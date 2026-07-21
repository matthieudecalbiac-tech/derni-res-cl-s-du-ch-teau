-- ============================================================
-- RPC repondre_demande — le châtelain accepte/refuse une demande de séjour.
-- À jouer dans Supabase Dashboard → SQL Editor.
--
-- SEUL chemin d'écriture du statut par un châtelain : la RLS de reservations est
-- lecture-seule pour lui (voulu). Cette RPC SECURITY DEFINER, gardée, est la
-- seule porte. Modèle : admin_upsert_chateau (garde interne + ERRCODE + FOR UPDATE).
--
-- SÉCURITÉ : SECURITY DEFINER exécute avec les droits du propriétaire (postgres :
-- bypass RLS + tous privilèges), MAIS auth.uid() reste l'APPELANT (claim JWT lu
-- dans request.jwt.claims) — donc is_chatelain_of() teste bien le châtelain qui
-- appelle, pas postgres. search_path figé à public (ferme l'injection de schéma).
--
-- PAS D'EMAIL ici : cette brique n'écrit QUE le statut. L'email (email_log +
-- send-email) viendra avec l'Edge Function enrobante. On teste la RPC seule d'abord.
--
-- ATOMICITÉ : DROP + CREATE dans UNE transaction. Si le CREATE échoue, le ROLLBACK
-- annule le DROP → la fonction n'est jamais laissée absente (le piège d'hier).
-- Idempotent : DROP FUNCTION IF EXISTS (signature exacte) + GRANT idempotent.
-- ============================================================

BEGIN;

DROP FUNCTION IF EXISTS public.repondre_demande(uuid, text);

CREATE FUNCTION public.repondre_demande(
  p_reservation_id uuid,
  p_decision       text
)
RETURNS TABLE (reservation_id uuid, nouveau_statut public.reservation_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chateau_id uuid;
  v_status     public.reservation_status;
  v_new_status public.reservation_status;
BEGIN
  -- 1. Résoudre le château depuis la réservation via la chambre. Existence ?
  SELECT ch.chateau_id
    INTO v_chateau_id
    FROM public.reservations r
    JOIN public.chambres     ch ON ch.id = r.chambre_id
   WHERE r.id = p_reservation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'repondre_demande: demande % introuvable', p_reservation_id
      USING ERRCODE = 'P0002';
  END IF;

  -- 2. Garde d'appartenance : ce châtelain est-il propriétaire de CE château ?
  --    auth.uid() reste l'appelant, même en SECURITY DEFINER.
  IF NOT public.is_chatelain_of(v_chateau_id) THEN
    RAISE EXCEPTION 'repondre_demande: acces refuse (pas le chatelain de ce chateau)'
      USING ERRCODE = '42501';
  END IF;

  -- 3. Verrou anti-course + garde d'état : on ne traite QU'UNE demande pending.
  SELECT status
    INTO v_status
    FROM public.reservations
   WHERE id = p_reservation_id
     FOR UPDATE;
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'repondre_demande: demande deja traitee (statut %)', v_status
      USING ERRCODE = 'P0001';
  END IF;

  -- 4. Valider la décision -> statut cible.
  IF p_decision = 'accepter' THEN
    v_new_status := 'confirmed';
  ELSIF p_decision = 'refuser' THEN
    v_new_status := 'cancelled';
  ELSE
    RAISE EXCEPTION 'repondre_demande: decision invalide % (attendu accepter|refuser)', p_decision
      USING ERRCODE = '22023';
  END IF;

  -- 5. Écrire le statut. updated_at est posé par le trigger set_timestamp_reservations.
  UPDATE public.reservations
     SET status = v_new_status
   WHERE id = p_reservation_id
  RETURNING id, status INTO reservation_id, nouveau_statut;

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.repondre_demande(uuid, text) IS
  'Réponse d''un châtelain à une demande de séjour : accepter -> confirmed, refuser -> cancelled. SECURITY DEFINER + gardes (existence, is_chatelain_of via la chambre, statut pending, FOR UPDATE). auth.uid() = appelant. N''envoie PAS d''email (brique Edge Function enrobante). Renvoie (reservation_id, nouveau_statut). GRANT EXECUTE authenticated ; la garde interne fait le contrôle d''accès.';

GRANT EXECUTE ON FUNCTION public.repondre_demande(uuid, text) TO authenticated;

COMMIT;

-- ============================================================
-- VÉRIFICATION (lecture seule) — la fonction existe, bonne signature + definer.
-- ============================================================
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_function_result(p.oid)             AS returns,
       p.prosecdef                               AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'repondre_demande';

-- ============================================================
-- TEST FONCTIONNEL en SQL Editor — ⚠ tu es postgres, auth.uid() est NULL, donc
-- un appel DIRECT `SELECT repondre_demande(...)` RAISE 42501 (is_chatelain_of =
-- false sans JWT). C'est ATTENDU, pas un bug. Pour tester le vrai chemin, SIMULE
-- le châtelain en posant son uid dans le claim JWT le temps de la transaction :
--
--   BEGIN;
--     SELECT set_config(
--       'request.jwt.claims',
--       json_build_object('sub', '<UUID_DU_USER_CHATELAIN>')::text,
--       true   -- is_local : limité à la transaction
--     );
--     SELECT * FROM public.repondre_demande('<UUID_RESERVATION_PENDING>', 'accepter');
--   ROLLBACK;   -- ROLLBACK pour un test à blanc ; COMMIT pour garder l'effet
--
-- Cas à vérifier : (a) châtelain de La Rivière + résa pending -> confirmed ;
-- (b) 2e appel sur la même -> RAISE 'deja traitee' ; (c) uid d'un autre user ->
-- RAISE 42501 ; (d) 'refuser' -> cancelled ; (e) decision bidon -> RAISE 22023.
-- ============================================================
