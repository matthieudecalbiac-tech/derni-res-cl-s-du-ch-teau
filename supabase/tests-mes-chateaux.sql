-- ============================================================
-- LCC — TEST RLS : ce qu'un châtelain voit de ses châteaux (étape 3.2)
-- ============================================================
--
-- ⚠⚠ CE FICHIER TESTE DES POLICIES, PAS UNE REQUÊTE — ET SON RÔLE EST INVERSÉ
-- PAR RAPPORT AUX AUTRES TESTS DU DÉPÔT. À lire avant d'y toucher.
--
--   tests 2.5 / 3.1   le rôle `authenticated` n'enveloppe QUE les appels RPC,
--                     et les vérifications se font en `postgres` — pour
--                     CONTOURNER la RLS, qui n'était pas l'objet du test.
--   CE FICHIER        le rôle est endossé PENDANT LES LECTURES — pour
--                     ÉPROUVER la RLS, qui EST l'objet du test.
--
-- ⚠ EN `postgres` (BYPASSRLS), TOUS LES SELECT CI-DESSOUS RENDRAIENT TOUT, et
-- les six verdicts passeraient au vert en ne prouvant RIEN. Si quelqu'un
-- « harmonise » un jour ce fichier sur le patron des autres, il le videra de son
-- sens sans qu'aucun verdict ne change. C'est la seule chose à ne pas faire ici.
--
-- ⚠ CE QUE LE TEST VITEST NE PEUT PAS PROUVER, et pourquoi ce fichier existe :
-- `getMesChateaux()` ne pose AUCUN filtre applicatif — pas de `.eq("user_id")`.
-- Elle demande la table entière et laisse Postgres décider. Un mock rendrait ce
-- qu'on lui dit de rendre ; seul un appel réel, sous une vraie identité, dit ce
-- que la RLS laisse passer.
--
-- ── ⚠ MISE EN SCÈNE : UN LIEN DE PROPRIÉTÉ TEMPORAIRE ──────────────────────
--
-- Mesuré le 24 août : il n'existe qu'UN SEUL lien dans `chateau_owners` —
-- matthieu…+chatelain -> chateau-de-la-riviere, PUBLIÉ, 5 chambres. Aucun
-- châtelain n'est lié à un BROUILLON.
--
-- Or le brouillon est le seul cas qui prouve quoi que ce soit. La policy fait :
--
--     statut = 'publie'  OR  is_chatelain_of(id)  OR  is_admin()
--
-- ⚠ UN TEST SUR DES CHÂTEAUX PUBLIÉS SEULS EST SATISFAIT PAR LE PREMIER TERME.
-- Il passerait au vert même si `is_chatelain_of(id)` disparaissait de la policy.
-- Le test 2 pose donc un lien vers un brouillon, l'éprouve, et le retire.
--
-- ⚠ Le lien est posé ET retiré DANS LE MÊME BLOC DO : si le bloc va au bout, le
-- DELETE s'exécute ; s'il lève, la transaction est annulée et la ligne n'a
-- jamais existé. L'état commité est propre dans les deux cas — contrairement au
-- décor de 2.5, qu'on laissait délibérément en base.
--
-- ── LES SIX CAS ────────────────────────────────────────────────────────────
--
--   1  le châtelain voit son château PUBLIÉ, avec ses chambres
--   2  ⚠ il voit le BROUILLON dont il vient d'être fait propriétaire
--   3  il ne voit PAS les autres châteaux via chateau_owners
--   4  ⚠ il ne voit PAS le lien de propriété d'un tiers  (policy chateau_owners)
--   5  ⚠ un CLIENT obtient ZÉRO LIGNE, pas une erreur
--   6  l'admin voit les liens (il en aura besoin en 3.5)
--
-- ⚠ LE 4 EST DISTINCT DU 3, et ce n'est pas de la redondance : le 3 éprouve ce
-- que masque la policy de `chateaux`, le 4 ce que masque celle de
-- `chateau_owners`. Deux policies, deux tests — sinon on ne saurait pas laquelle
-- a cédé.
--
-- ⚠ UN SEUL SELECT FINAL. Idempotent.
-- ============================================================

DROP TABLE IF EXISTS mes_chateaux_results;
CREATE TEMP TABLE mes_chateaux_results (
  test_num    text,
  description text,
  result      text,
  verdict     text
);
-- ⚠ INDISPENSABLE ICI, contrairement aux autres fichiers : les INSERT de verdict
--   ont lieu PENDANT que le rôle `authenticated` est endossé.
GRANT INSERT, SELECT ON mes_chateaux_results TO authenticated, anon;


DO $mc$
DECLARE
  chatelain  uuid;
  autre      uuid;   -- un client, ni châtelain ni admin
  admin_id   uuid;

  publie_id     uuid;
  publie_slug   text;
  brouillon_id  uuid;
  brouillon_slug text;

  n_chateaux int;
  n_chambres int;
  n_liens    int;
  v_slugs    text;
  v_lien_pose boolean := false;
BEGIN

  -- ══════════════════════════════════════════════════════════════════════
  -- SETUP — les acteurs et les cibles
  -- ══════════════════════════════════════════════════════════════════════
  SELECT co.user_id, co.chateau_id, c.slug
    INTO chatelain, publie_id, publie_slug
    FROM public.chateau_owners co
    JOIN public.chateaux c ON c.id = co.chateau_id
   WHERE c.statut = 'publie'
   LIMIT 1;

  SELECT id INTO admin_id FROM public.users WHERE role = 'admin' LIMIT 1;
  SELECT id INTO autre    FROM public.users
   WHERE role = 'client' AND id <> chatelain LIMIT 1;

  -- Un brouillon SANS propriétaire, pour la mise en scène.
  SELECT c.id, c.slug INTO brouillon_id, brouillon_slug
    FROM public.chateaux c
   WHERE c.statut <> 'publie'
     AND NOT EXISTS (SELECT 1 FROM public.chateau_owners o WHERE o.chateau_id = c.id)
   ORDER BY c.slug
   LIMIT 1;

  INSERT INTO mes_chateaux_results VALUES (
    'SETUP', 'chatelain + son chateau publie + un brouillon sans proprietaire',
    'chatelain=' || coalesce(chatelain::text, '(aucun)')
      || ' · publie=' || coalesce(publie_slug, '(aucun)')
      || ' · brouillon cible=' || coalesce(brouillon_slug, '(aucun)')
      || ' · autre(client)=' || coalesce(autre::text, '(aucun)'),
    CASE WHEN chatelain IS NOT NULL AND publie_id IS NOT NULL
              AND brouillon_id IS NOT NULL AND autre IS NOT NULL AND admin_id IS NOT NULL
         THEN 'PASS' ELSE 'FAIL — pre-requis absents, tests invalides' END
  );

  -- ── MISE EN SCENE : le chatelain devient proprietaire du brouillon ──
  INSERT INTO public.chateau_owners (user_id, chateau_id)
  VALUES (chatelain, brouillon_id);
  v_lien_pose := true;

  -- ══════════════════════════════════════════════════════════════════════
  -- ⚠ ON ENDOSSE LE CHATELAIN, ET ON LE GARDE PENDANT LES LECTURES.
  --   C'est tout l'objet du fichier : en postgres, la RLS ne s'applique pas.
  -- ══════════════════════════════════════════════════════════════════════
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', chatelain, 'role', 'authenticated')::text,
                     true);
  SET LOCAL ROLE 'authenticated';

  -- ── 1 — son chateau PUBLIE, avec ses chambres ──
  SELECT count(*) INTO n_chateaux
    FROM public.chateau_owners co
    JOIN public.chateaux c ON c.id = co.chateau_id
   WHERE c.id = publie_id;
  SELECT count(*) INTO n_chambres
    FROM public.chambres WHERE chateau_id = publie_id;

  INSERT INTO mes_chateaux_results VALUES (
    '1', 'voit son chateau PUBLIE et ses chambres',
    n_chateaux || ' chateau · ' || n_chambres || ' chambre(s)',
    CASE WHEN n_chateaux = 1 AND n_chambres > 0 THEN 'PASS'
         ELSE 'FAIL — le chatelain ne voit pas son propre chateau publie' END
  );

  -- ── 2 — ⚠ le BROUILLON dont il est proprietaire ──
  --    C'est LE cas qui eprouve `is_chatelain_of(id)` dans la policy.
  SELECT count(*) INTO n_chateaux
    FROM public.chateau_owners co
    JOIN public.chateaux c ON c.id = co.chateau_id
   WHERE c.id = brouillon_id;

  INSERT INTO mes_chateaux_results VALUES (
    '2', 'voit le BROUILLON dont il est proprietaire',
    n_chateaux || ' chateau (' || coalesce(brouillon_slug, '?') || ')',
    CASE WHEN n_chateaux = 1 THEN 'PASS'
         ELSE 'FAIL — ⚠ is_chatelain_of a disparu de chateaux_select_public : un chatelain ne peut pas preparer un chateau avant publication' END
  );

  -- ── 3 — il ne voit PAS les autres chateaux VIA chateau_owners ──
  SELECT count(*), string_agg(c.slug, ', ' ORDER BY c.slug)
    INTO n_chateaux, v_slugs
    FROM public.chateau_owners co
    JOIN public.chateaux c ON c.id = co.chateau_id;

  INSERT INTO mes_chateaux_results VALUES (
    '3', 'ne voit QUE ses chateaux via chateau_owners (2 attendus)',
    n_chateaux || ' : ' || coalesce(v_slugs, '(aucun)'),
    CASE WHEN n_chateaux = 2 THEN 'PASS'
         ELSE 'FAIL — la lecture deborde sur des chateaux dont il n est pas proprietaire' END
  );

  -- ── 4 — ⚠ il ne voit PAS le lien de propriete d'un TIERS ──
  --    Distinct du 3 : ici c'est la policy de chateau_owners qu'on eprouve,
  --    pas celle de chateaux.
  SELECT count(*) INTO n_liens
    FROM public.chateau_owners WHERE user_id <> chatelain;

  INSERT INTO mes_chateaux_results VALUES (
    '4', 'ne voit aucun lien de propriete d autrui',
    n_liens || ' lien(s) de tiers visible(s)',
    CASE WHEN n_liens = 0 THEN 'PASS'
         ELSE 'FAIL — chateau_owners_select_self_admin ne filtre plus : qui possede quoi devient public' END
  );

  RESET ROLE;

  -- ══════════════════════════════════════════════════════════════════════
  -- 5 — ⚠ UN CLIENT : zero ligne, PAS une erreur
  -- ══════════════════════════════════════════════════════════════════════
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', autre, 'role', 'authenticated')::text,
                     true);
  SET LOCAL ROLE 'authenticated';

  BEGIN
    SELECT count(*) INTO n_liens FROM public.chateau_owners;
    RESET ROLE;
    INSERT INTO mes_chateaux_results VALUES (
      '5', 'un CLIENT obtient 0 ligne, sans erreur',
      n_liens || ' lien(s)',
      CASE WHEN n_liens = 0 THEN 'PASS'
           ELSE 'FAIL — un client voit des liens de propriete' END
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      RESET ROLE;
      -- ⚠ Ce n'est PAS le comportement attendu, et la nuance compte pour l'UI :
      --   la RLS ne REFUSE pas, elle ne REND RIEN. Si un 42501 apparaissait ici,
      --   c'est que le GRANT SELECT a saute — l'ecran verrait une panne la ou il
      --   doit voir une liste vide.
      INSERT INTO mes_chateaux_results VALUES (
        '5', 'un CLIENT obtient 0 ligne, sans erreur', '42501 permission denied',
        'FAIL — le GRANT SELECT a saute : le client recoit une PANNE au lieu d une liste vide'
      );
  END;

  -- ══════════════════════════════════════════════════════════════════════
  -- 6 — L'ADMIN voit les liens (il en aura besoin en 3.5)
  -- ══════════════════════════════════════════════════════════════════════
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', admin_id, 'role', 'authenticated')::text,
                     true);
  SET LOCAL ROLE 'authenticated';

  SELECT count(*) INTO n_liens FROM public.chateau_owners;

  RESET ROLE;

  INSERT INTO mes_chateaux_results VALUES (
    '6', 'l admin voit les liens de propriete',
    n_liens || ' lien(s) (2 attendus : le reel + celui du test)',
    CASE WHEN n_liens >= 2 THEN 'PASS'
         ELSE 'FAIL — l admin ne voit pas les liens : /admin/chateaux/:id/disponibilites (3.5) serait aveugle' END
  );

  -- ══════════════════════════════════════════════════════════════════════
  -- NETTOYAGE — le lien temporaire, et lui seul.
  -- ⚠ En postgres : la policy d'ecriture de chateau_owners est admin-only, et
  --   on n'a pas besoin de la solliciter pour defaire une mise en scene.
  -- ══════════════════════════════════════════════════════════════════════
  IF v_lien_pose THEN
    DELETE FROM public.chateau_owners
     WHERE user_id = chatelain AND chateau_id = brouillon_id;
  END IF;

  SELECT count(*) INTO n_liens FROM public.chateau_owners;

  INSERT INTO mes_chateaux_results VALUES (
    'PROPRETE', 'le lien temporaire est retire',
    n_liens || ' lien(s) restant(s) en base (1 attendu)',
    CASE WHEN n_liens = 1 THEN 'PASS'
         ELSE 'FAIL — ⚠ retirer a la main : DELETE FROM chateau_owners WHERE user_id = '''
              || coalesce(chatelain::text, '?') || ''' AND chateau_id = '''
              || coalesce(brouillon_id::text, '?') || '''' END
  );

END;
$mc$;


-- ============================================================
-- RESULTATS — L'UNIQUE SELECT DU FICHIER.
-- Attendu : SETUP + les six cas + PROPRETE, tous en PASS.
-- ⚠ NE RIEN AJOUTER APRES.
-- ============================================================
SELECT test_num, description, result, verdict
FROM mes_chateaux_results
ORDER BY
  CASE test_num WHEN 'SETUP' THEN 0 WHEN 'PROPRETE' THEN 9 ELSE 1 END,
  test_num;
