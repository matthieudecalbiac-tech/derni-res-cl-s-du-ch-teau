-- ============================================================
-- DURCISSEMENT DES ÉCRITURES SUR reservations — RPC annuler_ma_reservation +
-- fermeture des chemins directs.
-- À jouer dans Supabase Dashboard → SQL Editor.
--
-- CE QU'ON FERME. Deux portes étaient ouvertes à tout `authenticated` :
--
--   1. UPDATE — la policy reservations_update_client_cancel était
--      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND
--      status = 'cancelled'). Le WITH CHECK ne fixait QUE user_id et status :
--      un client pouvait, dans le même UPDATE, réécrire prix_total_cents,
--      commission_lcc_cents, les dates ou chambre_id — pourvu que le statut
--      finisse à 'cancelled'. Le GRANT portait sur la table entière, sans liste
--      de colonnes. Le USING ne bornait pas non plus le statut de DÉPART : on
--      pouvait « annuler » un séjour completed et réécrire l'historique.
--      (Faille connue, annotée dans policies.sql depuis sa création.)
--
--   2. INSERT — la porte la plus large, et personne ne l'utilisait. La policy
--      reservations_insert_client_admin était WITH CHECK (user_id = auth.uid()
--      OR is_admin()) : n'importe quel client connecté pouvait INSÉRER une
--      réservation avec le prix_total_cents et la commission_lcc_cents de son
--      choix, sur n'importe quelle chambre. C'est exactement le prix falsifié
--      que demande-reservation prend soin de recalculer côté serveur — sauf
--      qu'ici il n'y avait aucun tunnel à contourner. Aucun consommateur :
--      le front n'écrit jamais dans reservations (seul SELECT via clubService),
--      et l'Edge Function demande-reservation passe en service_role.
--
-- LE PATRON : RPC = SEUL CHEMIN D'ÉCRITURE (déjà acté pour les amenities et
-- pour repondre_demande). Après cette migration, `authenticated` n'a plus AUCUN
-- droit d'écriture direct sur reservations. Les trois écritures légitimes
-- passent à côté de la RLS client :
--   • création       → demande-reservation, en service_role ;
--   • réponse        → repondre_demande, SECURITY DEFINER ;
--   • annulation     → annuler_ma_reservation, SECURITY DEFINER (ci-dessous).
-- Une fonction SECURITY DEFINER s'exécute avec les privilèges de son
-- PROPRIÉTAIRE : retirer le GRANT à authenticated ne casse donc aucune des
-- trois, tout en fermant l'accès direct.
--
-- ATOMICITÉ : tout dans UNE transaction. Si le CREATE échoue, le ROLLBACK
-- annule aussi les DROP de policies — on ne laisse jamais la table sans garde.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────
-- 1. RPC annuler_ma_reservation — le SEUL UPDATE possible côté client.
--    Modèle repondre_demande : gardes internes + ERRCODE + FOR UPDATE + outbox.
-- ─────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.annuler_ma_reservation(uuid, text);

CREATE FUNCTION public.annuler_ma_reservation(
  p_reservation_id uuid,
  p_motif          text DEFAULT NULL
)
RETURNS TABLE (reservation_id uuid, nouveau_statut public.reservation_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid;
  v_status       public.reservation_status;
  v_chateau_id   uuid;
  v_chateau_nom  text;
  v_chambre_nom  text;
  v_date_arrivee date;
  v_date_depart  date;
  v_voyageurs    integer;
  v_sujet        text;
  v_payload      jsonb;
BEGIN
  -- 1. Résoudre la réservation + le contexte du séjour. Existence ?
  SELECT r.user_id, ch.chateau_id, ch.nom, c.nom,
         r.date_arrivee, r.date_depart, r.voyageurs
    INTO v_user_id, v_chateau_id, v_chambre_nom, v_chateau_nom,
         v_date_arrivee, v_date_depart, v_voyageurs
    FROM public.reservations r
    JOIN public.chambres     ch ON ch.id = r.chambre_id
    JOIN public.chateaux     c  ON c.id  = ch.chateau_id
   WHERE r.id = p_reservation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'annuler_ma_reservation: reservation % introuvable', p_reservation_id
      USING ERRCODE = 'P0002';
  END IF;

  -- 2. Garde d'appartenance. IS DISTINCT FROM et non <> : avec un appelant
  --    anonyme, auth.uid() vaut NULL et `v_user_id <> NULL` s'évalue à NULL,
  --    donc le IF ne se déclencherait PAS et la garde serait contournée.
  --    IS DISTINCT FROM traite NULL comme une valeur : la garde tient.
  IF v_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'annuler_ma_reservation: acces refuse'
      USING ERRCODE = '42501';
  END IF;

  -- 3. Verrou anti-course + garde d'état. On n'annule que ce qui est encore
  --    en cours de vie : pending (pas encore répondu) ou confirmed (à venir).
  SELECT r.status INTO v_status
    FROM public.reservations r
   WHERE r.id = p_reservation_id
     FOR UPDATE;

  IF v_status = 'cancelled' THEN
    RAISE EXCEPTION 'annuler_ma_reservation: sejour deja annule'
      USING ERRCODE = 'P0001';
  ELSIF v_status = 'completed' THEN
    RAISE EXCEPTION 'annuler_ma_reservation: sejour deja passe, annulation impossible'
      USING ERRCODE = 'P0001';
  ELSIF v_status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'annuler_ma_reservation: statut % non annulable', v_status
      USING ERRCODE = 'P0001';
  END IF;

  -- 4. L'UPDATE. Les trois colonnes existaient déjà dans le schéma sans jamais
  --    être écrites nulle part : elles n'attendaient que ce chemin.
  --    updated_at est posé par le trigger set_timestamp_reservations.
  UPDATE public.reservations
     SET status              = 'cancelled',
         cancelled_at        = now(),
         cancellation_reason = p_motif
   WHERE id = p_reservation_id
  RETURNING id, status INTO reservation_id, nouveau_statut;

  -- 5. OUTBOX — même transaction que le statut. Soit le séjour est annulé ET
  --    les emails sont en file, soit rien.
  --
  --    QUI EST PRÉVENU : le CHÂTELAIN (sa chambre se libère) et l'ADMIN
  --    (supervision). PAS le client : il vient de faire le geste, l'écran le
  --    lui confirme — lui écrire pour l'informer de sa propre action serait du
  --    bruit.
  --
  --    Le motif n'entre PAS dans l'email : c'est du texte libre écrit par le
  --    client, non relu. Il reste en base (cancellation_reason) pour le support.
  v_sujet := 'Séjour annulé — ' || v_chateau_nom;
  v_payload := jsonb_build_object(
    'sujet', v_sujet,
    'params', jsonb_build_object(
      'chateau',     v_chateau_nom,
      'chambre',     v_chambre_nom,
      'dateArrivee', to_char(v_date_arrivee, 'YYYY-MM-DD'),
      'dateDepart',  to_char(v_date_depart, 'YYYY-MM-DD'),
      'voyageurs',   v_voyageurs
    )
  );

  -- Châtelain : une ligne par contact ACTIF du château (0, 1 ou plusieurs).
  INSERT INTO public.email_log (destinataire, type, reservation_id, statut, payload)
  SELECT cc.email, 'sejour_annule', p_reservation_id, 'en_attente', v_payload
    FROM public.chateau_contacts cc
   WHERE cc.chateau_id = v_chateau_id
     AND cc.actif = true;

  -- Admin : supervision. ⚠ L'admin est résolu DEPUIS LA BASE (users.role =
  -- 'admin'), et non depuis ADMIN_EMAIL comme le fait demande-reservation :
  -- ADMIN_EMAIL est une variable d'environnement d'Edge Function, illisible
  -- depuis SQL. Si la boîte de supervision diffère de l'email du compte admin,
  -- les deux chemins n'écrivent pas au même endroit — à réconcilier le jour où
  -- ça compte (mettre ADMIN_EMAIL dans Vault, ou aligner l'email du compte).
  INSERT INTO public.email_log (destinataire, type, reservation_id, statut, payload)
  SELECT u.email, 'sejour_annule', p_reservation_id, 'en_attente', v_payload
    FROM public.users u
   WHERE u.role = 'admin'
     AND u.email IS NOT NULL;

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.annuler_ma_reservation(uuid, text) IS
  'Annulation par le CLIENT de sa propre reservation : status -> cancelled, cancelled_at, cancellation_reason. SEUL chemin d''ecriture client (la RLS ne laisse plus aucun UPDATE/INSERT direct). SECURITY DEFINER + gardes (existence, appartenance via IS DISTINCT FROM auth.uid(), statut de depart pending|confirmed, FOR UPDATE). Ecrit en OUTBOX, meme transaction, une ligne email_log sejour_annule par contact chatelain actif + par admin — jamais au client, qui vient de faire le geste. Le motif reste en base, il n''entre pas dans l''email. Renvoie (reservation_id, nouveau_statut).';

-- EXECUTE est accordé a PUBLIC par defaut sur toute fonction nouvelle. Sur une
-- SECURITY DEFINER c'est un vrai trou : on le retire avant d'accorder.
REVOKE EXECUTE ON FUNCTION public.annuler_ma_reservation(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.annuler_ma_reservation(uuid, text) TO authenticated;

-- ─────────────────────────────────────────────────────────
-- 2. FERMETURE DES CHEMINS DIRECTS
-- ─────────────────────────────────────────────────────────

-- La faille UPDATE : remplacée par la RPC ci-dessus.
DROP POLICY IF EXISTS reservations_update_client_cancel ON public.reservations;

-- La faille INSERT : aucun consommateur, la creation passe par
-- demande-reservation en service_role.
DROP POLICY IF EXISTS reservations_insert_client_admin ON public.reservations;

-- L'ecriture admin : DROP, assume.
-- Un admin est un `authenticated`. Sans GRANT UPDATE pour ce role, la policy
-- reservations_update_admin ne peut PLUS etre evaluee : le privilege est refuse
-- avant que la RLS entre en jeu. La garder serait un leurre — exactement le
-- piege deja documente dans policies.sql a propos d'equipements (« equipements
-- EST le trou : policies d'ecriture inatteignables »). On prefere l'absence
-- franche : qui voudra un back-office d'ecriture sur les reservations devra
-- poser SCIEMMENT un chemin (RPC admin dediee, ou Edge Function service_role),
-- plutot que de croire qu'il en existe un. AdminReservations est aujourd'hui un
-- stub de 9 lignes : rien ne se casse.
DROP POLICY IF EXISTS reservations_update_admin ON public.reservations;

-- Plus aucun droit d'ecriture directe pour authenticated. SELECT est conserve
-- (policy reservations_select_owner : son fil, celui de ses chateaux, ou admin).
REVOKE INSERT, UPDATE ON public.reservations FROM authenticated;

COMMIT;

-- ============================================================
-- VÉRIFICATION (lecture seule)
-- ============================================================
-- 1. Il ne doit rester QUE reservations_select_owner.
SELECT polname, polcmd
FROM pg_policy
WHERE polrelid = 'public.reservations'::regclass
ORDER BY polname;

-- 2. authenticated ne doit plus avoir que SELECT sur la table.
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'reservations'
ORDER BY grantee, privilege_type;

-- 3. La fonction existe, en SECURITY DEFINER (prosecdef = true).
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef                               AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'annuler_ma_reservation';

-- ============================================================
-- TEST FONCTIONNEL en SQL Editor — auth.uid() y vaut NULL, donc un appel DIRECT
-- leve 42501 (garde d'appartenance). C'est ATTENDU, et c'est precisement ce que
-- le IS DISTINCT FROM garantit. Pour tester le vrai chemin, simuler le client :
--
--   BEGIN;
--     SELECT set_config('request.jwt.claims',
--       json_build_object('sub', '<UUID_DU_USER_CLIENT>')::text, true);
--     SELECT * FROM public.annuler_ma_reservation('<UUID_RESA_PENDING>', 'Imprevu');
--     -- 1) statut + tracabilite :
--     SELECT status, cancelled_at, cancellation_reason
--       FROM public.reservations WHERE id = '<UUID_RESA_PENDING>';
--     -- 2) lignes email_log en file (chatelain actif + admin), PAS le client :
--     SELECT destinataire, type, statut FROM public.email_log
--      WHERE reservation_id = '<UUID_RESA_PENDING>' AND type = 'sejour_annule';
--   ROLLBACK;
--
-- Cas a verifier : (a) resa pending d'un autre user -> 42501 ; (b) 2e appel sur
-- la meme -> 'sejour deja annule' ; (c) resa completed -> 'sejour deja passe' ;
-- (d) UPDATE direct en tant que client -> refuse (plus de GRANT).
-- ============================================================
