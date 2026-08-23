-- ============================================================
-- LCC — TEST : admin_upsert_chateau écrit dispo_geree, et n'a rien cassé
-- ============================================================
--
-- À lancer APRÈS `migrations/2026-08-23-dispo-geree.sql` (la colonne) puis
-- `migrations/2026-08-23-upsert-dispo-geree.sql` (la RPC).
--
-- ⚠⚠ CE TEST MODIFIE UN CHÂTEAU RÉEL, puis RESTAURE ses valeurs d'origine.
-- Il ne crée ni ne supprime aucune ligne — il n'y a donc rien à nettoyer, mais
-- il y a une restauration à vérifier. Pas de SAVEPOINT : le SQL Editor enveloppe
-- déjà ses instructions dans sa propre transaction, un ROLLBACK emporterait la
-- table TEMP des résultats.
--
-- ⚠ LA CIBLE EST UN BROUILLON — `vaux-le-vicomte`, non publié, donc invisible
-- des visiteurs (la policy `chateaux_select_public` filtre `statut = 'publie'`).
-- Même si la restauration échouait, aucun écran public n'en verrait la trace.
-- ⚠ Ne PAS pointer ce test sur un château publié « parce que c'est le même
-- code » : la différence est le rayon de la panne, pas le chemin exercé.
--
-- ── CE QU'IL PROUVE ────────────────────────────────────────────────────────
--
--   1  p_base avec dispo_geree:true       -> la colonne passe à true
--   2  p_base SANS dispo_geree            -> la valeur est PRÉSERVÉE
--                                           (contrat de fusion partielle)
--   3  un upsert ordinaire (nom) marche   -> on n'a pas cassé la fonction
--   4  les filles ne bougent pas          -> p_chambres omis = intouché
--   5  restauration des valeurs d'origine
--
-- ⚠ LE 2 EST LE CŒUR DU TEST, et il est contre-intuitif. `jsonb_populate_record`
-- ne « laisse pas tranquille » une colonne absente par magie : il repart de la
-- LIGNE EXISTANTE (`v_row`, lue en FOR UPDATE) et n'écrase que les clés
-- présentes. Si ce contrat se rompait, chaque sauvegarde d'un champ isolé
-- remettrait dispo_geree à false — et le châtelain verrait son calendrier se
-- désactiver tout seul.
--
-- ⚠ LE 3 ET LE 4 SONT LÀ PARCE QUE CETTE MIGRATION TOUCHE UNE FONCTION
-- CRITIQUE : l'upsert de TOUT château. Une ligne ajoutée au mauvais endroit, un
-- bloc fille amputé au copier-coller, et c'est l'admin entier qui casse. Le 1
-- seul ne prouverait rien de cela.
--
-- ── L'IDENTITÉ ADMIN ───────────────────────────────────────────────────────
--
-- `admin_upsert_chateau` est SECURITY DEFINER mais sa PREMIÈRE instruction est
-- `IF NOT public.is_admin()`, qui lit `auth.uid()`. On simule donc l'admin par
-- `set_config('request.jwt.claims', …)`, posé UNE FOIS hors de tout bloc à
-- EXCEPTION (un tel bloc ouvre une sous-transaction qui l'annulerait).
-- Le rôle `authenticated` n'est endossé qu'AUTOUR des appels RPC ; toutes les
-- lectures de vérification se font en `postgres`.
-- ============================================================

DROP TABLE IF EXISTS upsert_dispo_results;
CREATE TEMP TABLE upsert_dispo_results (
  test_num    text,
  description text,
  result      text,
  verdict     text
);
GRANT INSERT, SELECT ON upsert_dispo_results TO authenticated, anon;


DO $upsert$
DECLARE
  cible_slug constant text := 'vaux-le-vicomte';

  admin_id  uuid;
  cible_id  uuid;

  -- Valeurs d'origine, à restaurer en fin de test.
  orig_dispo boolean;
  orig_nom   text;

  nom_test  text;
  v_dispo   boolean;
  v_nom     text;
  n_avant   int;
  n_apres   int;
  ignore    uuid;
BEGIN

  SELECT id INTO admin_id FROM public.users WHERE role = 'admin' LIMIT 1;
  SELECT id, dispo_geree, nom INTO cible_id, orig_dispo, orig_nom
    FROM public.chateaux WHERE slug = cible_slug;
  SELECT count(*) INTO n_avant FROM public.chambres WHERE chateau_id = cible_id;
  nom_test := orig_nom || ' [TEST]';

  -- On pose l'identité ADMIN pour tous les appels qui suivent.
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', admin_id, 'role', 'authenticated')::text,
                     true);

  INSERT INTO upsert_dispo_results VALUES (
    'SETUP', 'identite admin + cible brouillon ' || cible_slug,
    'admin=' || coalesce(admin_id::text, '(aucun)')
      || ' · cible=' || coalesce(cible_id::text, '(introuvable)')
      || ' · dispo_geree d origine=' || coalesce(orig_dispo::text, '(null)')
      || ' · ' || n_avant || ' chambre(s)',
    CASE WHEN admin_id IS NOT NULL AND cible_id IS NOT NULL AND public.is_admin()
         THEN 'PASS' ELSE 'FAIL — pre-requis absents, tests invalides' END
  );

  -- ── TEST 1 — p_base avec dispo_geree:true -> la colonne passe à true
  BEGIN
    SET LOCAL ROLE 'authenticated';
    ignore := public.admin_upsert_chateau(cible_id, jsonb_build_object('dispo_geree', true));
    RESET ROLE;
    SELECT dispo_geree INTO v_dispo FROM public.chateaux WHERE id = cible_id;
    INSERT INTO upsert_dispo_results VALUES (
      '1', 'p_base {dispo_geree:true} -> colonne ecrite', 'dispo_geree=' || v_dispo::text,
      CASE WHEN v_dispo THEN 'PASS'
           ELSE 'FAIL — la colonne n est PAS dans l UPDATE SET : le toggle admin serait decoratif' END
    );
  EXCEPTION
    WHEN OTHERS THEN
      RESET ROLE;
      INSERT INTO upsert_dispo_results VALUES (
        '1', 'p_base {dispo_geree:true}', SQLSTATE || ' ' || SQLERRM, 'FAIL — l appel a echoue'
      );
  END;

  -- ── TEST 2 — p_base SANS dispo_geree -> valeur PRESERVEE (fusion partielle)
  -- ⚠ Le payload change le nom, donc il n'est pas vide : on prouve que la
  --   colonne survit à une VRAIE ecriture, pas à un appel inerte.
  BEGIN
    SET LOCAL ROLE 'authenticated';
    ignore := public.admin_upsert_chateau(cible_id, jsonb_build_object('nom', nom_test));
    RESET ROLE;
    SELECT dispo_geree, nom INTO v_dispo, v_nom FROM public.chateaux WHERE id = cible_id;
    INSERT INTO upsert_dispo_results VALUES (
      '2', 'p_base SANS dispo_geree -> valeur preservee',
      'dispo_geree=' || v_dispo::text || ' · nom=' || v_nom,
      CASE WHEN v_dispo THEN 'PASS'
           ELSE 'FAIL — ECRASEE a false : chaque sauvegarde desactiverait le calendrier' END
    );

    -- ── TEST 3 — l'upsert ordinaire fonctionne toujours
    INSERT INTO upsert_dispo_results VALUES (
      '3', 'upsert ordinaire (nom) inchange', 'nom=' || v_nom,
      CASE WHEN v_nom = nom_test THEN 'PASS' ELSE 'FAIL — la fonction n ecrit plus le nom' END
    );
  EXCEPTION
    WHEN OTHERS THEN
      RESET ROLE;
      INSERT INTO upsert_dispo_results VALUES (
        '2', 'p_base SANS dispo_geree', SQLSTATE || ' ' || SQLERRM, 'FAIL — l appel a echoue'
      );
  END;

  -- ── TEST 4 — les filles n'ont pas bouge (p_chambres jamais transmis)
  SELECT count(*) INTO n_apres FROM public.chambres WHERE chateau_id = cible_id;
  INSERT INTO upsert_dispo_results VALUES (
    '4', 'filles intactes (p_chambres omis = ne pas toucher)',
    n_avant || ' avant · ' || n_apres || ' apres',
    CASE WHEN n_apres = n_avant THEN 'PASS'
         ELSE 'FAIL — le bloc chambres a ete abime au copier-coller' END
  );

  -- ── TEST 5 — RESTAURATION des valeurs d'origine
  BEGIN
    SET LOCAL ROLE 'authenticated';
    ignore := public.admin_upsert_chateau(
      cible_id,
      jsonb_build_object('nom', orig_nom, 'dispo_geree', orig_dispo)
    );
    RESET ROLE;
    SELECT dispo_geree, nom INTO v_dispo, v_nom FROM public.chateaux WHERE id = cible_id;
    INSERT INTO upsert_dispo_results VALUES (
      '5', 'restauration des valeurs d origine',
      'dispo_geree=' || v_dispo::text || ' · nom=' || v_nom,
      CASE WHEN v_dispo IS NOT DISTINCT FROM orig_dispo AND v_nom = orig_nom THEN 'PASS'
           ELSE 'FAIL — ⚠ RESTAURER A LA MAIN : nom=' || orig_nom
                || ' dispo_geree=' || coalesce(orig_dispo::text, 'false') END
    );
  EXCEPTION
    WHEN OTHERS THEN
      RESET ROLE;
      INSERT INTO upsert_dispo_results VALUES (
        '5', 'restauration', SQLSTATE || ' ' || SQLERRM,
        'FAIL — ⚠ RESTAURER A LA MAIN : nom=' || orig_nom
          || ' dispo_geree=' || coalesce(orig_dispo::text, 'false')
      );
  END;

  RESET ROLE;

END;
$upsert$;


-- ============================================================
-- RESULTATS — attendu : SETUP + les cinq tests, tous en PASS.
-- ============================================================
SELECT test_num, description, result, verdict
FROM upsert_dispo_results
ORDER BY CASE test_num WHEN 'SETUP' THEN 0 ELSE 1 END, test_num;


-- ============================================================
-- CONTROLE FINAL (lecture seule) — l'etat du catalogue apres le test.
-- ⚠ `geres` doit valoir 0 : aucun chateau ne doit rester bascule.
-- ⚠ Aucun nom ne doit contenir « [TEST] ».
-- ============================================================
SELECT
  count(*)                                          AS chateaux,
  count(*) FILTER (WHERE dispo_geree)               AS geres_doit_etre_0,
  count(*) FILTER (WHERE nom LIKE '%[TEST]%')       AS noms_de_test_doit_etre_0
FROM public.chateaux;
