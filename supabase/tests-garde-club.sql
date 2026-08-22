-- ═══════════════════════════════════════════════════════════════════════════
-- LCC — TEST de la garde sur les deux fonctions Club
-- ═══════════════════════════════════════════════════════════════════════════
--
-- À lancer APRÈS `migrations/2026-08-22-garde-fonctions-club.sql`, dans le
-- SQL Editor du Dashboard Supabase.
--
-- Il PROUVE les deux sens — c'est un correctif de sécurité, un test qui ne
-- vérifierait que le cas nominal ne prouverait rien :
--
--   · un membre lit SON compte et SON palier          → PASS attendu
--   · le MÊME membre vise un AUTRE user_id            → REJET 42501 attendu
--   · un anonyme appelle les fonctions                → REJET attendu
--     (il recevait auparavant 0 / palier « Hôte » EN SILENCE)
--
-- ── MÉTHODE, REPRISE DE `tests-rls.sql` (ne pas réinventer) ─────────────────
--
--   · `CREATE TEMP TABLE` + `INSERT` + `SELECT` final. ⚠ PAS de `RAISE NOTICE` :
--     il est INVISIBLE dans le SQL Editor du Dashboard (leçon Sprint S1 Phase 5).
--   · `GRANT` sur la table temp aux rôles utilisés, sinon 42501 sur la table de
--     tests elle-même.
--   · Chaque appel attendu en échec est enveloppé `BEGIN … EXCEPTION` pour
--     capter le 42501 sans tuer le bloc.
--
-- ── CE QUI CHANGE PAR RAPPORT À `tests-rls.sql` ────────────────────────────
--
-- Là-bas on ne simulait qu'un RÔLE (`SET LOCAL ROLE 'anon'`). Ici il faut aussi
-- une IDENTITÉ : `auth.uid()` lit `request.jwt.claims ->> 'sub'`. On la pose donc
-- par `set_config('request.jwt.claims', …, true)` — le `true` limite la portée à
-- la transaction, comme `SET LOCAL`.
--
-- ⚠⚠ AVANT DE LANCER : remplacer les deux UUID ci-dessous par de VRAIS user_id
-- de la base. Les obtenir par :
--
--     SELECT id, email, role FROM public.users ORDER BY created_at LIMIT 5;
--
-- Prendre deux id DIFFÉRENTS. Idéalement, MEMBRE_A = le membre à 3 séjours
-- confirmés (le test 1 rendra alors 3, ce qui prouve que le corps métier n'a
-- pas bougé) et MEMBRE_B = n'importe quel autre.
--
-- ⚠ Les deux UUID se remplacent À UN SEUL ENDROIT : le bloc `DECLARE` ci-dessous,
-- lignes marquées « MEMBRE_A » et « MEMBRE_B ». Pas de `\set` ici — c'est une
-- commande psql, que le SQL Editor du Dashboard ne comprend pas : elle ferait
-- échouer le Run avant le premier test.
-- ═══════════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS garde_club_results;
CREATE TEMP TABLE garde_club_results (
  test_num    text,
  description text,
  result      text,
  verdict     text
);

-- Les tests basculent en 'authenticated' puis en 'anon' : les deux doivent
-- pouvoir écrire dans la table de collecte, sinon le test échoue sur lui-même.
GRANT INSERT, SELECT ON garde_club_results TO authenticated, anon;


DO $garde_tests$
DECLARE
  -- ⚠ REMPLACER CES DEUX VALEURS (cf. en-tête).
  membre_a uuid := '00000000-0000-0000-0000-000000000000';  -- MEMBRE_A
  membre_b uuid := '11111111-1111-1111-1111-111111111111';  -- MEMBRE_B
  n        int;
  pal      public.paliers;
  uid_vu   uuid;
BEGIN

  IF membre_a = membre_b THEN
    RAISE EXCEPTION 'SETUP FAIL — MEMBRE_A et MEMBRE_B doivent etre DIFFERENTS.';
  END IF;

  -- ═════════════════════════════════════════════════════════════════════════
  -- PARTIE 1 — LE MEMBRE A, SUR SES PROPRES DONNÉES  (doit PASSER)
  -- ═════════════════════════════════════════════════════════════════════════
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', membre_a, 'role', 'authenticated')::text,
                     true);
  SET LOCAL ROLE 'authenticated';

  uid_vu := auth.uid();
  INSERT INTO garde_club_results VALUES (
    'SETUP', 'auth.uid() vu par la base', coalesce(uid_vu::text, '(null)'),
    CASE WHEN uid_vu = membre_a THEN 'PASS' ELSE 'FAIL — identite non posee, tests invalides' END
  );

  -- TEST 1 — son propre compteur
  BEGIN
    n := public.count_sejours_confirmes(membre_a);
    INSERT INTO garde_club_results VALUES (
      '1', 'membre A -> count_sejours_confirmes(A)', n || ' sejour(s)', 'PASS'
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      INSERT INTO garde_club_results VALUES (
        '1', 'membre A -> count_sejours_confirmes(A)', 'ERREUR 42501',
        'FAIL — la garde bloque le proprietaire, le Club est casse'
      );
    WHEN OTHERS THEN
      INSERT INTO garde_club_results VALUES (
        '1', 'membre A -> count_sejours_confirmes(A)', SQLSTATE || ' ' || SQLERRM, 'INVESTIGUER'
      );
  END;

  -- TEST 2 — son propre palier (exerce AUSSI l'appel imbriqué vers la fonction
  -- gardée ci-dessus : si l'imbrication se bloquait elle-même, ce test le dirait)
  BEGIN
    pal := public.palier_du_membre(membre_a);
    INSERT INTO garde_club_results VALUES (
      '2', 'membre A -> palier_du_membre(A) [+ appel imbrique]',
      coalesce(pal.nom, '(aucun palier)'), 'PASS'
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      INSERT INTO garde_club_results VALUES (
        '2', 'membre A -> palier_du_membre(A)', 'ERREUR 42501',
        'FAIL — la garde bloque le proprietaire, le Club est casse'
      );
    WHEN OTHERS THEN
      INSERT INTO garde_club_results VALUES (
        '2', 'membre A -> palier_du_membre(A)', SQLSTATE || ' ' || SQLERRM, 'INVESTIGUER'
      );
  END;

  -- ═════════════════════════════════════════════════════════════════════════
  -- PARTIE 2 — LE MÊME MEMBRE, SUR LES DONNÉES D'UN AUTRE  (doit ÊTRE REJETÉ)
  -- ⚠ C'est LE test du correctif. Avant la migration, les deux rendaient une
  --   valeur — c'était la fuite.
  -- ═════════════════════════════════════════════════════════════════════════

  -- TEST 3
  BEGIN
    n := public.count_sejours_confirmes(membre_b);
    INSERT INTO garde_club_results VALUES (
      '3', 'membre A -> count_sejours_confirmes(B)', n || ' sejour(s) LU',
      'FAIL — LA FUITE EST OUVERTE'
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      INSERT INTO garde_club_results VALUES (
        '3', 'membre A -> count_sejours_confirmes(B)', 'ERREUR 42501 (garde)', 'PASS'
      );
    WHEN OTHERS THEN
      INSERT INTO garde_club_results VALUES (
        '3', 'membre A -> count_sejours_confirmes(B)', SQLSTATE || ' ' || SQLERRM, 'INVESTIGUER'
      );
  END;

  -- TEST 4
  BEGIN
    pal := public.palier_du_membre(membre_b);
    INSERT INTO garde_club_results VALUES (
      '4', 'membre A -> palier_du_membre(B)', coalesce(pal.nom, '(null)') || ' LU',
      'FAIL — LA FUITE EST OUVERTE'
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      INSERT INTO garde_club_results VALUES (
        '4', 'membre A -> palier_du_membre(B)', 'ERREUR 42501 (garde)', 'PASS'
      );
    WHEN OTHERS THEN
      INSERT INTO garde_club_results VALUES (
        '4', 'membre A -> palier_du_membre(B)', SQLSTATE || ' ' || SQLERRM, 'INVESTIGUER'
      );
  END;

  -- ═════════════════════════════════════════════════════════════════════════
  -- PARTIE 3 — L'ANONYME  (doit ÊTRE REJETÉ)
  -- Avant la migration, il recevait 0 / « Hote » EN SILENCE : ni erreur, ni
  -- indice qu'il n'aurait pas dû appeler.
  -- ⚠ Le rejet peut venir du GRANT retiré (42501 avant même la garde) OU de la
  --   garde (auth.uid() est NULL, donc NULL = p_user_id est faux). Les deux sont
  --   des PASS : c'est la défense en profondeur qui joue.
  -- ═════════════════════════════════════════════════════════════════════════
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', NULL, true);
  SET LOCAL ROLE 'anon';

  -- TEST 5
  BEGIN
    n := public.count_sejours_confirmes(membre_a);
    INSERT INTO garde_club_results VALUES (
      '5', 'anon -> count_sejours_confirmes(A)', n || ' sejour(s) LU',
      'FAIL — anon lit encore'
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      INSERT INTO garde_club_results VALUES (
        '5', 'anon -> count_sejours_confirmes(A)', 'ERREUR 42501 (GRANT ou garde)', 'PASS'
      );
    WHEN OTHERS THEN
      INSERT INTO garde_club_results VALUES (
        '5', 'anon -> count_sejours_confirmes(A)', SQLSTATE || ' ' || SQLERRM, 'INVESTIGUER'
      );
  END;

  -- TEST 6
  BEGIN
    pal := public.palier_du_membre(membre_a);
    INSERT INTO garde_club_results VALUES (
      '6', 'anon -> palier_du_membre(A)', coalesce(pal.nom, '(null)') || ' LU',
      'FAIL — anon lit encore'
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      INSERT INTO garde_club_results VALUES (
        '6', 'anon -> palier_du_membre(A)', 'ERREUR 42501 (GRANT ou garde)', 'PASS'
      );
    WHEN OTHERS THEN
      INSERT INTO garde_club_results VALUES (
        '6', 'anon -> palier_du_membre(A)', SQLSTATE || ' ' || SQLERRM, 'INVESTIGUER'
      );
  END;

  RESET ROLE;
END;
$garde_tests$;


-- ═══════════════════════════════════════════════════════════════════════════
-- RÉSULTATS — attendu : 6 PASS + le SETUP. Tout autre verdict est un échec.
-- ═══════════════════════════════════════════════════════════════════════════
SELECT test_num, description, result, verdict
FROM garde_club_results
ORDER BY
  CASE WHEN test_num = 'SETUP' THEN 0 ELSE 1 END,
  test_num;
