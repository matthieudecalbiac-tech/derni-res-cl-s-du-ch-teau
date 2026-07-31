-- ============================================================
-- Photos par EMPLACEMENT de vitrine — 7 colonnes optionnelles + RPC
--
-- LE PROBLEME. Le journal (JournalApercus) et la barre laterale (BarreLaterale)
-- piochent tous les deux dans chateaux.images, en sautant l'image du hero, au
-- MEME index : images[1] sert l'affiche Histoire ET la carte Permanent,
-- images[2] la breve Proprietaires ET la carte Dernieres Cles, images[3] la
-- breve Services ET la carte Club. La meme photo apparait donc deux fois par
-- ecran. Aux Briottieres (2 images, donc 1 hors hero) c'est la MEME photo aux
-- six emplacements.
--
-- LA DECISION. Un champ image DEDIE par emplacement, OPTIONNEL :
--   rempli -> la vitrine l'utilise, il surclasse la pioche ;
--   vide   -> repli sur la logique actuelle, a l'identique.
-- Aucune vitrine ne change d'apparence tant que rien n'est assigne : les 7
-- colonnes naissent NULL, et NULL est exactement le cas "repli".
--
-- ⚠ POURQUOI LA RPC EST REDEFINIE ICI. admin_upsert_chateau peuple v_row par
-- jsonb_populate_record (qui prendra les 7 nouvelles cles sans rien changer),
-- mais son UPDATE assigne des colonnes EXPLICITES. Une colonne absente de ce
-- SET est ecrite dans v_row puis silencieusement jetee : le formulaire admin
-- semble enregistrer, et rien ne bouge en base. C'est EXACTEMENT le trou que la
-- migration 2026-07-17 a ferme pour mode_paiement. Ajouter les colonnes sans
-- toucher au SET reproduirait le bug a l'identique, sept fois.
--
-- Idempotent : ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE. Rejouable.
--
-- PAS DE DROP FUNCTION cette fois : la signature 7-parametres est INCHANGEE,
-- CREATE OR REPLACE suffit. Le DROP+CREATE de 2026-07-17 etait rendu necessaire
-- par le passage de 6 a 7 parametres ; sans changement de signature, il ne
-- ferait qu'ouvrir une fenetre ou la fonction n'existe pas.
-- ============================================================

BEGIN;

-- ── 1. Les 7 colonnes d'emplacement ──────────────────────────────────────────
-- text et non un type dedie : ce sont les memes URL / chemins que images[],
-- prop_portrait ou chambres.image — meme storage, meme bouton de televersement.
ALTER TABLE public.chateaux ADD COLUMN IF NOT EXISTS img_hero                   text;
ALTER TABLE public.chateaux ADD COLUMN IF NOT EXISTS img_journal_histoire       text;
ALTER TABLE public.chateaux ADD COLUMN IF NOT EXISTS img_journal_proprietaires  text;
ALTER TABLE public.chateaux ADD COLUMN IF NOT EXISTS img_journal_services       text;
ALTER TABLE public.chateaux ADD COLUMN IF NOT EXISTS img_barre_permanent        text;
ALTER TABLE public.chateaux ADD COLUMN IF NOT EXISTS img_barre_dernieres_cles   text;
ALTER TABLE public.chateaux ADD COLUMN IF NOT EXISTS img_barre_club             text;

COMMENT ON COLUMN public.chateaux.img_hero IS
  'Photo de l''emplacement HERO de la vitrine. NULL = repli sur images[0].';
COMMENT ON COLUMN public.chateaux.img_journal_histoire IS
  'Photo de l''affiche « L''histoire du domaine » du journal. NULL = repli sur la pioche dans images[] hors hero.';
COMMENT ON COLUMN public.chateaux.img_journal_proprietaires IS
  'Photo de la breve « Les proprietaires » du journal. NULL = repli sur prop_portrait, puis sur la pioche.';
COMMENT ON COLUMN public.chateaux.img_journal_services IS
  'Photo de la breve « L''art de recevoir » du journal. NULL = repli sur la 1re image d''amenity, puis sur la pioche.';
COMMENT ON COLUMN public.chateaux.img_barre_permanent IS
  'Photo de la carte Permanent de la barre laterale. NULL = repli sur la pioche dans images[] hors hero.';
COMMENT ON COLUMN public.chateaux.img_barre_dernieres_cles IS
  'Photo de la carte Dernieres Cles de la barre laterale. NULL = repli sur la pioche dans images[] hors hero.';
COMMENT ON COLUMN public.chateaux.img_barre_club IS
  'Photo de la carte Club Chatelains de la barre laterale. NULL = repli sur la pioche dans images[] hors hero.';

-- ── 2. admin_upsert_chateau : les 7 colonnes entrent dans l'UPDATE SET ───────
-- Corps BYTE-IDENTIQUE a 2026-07-17-rpc-mode-paiement.sql, aux 7 lignes du SET
-- pres (bloc 1, juste apres video_background_youtube_id).

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
    est_la_une                  = v_row.est_la_une,
    is_demo_mock                = v_row.is_demo_mock,
    hero_night_stars            = v_row.hero_night_stars,
    mode_paiement               = v_row.mode_paiement,
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
  'Ecriture transactionnelle admin d''un chateau. Base = update partiel (41 colonnes, dont les 7 img_* d''emplacement de vitrine). Chambres = DIFF (upsert par id + delete des retirees, preserve les reservations). timeline/alentours = REPLACE. amenities = REPLACE + liaison N-N equipements (CTE uuid pre-genere). personnages = get-or-create par slug (slug calcule en JS, dedup DISTINCT ON avant upsert) + REPLACE de la liaison chateau_personnages. Garde is_admin(). SECURITY DEFINER + search_path fige.';


COMMIT;

-- ============================================================
-- VERIFICATIONS (lecture seule ; le Dashboard n'affiche que le DERNIER resultat).
-- ============================================================

-- (A) Les 7 colonnes existent et sont nullables (attendu : 7 lignes, is_nullable=YES)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'chateaux' AND column_name LIKE 'img\_%'
ORDER BY column_name;

-- (B) Aucun chateau n'est assigne (attendu : 7 zeros — donc AUCUNE vitrine ne change)
SELECT
  count(img_hero)                  AS hero,
  count(img_journal_histoire)      AS journal_histoire,
  count(img_journal_proprietaires) AS journal_proprietaires,
  count(img_journal_services)      AS journal_services,
  count(img_barre_permanent)       AS barre_permanent,
  count(img_barre_dernieres_cles)  AS barre_dernieres_cles,
  count(img_barre_club)            AS barre_club
FROM public.chateaux;

-- (C) Les 7 colonnes sont bien dans l'UPDATE de la RPC (attendu : 7)
SELECT count(*) AS lignes_img_dans_le_set
FROM regexp_matches(pg_get_functiondef(p.oid), 'img_[a-z_]+ +=', 'g') AS m
JOIN pg_proc p ON true
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'admin_upsert_chateau';
