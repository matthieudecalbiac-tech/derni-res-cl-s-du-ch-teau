-- ═══════════════════════════════════════════════════════════════════════════
-- tests-rls.sql — Tests smoke RLS Supabase Sprint S1-δ Phase 5
-- ═══════════════════════════════════════════════════════════════════════════
-- À exécuter dans Supabase Dashboard SQL Editor :
--   https://supabase.com/dashboard/project/ynoieryxfqiqjscqieum/sql/new
-- Copier-coller le contenu, puis cliquer Run.
--
-- MÉTHODE
--   - CREATE TEMP TABLE rls_test_results pour collecter les résultats
--   - Single DO block en transaction implicite (rollback auto si erreur fatale)
--   - SET LOCAL ROLE 'anon' au début → toutes les requêtes héritent
--   - Chaque test fait INSERT INTO rls_test_results (au lieu de RAISE NOTICE
--     qui est invisible dans le SQL Editor Supabase Dashboard)
--   - SELECT final affiche les ~22 lignes dans le panneau Results
--   - **TOUS les SELECT et INSERT sur tables privées sont wrappés
--     BEGIN/EXCEPTION** pour catcher 42501 (insufficient_privilege) sans
--     tuer le DO block.
--   - C'est la sécurité défensive à 2 niveaux (GRANT + RLS) qui fait que
--     anon obtient une erreur 42501 au lieu d'un SELECT 0 rows silencieux
--     pour les tables privées. Le test PASS si l'erreur 42501 est levée.
--
-- COUVERTURE — 11 tests RLS pour Sprint S1
--   - Lecture publique OK (1-4)         : chateaux, chambres, modules, offres
--   - Lecture privée bloquée (5, 6, 9)  : reservations, users, chateau_modules
--   - Écriture bloquée par erreur (7,8) : chateaux, reservations
--   - Vue publique bypass RLS (10)      : chateau_modules_public
--   - Loop filet de sécurité (11)       : 6 tables publiques + 6 privées
--
-- TESTS RÉSERVÉS S2 (nécessitent Auth Phase 3)
--   - Isolation client : voit ses résas, pas celles d'autres users
--   - Création autonome : authenticated INSERT reservation OK
--   - Châtelain : SELECT chateau_modules privé avec commission
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE TEMP POUR COLLECTER LES RÉSULTATS
-- ═══════════════════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS rls_test_results;
CREATE TEMP TABLE rls_test_results (
  test_num    text,        -- "1", "2", ..., "10", "11.a-chateaux", "11.b-reservations"
  description text,         -- "anon SELECT chateaux"
  result      text,         -- "8 rows" ou "ERREUR 42501"
  verdict     text          -- "PASS", "FAIL", "INVESTIGUER", "INFO"
);

-- Donner les droits INSERT/SELECT à anon sur la table temp
-- (sinon erreur 42501 quand on bascule en role anon plus bas).
-- Sans risque sécurité : TEMP TABLE = scope session, jamais exposée à l'API.
GRANT INSERT, SELECT ON rls_test_results TO anon;


DO $rls_tests$
DECLARE
  cnt integer;
  current_role_check text;
BEGIN
  -- ───────────────────────────────────────────────────────────────────────
  -- SETUP — Bascule role 'anon' pour toute la durée de cette transaction
  -- ───────────────────────────────────────────────────────────────────────
  SET LOCAL ROLE 'anon';
  current_role_check := current_setting('role');

  INSERT INTO rls_test_results VALUES (
    'SETUP', 'role check', current_role_check,
    CASE WHEN current_role_check = 'anon' THEN 'PASS' ELSE 'FAIL' END
  );

  IF current_role_check <> 'anon' THEN
    RAISE EXCEPTION 'SETUP FAIL — role n''est pas anon (=%). Tests invalides.', current_role_check;
  END IF;


  -- ───────────────────────────────────────────────────────────────────────
  -- TEST 1 — anon SELECT chateaux (attendu : 8 rows, lecture publique)
  -- ───────────────────────────────────────────────────────────────────────
  SELECT count(*) INTO cnt FROM public.chateaux;
  INSERT INTO rls_test_results VALUES (
    '1', 'anon SELECT chateaux', cnt || ' rows (attendu 8)',
    CASE WHEN cnt = 8 THEN 'PASS' ELSE 'FAIL' END
  );


  -- ───────────────────────────────────────────────────────────────────────
  -- TEST 2 — anon SELECT chambres (attendu : 23 rows, lecture publique)
  -- ───────────────────────────────────────────────────────────────────────
  SELECT count(*) INTO cnt FROM public.chambres;
  INSERT INTO rls_test_results VALUES (
    '2', 'anon SELECT chambres', cnt || ' rows (attendu 23)',
    CASE WHEN cnt = 23 THEN 'PASS' ELSE 'FAIL' END
  );


  -- ───────────────────────────────────────────────────────────────────────
  -- TEST 3 — anon SELECT modules (attendu : 4 rows, référentiel public)
  -- ───────────────────────────────────────────────────────────────────────
  SELECT count(*) INTO cnt FROM public.modules;
  INSERT INTO rls_test_results VALUES (
    '3', 'anon SELECT modules', cnt || ' rows (attendu 4)',
    CASE WHEN cnt = 4 THEN 'PASS' ELSE 'FAIL' END
  );


  -- ───────────────────────────────────────────────────────────────────────
  -- TEST 4 — anon SELECT offres visibles (attendu : 1+ row, Briottières
  -- Module B visible=true requires_role=NULL)
  -- ───────────────────────────────────────────────────────────────────────
  SELECT count(*) INTO cnt FROM public.offres;
  INSERT INTO rls_test_results VALUES (
    '4', 'anon SELECT offres', cnt || ' rows (attendu 1, Briottières Module B)',
    CASE WHEN cnt >= 1 THEN 'PASS' ELSE 'FAIL' END
  );


  -- ───────────────────────────────────────────────────────────────────────
  -- TEST 5 — anon SELECT reservations
  -- Sécurité défensive 2 niveaux : GRANT bloque AVANT que RLS ne s'exécute.
  -- Attendu : ERREUR 42501 OU 0 rows.
  -- ───────────────────────────────────────────────────────────────────────
  BEGIN
    SELECT count(*) INTO cnt FROM public.reservations;
    INSERT INTO rls_test_results VALUES (
      '5', 'anon SELECT reservations', cnt || ' rows (silencieux)',
      CASE WHEN cnt = 0 THEN 'PASS' ELSE 'FAIL' END
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      INSERT INTO rls_test_results VALUES (
        '5', 'anon SELECT reservations', 'ERREUR 42501 (GRANT bloque)', 'PASS'
      );
    WHEN OTHERS THEN
      INSERT INTO rls_test_results VALUES (
        '5', 'anon SELECT reservations', SQLSTATE || ' ' || SQLERRM, 'INVESTIGUER'
      );
  END;


  -- ───────────────────────────────────────────────────────────────────────
  -- TEST 6 — anon SELECT users
  -- Sécurité défensive 2 niveaux : GRANT bloque AVANT que RLS ne s'exécute.
  -- ───────────────────────────────────────────────────────────────────────
  BEGIN
    SELECT count(*) INTO cnt FROM public.users;
    INSERT INTO rls_test_results VALUES (
      '6', 'anon SELECT users', cnt || ' rows (silencieux)',
      CASE WHEN cnt = 0 THEN 'PASS' ELSE 'FAIL' END
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      INSERT INTO rls_test_results VALUES (
        '6', 'anon SELECT users', 'ERREUR 42501 (GRANT bloque)', 'PASS'
      );
    WHEN OTHERS THEN
      INSERT INTO rls_test_results VALUES (
        '6', 'anon SELECT users', SQLSTATE || ' ' || SQLERRM, 'INVESTIGUER'
      );
  END;


  -- ───────────────────────────────────────────────────────────────────────
  -- TEST 7 — anon INSERT chateaux (attendu : ERREUR 42501)
  -- ───────────────────────────────────────────────────────────────────────
  BEGIN
    INSERT INTO public.chateaux (nom, slug)
    VALUES ('rls-test-7', 'rls-test-7-slug-temporaire');
    INSERT INTO rls_test_results VALUES (
      '7', 'anon INSERT chateaux', 'SUCCÈS (RLS cassée !)', 'FAIL'
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      INSERT INTO rls_test_results VALUES (
        '7', 'anon INSERT chateaux', 'ERREUR 42501', 'PASS'
      );
    WHEN OTHERS THEN
      INSERT INTO rls_test_results VALUES (
        '7', 'anon INSERT chateaux', SQLSTATE || ' ' || SQLERRM, 'INVESTIGUER'
      );
  END;


  -- ───────────────────────────────────────────────────────────────────────
  -- TEST 8 — anon INSERT reservations (attendu : ERREUR 42501)
  -- ───────────────────────────────────────────────────────────────────────
  BEGIN
    INSERT INTO public.reservations (
      user_id, chambre_id, module_id,
      date_arrivee, date_depart, prix_total_cents
    )
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
      '2026-12-01', '2026-12-03', 50000
    );
    INSERT INTO rls_test_results VALUES (
      '8', 'anon INSERT reservations', 'SUCCÈS (RLS cassée !)', 'FAIL'
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      INSERT INTO rls_test_results VALUES (
        '8', 'anon INSERT reservations', 'ERREUR 42501', 'PASS'
      );
    WHEN OTHERS THEN
      INSERT INTO rls_test_results VALUES (
        '8', 'anon INSERT reservations', SQLSTATE || ' ' || SQLERRM, 'INVESTIGUER'
      );
  END;


  -- ───────────────────────────────────────────────────────────────────────
  -- TEST 9 — anon SELECT chateau_modules direct
  -- Sécurité défensive 2 niveaux : GRANT exclut anon (authenticated only).
  -- ───────────────────────────────────────────────────────────────────────
  BEGIN
    SELECT count(*) INTO cnt FROM public.chateau_modules;
    INSERT INTO rls_test_results VALUES (
      '9', 'anon SELECT chateau_modules', cnt || ' rows (RLS cache 12 rows)',
      CASE WHEN cnt = 0 THEN 'PASS' ELSE 'FAIL' END
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      INSERT INTO rls_test_results VALUES (
        '9', 'anon SELECT chateau_modules', 'ERREUR 42501 (GRANT bloque)', 'PASS'
      );
    WHEN OTHERS THEN
      INSERT INTO rls_test_results VALUES (
        '9', 'anon SELECT chateau_modules', SQLSTATE || ' ' || SQLERRM, 'INVESTIGUER'
      );
  END;


  -- ───────────────────────────────────────────────────────────────────────
  -- TEST 10 — anon SELECT chateau_modules_public VUE (attendu : 12 rows)
  -- Vue avec security_invoker=false bypass RLS + GRANT SELECT à anon.
  -- ───────────────────────────────────────────────────────────────────────
  BEGIN
    SELECT count(*) INTO cnt FROM public.chateau_modules_public;
    INSERT INTO rls_test_results VALUES (
      '10', 'anon SELECT chateau_modules_public (vue)',
      cnt || ' rows (attendu 12, vue bypass RLS)',
      CASE WHEN cnt = 12 THEN 'PASS' ELSE 'FAIL' END
    );
  EXCEPTION
    WHEN OTHERS THEN
      INSERT INTO rls_test_results VALUES (
        '10', 'anon SELECT chateau_modules_public (vue)',
        SQLSTATE || ' ' || SQLERRM, 'INVESTIGUER'
      );
  END;


  -- ───────────────────────────────────────────────────────────────────────
  -- TEST 11.a — Filet sécurité : tables publiques (attendu : rows > 0)
  -- ───────────────────────────────────────────────────────────────────────
  DECLARE
    tbl text;
  BEGIN
    FOR tbl IN
      SELECT unnest(ARRAY[
        'chateaux',
        'chambres',
        'chateau_amenities',
        'chateau_timeline',
        'chateau_alentours',
        'modules'
      ])
    LOOP
      BEGIN
        EXECUTE format('SELECT count(*) FROM public.%I', tbl) INTO cnt;
        INSERT INTO rls_test_results VALUES (
          '11.a-' || tbl, '[PUBLIC] ' || tbl, cnt || ' rows',
          CASE WHEN cnt > 0 THEN 'PASS' ELSE 'FAIL' END
        );
      EXCEPTION
        WHEN OTHERS THEN
          INSERT INTO rls_test_results VALUES (
            '11.a-' || tbl, '[PUBLIC] ' || tbl,
            SQLSTATE || ' ' || SQLERRM, 'INVESTIGUER'
          );
      END;
    END LOOP;
  END;


  -- ───────────────────────────────────────────────────────────────────────
  -- TEST 11.b — Filet sécurité : tables privées (attendu : ERR 42501 ou 0 rows)
  -- ───────────────────────────────────────────────────────────────────────
  DECLARE
    tbl text;
  BEGIN
    FOR tbl IN
      SELECT unnest(ARRAY[
        'reservations',
        'users',
        'audit_log',
        'chateau_modules',
        'disponibilites',
        'chateau_owners'
      ])
    LOOP
      BEGIN
        EXECUTE format('SELECT count(*) FROM public.%I', tbl) INTO cnt;
        INSERT INTO rls_test_results VALUES (
          '11.b-' || tbl, '[PRIVÉ] ' || tbl, cnt || ' rows',
          CASE WHEN cnt = 0 THEN 'PASS' ELSE 'FAIL' END
        );
      EXCEPTION
        WHEN insufficient_privilege THEN
          INSERT INTO rls_test_results VALUES (
            '11.b-' || tbl, '[PRIVÉ] ' || tbl, 'ERR 42501', 'PASS'
          );
        WHEN OTHERS THEN
          INSERT INTO rls_test_results VALUES (
            '11.b-' || tbl, '[PRIVÉ] ' || tbl,
            SQLSTATE || ' ' || SQLERRM, 'INVESTIGUER'
          );
      END;
    END LOOP;
  END;

END $rls_tests$;


-- ═══════════════════════════════════════════════════════════════════════════
-- AFFICHER LES RÉSULTATS DANS LE PANNEAU RESULTS
-- ═══════════════════════════════════════════════════════════════════════════
SELECT
  test_num    AS "#",
  description AS "Test",
  result      AS "Résultat",
  verdict     AS "Verdict"
FROM rls_test_results
ORDER BY
  CASE
    WHEN test_num = 'SETUP' THEN 0
    WHEN test_num ~ '^[0-9]+$' THEN test_num::int
    WHEN test_num LIKE '11.a-%' THEN 1100
    WHEN test_num LIKE '11.b-%' THEN 1200
    ELSE 9999
  END,
  test_num;


-- ═══════════════════════════════════════════════════════════════════════════
-- INTERPRÉTATION DES RÉSULTATS
-- ═══════════════════════════════════════════════════════════════════════════
-- Reporter les ~22 lignes affichées dans le panneau Results vers
-- supabase/tests-rls-RESULTS.md (template).
--
-- Si un test FAIL : analyse cas par cas selon gravité (Q3 actée 9 mai 2026)
--   - Lecture privée accessible à anon (test 5/6/9 > 0)        : gravité HAUTE  → fix S1
--   - INSERT publique réussi (test 7/8 SUCCÈS)                 : gravité HAUTE  → fix S1
--   - Lecture publique vide ou erreur (test 1-4)               : gravité HAUTE  → fix S1
--   - Vue publique non lisible (test 10 = 0)                   : gravité HAUTE  → fix S1
--   - Edge case hypothétique sans impact prod                  : gravité BASSE  → note S5
-- ═══════════════════════════════════════════════════════════════════════════
