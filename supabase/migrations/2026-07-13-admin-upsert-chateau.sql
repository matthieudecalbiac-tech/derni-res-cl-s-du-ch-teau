-- ============================================================
-- admin_upsert_chateau — ecriture transactionnelle d'un chateau complet
--
-- Un chateau vit dans cinq tables : sa ligne de base et quatre filles
-- (chambres, timeline, alentours, amenities). Le client PostgREST ne sait pas
-- ecrire plusieurs tables dans une meme transaction : chaque requete part
-- seule, et un echec au milieu laisserait un chateau a moitie ecrit. Cette
-- fonction plpgsql fait tout en une transaction implicite — tout passe, ou
-- rien ne change.
--
-- STRATEGIE REPLACE pour les filles : on efface les lignes du chateau puis on
-- reinsere le jeu recu. Ce n'est pas une fusion ligne a ligne, c'est un
-- remplacement, garde par la presence du tableau.
--
-- Contrat des tables filles (chambres, timeline, alentours, amenities) :
--   null / omis  = section preservee (la fonction ne la touche pas)
--   []           = section videe explicitement
--   [ ... ]      = section remplacee par ce jeu
-- Un tableau oublie cote service (serialise en null) ne detruit donc jamais
-- une fille : seul un [] explicite vide une section.
--
-- BASE en revanche : mise a jour PARTIELLE. jsonb_populate_record fusionne
-- p_base sur la ligne existante — les cles presentes ecrasent (null compris),
-- les absentes restent. Seules les colonnes editoriales sont touchees ; statut,
-- id, compteurs et timestamps ne sont jamais dans p_base et ne bougent pas.
--
-- SECURITE : SECURITY DEFINER (la fonction s'execute avec les droits du
-- proprietaire et court-circuite donc la RLS des tables) — la garde is_admin()
-- en toute premiere instruction est alors le seul controle d'acces, et
-- search_path est fige a public pour fermer l'injection de schema.
--
-- Les colonnes des INSERT correspondent exactement a ce que produisent les
-- mappers inverses chambreToRow / timelineToRow / alentourToRow / amenityToRow.
-- Idempotente : CREATE OR REPLACE.
-- ============================================================

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
    prop_description            = v_row.prop_description
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
  'Ecriture transactionnelle admin d''un chateau complet. Base = update partiel (jsonb_populate_record), filles = strategie REPLACE. Garde is_admin(). SECURITY DEFINER + search_path fige.';

-- La garde is_admin() interne fait le controle d'acces ; on peut donc exposer
-- l'execution a tout utilisateur authentifie (un non-admin sera refuse par le
-- RAISE EXCEPTION en tete de fonction).
GRANT EXECUTE ON FUNCTION public.admin_upsert_chateau(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) TO authenticated;
