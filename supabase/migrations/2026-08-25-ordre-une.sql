-- ============================================================
-- LCC — MIGRATION : une_de_la_semaine (boolean) devient ordre_une (integer)
-- ============================================================
--
-- QUOI. La vedette de la section home « Les cles a la une » cesse d'etre un
-- OUI/NON pour devenir un RANG. Un seul entier encode desormais l'appartenance
-- ET l'ordre : NULL = pas a la une, 1..n = position.
--
-- ⚠ POURQUOI REMPLACER PLUTOT QU'AJOUTER UNE COLONNE. Deux champs pour un seul
-- fait divergeraient — c'est le motif que ce depot s'interdit ailleurs (cf.
-- disponibilites.reservation_id). Et le point technique qui tranche est
-- contre-intuitif : `une_de_la_semaine` etant DEJA dans la liste blanche
-- d'admin_upsert_chateau, un changement de type ne toucherait pas la RPC,
-- tandis qu'AJOUTER une colonne EXIGE de la reemettre. Remplacer est donc plus
-- sur que la « voie sure » supposee.
--
-- ⚠ LE RENOMMAGE, LUI, IMPOSE LA REEMISSION. Il est assume : un champ nomme
-- `une_de_la_semaine` contenant 2 serait un piege permanent, et ce depot a
-- deja paye plusieurs noms qui mentaient. La garde ci-dessous rend la
-- reemission mecaniquement sure.
--
-- ⚠ L'ORDRE D'APPLICATION EST : CETTE MIGRATION D'ABORD, LE CODE ENSUITE.
-- Dans l'autre sens, le formulaire admin enverrait `ordre_une` a une RPC qui
-- l'ignore — jsonb_populate_record jette silencieusement une cle inconnue, et
-- toute sauvegarde perdrait le champ SANS ERREUR. Ici la fenetre est benigne :
-- le front deploye lit une colonne disparue, tombe sur son repli (les 4
-- premiers publies) et n'ecrit rien a tort.
--
-- ⚠ IDEMPOTENTE : chaque temps est garde sur information_schema / pg_catalog.
-- ⚠ UN SEUL SELECT FINAL — le SQL Editor n'affiche que le dernier resultat.
-- ============================================================

DROP TABLE IF EXISTS ordre_une_results;
CREATE TEMP TABLE ordre_une_results (
  etape   text,
  detail  text,
  verdict text
);


-- ────────────────────────────────────────────────────────────────────────────
-- GARDE (avant) — on capture les colonnes que l'UPDATE de la RPC assigne
-- AUJOURD'HUI. C'est la parade au piege des sept reemissions : une colonne
-- oubliee serait peuplee puis JETEE, sans la moindre erreur.
-- ────────────────────────────────────────────────────────────────────────────
DO $garde_avant$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'admin_upsert_chateau';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'ordre-une : admin_upsert_chateau introuvable — migration interrompue';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS ordre_une_avant (col text);
  DELETE FROM ordre_une_avant;
  INSERT INTO ordre_une_avant (col)
  SELECT DISTINCT m[1]
    FROM regexp_matches(v_def, '^\s{4}([a-z_]+)\s+=\s+v_row\.', 'gn') AS m;
END;
$garde_avant$;


-- ════════════════════════════════════════════════════════════════════════════
-- 1 a 4 — LA COLONNE : contraintes levees, type converti, nom change, rangs poses
-- ════════════════════════════════════════════════════════════════════════════
DO $colonne$
DECLARE
  v_type text;
  n_rangs int;
BEGIN
  SELECT data_type INTO v_type
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'chateaux'
     AND column_name = 'une_de_la_semaine';

  IF v_type = 'boolean' THEN
    -- ⚠ ① LES CONTRAINTES D'ABORD. Sans cela l'ALTER TYPE echoue : un DEFAULT
    --   `false` n'est pas convertible en entier.
    ALTER TABLE public.chateaux ALTER COLUMN une_de_la_semaine DROP DEFAULT;
    ALTER TABLE public.chateaux ALTER COLUMN une_de_la_semaine DROP NOT NULL;

    -- ⚠ ② LE TYPE. Le USING ne peut produire qu'une valeur UNIFORME : les
    --   vedettes sortent toutes a 1. C'est attendu — l'ordre reel est pose au
    --   temps ④.
    ALTER TABLE public.chateaux
      ALTER COLUMN une_de_la_semaine TYPE integer
      USING (CASE WHEN une_de_la_semaine THEN 1 ELSE NULL END);

    -- ⚠ ③ LE NOM, apres la conversion : le USING reste lisible avec l'ancien.
    ALTER TABLE public.chateaux RENAME COLUMN une_de_la_semaine TO ordre_une;

    INSERT INTO ordre_une_results VALUES
      ('1-3 colonne', 'boolean -> integer, renommee ordre_une', 'FAIT');
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='chateaux' AND column_name='ordre_une') THEN
    INSERT INTO ordre_une_results VALUES
      ('1-3 colonne', 'ordre_une existe deja — rien a convertir', 'DEJA FAIT');
  ELSE
    RAISE EXCEPTION 'ordre-une : ni une_de_la_semaine (boolean) ni ordre_une — etat inattendu, on n''ecrit rien';
  END IF;

  -- ⚠ ④ LES RANGS, PAR SLUG. SANS CE TEMPS, LES TROIS VEDETTES PARTAGERAIENT
  --   LA POSITION 1 : on introduirait un ordre en le perdant au meme instant.
  --   Ordre de la DA, pas ordre alphabetique.
  UPDATE public.chateaux SET ordre_une = 1 WHERE slug = 'chateau-de-la-riviere';
  UPDATE public.chateaux SET ordre_une = 2 WHERE slug = 'les-briottieres';
  UPDATE public.chateaux SET ordre_une = 3 WHERE slug = 'chateau-de-saint-paterne';

  SELECT count(*) INTO n_rangs FROM public.chateaux WHERE ordre_une IS NOT NULL;
  INSERT INTO ordre_une_results VALUES (
    '4 rangs', n_rangs || ' chateau(x) a la une',
    CASE WHEN n_rangs = 3 THEN 'PASS'
         ELSE 'FAIL — attendu 3 (la-riviere, briottieres, saint-paterne)' END
  );
END;
$colonne$;


-- ════════════════════════════════════════════════════════════════════════════
-- 5 — LE COMMENT : c'est lui qui porte la semantique
-- ════════════════════════════════════════════════════════════════════════════
COMMENT ON COLUMN public.chateaux.ordre_une IS
  'Rang a la une, section home « Les cles a la une ». 1 = premier. ⚠ NULL = PAS A LA UNE DU TOUT — semantique DIFFERENTE d''ordre_home, ou NULL veut dire « affiche, mais en fin de liste ». Meme type, deux lectures : ne pas transposer l''une a l''autre. ⚠ Les doublons de rang sont TOLERES : le formulaire admin edite un chateau a la fois et ne peut pas savoir qu''un autre porte deja ce rang ; une contrainte UNIQUE ferait echouer la sauvegarde sans que l''admin comprenne. Ils sont departages par nom a l''affichage. Remplace le booleen une_de_la_semaine, qui ne portait que l''appartenance (2026-08-25).';


-- ════════════════════════════════════════════════════════════════════════════
-- 6 — REEMISSION D'admin_upsert_chateau
-- ⚠ CORPS EXTRAIT PAR SCRIPT de 2026-08-24-horizon-ouverture.sql — la derniere
--   version en base, dont la garde avant/apres avait prouve l'exactitude. UNE
--   SEULE ligne y est changee : une_de_la_semaine -> ordre_une. Rien n'est
--   retape : c'est ainsi que les sept reemissions precedentes se sont passees
--   sans perte.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_upsert_chateau(
  p_id        uuid,
  p_base      jsonb,
  p_chambres  jsonb DEFAULT NULL,
  p_timeline  jsonb DEFAULT NULL,
  p_alentours jsonb DEFAULT NULL,
  p_amenities jsonb DEFAULT NULL,
  p_personnages jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.chateaux;
BEGIN
  -- ── Garde admin : PREMIERE instruction, avant toute lecture ou ecriture ──
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_upsert_chateau: acces refuse (role admin requis)'
      USING ERRCODE = '42501';
  END IF;

  -- Le chateau doit exister (cette fonction met a jour, elle ne cree pas).
  -- FOR UPDATE verrouille la ligne le temps de la transaction.
  SELECT * INTO v_row FROM public.chateaux WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'admin_upsert_chateau: chateau % introuvable', p_id
      USING ERRCODE = 'P0002';
  END IF;

  -- ── 1. BASE : fusion partielle p_base sur la ligne existante ──
  -- jsonb_populate_record : cle presente -> ecrase (null compris),
  -- cle absente -> garde la valeur actuelle. Typage automatique (text[],
  -- jsonb, numeric, bool) car on peuple un rowtype public.chateaux.
  v_row := jsonb_populate_record(v_row, p_base);

  UPDATE public.chateaux SET
    nom                         = v_row.nom,
    slug                        = v_row.slug,
    region                      = v_row.region,
    departement                 = v_row.departement,
    ville                       = v_row.ville,
    accroche                    = v_row.accroche,
    siecle                      = v_row.siecle,
    style                       = v_row.style,
    urgence                     = v_row.urgence,
    histoire                    = v_row.histoire,
    description                 = v_row.description,
    region_narrative            = v_row.region_narrative,
    region_histoire             = v_row.region_histoire,
    chiffres_cles               = v_row.chiffres_cles,
    images                      = v_row.images,
    video_background_youtube_id = v_row.video_background_youtube_id,
    img_hero                    = v_row.img_hero,
    img_journal_histoire        = v_row.img_journal_histoire,
    img_journal_proprietaires   = v_row.img_journal_proprietaires,
    img_journal_services        = v_row.img_journal_services,
    img_barre_permanent         = v_row.img_barre_permanent,
    img_barre_dernieres_cles    = v_row.img_barre_dernieres_cles,
    img_barre_club              = v_row.img_barre_club,
    accroche_journal_histoire      = v_row.accroche_journal_histoire,
    accroche_journal_proprietaires = v_row.accroche_journal_proprietaires,
    accroche_journal_services      = v_row.accroche_journal_services,
    accroche_barre_permanent       = v_row.accroche_barre_permanent,
    accroche_barre_dernieres_cles  = v_row.accroche_barre_dernieres_cles,
    accroche_barre_club            = v_row.accroche_barre_club,
    titre_theme_histoire           = v_row.titre_theme_histoire,
    titre_journal_histoire         = v_row.titre_journal_histoire,
    est_la_une                  = v_row.est_la_une,
    is_demo_mock                = v_row.is_demo_mock,
    hero_night_stars            = v_row.hero_night_stars,
    mode_paiement               = v_row.mode_paiement,
    -- ⚠ SEULE LIGNE AJOUTEE PAR LA MIGRATION 2026-08-23. Sans elle, le toggle
    --   admin serait decoratif : jsonb_populate_record peuple v_row.dispo_geree,
    --   mais cet UPDATE nomme ses colonnes une par une.
    dispo_geree                 = v_row.dispo_geree,
    -- ⚠ SEULE LIGNE AJOUTEE PAR LA MIGRATION 2026-08-24. Meme raison qu'au
    --   23 aout : jsonb_populate_record peuple v_row.dispo_ouverte_jusqu_a,
    --   mais cet UPDATE nomme ses colonnes une par une.
    dispo_ouverte_jusqu_a       = v_row.dispo_ouverte_jusqu_a,
    couleur_theme               = v_row.couleur_theme,
    accent_theme                = v_row.accent_theme,
    distance_paris_label        = v_row.distance_paris_label,
    distance_paris              = v_row.distance_paris,
    coordonnees_lat             = v_row.coordonnees_lat,
    coordonnees_lng             = v_row.coordonnees_lng,
    prop_nom                    = v_row.prop_nom,
    prop_depuis                 = v_row.prop_depuis,
    prop_initiale               = v_row.prop_initiale,
    prop_nom_affiche            = v_row.prop_nom_affiche,
    prop_portrait               = v_row.prop_portrait,
    prop_citation               = v_row.prop_citation,
    prop_description            = v_row.prop_description,
    ordre_une                   = v_row.ordre_une,
    ordre_home                  = v_row.ordre_home
  WHERE id = p_id;

  -- ── Contrat des filles (strategie REPLACE gardee) ──
  --   null / omis  = section preservee (ne pas toucher)
  --   []           = section videe explicitement
  --   [...]        = section remplacee par ce jeu
  -- Un champ oublie cote service (null) ne detruit donc jamais une fille :
  -- seul un tableau explicitement fourni declenche le DELETE + INSERT.

  -- ── 2. chambres : DIFF (upsert par id + delete des retirees) ──
  -- Preserve les id existants -> ne casse pas les reservations. Contrat null/[]
  -- identique aux autres filles : null = ne pas toucher, [] = tout retirer,
  -- [...] = etat cible complet.
  IF p_chambres IS NOT NULL THEN

    -- 2a. UPDATE des chambres existantes (id present dans le payload).
    UPDATE public.chambres c SET
      nom         = e->>'nom',
      description = e->>'description',
      superficie  = e->>'superficie',
      capacite    = (e->>'capacite')::integer,
      prix_cents  = (e->>'prix_cents')::integer,
      image       = e->>'image',
      equipements = CASE WHEN e ? 'equipements'
                         THEN ARRAY(SELECT jsonb_array_elements_text(e->'equipements'))
                         ELSE ARRAY[]::text[] END,
      ordre       = COALESCE((e->>'ordre')::integer, (ord - 1)::integer)
    FROM jsonb_array_elements(p_chambres) WITH ORDINALITY AS t(e, ord)
    WHERE (e->>'id') IS NOT NULL
      AND c.id = (e->>'id')::uuid
      AND c.chateau_id = p_id;

    -- 2b. INSERT des nouvelles chambres (id absent du payload).
    INSERT INTO public.chambres
      (chateau_id, nom, description, superficie, capacite, prix_cents, image, equipements, ordre)
    SELECT
      p_id,
      e->>'nom',
      e->>'description',
      e->>'superficie',
      (e->>'capacite')::integer,
      (e->>'prix_cents')::integer,
      e->>'image',
      CASE WHEN e ? 'equipements'
           THEN ARRAY(SELECT jsonb_array_elements_text(e->'equipements'))
           ELSE ARRAY[]::text[] END,
      COALESCE((e->>'ordre')::integer, (ord - 1)::integer)
    FROM jsonb_array_elements(p_chambres) WITH ORDINALITY AS t(e, ord)
    WHERE (e->>'id') IS NULL;

    -- 2c. DELETE des chambres retirees (du chateau, absentes du payload).
    -- Le RESTRICT de reservations bloque proprement une chambre reservee (23503) :
    -- pas de bloc EXCEPTION, l'erreur remonte a saveChateauComplet.
    DELETE FROM public.chambres c
    WHERE c.chateau_id = p_id
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_chambres) AS e
        WHERE (e->>'id') IS NOT NULL AND (e->>'id')::uuid = c.id
      );
  END IF;

  -- ── 3. timeline : REPLACE (inchange) ──
  IF p_timeline IS NOT NULL THEN
    DELETE FROM public.chateau_timeline WHERE chateau_id = p_id;
    INSERT INTO public.chateau_timeline
      (chateau_id, annee, evenement, ordre)
    SELECT
      p_id,
      e->>'annee',
      e->>'evenement',
      COALESCE((e->>'ordre')::integer, (ord - 1)::integer)
    FROM jsonb_array_elements(p_timeline) WITH ORDINALITY AS t(e, ord);
  END IF;

  -- ── 4. alentours : REPLACE (inchange) ──
  IF p_alentours IS NOT NULL THEN
    DELETE FROM public.chateau_alentours WHERE chateau_id = p_id;
    INSERT INTO public.chateau_alentours
      (chateau_id, nom, distance, type, icone, description, ordre)
    SELECT
      p_id,
      e->>'nom',
      e->>'distance',
      (e->>'type')::public.alentour_type,
      e->>'icone',
      e->>'description',
      COALESCE((e->>'ordre')::integer, (ord - 1)::integer)
    FROM jsonb_array_elements(p_alentours) WITH ORDINALITY AS t(e, ord);
  END IF;

  -- ── 5. amenities : REPLACE + liaison N-N equipements (CTE uuid pre-genere) ──
  IF p_amenities IS NOT NULL THEN
    -- Le DELETE cascade sur amenity_equipements (FK ON DELETE CASCADE) : les
    -- anciennes liaisons partent avec les anciennes amenities, rien a nettoyer.
    DELETE FROM public.chateau_amenities WHERE chateau_id = p_id;

    -- On genere l'id NOUS-MEMES (au lieu du DEFAULT) : on le connait AVANT
    -- l'insert, donc la CTE soeur peut inserer les liaisons sans dependre de
    -- RETURNING. FK amenity_equipements -> chateau_amenities validee en fin
    -- d'instruction (triggers RI differes) : motif prouve en FK immediate.
    WITH payload AS (
      SELECT gen_random_uuid() AS new_id, e, ord
      FROM jsonb_array_elements(p_amenities) WITH ORDINALITY AS t(e, ord)
    ),
    ins AS (
      INSERT INTO public.chateau_amenities
        (id, chateau_id, type, categorie, nom, description, icone, image, inclus, prix_supplement_cents, duree_minutes, ordre)
      SELECT
        p.new_id,
        p_id,
        (p.e->>'type')::public.amenity_type,
        NULLIF(p.e->>'categorie', ''),
        p.e->>'nom',
        p.e->>'description',
        p.e->>'icone',
        p.e->>'image',
        COALESCE((p.e->>'inclus')::boolean, true),
        (p.e->>'prix_supplement_cents')::integer,
        (p.e->>'duree_minutes')::integer,
        COALESCE((p.e->>'ordre')::integer, (p.ord - 1)::integer)
      FROM payload p
    )
    INSERT INTO public.amenity_equipements (amenity_id, equipement_slug)
    SELECT p.new_id, slug
    FROM payload p
    CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(p.e->'equipements', '[]'::jsonb)) AS slug;
  END IF;

  -- ── 6. personnages : get-or-create par slug + REPLACE liaison (contrat null/[]) ──
  IF p_personnages IS NOT NULL THEN
    -- 6a. GET-OR-CREATE des personnages. Le slug arrive tout fait (calcule en JS,
    --     src/utils/slug.js). DISTINCT ON (slug) DEDUP le payload AVANT l'upsert :
    --     deux entrees du meme slug (meme personne, natures differentes) feraient
    --     sinon echouer ON CONFLICT (21000, row affected twice).
    --     DO NOTHING, PAS DO UPDATE -- NE PAS "corriger" ceci :
    --       le nom appartient au REFERENTIEL. DO UPDATE SET nom laisserait une
    --       faute de frappe dans UNE fiche chateau renommer le personnage PARTAGE,
    --       silencieusement, sur toutes ses autres pages. Le nom ne se corrige pas
    --       par effet de bord d'une sauvegarde de chateau (ca se fera via un CRUD
    --       referentiel dedie). Le JOIN de 6b retrouve l'id que la ligne vienne
    --       d'etre creee ou qu'elle preexiste -> DO NOTHING est gratuit ici.
    INSERT INTO public.personnages (nom, slug)
    SELECT DISTINCT ON (e->>'slug') e->>'nom', e->>'slug'
    FROM jsonb_array_elements(p_personnages) AS e
    ORDER BY e->>'slug'
    ON CONFLICT (slug) DO NOTHING;

    -- 6b. REPLACE de la liaison (DELETE all + INSERT), facon bloc timeline. Le
    --     personnage_id est resolu par jointure sur le slug (existant ou cree en
    --     6a). ON CONFLICT DO NOTHING : filet si le payload contient deux fois la
    --     MEME (personnage, nature) -> on garde la premiere (le CHECK nature et le
    --     RESTRICT/CASCADE des FK restent actifs).
    DELETE FROM public.chateau_personnages WHERE chateau_id = p_id;
    INSERT INTO public.chateau_personnages
      (chateau_id, personnage_id, nature, texte, ordre)
    SELECT
      p_id,
      pg.id,
      e->>'nature',
      e->>'texte',
      COALESCE((e->>'ordre')::integer, (ord - 1)::integer)
    FROM jsonb_array_elements(p_personnages) WITH ORDINALITY AS t(e, ord)
    JOIN public.personnages pg ON pg.slug = e->>'slug'
    ON CONFLICT ON CONSTRAINT chateau_personnages_unique DO NOTHING;
  END IF;

  RETURN p_id;
END;
$$;

COMMENT ON FUNCTION public.admin_upsert_chateau(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) IS
  'Ecriture transactionnelle admin d''un chateau. Base = update partiel (52 colonnes, dont les 7 img_*, les 6 accroche_*, les 2 titre_* d''emplacement de vitrine, dispo_geree depuis le 2026-08-23, dispo_ouverte_jusqu_a depuis le 2026-08-24, et ordre_une depuis le 2026-08-25 — qui remplace le booleen une_de_la_semaine). Chambres = DIFF (upsert par id + delete des retirees, preserve les reservations). timeline/alentours = REPLACE. amenities = REPLACE + liaison N-N equipements (CTE uuid pre-genere). personnages = get-or-create par slug (slug calcule en JS, dedup DISTINCT ON avant upsert) + REPLACE de la liaison chateau_personnages. Garde is_admin(). SECURITY DEFINER + search_path fige.';


-- ────────────────────────────────────────────────────────────────────────────
-- GARDE (apres) — la migration se prouve, ou elle s'annule.
-- ⚠ On ne relit pas la fonction « a l'œil » : on COMPARE les ensembles de
--   colonnes assignees. Le gain doit valoir EXACTEMENT {ordre_une} et la perte
--   EXACTEMENT {une_de_la_semaine}. Toute autre difference = une colonne
--   perdue, donc un champ qui serait saisi, sauvegarde, et sans effet.
-- ────────────────────────────────────────────────────────────────────────────
DO $garde_apres$
DECLARE
  v_def   text;
  v_gain  text[];
  v_perte text[];
  v_type  text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'admin_upsert_chateau';

  CREATE TEMP TABLE IF NOT EXISTS ordre_une_apres (col text);
  DELETE FROM ordre_une_apres;
  INSERT INTO ordre_une_apres (col)
  SELECT DISTINCT m[1]
    FROM regexp_matches(v_def, '^\s{4}([a-z_]+)\s+=\s+v_row\.', 'gn') AS m;

  SELECT array_agg(col ORDER BY col) INTO v_gain
    FROM (SELECT col FROM ordre_une_apres EXCEPT SELECT col FROM ordre_une_avant) g;
  SELECT array_agg(col ORDER BY col) INTO v_perte
    FROM (SELECT col FROM ordre_une_avant EXCEPT SELECT col FROM ordre_une_apres) p;

  IF v_gain IS DISTINCT FROM ARRAY['ordre_une']::text[]
     OR v_perte IS DISTINCT FROM ARRAY['une_de_la_semaine']::text[] THEN
    RAISE EXCEPTION 'ordre-une : reemission NON conforme — gain=% perte=% (attendu {ordre_une} / {une_de_la_semaine}). AUCUNE modification n''est conservee.',
      coalesce(array_to_string(v_gain, ','), '(aucun)'),
      coalesce(array_to_string(v_perte, ','), '(aucune)');
  END IF;

  INSERT INTO ordre_une_results VALUES (
    '6 reemission',
    'colonnes assignees : ' || (SELECT count(*) FROM ordre_une_apres)
      || ' · gain {ordre_une} · perte {une_de_la_semaine}',
    'PASS'
  );

  -- Controle de type et de nullabilite, tant qu'on y est.
  SELECT data_type INTO v_type FROM information_schema.columns
   WHERE table_schema='public' AND table_name='chateaux' AND column_name='ordre_une';
  INSERT INTO ordre_une_results VALUES (
    'colonne', 'ordre_une : ' || coalesce(v_type, '(absente)')
      || ', nullable=' || (SELECT is_nullable FROM information_schema.columns
                            WHERE table_schema='public' AND table_name='chateaux' AND column_name='ordre_une'),
    CASE WHEN v_type = 'integer' THEN 'PASS' ELSE 'FAIL — type inattendu' END
  );

  INSERT INTO ordre_une_results VALUES (
    'ancienne colonne',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema='public' AND table_name='chateaux'
                         AND column_name='une_de_la_semaine')
         THEN 'une_de_la_semaine EXISTE ENCORE' ELSE 'une_de_la_semaine absente' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema='public' AND table_name='chateaux'
                         AND column_name='une_de_la_semaine')
         THEN 'FAIL' ELSE 'PASS' END
  );
END;
$garde_apres$;


-- ════════════════════════════════════════════════════════════════════════════
-- 7 — RESULTATS : L'UNIQUE SELECT DU FICHIER
-- Attendu : toutes les lignes en PASS / FAIT, et les trois vedettes a 1, 2, 3.
-- ⚠ NE RIEN AJOUTER APRES.
-- ════════════════════════════════════════════════════════════════════════════
SELECT etape, detail, verdict FROM ordre_une_results
UNION ALL
SELECT 'vedette', slug || ' -> rang ' || ordre_une,
       CASE WHEN (slug, ordre_une) IN (
              ('chateau-de-la-riviere', 1), ('les-briottieres', 2), ('chateau-de-saint-paterne', 3)
            ) THEN 'PASS' ELSE 'FAIL — rang inattendu' END
  FROM public.chateaux WHERE ordre_une IS NOT NULL
ORDER BY 1, 2;
