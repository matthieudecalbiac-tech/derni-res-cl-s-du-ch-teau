-- ============================================================
-- BALAYAGE AUTOMATIQUE DE LA FILE email_log — job pg_cron 'drain-email-log'.
-- À jouer dans Supabase Dashboard → SQL Editor.
--
-- Dernière pièce du patron outbox. email_log est la boîte d'envoi ; send-email
-- la draine quand on l'appelle avec body {}. Jusqu'ici ce déclenchement était
-- MANUEL (ou le nudge best-effort de demande-reservation). Ce job le rend
-- automatique : toutes les 2 minutes, quelqu'un frappe à la porte.
--
-- Ce que ça répare : le nudge de demande-reservation est fire-and-forget — s'il
-- rate (worker tué, réseau, 500 transitoire), les lignes restaient 'en_attente'
-- indéfiniment, sans personne pour les reprendre. Et les confirmations châtelain
-- (repondre_demande) n'ont AUCUN nudge : elles n'attendaient que ce balayage.
--
-- CADENCE 2 MINUTES, lâche EXPRÈS. Le nudge reste le chemin rapide (email quasi
-- immédiat après une demande) ; le cron est le FILET qui rattrape les nudges
-- ratés et les écritures sans nudge. Serrer la cadence n'améliorerait que le
-- pire cas d'un chemin déjà dégradé, en multipliant les invocations à vide.
--
-- FIRE-AND-FORGET ASSUMÉ : net.http_post est asynchrone (il rend un request_id,
-- pas une réponse). On ne lit pas le résultat, on ne branche rien dessus : c'est
-- send-email qui met à jour email_log (statut / tentatives / derniere_erreur).
-- Le job n'a donc pas d'état à gérer, et un appel perdu est simplement rejoué
-- 2 minutes plus tard. La borne tentatives < 5 de send-email empêche
-- l'acharnement sur une ligne définitivement cassée.
--
-- SECRET : la valeur de X-Internal-Secret n'est écrite NI dans cette migration,
-- NI dans la définition du job. Le SELECT sur vault.decrypted_secrets est
-- EMBARQUÉ DANS LA COMMANDE : il est ré-évalué à chaque exécution. Donc
-- (a) `SELECT command FROM cron.job` ne révèle rien, (b) faire tourner le secret
-- dans Vault suffit — aucun re-scheduling nécessaire.
--
-- PAS D'Authorization : send-email est déployée avec verify_jwt = false
-- (cf. supabase/config.toml). Sa seule barrière est X-Internal-Secret. Ajouter
-- un JWT ici ne protégerait rien de plus (l'anon key est publique).
--
-- IDEMPOTENT : unschedule gardé + schedule. Rejouable sans erreur ni doublon.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────
-- 0. GARDE-FOU — le secret doit exister AVANT de planifier.
--    Sans lui, jsonb_build_object poserait un header NULL et send-email
--    répondrait 401 à chaque passage... silencieusement, puisque personne ne lit
--    la réponse d'un fire-and-forget. On échoue donc ICI, bruyamment : le
--    RAISE annule la transaction, le job n'est pas créé.
-- ─────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'internal_function_secret'
  ) THEN
    RAISE EXCEPTION
      'Secret Vault "internal_function_secret" introuvable : le job enverrait un header vide et prendrait un 401 muet toutes les 2 min. Créer le secret AVANT de rejouer cette migration.';
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────
-- 1. NETTOYAGE IDEMPOTENT
--    cron.unschedule(nom) lève une exception si le job n'existe pas : on le
--    garde derrière un EXISTS. (pg_cron 1.6 ferait un upsert sur le nom depuis
--    cron.schedule, mais on ne s'appuie pas sur ce comportement de version.)
-- ─────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'drain-email-log') THEN
    PERFORM cron.unschedule('drain-email-log');
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────
-- 2. PLANIFICATION — toutes les 2 minutes.
--    body '{}' = mode BALAYAGE de send-email : elle draine la file entière, et
--    non une réservation précise (ce que fait le nudge avec un reservationId).
--    Depuis le claim atomique (migration 2026-07-23-email-log-claim.sql), chaque
--    passage RÉSERVE au plus LOT_MAX = 50 lignes éligibles au lieu de toutes les
--    lire. Le débit du drain est donc borné à 50 emails par tour, soit 25/min à
--    cette cadence : un backlog plus gros se vide en plusieurs passages, ce qui
--    est le comportement voulu (rien n'est perdu, seulement étalé).
--    timeout généreux : la requête HTTP couvre le drain complet, et couper la
--    connexion trop tôt risquerait d'interrompre send-email en plein travail.
--    Le timeout ne retarde rien — l'appel est asynchrone.
-- ─────────────────────────────────────────────────────────
SELECT cron.schedule(
  'drain-email-log',
  '*/2 * * * *',
  $cmd$
  SELECT net.http_post(
    url     := 'https://ynoieryxfqiqjscqieum.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
                 'Content-Type',      'application/json',
                 'X-Internal-Secret', (SELECT decrypted_secret
                                         FROM vault.decrypted_secrets
                                        WHERE name = 'internal_function_secret')
               ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $cmd$
);

COMMIT;

-- ============================================================
-- VÉRIFICATION (lecture seule) — le job est déclaré et actif.
-- Lire aussi `command` : il doit contenir le SELECT sur vault, PAS le secret.
-- ============================================================
SELECT jobid,
       jobname,
       schedule,
       active,
       database,
       username,
       command
FROM cron.job
WHERE jobname = 'drain-email-log';

-- ============================================================
-- EXPLOITATION — à garder sous la main.
--
-- 1. EST-CE QUE ÇA TOURNE ? (10 dernières exécutions du job)
--    status = 'succeeded' veut dire « la commande SQL a réussi », c'est-à-dire
--    « la requête HTTP a été MISE EN FILE » — pas « l'email est parti ». C'est la
--    contrepartie du fire-and-forget.
--
--      SELECT d.runid, d.start_time, d.status, d.return_message
--      FROM cron.job_run_details d
--      JOIN cron.job j ON j.jobid = d.jobid
--      WHERE j.jobname = 'drain-email-log'
--      ORDER BY d.start_time DESC
--      LIMIT 10;
--
-- 2. EST-CE QUE send-email RÉPOND ? (ce que pg_net a reçu en retour)
--    C'est ICI qu'on voit un 401 (secret faux/absent) ou un 500. pg_net purge
--    cette table au bout de quelques heures : regarder frais.
--
--      SELECT id, status_code, content, created
--      FROM net._http_response
--      ORDER BY created DESC
--      LIMIT 10;
--
--    Attendu : 200 avec { ok, traites, envoyes, echoues }. Un 401 = le secret
--    lu dans Vault ne correspond plus à INTERNAL_FUNCTION_SECRET côté fonction.
--
-- 3. EST-CE QUE LA FILE SE VIDE ? (la seule preuve qui compte vraiment)
--
--      SELECT statut, count(*), max(tentatives)
--      FROM public.email_log
--      GROUP BY statut;
--
--    Une ligne bloquée en 'echoue' avec tentatives = 5 ne sera PLUS reprise
--    (borne volontaire) : lire sa derniere_erreur avant de décider quoi que ce
--    soit. Pour la rejouer une fois le problème corrigé :
--      UPDATE public.email_log SET statut = 'en_attente', tentatives = 0
--       WHERE id = '<uuid>';
--
-- 4. COUPER EN URGENCE — deux gestes, selon l'intention.
--
--    a) PAUSE (garde la définition, reprend d'un UPDATE) — à préférer :
--         UPDATE cron.job SET active = false WHERE jobname = 'drain-email-log';
--       Reprise :
--         UPDATE cron.job SET active = true  WHERE jobname = 'drain-email-log';
--
--    b) SUPPRESSION (efface le job ; il faudra rejouer cette migration) :
--         SELECT cron.unschedule('drain-email-log');
--
--    Dans les deux cas, RIEN n'est perdu : les lignes email_log restent en file
--    et repartiront à la reprise. Couper le drain retarde des emails, ne les
--    détruit pas.
-- ============================================================
