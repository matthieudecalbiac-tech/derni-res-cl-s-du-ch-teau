-- ============================================================
-- LCC — TEST : capture P0003 + réparation du chemin « refuser »
-- ============================================================
--
-- À lancer APRÈS `migrations/2026-08-22-repondre-demande-anti-survente.sql`.
--
-- ⚠⚠ CE TEST ÉCRIT DANS `reservations` ET `email_log`, PUIS SE NETTOIE PAR
-- `DELETE` CIBLÉ. Pas de SAVEPOINT : le SQL Editor de Supabase enveloppe déjà
-- ses instructions dans sa propre transaction, si bien qu'un `ROLLBACK`
-- emporterait la table TEMP des résultats. À n'exécuter qu'en connaissance de
-- cause.
--
-- Le nettoyage vise DEUX tables — c'est nouveau par rapport à
-- `tests-anti-survente.sql` : la RPC écrit une ligne d'outbox à l'étape 7, et
-- l'oublier laisserait des emails en attente qui PARTIRAIENT au prochain drain
-- (`drain-email-log`, toutes les 2 min). ⚠ On supprime donc email_log AVANT
-- reservations : la FK est en ON DELETE SET NULL côté email_log, un ordre
-- inverse laisserait des orphelines invisibles au filtre.
--
-- ── CE QU'IL PROUVE ────────────────────────────────────────────────────────
--
--   1  accepter une demande dont les dates sont prises  -> P0003 (pas 23P01 brut)
--   2  aucune ligne email_log n'a été écrite            -> pas de demi-état
--   3  la demande est restée `pending`                  -> rien n'a bougé
--   4  refuser une demande chevauchante                 -> `cancelled`
--                                                       + cancelled_at posé
--                                                       + outbox `sejour_refuse`
--   5  accepter une demande SANS conflit                -> OK + email_log écrite
--
-- ⚠ LES TESTS 4 ET 5 COMPTENT AUTANT QUE LE 1. Une capture trop large casserait
-- le chemin « refuser » (que la contrainte ne peut pas déclencher) ou le chemin
-- nominal. Le 1 seul ne prouverait pas qu'on n'a rien cassé.
--
-- ── ⚠ LE TEST 4 A TROUVÉ AUTRE CHOSE QUE CE QU'IL CHERCHAIT ────────────────
--
-- Écrit pour vérifier que la capture P0003 ne débordait pas sur le refus, il a
-- révélé que **le chemin « refuser » n'avait jamais fonctionné** : la RPC posait
-- `status = 'cancelled'` sans `cancelled_at`, ce que
-- `reservations_cancelled_coherent` refuse (23514). Depuis le 21 juillet, et
-- jamais vu parce qu'aucun châtelain n'avait encore refusé une demande.
--
-- Preuve décisive, mesurée en base : `SELECT count(*) FROM email_log WHERE
-- type = 'sejour_refuse'` rendait **0**, contre **2** pour `sejour_confirme`.
-- Ce type d'email n'est produit par aucune autre fonction.
--
-- ⚠ IL EST DONC MAINTENANT LE GARDIEN DE CETTE RÉPARATION, avec TROIS
-- assertions au lieu d'une :
--
--   status = 'cancelled'        le refus aboutit
--   cancelled_at IS NOT NULL    la réparation elle-même, nommée
--   1 outbox `sejour_refuse`    l'étape 7 du chemin refus
--
-- ⚠ LA TROISIÈME N'EST PAS DU ZÈLE. Le refus n'ayant jamais abouti, la branche
-- `v_type := 'sejour_refuse'` de l'étape 7 n'a JAMAIS ÉTÉ EXÉCUTÉE — ni en
-- production, ni ailleurs. Ce test est sa première exécution.
--
-- ⚠ `cancellation_reason` est AFFICHÉ mais n'est pas un critère de verdict
-- (arbitrage du 22 août) : le marqueur est une décision produit, pas un
-- invariant technique. Il reste visible dans la colonne `result` pour qu'une
-- disparition se voie.
--
-- ── ⚠ LE RÔLE `authenticated` NE TIENT QUE LE TEMPS DE L'APPEL RPC ─────────
--
-- La PREMIÈRE version de ce test posait `SET LOCAL ROLE 'authenticated'` une
-- fois pour toutes, puis lisait `email_log` au test 2. Elle est morte en
-- **42501 permission denied for table email_log** — et ce n'était PAS un défaut
-- du test : c'est le verrou du sous-audit D qui fonctionne. `email_log` porte
-- la RLS active et ZÉRO policy, réservée au backend en `service_role` ;
-- `authenticated` n'y a aucun droit, par conception.
--
-- ⚠ D'où la règle de ce fichier : **le rôle simulé n'enveloppe QUE l'appel à
-- `repondre_demande`**, qui en a besoin pour sa garde interne `is_chatelain_of`
-- (elle lit `auth.uid()`). Toutes les lectures de vérification — statut de la
-- demande, comptage d'`email_log` — se font APRÈS `RESET ROLE`, donc en
-- `postgres`, qui contourne la RLS.
--
-- ⚠ NE PAS « corriger » ce 42501 en ouvrant un droit à `authenticated` sur
-- `email_log`. Ce serait échanger un test contre un verrou de sécurité.
--
-- ⚠ La RPC, elle, écrit bien dans `email_log` : elle est SECURITY DEFINER et
-- s'exécute donc avec les droits de son propriétaire, pas ceux de l'appelant.
-- C'est exactement ce que les tests 4 et 5 vérifient.
--
-- ── IDENTIFIANTS (mesurés en base le 22 août) ──────────────────────────────
--
--   CHATELAIN  df85d3dc-58cb-4a9a-812c-ba74fe9d5260   proprio chateau-de-la-riviere
--   CHAMBRE    1ed578ec-8a78-4f1c-8a39-62e3ff4712be   une chambre de ce château
--   CLIENT     f5407c48-a0d4-4a2c-95e8-3b7fb809c994   compte client DISTINCT
--
-- ⚠ Le client n'est jamais le propriétaire : `is_chatelain_of` doit répondre vrai
-- pour le châtelain et la réservation appartenir au voyageur.
--
-- ⚠ `repondre_demande` est SECURITY DEFINER mais sa garde interne lit
-- `auth.uid()` : on simule donc l'identité du CHÂTELAIN par
-- `set_config('request.jwt.claims', …)`, comme pour la garde Club. Ce réglage
-- est posé UNE FOIS, hors de tout bloc à EXCEPTION — un bloc EXCEPTION ouvre
-- une sous-transaction, et un `set_config(…, true)` posé dedans serait annulé
-- avec elle. Le `SET LOCAL ROLE`, lui, est repris à chaque appel.
-- ============================================================

DROP TABLE IF EXISTS p0003_results;
CREATE TEMP TABLE p0003_results (
  test_num    text,
  description text,
  result      text,
  verdict     text
);
-- Filet : plus rien n'écrit cette table sous le rôle simulé (les INSERT de
-- verdict ont tous lieu en postgres), mais le GRANT ne coûte rien et évite un
-- 42501 sur la table de résultats elle-même si l'ordre venait à changer.
GRANT INSERT, SELECT ON p0003_results TO authenticated, anon;


DO $p0003$
DECLARE
  chatelain uuid := 'df85d3dc-58cb-4a9a-812c-ba74fe9d5260';
  chambre   uuid := '1ed578ec-8a78-4f1c-8a39-62e3ff4712be';
  client    uuid := 'f5407c48-a0d4-4a2c-95e8-3b7fb809c994';

  module_a  uuid;
  -- Dates très lointaines : marqueur du nettoyage, aucun risque de croiser une
  -- vraie réservation.
  d1 date := (CURRENT_DATE + 500);
  d2 date := (CURRENT_DATE + 505);
  d3 date := (CURRENT_DATE + 520);
  d4 date := (CURRENT_DATE + 525);
  borne date := (CURRENT_DATE + 490);

  id_pending_conflit uuid;
  id_pending_refus   uuid;
  id_pending_libre   uuid;
  n     int;
  st    public.reservation_status;
  ts    timestamptz;
  motif text;
BEGIN

  SELECT id INTO module_a FROM public.modules WHERE code = 'A' LIMIT 1;

  -- ══════════════════════════════════════════════════════════════════════
  -- SETUP — la réservation CONFIRMÉE qui occupe le créneau, puis trois
  -- demandes `pending` : une en conflit, une en conflit (pour le refus), une
  -- libre. Insérées en tant que postgres.
  -- ══════════════════════════════════════════════════════════════════════
  INSERT INTO public.reservations
    (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status)
  VALUES (client, chambre, module_a, d1, d2, 10000, 'confirmed');

  INSERT INTO public.reservations
    (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status)
  VALUES (client, chambre, module_a, d1 + 1, d2 + 1, 10000, 'pending')
  RETURNING id INTO id_pending_conflit;

  INSERT INTO public.reservations
    (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status)
  VALUES (client, chambre, module_a, d1 + 2, d2 + 2, 10000, 'pending')
  RETURNING id INTO id_pending_refus;

  INSERT INTO public.reservations
    (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status)
  VALUES (client, chambre, module_a, d3, d4, 10000, 'pending')
  RETURNING id INTO id_pending_libre;

  -- L'IDENTITÉ du châtelain, posée une fois pour toute la transaction.
  -- ⚠ On NE bascule PAS de rôle ici : `auth.uid()` lit ce réglage, pas le rôle
  --   courant. Le rôle `authenticated` ne sera endossé qu'autour des appels RPC.
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', chatelain, 'role', 'authenticated')::text,
                     true);

  INSERT INTO p0003_results VALUES (
    'SETUP', 'identite chatelain posee + 1 confirmed + 3 pending',
    'auth.uid()=' || coalesce(auth.uid()::text, '(null)'),
    CASE WHEN auth.uid() = chatelain THEN 'PASS' ELSE 'FAIL — identite non posee, tests invalides' END
  );

  -- ── TEST 1 — accepter une demande dont les dates sont prises -> P0003
  BEGIN
    SET LOCAL ROLE 'authenticated';
    PERFORM public.repondre_demande(id_pending_conflit, 'accepter');
    RESET ROLE;
    INSERT INTO p0003_results VALUES (
      '1', 'accepter une demande en conflit', 'ACCEPTE',
      'FAIL — la contrainte ne s est pas declenchee'
    );
  EXCEPTION
    WHEN sqlstate 'P0003' THEN
      RESET ROLE;
      INSERT INTO p0003_results VALUES (
        '1', 'accepter une demande en conflit', 'P0003 (traduit)', 'PASS'
      );
    WHEN exclusion_violation THEN
      RESET ROLE;
      INSERT INTO p0003_results VALUES (
        '1', 'accepter une demande en conflit', '23P01 BRUT',
        'FAIL — la capture n a pas pris : le chatelain verrait l erreur Postgres'
      );
    WHEN OTHERS THEN
      RESET ROLE;
      INSERT INTO p0003_results VALUES (
        '1', 'accepter une demande en conflit', SQLSTATE || ' ' || SQLERRM, 'INVESTIGUER'
      );
  END;

  -- ── TEST 2 — aucune ligne email_log pour cette demande -> pas de demi-état
  -- ⚠ LECTURE EN POSTGRES, OBLIGATOIREMENT. Sous `authenticated`, ce SELECT
  --   meurt en 42501 : email_log est verrouillée (RLS + 0 policy, cf. en-tête).
  SELECT count(*) INTO n FROM public.email_log WHERE reservation_id = id_pending_conflit;
  INSERT INTO p0003_results VALUES (
    '2', 'aucune email_log pour la demande refusee par la contrainte',
    n || ' ligne(s)',
    CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL — DEMI-ETAT : outbox ecrite malgre l echec' END
  );

  -- ── TEST 3 — la demande est restée `pending`
  SELECT status INTO st FROM public.reservations WHERE id = id_pending_conflit;
  INSERT INTO p0003_results VALUES (
    '3', 'la demande en conflit est restee traitable', st::text,
    CASE WHEN st = 'pending' THEN 'PASS' ELSE 'FAIL — le statut a bouge malgre l echec' END
  );

  -- ── TEST 4 — REFUSER : le chemin réparé, sous ses TROIS aspects
  --
  -- ⚠ `cancelled` n'entre pas dans le WHERE de la contrainte anti-survente :
  --   refuser ne peut pas lever 23P01. Ce test prouve donc AUSSI que la capture
  --   P0003 n'a pas débordé — c'était son rôle d'origine.
  --
  -- ⚠ ET IL GARDE LA RÉPARATION : sans `cancelled_at`, cet appel meurt en 23514
  --   (`reservations_cancelled_coherent`). C'est ce qu'il faisait avant le
  --   22 août, et depuis le 21 juillet.
  BEGIN
    SET LOCAL ROLE 'authenticated';
    PERFORM public.repondre_demande(id_pending_refus, 'refuser');
    RESET ROLE;
    SELECT status, cancelled_at, cancellation_reason
      INTO st, ts, motif
      FROM public.reservations WHERE id = id_pending_refus;
    SELECT count(*) INTO n
      FROM public.email_log
     WHERE reservation_id = id_pending_refus AND type = 'sejour_refuse';
    INSERT INTO p0003_results VALUES (
      '4', 'refuser : statut + cancelled_at + outbox sejour_refuse',
      st::text
        || ' · cancelled_at ' || CASE WHEN ts IS NULL THEN 'ABSENT' ELSE 'pose' END
        || ' · ' || n || ' sejour_refuse'
        || ' · motif=' || COALESCE(motif, '(null)'),
      CASE
        WHEN st = 'cancelled' AND ts IS NOT NULL AND n = 1 THEN 'PASS'
        WHEN st = 'cancelled' AND ts IS NULL      THEN 'FAIL — cancelled_at absent'
        WHEN st = 'cancelled' AND n <> 1          THEN 'FAIL — ETAPE 7 chemin refus : outbox absente ou doublee'
        ELSE 'FAIL — statut inattendu, chemin refuser casse'
      END
    );
  EXCEPTION
    WHEN sqlstate '23514' THEN
      -- La signature EXACTE du defaut repare le 22 aout. Nommee a part pour
      -- qu'une regression se lise d'un coup d'oeil.
      RESET ROLE;
      INSERT INTO p0003_results VALUES (
        '4', 'refuser : statut + cancelled_at + outbox sejour_refuse',
        '23514 ' || SQLERRM,
        'FAIL — REGRESSION : la reparation cancelled_at a disparu'
      );
    WHEN OTHERS THEN
      RESET ROLE;
      INSERT INTO p0003_results VALUES (
        '4', 'refuser : statut + cancelled_at + outbox sejour_refuse',
        SQLSTATE || ' ' || SQLERRM,
        'FAIL — le chemin refuser est casse'
      );
  END;

  -- ── TEST 5 — accepter une demande SANS conflit -> OK + email_log écrite
  -- ⚠ LE TEST DU CHEMIN NOMINAL. Si l'etape 7 avait disparu (piege des deux
  --   migrations coexistantes), c'est ici qu'on le verrait.
  -- ⚠ La RPC est SECURITY DEFINER : ELLE peut ecrire email_log sous le rôle
  --   `authenticated`. C'est la LECTURE de verification qui ne le peut pas —
  --   d'où le RESET ROLE avant les deux SELECT.
  BEGIN
    SET LOCAL ROLE 'authenticated';
    PERFORM public.repondre_demande(id_pending_libre, 'accepter');
    RESET ROLE;
    SELECT status, cancelled_at INTO st, ts
      FROM public.reservations WHERE id = id_pending_libre;
    SELECT count(*) INTO n FROM public.email_log WHERE reservation_id = id_pending_libre;
    INSERT INTO p0003_results VALUES (
      '5', 'accepter sans conflit (+ outbox etape 7)',
      st::text || ' · ' || n || ' email_log'
        || ' · cancelled_at ' || CASE WHEN ts IS NULL THEN 'NULL (attendu)' ELSE 'POSE — anormal' END,
      CASE WHEN st = 'confirmed' AND n = 1 AND ts IS NULL THEN 'PASS'
           WHEN st = 'confirmed' AND n = 0 THEN 'FAIL — ETAPE 7 PERDUE : plus d outbox'
           WHEN st = 'confirmed' AND ts IS NOT NULL THEN 'FAIL — cancelled_at pose sur une acceptation'
           ELSE 'FAIL — chemin nominal casse' END
    );
  EXCEPTION
    WHEN OTHERS THEN
      RESET ROLE;
      INSERT INTO p0003_results VALUES (
        '5', 'accepter sans conflit', SQLSTATE || ' ' || SQLERRM,
        'FAIL — le chemin nominal est casse'
      );
  END;

  -- ══════════════════════════════════════════════════════════════════════
  -- NETTOYAGE — les DEUX tables, email_log EN PREMIER.
  -- ⚠ Une outbox oubliee PARTIRAIT au prochain drain (toutes les 2 min) : le
  --   client de test recevrait un vrai email pour un sejour qui n'existe pas.
  -- ⚠ Le test 4 en produit une lui aussi desormais (sejour_refuse) — elle est
  --   couverte, id_pending_refus est bien dans la liste.
  -- ══════════════════════════════════════════════════════════════════════
  RESET ROLE;

  DELETE FROM public.email_log
   WHERE reservation_id IN (id_pending_conflit, id_pending_refus, id_pending_libre);

  DELETE FROM public.reservations
   WHERE chambre_id = chambre
     AND user_id = client
     AND date_arrivee >= borne;

  INSERT INTO p0003_results VALUES (
    'CLEANUP', 'suppression ciblee email_log puis reservations',
    'chambre du test, client du test, arrivee >= ' || borne, 'PASS'
  );

END;
$p0003$;


-- ============================================================
-- RÉSULTATS — attendu : SETUP + les cinq tests + CLEANUP, tous en PASS.
-- ============================================================
SELECT test_num, description, result, verdict
FROM p0003_results
ORDER BY
  CASE test_num WHEN 'SETUP' THEN 0 WHEN 'CLEANUP' THEN 9 ELSE 1 END,
  test_num;


-- ============================================================
-- CONTRÔLE DE NETTOYAGE (lecture seule) — les deux doivent rendre 0 ligne.
-- ⚠ Si `email_log` en rend, SUPPRIMER À LA MAIN AVANT LE PROCHAIN DRAIN
--    (`drain-email-log` tourne toutes les 2 minutes).
-- ============================================================
SELECT 'reservations' AS table_, id::text, date_arrivee::text, status::text
FROM public.reservations WHERE date_arrivee >= (CURRENT_DATE + 490)
UNION ALL
SELECT 'email_log', e.id::text, e.created_at::text, e.statut
FROM public.email_log e
LEFT JOIN public.reservations r ON r.id = e.reservation_id
WHERE r.id IS NULL AND e.created_at > NOW() - interval '10 minutes';
