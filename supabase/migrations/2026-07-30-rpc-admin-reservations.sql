-- ============================================================
-- RPC admin_annuler_reservation + admin_forcer_statut — les ÉCRITURES de
-- l'écran /admin/reservations (brique 2/2 : les actions).
-- À jouer dans Supabase Dashboard → SQL Editor.
--
-- ── POURQUOI DES RPC, ET PAS UNE POLICY ─────────────────────
-- Le durcissement du 23 juillet a retiré INSERT et UPDATE à `authenticated` et
-- DROP reservations_update_admin en l'assumant : « un admin est un
-- authenticated ; sans GRANT UPDATE pour ce role, la policy ne peut PLUS etre
-- evaluee […] qui voudra un back-office d'ecriture devra poser SCIEMMENT un
-- chemin (RPC admin dediee, ou Edge Function service_role) ».
-- C'est ce chemin. Il est posé sciemment, et il est le seul.
-- SECURITY DEFINER : la fonction s'exécute avec les privilèges de son
-- propriétaire, donc le REVOKE sur la table ne la gêne pas — et c'est ce qui
-- rend la garde is_admin() INTERNE obligatoire, puisque plus rien ne filtre en
-- amont.
--
-- ── DEUX FONCTIONS, DEUX NATURES ────────────────────────────
-- admin_annuler_reservation est un GESTE COMMERCIAL : il produit une
-- conséquence chez un tiers (le client reçoit un email), donc il exige un état
-- où cette conséquence a du sens — pending ou confirmed.
--
-- admin_forcer_statut est une CORRECTION TECHNIQUE : il ne parle à personne,
-- donc il peut tout faire. Liberté totale sur la transition, aucun email.
--
-- POURQUOI annuler N'EST PAS AUTORISÉ DEPUIS completed. Ce n'est pas une
-- contrainte de données — forcer_statut permet de toute façon la transition —
-- c'est que l'EMAIL deviendrait un mensonge : annoncer que le séjour « ne
-- pourra finalement pas avoir lieu » à quelqu'un qui a déjà dormi au château
-- contredit un fait qu'il connaît mieux que nous. Même chose depuis cancelled :
-- re-annuler n'apprend rien à qui a déjà été prévenu. L'admin qui a besoin de
-- ces transitions passe par forcer_statut, qui les fait en silence.
-- C'est aussi la symétrie avec annuler_ma_reservation, bornée aux deux mêmes
-- statuts depuis le 23 juillet.
--
-- ── L'OUTBOX EST INVERSÉE ───────────────────────────────────
-- annuler_ma_reservation NE prévient PAS le client : « il vient de faire le
-- geste, l'écran le lui confirme ». Ici le client SUBIT l'annulation — il est
-- donc le premier concerné, et le seul qui ne puisse pas l'apprendre autrement.
-- Le châtelain est prévenu aussi (sa chambre se libère).
--
-- Le MOTIF ne part PAS dans l'email : texte libre non relu, il reste en base
-- (cancellation_reason) pour le support. Même règle que côté client.
--
-- Écriture en OUTBOX, dans la MÊME transaction que le statut : soit le séjour
-- est annulé ET les emails sont en file, soit rien.
--
-- ── LA RÉSURRECTION QUE LE CHECK NE RATTRAPE PAS ────────────
-- reservations_cancelled_coherent impose cancelled_at NOT NULL quand
-- status = 'cancelled', mais ne dit RIEN dans l'autre sens. Un
-- cancelled -> confirmed forcé passerait donc la contrainte en laissant
-- cancelled_at et cancellation_reason renseignés sur une réservation active.
-- admin_forcer_statut nettoie les deux colonnes lui-même : la base ne le fera
-- pas à sa place.
--
-- Idempotent : DROP FUNCTION IF EXISTS avant chaque CREATE. Tout dans UNE
-- transaction — si un CREATE échoue, le ROLLBACK ne laisse pas une moitié.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────
-- 1. admin_annuler_reservation — le geste, avec ses emails.
-- ─────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.admin_annuler_reservation(uuid, text);

CREATE FUNCTION public.admin_annuler_reservation(
  p_reservation_id uuid,
  p_motif          text DEFAULT NULL
)
RETURNS TABLE (reservation_id uuid, nouveau_statut public.reservation_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status       public.reservation_status;
  v_chateau_id   uuid;
  v_chateau_nom  text;
  v_chambre_nom  text;
  v_client_email text;
  v_client_nom   text;
  v_date_arrivee date;
  v_date_depart  date;
  v_voyageurs    integer;
  v_payload_cli  jsonb;
  v_payload_cha  jsonb;
BEGIN
  -- 1. La garde, AVANT toute lecture. SECURITY DEFINER a désactivé la RLS :
  --    sans ce test, n'importe quel `authenticated` annulerait n'importe quelle
  --    réservation. C'est LA ligne qui tient la fonction.
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_annuler_reservation: acces refuse'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Contexte du séjour + contact client. Le JOIN users est ce qui distingue
  --    cette fonction de sa jumelle côté client : ici on doit ÉCRIRE au client,
  --    donc il faut son email.
  SELECT ch.chateau_id, ch.nom, c.nom,
         u.email,
         COALESCE(
           CASE WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL
                THEN u.first_name || ' ' || u.last_name END,
           u.full_name,
           ''
         ),
         r.date_arrivee, r.date_depart, r.voyageurs
    INTO v_chateau_id, v_chambre_nom, v_chateau_nom,
         v_client_email, v_client_nom,
         v_date_arrivee, v_date_depart, v_voyageurs
    FROM public.reservations r
    JOIN public.chambres     ch ON ch.id = r.chambre_id
    JOIN public.chateaux     c  ON c.id  = ch.chateau_id
    JOIN public.users        u  ON u.id  = r.user_id
   WHERE r.id = p_reservation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'admin_annuler_reservation: reservation % introuvable', p_reservation_id
      USING ERRCODE = 'P0002';
  END IF;

  -- 3. Verrou anti-course + garde d'état. Les deux refus ci-dessous ne
  --    protègent pas la donnée (forcer_statut ferait la transition) : ils
  --    protègent le DESTINATAIRE d'un email qui serait faux.
  SELECT r.status INTO v_status
    FROM public.reservations r
   WHERE r.id = p_reservation_id
     FOR UPDATE;

  IF v_status = 'cancelled' THEN
    RAISE EXCEPTION 'admin_annuler_reservation: sejour deja annule'
      USING ERRCODE = 'P0001';
  ELSIF v_status = 'completed' THEN
    RAISE EXCEPTION 'admin_annuler_reservation: sejour deja passe, utiliser admin_forcer_statut'
      USING ERRCODE = 'P0001';
  ELSIF v_status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'admin_annuler_reservation: statut % non annulable', v_status
      USING ERRCODE = 'P0001';
  END IF;

  -- 4. L'UPDATE. updated_at est posé par le trigger set_timestamp_reservations.
  UPDATE public.reservations
     SET status              = 'cancelled',
         cancelled_at        = now(),
         cancellation_reason = p_motif
   WHERE id = p_reservation_id
  RETURNING id, status INTO reservation_id, nouveau_statut;

  -- 5. OUTBOX — INVERSÉE par rapport à annuler_ma_reservation.
  --    Là-bas le client était le seul à NE PAS être prévenu (il venait de faire
  --    le geste). Ici il est le premier concerné : il subit l'annulation, et
  --    c'est le seul moyen qu'il a de l'apprendre.
  --    Le motif n'entre pas dans l'email — il reste en base pour le support.
  v_payload_cli := jsonb_build_object(
    'sujet', 'Votre séjour — ' || v_chateau_nom,
    'params', jsonb_build_object(
      'nomClient',   v_client_nom,
      'chateau',     v_chateau_nom,
      'dateArrivee', to_char(v_date_arrivee, 'YYYY-MM-DD'),
      'dateDepart',  to_char(v_date_depart, 'YYYY-MM-DD'),
      'voyageurs',   v_voyageurs
    )
  );

  INSERT INTO public.email_log (destinataire, type, reservation_id, statut, payload)
  VALUES (v_client_email, 'sejour_annule_admin', p_reservation_id, 'en_attente', v_payload_cli);

  -- Châtelain : gabarit sejour_annule existant (email de TRAVAIL — sa chambre
  -- se libère). Une ligne par contact ACTIF du château (0, 1 ou plusieurs).
  -- Ce gabarit affirmait « annulée par le voyageur » : faux ici. Il a été rendu
  -- neutre dans la même brique (« Une demande de séjour vient d'être annulée. »)
  -- pour servir les DEUX chemins sans mentir. Ce qui intéresse le châtelain est
  -- dans la dernière ligne : ses dates se libèrent.
  v_payload_cha := jsonb_build_object(
    'sujet', 'Séjour annulé — ' || v_chateau_nom,
    'params', jsonb_build_object(
      'chateau',     v_chateau_nom,
      'chambre',     v_chambre_nom,
      'dateArrivee', to_char(v_date_arrivee, 'YYYY-MM-DD'),
      'dateDepart',  to_char(v_date_depart, 'YYYY-MM-DD'),
      'voyageurs',   v_voyageurs
    )
  );

  INSERT INTO public.email_log (destinataire, type, reservation_id, statut, payload)
  SELECT cc.email, 'sejour_annule', p_reservation_id, 'en_attente', v_payload_cha
    FROM public.chateau_contacts cc
   WHERE cc.chateau_id = v_chateau_id
     AND cc.actif = true;

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.admin_annuler_reservation(uuid, text) IS
  'Annulation d''une reservation PAR L''ADMIN : status -> cancelled, cancelled_at, cancellation_reason. SECURITY DEFINER + garde is_admin() INTERNE (la RLS ne filtre plus rien en SECURITY DEFINER). Bornee a pending|confirmed : depuis completed ou cancelled l''email serait faux (annoncer un sejour annule a qui y a deja dormi, ou re-prevenir qui l''a deja ete) — ces cas passent par admin_forcer_statut, qui est muet. OUTBOX INVERSEE par rapport a annuler_ma_reservation : ici le CLIENT est prevenu (il subit l''annulation) via le gabarit sejour_annule_admin, plus les contacts chatelains actifs via sejour_annule. Le motif reste en base, il n''entre pas dans l''email. Renvoie (reservation_id, nouveau_statut).';

REVOKE EXECUTE ON FUNCTION public.admin_annuler_reservation(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_annuler_reservation(uuid, text) TO authenticated;


-- ─────────────────────────────────────────────────────────
-- 2. admin_forcer_statut — la correction technique, muette.
-- ─────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.admin_forcer_statut(uuid, text);

CREATE FUNCTION public.admin_forcer_statut(
  p_reservation_id uuid,
  p_nouveau_statut text
)
RETURNS TABLE (
  reservation_id uuid,
  ancien_statut  public.reservation_status,
  nouveau_statut public.reservation_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cible  public.reservation_status;
  v_avant  public.reservation_status;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_forcer_statut: acces refuse'
      USING ERRCODE = '42501';
  END IF;

  -- Validation de la cible AVANT le cast. Un cast direct sur une valeur hors
  -- enum leverait un 22P02 illisible ; ici le message dit ce qui etait attendu.
  IF p_nouveau_statut IS NULL
     OR p_nouveau_statut NOT IN ('pending', 'confirmed', 'cancelled', 'completed') THEN
    RAISE EXCEPTION 'admin_forcer_statut: statut % invalide (attendu pending|confirmed|cancelled|completed)', p_nouveau_statut
      USING ERRCODE = '22023';
  END IF;
  v_cible := p_nouveau_statut::public.reservation_status;

  SELECT r.status INTO v_avant
    FROM public.reservations r
   WHERE r.id = p_reservation_id
     FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'admin_forcer_statut: reservation % introuvable', p_reservation_id
      USING ERRCODE = 'P0002';
  END IF;

  -- LIBERTE TOTALE sur la transition : aucune garde d'etat, c'est le point de
  -- cette fonction. La seule chose qu'elle impose est la COHERENCE des deux
  -- colonnes d'annulation, que le CHECK ne tient que dans un sens.
  --
  --   cible = cancelled  -> cancelled_at obligatoire (sinon le CHECK refuse).
  --                         On PRESERVE un horodatage et un motif deja la : un
  --                         forcage ne doit pas effacer la trace d'une vraie
  --                         annulation. A defaut, un marqueur identifiable dit
  --                         au support d'ou vient cette ligne.
  --   cible <> cancelled -> les deux colonnes sont REMISES A NULL. Sans ca une
  --                         reservation ressuscitee resterait porteuse de sa
  --                         date et de son motif d'annulation, et le CHECK
  --                         laisserait passer cette incoherence.
  UPDATE public.reservations r
     SET status = v_cible,
         cancelled_at = CASE
           WHEN v_cible = 'cancelled' THEN COALESCE(r.cancelled_at, now())
           ELSE NULL
         END,
         cancellation_reason = CASE
           WHEN v_cible = 'cancelled'
             THEN COALESCE(r.cancellation_reason, 'Statut force par un administrateur')
           ELSE NULL
         END
   WHERE r.id = p_reservation_id
  RETURNING r.id, v_avant, r.status
       INTO reservation_id, ancien_statut, nouveau_statut;

  -- AUCUN EMAIL, deliberement. Un forcage est une correction de donnee, pas un
  -- evenement de la vie du sejour : rien a annoncer a personne. L'annulation
  -- qui, elle, doit se dire, a sa propre fonction.

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.admin_forcer_statut(uuid, text) IS
  'Forcage du statut d''une reservation PAR L''ADMIN. SECURITY DEFINER + garde is_admin() INTERNE. LIBERTE TOTALE sur la transition (n''importe quel statut vers n''importe quel autre) : c''est une correction technique, pas un geste commercial. AUCUN EMAIL — l''annulation qui doit se dire passe par admin_annuler_reservation. Tient la COHERENCE que le CHECK reservations_cancelled_coherent ne tient que dans un sens : cible cancelled -> cancelled_at pose (existant preserve, sinon now()) et motif marque ; cible autre -> cancelled_at ET cancellation_reason remis a NULL, sans quoi une reservation ressuscitee resterait porteuse de son annulation. Renvoie (reservation_id, ancien_statut, nouveau_statut).';

REVOKE EXECUTE ON FUNCTION public.admin_forcer_statut(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_forcer_statut(uuid, text) TO authenticated;

COMMIT;


-- ============================================================
-- VÉRIFICATION (lecture seule)
-- ============================================================
-- 1. Les deux fonctions existent, en SECURITY DEFINER (prosecdef = true).
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef                               AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('admin_annuler_reservation', 'admin_forcer_statut')
ORDER BY p.proname;

-- 2. EXECUTE retire a PUBLIC, accorde a authenticated.
SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('admin_annuler_reservation', 'admin_forcer_statut')
ORDER BY routine_name, grantee;

-- 3. Aucune incoherence cancelled_at / status (doit renvoyer 0).
SELECT count(*) AS incoherences
FROM public.reservations
WHERE (status =  'cancelled' AND cancelled_at IS NULL)
   OR (status <> 'cancelled' AND cancelled_at IS NOT NULL);


-- ============================================================
-- TEST FONCTIONNEL en SQL Editor — auth.uid() y vaut NULL, donc is_admin()
-- renvoie faux et un appel DIRECT leve 42501. C'est ATTENDU. Pour tester le
-- vrai chemin, simuler l'admin :
--
--   BEGIN;
--     SELECT set_config('request.jwt.claims',
--       json_build_object('sub', '<UUID_DU_COMPTE_ADMIN>')::text, true);
--     SELECT * FROM public.admin_annuler_reservation('<UUID_RESA_PENDING>', 'Test');
--     SELECT status, cancelled_at, cancellation_reason
--       FROM public.reservations WHERE id = '<UUID_RESA_PENDING>';
--     -- Deux types en file : sejour_annule_admin (client) + sejour_annule (chatelain)
--     SELECT destinataire, type FROM public.email_log
--      WHERE reservation_id = '<UUID_RESA_PENDING>';
--     -- Resurrection : les deux colonnes doivent repasser a NULL
--     SELECT * FROM public.admin_forcer_statut('<UUID_RESA_PENDING>', 'confirmed');
--     SELECT status, cancelled_at, cancellation_reason
--       FROM public.reservations WHERE id = '<UUID_RESA_PENDING>';
--   ROLLBACK;
--
-- Cas a verifier : (a) appel par un NON-admin -> 42501 ; (b) annuler un
-- completed -> P0001 renvoyant vers forcer_statut ; (c) forcer_statut avec
-- 'nimportequoi' -> 22023 ; (d) forcer cancelled puis confirmed -> cancelled_at
-- et cancellation_reason a NULL a l'arrivee.
-- ============================================================


-- ============================================================
-- DEPLOIEMENT — send-email est BLOQUANT
-- ============================================================
-- Cette migration fait ecrire a la base des lignes email_log de type
-- 'sejour_annule_admin'. Tant que send-email n'est pas redeployee, GABARITS ne
-- connait pas ce type : la ligne part en statut 'echoue' avec « type inconnu »,
-- et le client n'est JAMAIS prevenu de l'annulation de son sejour.
-- Ordre : jouer cette migration -> deployer send-email -> tester.
--
-- Le meme deploiement emporte la correction du gabarit sejour_annule, dont le
-- corps affirmait « annulee par le voyageur » — vrai quand le client annule,
-- faux quand c'est LCC. Il est desormais neutre et sert les deux chemins.
