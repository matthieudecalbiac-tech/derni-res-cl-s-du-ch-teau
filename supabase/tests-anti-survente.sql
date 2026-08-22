-- ============================================================
-- LCC — TEST de la contrainte anti-survente
-- ============================================================
--
-- À lancer APRÈS `migrations/2026-08-22-anti-survente.sql`, dans le SQL Editor.
--
-- ⚠⚠ CE TEST ÉCRIT VRAIMENT DANS `reservations`, PUIS SE NETTOIE PAR `DELETE`.
--
-- La première version encadrait tout d'un `BEGIN … ROLLBACK` — rien n'aurait
-- survécu. Le SQL Editor de Supabase enveloppe déjà ses instructions dans sa
-- propre transaction : un `BEGIN` explicite n'y ouvre pas de niveau imbriqué, et
-- le `ROLLBACK` emportait la table TEMP des résultats avec le reste. Faute de
-- SAVEPOINT utilisable, le nettoyage se fait donc par suppression CIBLÉE.
--
-- ⚠ À N'EXÉCUTER QU'EN CONNAISSANCE DE CAUSE. Le `DELETE` final ne vise que les
-- lignes de ce test, reconnaissables à leurs dates très lointaines (J+400 et
-- au-delà) ET à leur chambre. Il ne peut pas atteindre une vraie réservation —
-- mais c'est une suppression dans une table de production, et cela se sait.
--
-- ── CE QU'IL PROUVE, ET POURQUOI LES DEUX SENS ─────────────────────────────
--
-- Une contrainte TROP LARGE rejetterait tout et passerait quand même le test de
-- rejet. Les cas qui doivent PASSER comptent donc autant que celui qui doit
-- échouer — les tests 3 et 5 sont les plus révélateurs :
--
--   1  chevauchement, même chambre, 2 × confirmed      -> REJET 23P01
--   2  plages disjointes, même chambre                 -> OK
--   3  départ J = arrivée J, même chambre              -> OK  ⚠ la borne '[)'
--   4  mêmes dates, chambres DIFFÉRENTES               -> OK
--   5  chevauchement dont un `pending`                 -> OK  ⚠ le WHERE partiel
--   6  chevauchement dont un `cancelled`               -> OK  ⚠ statut non occupant
--
-- Sans le 3, une contrainte en '[]' passerait inaperçue et refuserait des
-- séjours valides. Sans le 5, une contrainte non partielle supprimerait
-- l'arbitrage du châtelain et gèlerait l'inventaire.
--
-- ── MÉTHODE, REPRISE DE `tests-rls.sql` ────────────────────────────────────
--
--   · `CREATE TEMP TABLE` + `INSERT` + `SELECT` final. ⚠ PAS de `RAISE NOTICE` :
--     invisible dans le SQL Editor du Dashboard.
--   · Chaque insertion attendue en échec est enveloppée `BEGIN … EXCEPTION`
--     (bloc PL/pgSQL, pas transaction) pour capter `23P01` sans tuer le bloc.
--
-- ⚠⚠ AVANT DE LANCER : remplacer les TROIS identifiants du bloc `DECLARE`.
--
--     SELECT c.id AS chambre_id, c.nom, ch.slug
--     FROM public.chambres c JOIN public.chateaux ch ON ch.id = c.chateau_id
--     ORDER BY ch.slug LIMIT 5;
--
--     SELECT id, email FROM public.users ORDER BY created_at LIMIT 1;
--
-- Prendre DEUX chambre_id DIFFÉRENTS (le test 4 en dépend) et un user_id
-- quelconque — il ne sert qu'à satisfaire la clé étrangère.
-- ⚠ Le `module_id` est résolu par le test lui-même (module 'A'), rien à faire.
-- ============================================================

DROP TABLE IF EXISTS anti_survente_results;
CREATE TEMP TABLE anti_survente_results (
  test_num    text,
  description text,
  result      text,
  verdict     text
);


DO $anti_survente$
DECLARE
  -- ⚠ REMPLACER CES TROIS VALEURS (cf. en-tête).
  chambre_a uuid := '00000000-0000-0000-0000-000000000000';  -- CHAMBRE_A
  chambre_b uuid := '11111111-1111-1111-1111-111111111111';  -- CHAMBRE_B (différente de A)
  membre    uuid := '22222222-2222-2222-2222-222222222222';  -- USER_ID

  module_a  uuid;
  -- Dates très lointaines : aucun risque de croiser une vraie réservation, et
  -- elles servent de MARQUEUR au nettoyage final.
  d1 date := (CURRENT_DATE + 400);
  d2 date := (CURRENT_DATE + 405);
  d3 date := (CURRENT_DATE + 410);
  borne date := (CURRENT_DATE + 390);   -- tout ce qui est au-delà appartient au test
BEGIN

  IF chambre_a = chambre_b THEN
    RAISE EXCEPTION 'SETUP FAIL — CHAMBRE_A et CHAMBRE_B doivent etre DIFFERENTES.';
  END IF;

  SELECT id INTO module_a FROM public.modules WHERE code = 'A' LIMIT 1;
  IF module_a IS NULL THEN
    SELECT id INTO module_a FROM public.modules ORDER BY code LIMIT 1;
  END IF;

  INSERT INTO anti_survente_results VALUES (
    'SETUP', 'module et bornes de dates',
    'module=' || coalesce(module_a::text, '(null)') || '  ' || d1 || ' / ' || d2 || ' / ' || d3,
    CASE WHEN module_a IS NULL THEN 'FAIL — aucun module, tests invalides' ELSE 'PASS' END
  );

  -- ══════════════════════════════════════════════════════════════════════
  -- La ligne de référence : un séjour CONFIRMÉ sur la chambre A, d1 -> d2.
  -- ══════════════════════════════════════════════════════════════════════
  INSERT INTO public.reservations
    (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status)
  VALUES (membre, chambre_a, module_a, d1, d2, 10000, 'confirmed');

  -- ── TEST 1 — chevauchement, même chambre, 2 × confirmed -> DOIT ÊTRE REJETÉ
  BEGIN
    INSERT INTO public.reservations
      (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status)
    VALUES (membre, chambre_a, module_a, d1 + 1, d2 + 1, 10000, 'confirmed');
    INSERT INTO anti_survente_results VALUES (
      '1', 'chevauchement meme chambre, 2x confirmed', 'ACCEPTE',
      'FAIL — LA SURVENTE EST POSSIBLE'
    );
  EXCEPTION
    WHEN exclusion_violation THEN
      INSERT INTO anti_survente_results VALUES (
        '1', 'chevauchement meme chambre, 2x confirmed', 'REJET 23P01', 'PASS'
      );
    WHEN OTHERS THEN
      INSERT INTO anti_survente_results VALUES (
        '1', 'chevauchement meme chambre, 2x confirmed', SQLSTATE || ' ' || SQLERRM, 'INVESTIGUER'
      );
  END;

  -- ── TEST 2 — plages DISJOINTES, même chambre -> DOIT PASSER
  BEGIN
    INSERT INTO public.reservations
      (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status)
    VALUES (membre, chambre_a, module_a, d2 + 1, d3, 10000, 'confirmed');
    INSERT INTO anti_survente_results VALUES (
      '2', 'plages disjointes, meme chambre', 'ACCEPTE', 'PASS'
    );
  EXCEPTION
    WHEN OTHERS THEN
      INSERT INTO anti_survente_results VALUES (
        '2', 'plages disjointes, meme chambre', SQLSTATE || ' ' || SQLERRM,
        'FAIL — la contrainte est TROP LARGE'
      );
  END;

  -- ── TEST 3 — départ J = arrivée J, même chambre -> DOIT PASSER
  -- ⚠ LE TEST DE LA BORNE '[)'. En '[]', ce cas serait refusé alors que la
  --   chambre est LIBRE le soir du départ.
  BEGIN
    INSERT INTO public.reservations
      (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status)
    VALUES (membre, chambre_a, module_a, d2, d2 + 1, 10000, 'confirmed');
    INSERT INTO anti_survente_results VALUES (
      '3', 'depart J = arrivee J (borne [) )', 'ACCEPTE', 'PASS'
    );
  EXCEPTION
    WHEN exclusion_violation THEN
      INSERT INTO anti_survente_results VALUES (
        '3', 'depart J = arrivee J (borne [) )', 'REJET 23P01',
        'FAIL — borne [] au lieu de [) : on refuse des sejours valides'
      );
    WHEN OTHERS THEN
      INSERT INTO anti_survente_results VALUES (
        '3', 'depart J = arrivee J (borne [) )', SQLSTATE || ' ' || SQLERRM, 'INVESTIGUER'
      );
  END;

  -- ── TEST 4 — mêmes dates, chambres DIFFÉRENTES -> DOIT PASSER
  BEGIN
    INSERT INTO public.reservations
      (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status)
    VALUES (membre, chambre_b, module_a, d1, d2, 10000, 'confirmed');
    INSERT INTO anti_survente_results VALUES (
      '4', 'memes dates, chambres differentes', 'ACCEPTE', 'PASS'
    );
  EXCEPTION
    WHEN OTHERS THEN
      INSERT INTO anti_survente_results VALUES (
        '4', 'memes dates, chambres differentes', SQLSTATE || ' ' || SQLERRM,
        'FAIL — la contrainte ignore chambre_id'
      );
  END;

  -- ── TEST 5 — chevauchement dont un `pending` -> DOIT PASSER
  -- ⚠ LE TEST DU `WHERE` PARTIEL, et de la décision produit qui le sous-tend :
  --   plusieurs demandes peuvent viser les mêmes dates, la CONFIRMATION tranche.
  BEGIN
    INSERT INTO public.reservations
      (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status)
    VALUES (membre, chambre_a, module_a, d1, d2, 10000, 'pending');
    INSERT INTO anti_survente_results VALUES (
      '5', 'chevauchement avec un pending', 'ACCEPTE', 'PASS'
    );
  EXCEPTION
    WHEN exclusion_violation THEN
      INSERT INTO anti_survente_results VALUES (
        '5', 'chevauchement avec un pending', 'REJET 23P01',
        'FAIL — pending occupe : arbitrage chatelain supprime, inventaire gelable'
      );
    WHEN OTHERS THEN
      INSERT INTO anti_survente_results VALUES (
        '5', 'chevauchement avec un pending', SQLSTATE || ' ' || SQLERRM, 'INVESTIGUER'
      );
  END;

  -- ── TEST 6 — chevauchement dont un `cancelled` -> DOIT PASSER
  BEGIN
    INSERT INTO public.reservations
      (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status,
       cancelled_at, cancellation_reason)
    VALUES (membre, chambre_a, module_a, d1, d2, 10000, 'cancelled', NOW(), 'test anti-survente');
    INSERT INTO anti_survente_results VALUES (
      '6', 'chevauchement avec un cancelled', 'ACCEPTE', 'PASS'
    );
  EXCEPTION
    WHEN exclusion_violation THEN
      INSERT INTO anti_survente_results VALUES (
        '6', 'chevauchement avec un cancelled', 'REJET 23P01',
        'FAIL — une resa annulee occupe encore la chambre'
      );
    WHEN OTHERS THEN
      -- ⚠ Une erreur ici vient probablement de `reservations_cancelled_coherent`
      --   (cancelled exige cancelled_at) et non de l'anti-survente.
      INSERT INTO anti_survente_results VALUES (
        '6', 'chevauchement avec un cancelled', SQLSTATE || ' ' || SQLERRM, 'INVESTIGUER'
      );
  END;

  -- ══════════════════════════════════════════════════════════════════════
  -- NETTOYAGE — suppression CIBLÉE des lignes de ce test.
  --
  -- ⚠ Trois garde-fous cumulés, pour qu'aucune vraie réservation ne puisse être
  -- atteinte : les deux chambres du test, ET une arrivée au-delà de J+390, ET
  -- l'utilisateur du test. Une réservation réelle à plus d'un an sur ces mêmes
  -- chambres et ce même compte serait nécessaire pour être touchée.
  -- ══════════════════════════════════════════════════════════════════════
  DELETE FROM public.reservations
   WHERE chambre_id IN (chambre_a, chambre_b)
     AND user_id = membre
     AND date_arrivee >= borne;

  INSERT INTO anti_survente_results VALUES (
    'CLEANUP', 'suppression ciblee des lignes de test',
    'chambres du test, user du test, arrivee >= ' || borne, 'PASS'
  );

END;
$anti_survente$;


-- ============================================================
-- RÉSULTATS — attendu : SETUP + les six tests + CLEANUP, tous en PASS.
-- ============================================================
SELECT test_num, description, result, verdict
FROM anti_survente_results
ORDER BY
  CASE test_num WHEN 'SETUP' THEN 0 WHEN 'CLEANUP' THEN 9 ELSE 1 END,
  test_num;


-- ============================================================
-- CONTRÔLE DE NETTOYAGE (lecture seule) — doit rendre 0 ligne.
-- ⚠ Si elle en rend, le DELETE n'a pas tout pris : supprimer à la main avant
-- de considérer le test comme terminé.
-- ============================================================
SELECT id, chambre_id, date_arrivee, date_depart, status
FROM public.reservations
WHERE date_arrivee >= (CURRENT_DATE + 390)
ORDER BY date_arrivee;
