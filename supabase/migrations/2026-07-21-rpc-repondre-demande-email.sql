-- ============================================================
-- RPC repondre_demande v2 — PATRON OUTBOX : statut + email_log ATOMIQUES.
-- À jouer dans Supabase Dashboard → SQL Editor.
--
-- Remplace la v1 (2026-07-21-rpc-repondre-demande.sql). Même signature, mêmes
-- gardes. NOUVEAUTÉ : après l'UPDATE du statut, la fonction écrit — dans la MÊME
-- transaction — une ligne email_log 'en_attente' pour prévenir le CLIENT.
-- Atomique : soit le séjour change de statut ET l'email est en file, soit rien.
--
-- L'envoi lui-même n'est PAS fait ici : email_log est une OUTBOX. Un balayage
-- (send-email, mode body {}) drainera la file plus tard ; le nudge n'est qu'une
-- optim de latence. Cette brique n'écrit QUE la ligne — pas de HTTP depuis SQL.
--
-- CONFIDENTIALITÉ : SECURITY DEFINER (propriétaire postgres) → la fonction lit
-- users.email/full_name MALGRÉ users_select_self, et INSÈRE dans email_log MALGRÉ
-- le GRANT service_role-only. Le châtelain ne voit jamais l'email client : c'est
-- la RPC qui l'utilise pour remplir email_log.destinataire. auth.uid() reste
-- l'appelant (garde is_chatelain_of intacte).
--
-- ATOMICITÉ DDL : DROP + CREATE dans UNE transaction (rollback annule le DROP si
-- le CREATE échoue). Idempotent : DROP IF EXISTS (signature exacte) + GRANT.
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
  v_chateau_id   uuid;
  v_status       public.reservation_status;
  v_new_status   public.reservation_status;
  -- Données de l'email (résolues après l'UPDATE, la RPC les lit en definer).
  v_email        text;
  v_full_name    text;
  v_chateau_nom  text;
  v_date_arrivee date;
  v_date_depart  date;
  v_voyageurs    integer;
  v_type         text;
  v_sujet        text;
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

  -- 5. Écrire le statut. updated_at posé par le trigger set_timestamp_reservations.
  UPDATE public.reservations
     SET status = v_new_status
   WHERE id = p_reservation_id
  RETURNING id, status INTO reservation_id, nouveau_statut;

  -- 6. OUTBOX — résoudre le destinataire CLIENT + les données du séjour (definer :
  --    lit users malgré users_select_self ; le châtelain ne voit jamais cet email).
  SELECT u.email, u.full_name, r.date_arrivee, r.date_depart, r.voyageurs, c.nom
    INTO v_email, v_full_name, v_date_arrivee, v_date_depart, v_voyageurs, v_chateau_nom
    FROM public.reservations r
    JOIN public.users    u  ON u.id  = r.user_id
    JOIN public.chambres ch ON ch.id = r.chambre_id
    JOIN public.chateaux c  ON c.id  = ch.chateau_id
   WHERE r.id = p_reservation_id;

  -- Type + sujet selon la décision.
  IF v_new_status = 'confirmed' THEN
    v_type  := 'sejour_confirme';
    v_sujet := 'Votre séjour est confirmé — ' || v_chateau_nom;
  ELSE
    v_type  := 'sejour_refuse';
    v_sujet := 'Votre demande de séjour — ' || v_chateau_nom;
  END IF;

  -- 7. Ligne email_log 'en_attente' (payload = { sujet, params } aux formes des
  --    gabarits client de send-email). INSERT autorisé : definer bypasse le GRANT.
  INSERT INTO public.email_log (destinataire, type, reservation_id, statut, payload)
  VALUES (
    v_email,
    v_type,
    p_reservation_id,
    'en_attente',
    jsonb_build_object(
      'sujet', v_sujet,
      'params', jsonb_build_object(
        'nomClient',   COALESCE(v_full_name, ''),
        'chateau',     v_chateau_nom,
        'dateArrivee', to_char(v_date_arrivee, 'YYYY-MM-DD'),
        'dateDepart',  to_char(v_date_depart, 'YYYY-MM-DD'),
        'voyageurs',   v_voyageurs
      )
    )
  );

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.repondre_demande(uuid, text) IS
  'Réponse châtelain à une demande (OUTBOX) : accepter -> confirmed, refuser -> cancelled, ATOMIQUE avec l''écriture d''une ligne email_log en_attente pour le client (type sejour_confirme/sejour_refuse). SECURITY DEFINER + gardes (existence, is_chatelain_of, pending + FOR UPDATE). Lit users.email/full_name et INSÈRE email_log en definer ; le châtelain ne voit jamais l''email client. N''envoie PAS l''email (balayage send-email). Renvoie (reservation_id, nouveau_statut).';

GRANT EXECUTE ON FUNCTION public.repondre_demande(uuid, text) TO authenticated;

COMMIT;

-- ============================================================
-- VÉRIFICATION — la fonction existe, bonne signature + definer.
-- ============================================================
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_function_result(p.oid)             AS returns,
       p.prosecdef                               AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'repondre_demande';

-- ============================================================
-- TEST FONCTIONNEL en SQL Editor — simuler le châtelain (auth.uid() sinon NULL
-- -> 42501, attendu). Après l'appel, vérifier LES DEUX écritures :
--
--   BEGIN;
--     SELECT set_config('request.jwt.claims',
--       json_build_object('sub', '<UUID_DU_USER_CHATELAIN>')::text, true);
--     SELECT * FROM public.repondre_demande('<UUID_RESERVATION_PENDING>', 'accepter');
--     -- 1) statut passé à confirmed :
--     SELECT id, status FROM public.reservations WHERE id = '<UUID_RESERVATION_PENDING>';
--     -- 2) ligne email_log en_attente écrite :
--     SELECT type, destinataire, statut, payload
--       FROM public.email_log WHERE reservation_id = '<UUID_RESERVATION_PENDING>';
--   ROLLBACK;   -- test à blanc ; COMMIT pour garder l'effet
-- ============================================================
