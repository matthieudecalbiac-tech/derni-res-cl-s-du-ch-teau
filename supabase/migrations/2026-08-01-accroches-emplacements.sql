-- ============================================================
-- Accroches editoriales par emplacement — 6 colonnes optionnelles + RPC
--
-- LE PROBLEME. Aucun texte d'appel de la vitrine n'est ecrit par la direction
-- artistique. Le journal DECOUPE : quatre premieres phrases de chateaux.histoire
-- pour l'affiche, deux de prop_description pour la breve Proprietaires, et pour
-- les Services une phrase COMPOSEE EN JAVASCRIPT (« Le domaine compte 7 services
-- et 6 activites. » suivie de quatre noms). La barre laterale, elle, sert trois
-- phrases constantes, identiques pour les cinq chateaux publies.
-- La DA peut reecrire `histoire` en esperant que la coupe tombe bien. Elle ne
-- peut pas decider de la phrase.
--
-- LA DECISION, MEME PATRON QUE LES PHOTOS (2026-07-31). Un champ texte DEDIE par
-- emplacement, OPTIONNEL :
--   rempli -> la vitrine l'affiche telle quelle ;
--   vide   -> repli sur la logique actuelle, a l'identique.
-- Les 6 colonnes naissent NULL, et NULL est exactement le cas « repli » : AUCUNE
-- vitrine ne change tant que rien n'est ecrit.
--
-- ⚠ POURQUOI LA RPC EST REDEFINIE ICI. admin_upsert_chateau peuple v_row par
-- jsonb_populate_record (qui prendra les 6 nouvelles cles sans rien changer),
-- mais son UPDATE assigne des colonnes EXPLICITES. Une colonne absente de ce SET
-- est ecrite dans v_row puis silencieusement jetee : le formulaire admin semble
-- enregistrer, et rien ne bouge en base. C'est le trou ferme le 17 juillet pour
-- mode_paiement, et re-ferme le 31 juillet pour les 7 img_*. Troisieme fois.
--
-- Idempotent : ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE. Rejouable.
-- Signature 7-parametres INCHANGEE, donc pas de DROP FUNCTION : les accroches
-- voyagent dans p_base, un jsonb deja ouvert.
-- ============================================================

BEGIN;

-- ── 1. Les 6 colonnes d'accroche ─────────────────────────────────────────────
-- text et non varchar(n) : ce sont des phrases editoriales, et une limite
-- arbitraire se decouvre toujours le jour ou elle tronque la bonne formule. La
-- mise en page, elle, est deja bornee cote CSS.
ALTER TABLE public.chateaux ADD COLUMN IF NOT EXISTS accroche_journal_histoire       text;
ALTER TABLE public.chateaux ADD COLUMN IF NOT EXISTS accroche_journal_proprietaires  text;
ALTER TABLE public.chateaux ADD COLUMN IF NOT EXISTS accroche_journal_services       text;
ALTER TABLE public.chateaux ADD COLUMN IF NOT EXISTS accroche_barre_permanent        text;
ALTER TABLE public.chateaux ADD COLUMN IF NOT EXISTS accroche_barre_dernieres_cles   text;
ALTER TABLE public.chateaux ADD COLUMN IF NOT EXISTS accroche_barre_club             text;

COMMENT ON COLUMN public.chateaux.accroche_journal_histoire IS
  'Accroche de l''affiche « L''histoire du domaine » du journal. NULL = repli sur les 4 premieres phrases de chateaux.histoire (decoupe auto, plafond 460 car.).';
COMMENT ON COLUMN public.chateaux.accroche_journal_proprietaires IS
  'Accroche de la breve « Les proprietaires » du journal. NULL = repli sur les 2 premieres phrases de prop_description, a defaut prop_citation (plafond 240 car.).';
COMMENT ON COLUMN public.chateaux.accroche_journal_services IS
  'Accroche de la breve « L''art de recevoir » du journal. NULL = repli sur la phrase composee en JS depuis les amenities (comptes + 4 noms cites).';
COMMENT ON COLUMN public.chateaux.accroche_barre_permanent IS
  'Phrase de la carte Permanent de la barre laterale. NULL = repli sur la constante PHRASES_BANDEAU.permanent (identique pour tous les chateaux).';
COMMENT ON COLUMN public.chateaux.accroche_barre_dernieres_cles IS
  'Phrase de la carte Dernieres Cles de la barre laterale. NULL = repli sur la constante PHRASES_BANDEAU.dernieresCles (identique pour tous les chateaux).';
COMMENT ON COLUMN public.chateaux.accroche_barre_club IS
  'Phrase de la carte Club Chatelains de la barre laterale. NULL = repli sur la constante PHRASES_BANDEAU.club (identique pour tous les chateaux).';

-- ── 2. admin_upsert_chateau : les 6 colonnes entrent dans l'UPDATE SET ───────
-- Corps BYTE-IDENTIQUE a 2026-07-31-photos-emplacements.sql, aux 6 lignes du SET
-- pres (bloc 1, juste apres le bloc des sept img_*).

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
  'Ecriture transactionnelle admin d''un chateau. Base = update partiel (47 colonnes, dont les 7 img_* et les 6 accroche_* d''emplacement de vitrine). Chambres = DIFF (upsert par id + delete des retirees, preserve les reservations). timeline/alentours = REPLACE. amenities = REPLACE + liaison N-N equipements (CTE uuid pre-genere). personnages = get-or-create par slug (slug calcule en JS, dedup DISTINCT ON avant upsert) + REPLACE de la liaison chateau_personnages. Garde is_admin(). SECURITY DEFINER + search_path fige.';



COMMIT;

-- ============================================================
-- VERIFICATIONS (lecture seule ; le Dashboard n'affiche que le DERNIER resultat).
--
-- ⚠ La verification (C) de la migration du 31 juillet etait FAUSSE : elle ecrivait
--    FROM regexp_matches(pg_get_functiondef(p.oid), ...) JOIN pg_proc p ON true
--    soit p.oid reference AVANT que pg_proc p n'existe dans le FROM. Postgres
--    rejette (« invalid reference to FROM-clause entry for table p »). Corrige
--    ici par un CROSS JOIN LATERAL, qui n'est licite qu'APRES la table dont il
--    depend. Les trois controles ci-dessous s'executent tels quels.
-- ============================================================

-- (A) Les 6 colonnes existent et sont nullables (attendu : 6 lignes, is_nullable=YES)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'chateaux'
  AND column_name LIKE 'accroche\_%'
ORDER BY column_name;

-- (B) Aucun chateau n'a d'accroche (attendu : 6 zeros — donc AUCUNE vitrine ne change)
SELECT
  count(accroche_journal_histoire)      AS journal_histoire,
  count(accroche_journal_proprietaires) AS journal_proprietaires,
  count(accroche_journal_services)      AS journal_services,
  count(accroche_barre_permanent)       AS barre_permanent,
  count(accroche_barre_dernieres_cles)  AS barre_dernieres_cles,
  count(accroche_barre_club)            AS barre_club
FROM public.chateaux;

-- (C) Les 6 colonnes sont bien ASSIGNEES dans la RPC (attendu : 6).
-- LATERAL et non un FROM en tete : la fonction regexp_matches consomme p.oid,
-- elle doit donc venir APRES pg_proc p. C'est la correction du 31 juillet.
SELECT count(*) AS accroches_dans_le_set
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN LATERAL regexp_matches(
  pg_get_functiondef(p.oid), 'accroche_[a-z_]+ +=', 'g'
) AS m
WHERE n.nspname = 'public' AND p.proname = 'admin_upsert_chateau';

-- (C bis) Meme controle pour les 7 img_* (attendu : 7) — la requete que la
-- migration precedente n'a pas pu executer, rejouee correctement.
SELECT count(*) AS img_dans_le_set
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN LATERAL regexp_matches(
  pg_get_functiondef(p.oid), 'img_[a-z_]+ +=', 'g'
) AS m
WHERE n.nspname = 'public' AND p.proname = 'admin_upsert_chateau';
