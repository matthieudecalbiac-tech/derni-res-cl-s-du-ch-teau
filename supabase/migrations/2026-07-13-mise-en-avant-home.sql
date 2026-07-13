-- ============================================================
-- Mise en avant sur la home — contrôle admin des 2 sections
--
-- Niveau 2 : piloter depuis le formulaire admin les deux sections de la home
-- qui listent des châteaux, au lieu d'un filtre auto et d'une liste de slugs
-- codée en dur.
--
-- Deux colonnes ajoutées à public.chateaux :
--   - une_de_la_semaine (bool) : vedette CURATÉE de la section "Les clés à la
--     une". L'admin choisit explicitement qui y figure (décision projet :
--     "une de la semaine = admin-curated, pas auto").
--   - ordre_home (integer, nullable) : ordre d'affichage de la section
--     "Découvrez aussi". null = pas d'ordre défini → ira en fin de tri.
--
-- PARTIE (a) : ALTER TABLE (idempotent, ADD COLUMN IF NOT EXISTS).
-- PARTIE (b) : CREATE OR REPLACE de admin_upsert_chateau. La fonction avait une
--   liste SET FIGÉE de 32 colonnes ; sans cette mise à jour, le formulaire
--   écrirait les 2 nouveaux champs dans p_base mais la RPC les ignorerait
--   silencieusement. On ajoute donc une_de_la_semaine et ordre_home au SET
--   (32 → 34). RIEN d'autre ne change : garde is_admin, SECURITY DEFINER,
--   search_path, les 4 REPLACE des filles, le contrat null/[] sont identiques.
-- ============================================================

-- ── PARTIE (a) : colonnes ──
ALTER TABLE public.chateaux
  ADD COLUMN IF NOT EXISTS une_de_la_semaine boolean NOT NULL DEFAULT false;

ALTER TABLE public.chateaux
  ADD COLUMN IF NOT EXISTS ordre_home integer;

COMMENT ON COLUMN public.chateaux.une_de_la_semaine IS
  'Vedette curatée de la section home "Les clés à la une". Choisie par l''admin.';
COMMENT ON COLUMN public.chateaux.ordre_home IS
  'Ordre d''affichage section home "Découvrez aussi" (null = fin de tri).';


-- ── PARTIE (b) : RPC avec les 2 nouvelles colonnes dans le SET (32 → 34) ──
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

  -- ── 2. chambres : REPLACE ──
  IF p_chambres IS NOT NULL THEN
    DELETE FROM public.chambres WHERE chateau_id = p_id;
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
    FROM jsonb_array_elements(p_chambres) WITH ORDINALITY AS t(e, ord);
  END IF;

  -- ── 3. timeline : REPLACE ──
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

  -- ── 4. alentours : REPLACE ──
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

  -- ── 5. amenities : REPLACE (ligne pivot complete, pas 4 booleens) ──
  IF p_amenities IS NOT NULL THEN
    DELETE FROM public.chateau_amenities WHERE chateau_id = p_id;
    INSERT INTO public.chateau_amenities
      (chateau_id, type, nom, description, icone, inclus, prix_supplement_cents, duree_minutes, ordre)
    SELECT
      p_id,
      (e->>'type')::public.amenity_type,
      e->>'nom',
      e->>'description',
      e->>'icone',
      COALESCE((e->>'inclus')::boolean, true),
      (e->>'prix_supplement_cents')::integer,
      (e->>'duree_minutes')::integer,
      COALESCE((e->>'ordre')::integer, (ord - 1)::integer)
    FROM jsonb_array_elements(p_amenities) WITH ORDINALITY AS t(e, ord);
  END IF;

  RETURN p_id;
END;
$$;

COMMENT ON FUNCTION public.admin_upsert_chateau(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) IS
  'Ecriture transactionnelle admin d''un chateau complet. Base = update partiel (jsonb_populate_record, 34 colonnes editoriales), filles = strategie REPLACE. Garde is_admin(). SECURITY DEFINER + search_path fige.';
