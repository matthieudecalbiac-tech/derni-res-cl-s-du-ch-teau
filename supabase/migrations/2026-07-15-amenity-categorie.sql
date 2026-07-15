-- ============================================================
-- chateau_amenities.categorie — catégorie éditoriale + persistance RPC
--
-- Fondation des filtres par expérience. La categorie est DISTINCTE du `type`
-- (service | activite) : elle traverse les deux (massage = service, piscine =
-- activite, tous deux « bien_etre »). Liste fermée de 6 valeurs, une seule par
-- amenity, NULLABLE (les services purement pratiques — wifi, recharge, animaux —
-- n'ont pas de catégorie et restent filtrables par nom).
--
-- Choix texte + CHECK (pas enum PG) : la taxonomie est éditoriale et destinée à
-- évoluer (7e catégorie, renommage, fusion). Un enum PG rendrait renommer /
-- supprimer une valeur douloureux (recréer le type + réécrire la colonne) ;
-- un CHECK s'ajuste par un simple DROP/ADD CONSTRAINT transactionnel. La
-- garantie « liste fermée » reste tenue par le CHECK + le select fixe du form.
--
-- DEUX parties indispensables (le piège déjà rencontré 3× : image,
-- mise-en-avant-home, diff-chambres) :
--
--   (a) ALTER TABLE : colonne `categorie text` + CONSTRAINT CHECK (6 valeurs
--       OR NULL). Idempotent : DROP CONSTRAINT IF EXISTS avant ADD.
--
--   (b) CREATE OR REPLACE de admin_upsert_chateau : le bloc amenities passe par
--       REPLACE (DELETE all + INSERT). Sans ajouter `categorie` à la liste
--       INSERT + au SELECT depuis le jsonb, le REPLACE réinsère les amenities
--       SANS leur catégorie → la catégorie saisie au formulaire serait
--       silencieusement perdue à chaque sauvegarde. La colonne DB ne suffit
--       pas, le RPC doit la transporter.
--
-- SEUL le bloc « 5. amenities » gagne la colonne categorie. Tout le reste de la
-- fonction est IDENTIQUE à la version amenity-image (garde is_admin,
-- SECURITY DEFINER, search_path, SET 34 colonnes base, chambres DIFF,
-- timeline/alentours REPLACE, contrat null/[]).
-- ============================================================

-- ── (a) Colonne categorie + CHECK (idempotent) ──
ALTER TABLE public.chateau_amenities
  ADD COLUMN IF NOT EXISTS categorie text;

ALTER TABLE public.chateau_amenities
  DROP CONSTRAINT IF EXISTS chateau_amenities_categorie_check;

ALTER TABLE public.chateau_amenities
  ADD CONSTRAINT chateau_amenities_categorie_check
  CHECK (categorie IS NULL OR categorie IN
    ('bien_etre', 'gastronomie', 'sport', 'nature', 'culture', 'famille'));

COMMENT ON COLUMN public.chateau_amenities.categorie IS
  'Catégorie éditoriale (liste fermée de 6, une seule, nullable) pour les filtres par expérience : bien_etre, gastronomie, sport, nature, culture, famille. DISTINCTE de `type` (service/activite) qu''elle traverse. NULL pour les services purement pratiques (wifi, recharge, animaux).';

-- ── (b) RPC : bloc amenities transporte désormais categorie ──
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

  -- ── 5. amenities : REPLACE (ligne pivot complete + image + categorie) ──
  IF p_amenities IS NOT NULL THEN
    DELETE FROM public.chateau_amenities WHERE chateau_id = p_id;
    INSERT INTO public.chateau_amenities
      (chateau_id, type, categorie, nom, description, icone, image, inclus, prix_supplement_cents, duree_minutes, ordre)
    SELECT
      p_id,
      (e->>'type')::public.amenity_type,
      NULLIF(e->>'categorie', ''),
      e->>'nom',
      e->>'description',
      e->>'icone',
      e->>'image',
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
  'Ecriture transactionnelle admin d''un chateau. Base = update partiel (34 colonnes). Chambres = DIFF (upsert par id + delete des retirees, preserve les reservations). timeline/alentours/amenities = REPLACE (amenities transporte image + categorie). Garde is_admin(). SECURITY DEFINER + search_path fige.';
