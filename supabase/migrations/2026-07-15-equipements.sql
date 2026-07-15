-- ============================================================
-- equipements — referentiel d'equipements filtrables (N-N) sur les services
--
-- Troisieme niveau de qualification d'un service, apres `type` (service|activite)
-- et `categorie` (6 valeurs, liste fermee) : les EQUIPEMENTS filtrables, en
-- relation N-N (un service peut en porter plusieurs — "Piscine chauffee et sauna"
-- = piscine + sauna ; "Tennis, trampoline, velos" = tennis + jeux_interieur + velos).
--
-- Pourquoi une TABLE et pas un CHECK : la liste doit s'enrichir au fil des
-- chateaux (ajouter "heliport" ou "fauconnerie" = un INSERT, jamais une
-- migration). C'est un REFERENTIEL, pas une enumeration figee.
--
-- QUATRE parties :
--   (a) referentiel `equipements` (slug PK, libelle, ordre) + seed idempotent des 21.
--   (b) liaison `amenity_equipements` (N-N, PK composite, FK CASCADE) + index.
--   (c) RLS + GRANTS (calque le pattern chateau_amenities).
--   (d) CREATE OR REPLACE admin_upsert_chateau : bloc 5 amenities reecrit avec la
--       CTE prouvee (payload/gen_random_uuid + ins + INSERT liaisons via LATERAL).
--       Le reste de la fonction (blocs 1-4) est BYTE-IDENTIQUE a la version categorie.
--
-- Le point dur : dans le bloc 5 REPLACE, les nouveaux amenity_id sont generes a
-- l'INSERT. On pre-genere l'uuid dans la CTE `payload` (au lieu du DEFAULT), donc
-- on le connait AVANT l'insert : la CTE soeur `ins` insere l'amenity, l'INSERT
-- final insere les liaisons depuis la MEME instruction via LATERAL. La FK
-- amenity_equipements -> chateau_amenities est validee en fin d'instruction
-- (triggers RI differes) : motif prouve empiriquement en FK immediate (test
-- wCTE parent+enfant, 0 violation 23503). Le DELETE initial cascade sur
-- amenity_equipements (ON DELETE CASCADE) : aucune liaison a nettoyer a la main.
-- ============================================================

-- ── (a) Referentiel equipements ──
CREATE TABLE IF NOT EXISTS public.equipements (
  slug    text    PRIMARY KEY,
  libelle text    NOT NULL,
  ordre   integer NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.equipements IS
  'Referentiel d''equipements filtrables (piscine, sauna, tennis...). Enrichissable par simple INSERT (pas de migration). `ordre` groupe par categorie pour l''affichage.';

-- Seed idempotent des 21 (rejouable : ON CONFLICT met a jour libelle + ordre).
-- ordre groupe par categorie : bien-etre 10-50, gastronomie 100-130,
-- sport 200-240, nature 300-310, culture 400-420, famille 500-510.
INSERT INTO public.equipements (slug, libelle, ordre) VALUES
  ('piscine',        'Piscine',               10),
  ('sauna',          'Sauna',                 20),
  ('hammam',         'Hammam',                30),
  ('spa',            'Spa',                   40),
  ('massage',        'Massage',               50),
  ('table_hotes',    'Table d''hôtes',        100),
  ('petit_dejeuner', 'Petit-déjeuner',        110),
  ('cuisine',        'Cuisine à disposition', 120),
  ('pique_nique',    'Pique-nique',           130),
  ('tennis',         'Tennis',                200),
  ('velos',          'Vélos',                 210),
  ('equitation',     'Équitation',            220),
  ('canoe',          'Canoë & barque',        230),
  ('petanque',       'Pétanque',              240),
  ('parc_jardins',   'Parc & jardins',        300),
  ('peche',          'Pêche',                 310),
  ('visite_guidee',  'Visite guidée',         400),
  ('atelier',        'Atelier',               410),
  ('spectacle',      'Spectacle',             420),
  ('baby_sitting',   'Baby-sitting',          500),
  ('jeux_interieur', 'Jeux d''intérieur',     510)
ON CONFLICT (slug) DO UPDATE
  SET libelle = EXCLUDED.libelle,
      ordre   = EXCLUDED.ordre;

-- ── (b) Liaison N-N amenity_equipements ──
CREATE TABLE IF NOT EXISTS public.amenity_equipements (
  amenity_id      uuid NOT NULL REFERENCES public.chateau_amenities(id) ON DELETE CASCADE,
  equipement_slug text NOT NULL REFERENCES public.equipements(slug),
  PRIMARY KEY (amenity_id, equipement_slug)
);

COMMENT ON TABLE public.amenity_equipements IS
  'Liaison N-N entre un service (chateau_amenities) et ses equipements filtrables. ON DELETE CASCADE cote amenity : la reecriture REPLACE du bloc 5 de la RPC purge les liaisons automatiquement.';

-- Index sur equipement_slug : on filtrera les services PAR equipement.
CREATE INDEX IF NOT EXISTS idx_amenity_equipements_slug
  ON public.amenity_equipements (equipement_slug);

-- ── (c) RLS + GRANTS (calque chateau_amenities) ──
ALTER TABLE public.equipements          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenity_equipements  ENABLE ROW LEVEL SECURITY;

-- equipements : SELECT public, ecritures admin-only.
DROP POLICY IF EXISTS equipements_select_public ON public.equipements;
CREATE POLICY equipements_select_public ON public.equipements
  FOR SELECT USING (true);

DROP POLICY IF EXISTS equipements_insert_admin ON public.equipements;
CREATE POLICY equipements_insert_admin ON public.equipements
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS equipements_update_admin ON public.equipements;
CREATE POLICY equipements_update_admin ON public.equipements
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS equipements_delete_admin ON public.equipements;
CREATE POLICY equipements_delete_admin ON public.equipements
  FOR DELETE USING (public.is_admin());

-- amenity_equipements : SELECT public, ecritures admin-only (le chemin d'ecriture
-- normal est la RPC SECURITY DEFINER, qui bypass le RLS ; admin-only = defense
-- en profondeur, coherent avec les autres tables filles ecrites par la RPC).
DROP POLICY IF EXISTS amenity_equipements_select_public ON public.amenity_equipements;
CREATE POLICY amenity_equipements_select_public ON public.amenity_equipements
  FOR SELECT USING (true);

DROP POLICY IF EXISTS amenity_equipements_insert_admin ON public.amenity_equipements;
CREATE POLICY amenity_equipements_insert_admin ON public.amenity_equipements
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS amenity_equipements_update_admin ON public.amenity_equipements;
CREATE POLICY amenity_equipements_update_admin ON public.amenity_equipements
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS amenity_equipements_delete_admin ON public.amenity_equipements;
CREATE POLICY amenity_equipements_delete_admin ON public.amenity_equipements
  FOR DELETE USING (public.is_admin());

-- GRANT SELECT a anon + authenticated (sinon 42501 avant meme l'evaluation RLS).
GRANT SELECT ON public.equipements          TO anon, authenticated;
GRANT SELECT ON public.amenity_equipements  TO anon, authenticated;

-- ── (d) RPC : bloc 5 amenities reecrit avec la CTE N-N ──
CREATE OR REPLACE FUNCTION public.admin_upsert_chateau(
  p_id        uuid,
  p_base      jsonb,
  p_chambres  jsonb DEFAULT NULL,
  p_timeline  jsonb DEFAULT NULL,
  p_alentours jsonb DEFAULT NULL,
  p_amenities jsonb DEFAULT NULL
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
    est_la_une                  = v_row.est_la_une,
    is_demo_mock                = v_row.is_demo_mock,
    hero_night_stars            = v_row.hero_night_stars,
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

  RETURN p_id;
END;
$$;

COMMENT ON FUNCTION public.admin_upsert_chateau(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) IS
  'Ecriture transactionnelle admin d''un chateau. Base = update partiel (34 colonnes). Chambres = DIFF (upsert par id + delete des retirees, preserve les reservations). timeline/alentours = REPLACE. amenities = REPLACE + liaison N-N equipements (CTE uuid pre-genere : amenity + amenity_equipements dans la meme instruction). Garde is_admin(). SECURITY DEFINER + search_path fige.';
