-- ============================================================
-- LCC — admin_upsert_chateau : écrire aussi `dispo_geree`
-- ============================================================
--
-- À jouer APRÈS `2026-08-23-dispo-geree.sql` (qui crée la colonne).
--
-- QUOI — UNE SEULE LIGNE ajoutée à l'UPDATE de la section 1 :
--
--     dispo_geree = v_row.dispo_geree,
--
-- Tout le reste — signature à 7 arguments, SECURITY DEFINER, search_path figé,
-- garde `is_admin()`, `FOR UPDATE`, `jsonb_populate_record`, et les cinq blocs
-- filles (chambres en DIFF, timeline/alentours en REPLACE, amenities avec sa
-- CTE, personnages en get-or-create) — est repris À L'IDENTIQUE.
--
-- POURQUOI — sans elle, le toggle admin serait DÉCORATIF.
-- `jsonb_populate_record` peuple bien `v_row.dispo_geree` depuis `p_base`
-- (rowtype `public.chateaux`, la colonne y entre automatiquement), mais
-- l'UPDATE qui suit nomme ses colonnes UNE PAR UNE. Une colonne absente de
-- cette liste est peuplée, puis jetée. La case aurait été cochée, sauvegardée,
-- et sans effet.
--
-- ── ⚠ SEPT MIGRATIONS RÉÉMETTENT CETTE FONCTION ─────────────────────────────
--
-- `mode_paiement`, les sept `img_*`, les six `accroche_*` et les deux `titre_*`
-- ont tous été ajoutés par réémissions successives. Repartir de la mauvaise
-- perdrait des colonnes EN SILENCE — un formulaire qui cesse d'enregistrer un
-- champ ne lève aucune erreur. C'est exactement le piège rencontré sur
-- `repondre_demande`, dont deux migrations coexistent et dont une omet l'outbox.
--
-- ⚠ CETTE MIGRATION NE DEMANDE PAS QU'ON LA CROIE : ELLE SE PROUVE.
-- Elle capture la définition en base AVANT, et vérifie APRÈS que l'ensemble des
-- colonnes assignées n'a rien perdu et a gagné `dispo_geree` — et RIEN d'autre.
-- Si une seule colonne manquait, elle lève une exception et le `COMMIT` n'a pas
-- lieu : la fonction reste telle qu'elle était. Le contrôle est mécanique, il ne
-- dépend pas de ma lecture.
--
-- ── PLACEMENT DE LA LIGNE ───────────────────────────────────────────────────
--
-- Juste après `mode_paiement`, donc dans le bloc des drapeaux de configuration
-- (`est_la_une`, `is_demo_mock`, `hero_night_stars`, `mode_paiement`). Le même
-- voisinage que dans `schema.sql` et que dans le formulaire admin : les trois
-- endroits se lisent dans le même ordre.
--
-- ── UNE COQUILLE CORRIGÉE AU PASSAGE ────────────────────────────────────────
--
-- Le COMMENT annonçait « 49 colonnes ». Le compte réel était **50** avant cette
-- migration, **51** après. L'écart préexistait ; il est corrigé, et la requête
-- (B) ci-dessous le vérifie plutôt que de l'affirmer.
--
-- IMPACT — le toggle « Gestion des disponibilités activée » écrit réellement.
-- Aucune autre colonne, aucune fille, aucun comportement ne change.
--
-- IDEMPOTENTE — CREATE OR REPLACE. Rejouable : le garde constate alors que
-- `dispo_geree` est déjà là et laisse passer.
-- ============================================================

BEGIN;

-- ── GARDE (avant) — mémoriser la définition actuelle ────────────────────────
DROP TABLE IF EXISTS _upsert_avant;
CREATE TEMP TABLE _upsert_avant AS
SELECT pg_get_functiondef(p.oid) AS def
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'admin_upsert_chateau';

DO $g$
BEGIN
  IF (SELECT count(*) FROM _upsert_avant) <> 1 THEN
    RAISE EXCEPTION
      'admin_upsert_chateau introuvable (ou surchargee) : cette migration remplace une fonction existante, elle n''en cree pas une.';
  END IF;
END
$g$;


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
    une_de_la_semaine           = v_row.une_de_la_semaine,
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
  'Ecriture transactionnelle admin d''un chateau. Base = update partiel (51 colonnes, dont les 7 img_*, les 6 accroche_*, les 2 titre_* d''emplacement de vitrine, et dispo_geree depuis le 2026-08-23). Chambres = DIFF (upsert par id + delete des retirees, preserve les reservations). timeline/alentours = REPLACE. amenities = REPLACE + liaison N-N equipements (CTE uuid pre-genere). personnages = get-or-create par slug (slug calcule en JS, dedup DISTINCT ON avant upsert) + REPLACE de la liaison chateau_personnages. Garde is_admin(). SECURITY DEFINER + search_path fige.';


-- ── GARDE (apres) — la migration se prouve, ou elle s'annule ────────────────
-- Compare l'ENSEMBLE des colonnes assignees avant / apres. Toute perte, ou tout
-- ajout autre que `dispo_geree`, leve une exception AVANT le COMMIT : la
-- fonction reste alors telle qu'elle etait.
DO $g$
DECLARE
  v_avant   text;
  v_perdues text[];
  v_gagnees text[];
BEGIN
  SELECT def INTO v_avant FROM _upsert_avant;

  WITH apres AS (
    SELECT DISTINCT m[1] AS col
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL regexp_matches(pg_get_functiondef(p.oid), '([a-z_]+)\s+=\s+v_row\.', 'g') AS m
    WHERE n.nspname = 'public' AND p.proname = 'admin_upsert_chateau'
  ),
  avant AS (
    SELECT DISTINCT m[1] AS col
    FROM regexp_matches(v_avant, '([a-z_]+)\s+=\s+v_row\.', 'g') AS m
  )
  SELECT
    (SELECT array_agg(col ORDER BY col) FROM (SELECT col FROM avant EXCEPT SELECT col FROM apres) x),
    (SELECT array_agg(col ORDER BY col) FROM (SELECT col FROM apres EXCEPT SELECT col FROM avant) y)
  INTO v_perdues, v_gagnees;

  IF v_perdues IS NOT NULL THEN
    RAISE EXCEPTION
      'REGRESSION : colonnes PERDUES par cette migration -> %. Elle est partie d''une version obsolete du depot. Rien n''est commite.',
      v_perdues;
  END IF;

  -- Rejeu : dispo_geree etait deja la, donc aucun gain. C'est legitime.
  IF v_gagnees IS NOT NULL AND v_gagnees <> ARRAY['dispo_geree'] THEN
    RAISE EXCEPTION
      'INATTENDU : colonnes ajoutees autres que dispo_geree -> %. Rien n''est commite.',
      v_gagnees;
  END IF;

  RAISE NOTICE 'admin_upsert_chateau : aucune colonne perdue, gain = %',
    COALESCE(v_gagnees::text, '{} (rejeu)');
END
$g$;

DROP TABLE _upsert_avant;

COMMIT;


-- ============================================================
-- VERIFICATIONS (lecture seule) — le Dashboard n'affiche que le DERNIER
-- resultat : jouer les requetes une par une si besoin.
-- ============================================================

-- (A) dispo_geree est bien ASSIGNEE dans la RPC (attendu : 1).
SELECT count(*) AS dispo_geree_dans_le_set
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN LATERAL regexp_matches(
  pg_get_functiondef(p.oid), 'dispo_geree\s+=\s+v_row\.', 'g'
) AS m
WHERE n.nspname = 'public' AND p.proname = 'admin_upsert_chateau';

-- (B) Le compte annonce par le COMMENT est-il le vrai ? (attendu : 51 et 51).
SELECT
  (SELECT count(DISTINCT m[1])
     FROM pg_proc p2
     JOIN pg_namespace n2 ON n2.oid = p2.pronamespace
     CROSS JOIN LATERAL regexp_matches(pg_get_functiondef(p2.oid), '([a-z_]+)\s+=\s+v_row\.', 'g') AS m
    WHERE n2.nspname = 'public' AND p2.proname = 'admin_upsert_chateau')      AS colonnes_reelles,
  substring(obj_description(p.oid, 'pg_proc') from '\((\d+) colonnes')::int   AS colonnes_annoncees
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'admin_upsert_chateau';

-- (C) La signature n'a pas bouge (attendu : 1 ligne, 7 arguments, SECURITY DEFINER).
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef                               AS security_definer,
       p.proconfig                               AS search_path
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'admin_upsert_chateau';
