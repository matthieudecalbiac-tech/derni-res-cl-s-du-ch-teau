-- ============================================================
-- CLAIM ATOMIQUE de la file email_log — statut 'en_cours' + claim_emails().
-- À jouer dans Supabase Dashboard → SQL Editor.
--
-- LE PROBLÈME : send-email lisait la file (SELECT) puis envoyait, sans réserver
-- les lignes. Deux invocations qui se chevauchent lisent donc les MÊMES lignes
-- et envoient DEUX FOIS le même email au client. Aujourd'hui le risque est
-- faible (le nudge est cadré par reservationId) ; avec le balayage pg_cron
-- toutes les 2 minutes il devient réel dès qu'un drain dure plus longtemps que
-- l'intervalle — backlog, ou Brevo lent.
--
-- LA SOLUTION : réserver avant d'envoyer, en UNE requête. UPDATE ... RETURNING
-- est atomique : en READ COMMITTED, deux UPDATE concurrents sur la même ligne se
-- sérialisent, et le second RÉ-ÉVALUE son WHERE sur la version fraîche — il voit
-- 'en_cours' et ne la prend pas. L'exclusivité vient de Postgres, pas du code.
-- FOR UPDATE SKIP LOCKED n'est pas là pour la correction mais pour la latence :
-- le second drain passe au lot suivant au lieu d'attendre le verrou.
--
-- TENTATIVES INCRÉMENTÉ AU CLAIM, pas à l'envoi. Sans ça, une ligne dont le
-- traitement TUE le worker de façon déterministe (payload qui fait planter le
-- rendu, timeout systématique) serait re-réservée toutes les 10 minutes,
-- éternellement, sans jamais consommer son budget de 5 essais : la reprise sur
-- mort deviendrait une boucle infinie. Faire payer une tentative à la
-- réservation ferme la boucle — une ligne toxique brûle ses 5 essais et se fige.
-- COROLLAIRE : send-email ne fait plus tentatives+1 sur ses chemins d'envoi
-- (sinon chaque passage en consommerait deux et le budget réel tomberait à 2,5).
--
-- FENÊTRE DE REPRISE 10 MINUTES : un drain qui meurt après avoir réservé
-- laisserait ses lignes bloquées en 'en_cours' pour toujours. On les rend donc
-- ré-éligibles passé un délai. 10 min dépasse largement la durée de vie maximale
-- d'une Edge Function (le runtime la tue avant) : on ne peut pas re-réserver une
-- ligne réellement encore en vol. La date de réservation est `updated_at`, posé
-- par le trigger set_timestamp_email_log — pas de colonne supplémentaire.
--
-- PAS SECURITY DEFINER, volontairement : contrairement à repondre_demande, il
-- n'y a aucun auth.uid() à préserver ici. L'appelant est service_role, qui a
-- déjà le GRANT UPDATE sur email_log (migration 2026-07-18). Une fonction
-- ordinaire suffit — moins de pouvoir, moins de surface.
--
-- LANGUAGE sql et pas plpgsql : en plpgsql, un RETURNS TABLE crée des variables
-- nommées id/tentatives/... qui entrent en collision avec les colonnes du même
-- nom dans le sous-select (« column reference is ambiguous »). Une fonction SQL
-- pure n'a pas ce piège, et il n'y a aucune logique procédurale à écrire.
--
-- IDEMPOTENT : DROP CONSTRAINT découvert dynamiquement + ADD CONSTRAINT nommée,
-- CREATE OR REPLACE FUNCTION, GRANT idempotent. Rejouable.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────
-- 1. CHECK statut — ajouter 'en_cours'
--    La contrainte d'origine est INLINE dans le CREATE TABLE, donc auto-nommée
--    par Postgres. On ne DEVINE pas son nom : on le retrouve dans le catalogue
--    (la contrainte CHECK de la table qui porte la colonne `statut`), on la
--    supprime, puis on en repose une NOMMÉE — les migrations suivantes auront
--    ainsi un nom déterministe à cibler.
-- ─────────────────────────────────────────────────────────
DO $$
DECLARE
  v_nom text;
BEGIN
  SELECT con.conname
    INTO v_nom
    FROM pg_constraint con
    JOIN pg_class     cls ON cls.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
   WHERE nsp.nspname = 'public'
     AND cls.relname = 'email_log'
     AND con.contype = 'c'
     AND pg_get_constraintdef(con.oid) ILIKE '%statut%'
   LIMIT 1;

  IF v_nom IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.email_log DROP CONSTRAINT %I', v_nom);
    RAISE NOTICE 'Contrainte CHECK supprimee : %', v_nom;
  END IF;
END;
$$;

ALTER TABLE public.email_log
  ADD CONSTRAINT email_log_statut_check
  CHECK (statut IN ('en_attente', 'en_cours', 'envoye', 'echoue'));

COMMENT ON COLUMN public.email_log.statut IS
  'en_attente = en file, jamais tentee. en_cours = RESERVEE par un drain (claim_emails), envoi en vol. envoye = partie chez Brevo. echoue = tentative ratee, rejouable tant que tentatives < 5. Une ligne bloquee en en_cours au-dela de 10 min = drain mort : elle redevient eligible.';

-- L'index partiel idx_email_log_a_renvoyer (WHERE statut != 'envoye') couvre
-- deja 'en_cours' : rien a changer de ce cote.

-- ─────────────────────────────────────────────────────────
-- 2. FONCTION DE CLAIM
--    Réserve jusqu'à p_limit lignes éligibles et les renvoie. FIFO (created_at).
--    p_reservation_id : chemin NUDGE (une demande précise) ; NULL = balayage.
--
--    ÉLIGIBLE =
--      (a) pas encore envoyée          → statut <> 'envoye'
--      (b) sous la borne d'acharnement → tentatives < 5
--      (c) jamais prise OU prise il y a plus de 10 min
--                                      → statut <> 'en_cours'
--                                        OR updated_at < now() - 10 min
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_emails(
  p_limit          integer DEFAULT 50,
  p_reservation_id uuid    DEFAULT NULL
)
-- Renvoie exactement ce dont send-email a besoin pour rendre et poster. PAS
-- `tentatives` : le compteur est géré ici, l'appelant n'y touche plus — le lui
-- renvoyer serait une colonne que personne ne lit.
RETURNS TABLE (
  id           uuid,
  destinataire text,
  type         text,
  payload      jsonb
)
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  UPDATE public.email_log AS e
     SET statut     = 'en_cours',
         tentatives = e.tentatives + 1
    FROM (
      SELECT f.id
        FROM public.email_log AS f
       WHERE f.statut <> 'envoye'
         AND f.tentatives < 5
         AND (f.statut <> 'en_cours' OR f.updated_at < now() - interval '10 minutes')
         AND (p_reservation_id IS NULL OR f.reservation_id = p_reservation_id)
       ORDER BY f.created_at
       LIMIT p_limit
       FOR UPDATE SKIP LOCKED
    ) AS pris
   WHERE e.id = pris.id
  RETURNING e.id, e.destinataire, e.type, e.payload;
$$;

COMMENT ON FUNCTION public.claim_emails(integer, uuid) IS
  'Reserve atomiquement jusqu''a p_limit lignes email_log a envoyer et les renvoie (FIFO created_at). Passe leur statut a en_cours et incremente tentatives AU CLAIM (une ligne qui tue le worker brule son budget au lieu de boucler). Eligible : statut <> envoye ET tentatives < 5 ET (pas en_cours OU reserve depuis plus de 10 min = drain mort). p_reservation_id non-null restreint au chemin nudge. UPDATE ... RETURNING + FOR UPDATE SKIP LOCKED : deux drains concurrents ne peuvent pas prendre la meme ligne. SECURITY INVOKER : appelee par service_role, qui a deja le GRANT UPDATE.';

-- ─────────────────────────────────────────────────────────
-- 3. GRANTS
--    Postgres accorde EXECUTE a PUBLIC par defaut sur toute fonction nouvelle :
--    on le retire explicitement. anon/authenticated n'ont de toute facon aucun
--    GRANT sur email_log (ils prendraient 42501), mais la fonction n'a aucune
--    raison de leur etre seulement visible. Defense en profondeur.
-- ─────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.claim_emails(integer, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.claim_emails(integer, uuid) TO service_role;

COMMIT;

-- ============================================================
-- VÉRIFICATION (lecture seule)
-- ============================================================
-- 1. Le CHECK accepte bien les 4 statuts.
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.email_log'::regclass AND contype = 'c';

-- 2. La fonction existe, en SECURITY INVOKER (prosecdef = false).
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef                               AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'claim_emails';

-- ============================================================
-- TEST FONCTIONNEL en SQL Editor — à blanc (ROLLBACK).
--
--   BEGIN;
--     -- Réserve au plus 5 lignes et montre ce qui a été pris :
--     SELECT * FROM public.claim_emails(5);
--     -- Les mêmes lignes ne doivent PLUS être reprises par un second claim :
--     SELECT * FROM public.claim_emails(5);   -- attendu : 0 ligne (déjà en_cours)
--     -- État de la file :
--     SELECT statut, count(*), max(tentatives) FROM public.email_log GROUP BY statut;
--   ROLLBACK;
--
-- Pour vérifier la reprise après drain mort, sans attendre 10 minutes.
-- ⚠ trigger_set_timestamp fait `NEW.updated_at = NOW()` sur TOUT UPDATE : on ne
--   peut pas antidater la ligne tant que le trigger est armé, il écraserait la
--   valeur. On le désarme le temps du test — DISABLE TRIGGER est transactionnel,
--   le ROLLBACK le réarme.
--
--   BEGIN;
--     SELECT * FROM public.claim_emails(1);
--     ALTER TABLE public.email_log DISABLE TRIGGER set_timestamp_email_log;
--     UPDATE public.email_log SET updated_at = now() - interval '11 minutes'
--      WHERE statut = 'en_cours';
--     ALTER TABLE public.email_log ENABLE TRIGGER set_timestamp_email_log;
--     SELECT * FROM public.claim_emails(1);   -- attendu : la ligne revient
--   ROLLBACK;
-- ============================================================
