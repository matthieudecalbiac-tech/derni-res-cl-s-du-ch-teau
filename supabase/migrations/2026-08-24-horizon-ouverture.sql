-- ============================================================
-- LCC — moteur, etape 3.1 : l'HORIZON D'OUVERTURE
-- ============================================================
--
-- QUOI — trois pieces, dans une seule transaction :
--   1. la colonne  chateaux.dispo_ouverte_jusqu_a
--   2. est_disponible  apprend a la lire  (UNE branche ajoutee)
--   3. admin_upsert_chateau  apprend a l'ecrire  (UNE ligne ajoutee)
--
-- ── POURQUOI UN HORIZON, ET PAS DES LIGNES MATERIALISEES ────────────────────
--
-- La decision produit est « le chatelain ne fait QUE bloquer » — le geste
-- Airbnb. ⚠ IL FAUT LE NOMMER HONNETEMENT : c'est un opt-OUT, pas une
-- preservation de l'opt-in decide le 23 aout. Un oubli de blocage OUVRE
-- desormais une nuit, ce que l'opt-in ecartait. L'horizon est la borne qui rend
-- ce risque FINI.
--
-- L'alternative etait de materialiser des lignes `true` sur un horizon glissant.
-- Ecartee, et pas pour le volume : 62 chambres (dont 44 publiees) font ~22 600
-- lignes par an, negligeable face aux 8 Go du plan Pro. Ecartee pour
-- L'ENTRETIEN — un horizon qui glisse demande un CRON.
--
-- ⚠⚠ ET LE MODE DE PANNE DE CE CRON AURAIT ETE SILENCIEUX. S'il s'arrete,
-- personne ne le voit : les dates lointaines cessent d'etre reservables, une par
-- jour, sans erreur ni log ni test rouge. On s'en apercevrait a la baisse des
-- demandes. Sur un moteur de reservation, c'est le pire mode de panne possible
-- — et ce depot porte deja la dette « le cron n'est pas versionne ».
--
-- Ici : zero ligne, aucun cron, et l'horizon est une DONNEE VISIBLE que le
-- chatelain controle. Rien ne bouge tout seul.
--
-- ── LES TROIS ETATS D'UNE NUIT, EN MODE GERE ────────────────────────────────
--
--   ligne est_disponible = false   FERMEE   le chatelain a bloque
--   ligne est_disponible = true    OUVERTE  ouverture explicite
--   PAS DE LIGNE                   OUVERTE  si nuit <= dispo_ouverte_jusqu_a
--                                  FERMEE   au-dela
--
-- ⚠ RETROCOMPATIBLE PAR CONSTRUCTION. `dispo_ouverte_jusqu_a IS NULL` rend le
-- second terme du COALESCE faux, donc une nuit sans ligne est FERMEE — trait
-- pour trait ce que produisait le JOIN interne, qui l'eliminait du compte. Ce
-- n'est pas une equivalence a verifier cas par cas : c'est la meme valeur,
-- obtenue autrement. Les SEIZE tests de l'etape 2.2 passent INCHANGES, parite
-- #142 comprise. On ETEND, on ne reecrit pas.
--
-- ── DEUX PROPRIETES EMERGENTES, A CONNAITRE ─────────────────────────────────
--
-- ⚠ UNE LIGNE `true` EST PLUS FORTE QUE L'HORIZON. Un chatelain peut donc ouvrir
-- une date lointaine — un mariage reserve deux ans a l'avance — SANS deplacer
-- tout son horizon. Ce n'est pas un effet de bord, c'est utile, et c'est garde
-- par un test.
--
-- ⚠ LE CALENDRIER S'ARRETE DE LUI-MEME A L'HORIZON. jours_disponibles_chambre
-- cesse de rendre des nuits au-dela, sans que personne ne code cette limite —
-- elle decoule de l'appel par nuit a est_disponible. Coherent (on ne montre
-- ouvert que ce qui l'est), mais un lecteur pourrait le prendre pour un defaut.
--
-- ── LES TROIS FILLES N'ONT PAS A CHANGER ────────────────────────────────────
--
-- chateau_disponible, jours_disponibles_chambre et jours_disponibles_chateau
-- APPELLENT est_disponible, elles ne la copient pas. Elles heritent donc de la
-- branche horizon sans une ligne de plus. C'est le dividende de la decision de
-- l'etape 2.3 — la seule forme qui rendait ce genre d'evolution gratuit.
--
-- IMPACT — aucun tant qu'aucun chateau ne porte d'horizon : la colonne nait a
-- NULL sur les 13 chateaux. La bascule reste une operation de DONNEE.
--
-- IDEMPOTENTE — ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE.
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. LA COLONNE
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.chateaux
  ADD COLUMN IF NOT EXISTS dispo_ouverte_jusqu_a date;

COMMENT ON COLUMN public.chateaux.dispo_ouverte_jusqu_a IS
  'Horizon d''ouverture par defaut, en mode gere. NULL = aucune ouverture par defaut : seules les lignes disponibilites a true ouvrent (comportement d''avant le 24 aout 2026). Une DATE = les nuits SANS LIGNE jusqu''a elle incluse valent OUVERTES, au-dela FERMEES. ⚠ Le chatelain ne saisit alors QUE ses blocages (geste « Airbnb ») — c''est un opt-OUT BORNE, nomme comme tel : un oubli de blocage OUVRE une nuit. L''horizon est la borne qui rend ce risque fini. ⚠ Une ligne a true reste PLUS FORTE que l''horizon : on peut ouvrir une date lointaine sans deplacer l''horizon.';


-- ────────────────────────────────────────────────────────────────────────────
-- 2. est_disponible — UNE branche ajoutee dans la source 2
-- ⚠ Le reste est repris A L'IDENTIQUE de 2026-08-23-est-disponible.sql, seule
--   migration de cette fonction, appliquee le 23 aout depuis ce fichier meme.
--   Quatre lignes touchees : la declaration de v_horizon, la colonne de plus
--   dans le SELECT INTO, JOIN -> LEFT JOIN, et le WHERE devenu COALESCE.
--   ⚠ LA SOURCE 1 (reservations) N'EST PAS TOUCHEE — le predicat de parite #142
--   est intact au caractere pres, et un garde mecanique le verifie apres COMMIT.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.est_disponible(
  p_chambre_id uuid,
  p_arrivee    date,
  p_depart     date
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chateau_id uuid;
  v_geree      boolean;
  v_horizon    date;      -- ⚠ AJOUT 2026-08-24
  v_nuits      integer;
  v_ouvertes   integer;
BEGIN
  -- ── 0. BORNES ──
  -- Une plage vide ou inversee n'est pas « disponible », elle est invalide : on
  -- rend false plutot que de lever, parce que l'appelant est un ECRAN.
  IF p_chambre_id IS NULL OR p_arrivee IS NULL OR p_depart IS NULL THEN
    RETURN false;
  END IF;
  IF p_depart <= p_arrivee THEN
    RETURN false;
  END IF;
  IF p_arrivee < CURRENT_DATE THEN
    RETURN false;
  END IF;

  -- La chambre doit exister ; on resout son chateau, son mode et son horizon au
  -- passage. ⚠ AUCUN aller-retour de plus : la jointure sur chateaux existait
  -- deja pour lire dispo_geree.
  SELECT ch.chateau_id, c.dispo_geree, c.dispo_ouverte_jusqu_a
    INTO v_chateau_id, v_geree, v_horizon
    FROM public.chambres ch
    JOIN public.chateaux c ON c.id = ch.chateau_id
   WHERE ch.id = p_chambre_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- ── 1. RESERVATION ACTIVE ──
  -- ⚠ PREDICAT COPIE MOT POUR MOT DE reservations_pas_de_chevauchement.
  --   Memes statuts, meme borne '[)'. Toute divergence ferait promettre a
  --   l'ecran ce que la base refuse. Le test de PARITE le confronte.
  IF EXISTS (
    SELECT 1
      FROM public.reservations r
     WHERE r.chambre_id = p_chambre_id
       AND r.status IN ('confirmed', 'completed')
       AND daterange(r.date_arrivee, r.date_depart, '[)')
        && daterange(p_arrivee, p_depart, '[)')
  ) THEN
    RETURN false;
  END IF;

  -- ── 2. CALENDRIER — seulement si le chateau est en gestion ──
  -- Hors gestion, la table n'est PAS consultee : comportement historique.
  IF v_geree THEN
    -- Les NUITS d'un sejour [arrivee, depart) sont arrivee .. depart-1.
    -- Le depart n'est pas une nuit : on ne dort pas le soir du depart.
    v_nuits := p_depart - p_arrivee;

    -- On compte les nuits OUVERTES. Trois cas, une seule expression :
    --   ligne presente  -> sa valeur tranche (true ouvre, false ferme)
    --   pas de ligne    -> l'HORIZON tranche
    --
    -- ⚠ LEFT JOIN, et non JOIN : sans lui, une nuit sans ligne disparaitrait du
    --   resultat avant meme d'etre jugee, et l'horizon ne pourrait pas s'y
    --   appliquer. C'est LA modification du 24 aout.
    --
    -- ⚠ RETROCOMPATIBLE PAR CONSTRUCTION : si v_horizon IS NULL, le second
    --   terme vaut FALSE, donc une nuit sans ligne est fermee — exactement ce
    --   que produisait l'ancien JOIN interne.
    SELECT count(*)
      INTO v_ouvertes
      FROM generate_series(p_arrivee, p_depart - 1, interval '1 day') AS g(nuit)
      LEFT JOIN public.disponibilites d
        ON d.chambre_id = p_chambre_id
       AND d.date = g.nuit::date
     WHERE COALESCE(
             d.est_disponible,                                    -- ⚠ la COLONNE, pas la fonction homonyme
             v_horizon IS NOT NULL AND g.nuit::date <= v_horizon  -- ⚠ borne INCLUSE
           );

    IF v_ouvertes <> v_nuits THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.est_disponible(uuid, date, date) IS
  'Disponibilite d''une CHAMBRE sur [arrivee, depart) — depart exclu. Compose, dans l''ordre : bornes (depart > arrivee, arrivee >= aujourd''hui, chambre existante), reservation confirmed/completed chevauchante (predicat COPIE MOT POUR MOT de la contrainte reservations_pas_de_chevauchement — toute divergence ferait promettre a l''ecran ce que la base refuse), puis le calendrier UNIQUEMENT si chateaux.dispo_geree. TROIS ETATS par nuit depuis le 24 aout 2026 : ligne a false = FERMEE ; ligne a true = OUVERTE ; PAS DE LIGNE = ouverte si la nuit est <= chateaux.dispo_ouverte_jusqu_a (borne incluse), fermee au-dela. ⚠ dispo_ouverte_jusqu_a a NULL reproduit exactement le comportement anterieur (aucune ouverture par defaut) — la branche est retrocompatible par construction. ⚠ DEUX PROPRIETES EMERGENTES : une ligne a true est PLUS FORTE que l''horizon (on ouvre une date lointaine sans deplacer l''horizon) ; et jours_disponibles_* s''arrete de lui-meme a l''horizon, sans que cette limite soit codee nulle part. pending n''occupe pas. L''offre n''est PAS evaluee (hors fenetre d''offre ne veut pas dire indisponible, seulement pas a ce tarif). disponibilites.reservation_id n''est PAS lu. SECURITY DEFINER : reservations est sous RLS, un appel cote navigateur ne verrait RIEN de ce qui bloque.';


-- ────────────────────────────────────────────────────────────────────────────
-- 3. admin_upsert_chateau — la colonne entre dans l'UPDATE SET
-- ⚠ MEME PIEGE QU'AU 23 AOUT : jsonb_populate_record peuple bien
--   v_row.dispo_ouverte_jusqu_a, mais l'UPDATE nomme ses colonnes UNE PAR UNE.
--   Sans cette ligne, le champ serait saisi, sauvegarde, et sans effet.
-- ⚠ Le corps ci-dessous est EXTRAIT PAR SCRIPT de 2026-08-23-upsert-dispo-geree.sql
--   (la version en base, dont le garde avant/apres a prouve l'exactitude), et non
--   retape. Une seule ligne — plus son commentaire — y est ajoutee.
-- ────────────────────────────────────────────────────────────────────────────

-- GARDE (avant) — memoriser la definition actuelle.
DROP TABLE IF EXISTS _upsert_avant_horizon;
CREATE TEMP TABLE _upsert_avant_horizon AS
SELECT pg_get_functiondef(p.oid) AS def
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'admin_upsert_chateau';

DO $g$
BEGIN
  IF (SELECT count(*) FROM _upsert_avant_horizon) <> 1 THEN
    RAISE EXCEPTION
      'admin_upsert_chateau introuvable (ou surchargee) : cette migration remplace une fonction existante.';
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
  'Ecriture transactionnelle admin d''un chateau. Base = update partiel (52 colonnes, dont les 7 img_*, les 6 accroche_*, les 2 titre_* d''emplacement de vitrine, dispo_geree depuis le 2026-08-23 et dispo_ouverte_jusqu_a depuis le 2026-08-24). Chambres = DIFF (upsert par id + delete des retirees, preserve les reservations). timeline/alentours = REPLACE. amenities = REPLACE + liaison N-N equipements (CTE uuid pre-genere). personnages = get-or-create par slug (slug calcule en JS, dedup DISTINCT ON avant upsert) + REPLACE de la liaison chateau_personnages. Garde is_admin(). SECURITY DEFINER + search_path fige.';


-- ────────────────────────────────────────────────────────────────────────────
-- GARDES (apres) — la migration se prouve, ou elle s'annule.
-- ────────────────────────────────────────────────────────────────────────────
DO $g$
DECLARE
  v_avant   text;
  v_dispo   text;
  v_perdues text[];
  v_gagnees text[];
BEGIN
  -- (i) est_disponible : le PREDICAT DE PARITE #142 est-il toujours la ?
  --     C'est le seul morceau dont une perte serait invisible et couteuse : la
  --     fonction continuerait de repondre, en se trompant.
  SELECT pg_get_functiondef(p.oid) INTO v_dispo
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'est_disponible';

  IF v_dispo IS NULL THEN
    RAISE EXCEPTION 'est_disponible introuvable apres remplacement.';
  END IF;
  IF position('status IN (''confirmed'', ''completed'')' in v_dispo) = 0 THEN
    RAISE EXCEPTION
      'REGRESSION : le filtre de statuts de la parite #142 a disparu d''est_disponible. Rien n''est commite.';
  END IF;
  IF position('daterange(r.date_arrivee, r.date_depart, ''[)'')' in v_dispo) = 0 THEN
    RAISE EXCEPTION
      'REGRESSION : le daterange borne ''[)'' de la parite #142 a disparu d''est_disponible. Rien n''est commite.';
  END IF;
  IF position('dispo_ouverte_jusqu_a' in v_dispo) = 0 THEN
    RAISE EXCEPTION 'la branche horizon n''est pas dans est_disponible. Rien n''est commite.';
  END IF;

  -- (ii) admin_upsert_chateau : aucune colonne perdue, exactement une gagnee.
  SELECT def INTO v_avant FROM _upsert_avant_horizon;

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
      'REGRESSION : colonnes PERDUES par admin_upsert_chateau -> %. Rien n''est commite.', v_perdues;
  END IF;
  IF v_gagnees IS NOT NULL AND v_gagnees <> ARRAY['dispo_ouverte_jusqu_a'] THEN
    RAISE EXCEPTION
      'INATTENDU : colonnes ajoutees autres que dispo_ouverte_jusqu_a -> %. Rien n''est commite.', v_gagnees;
  END IF;

  RAISE NOTICE 'gardes OK — parite #142 intacte, upsert gain = %',
    COALESCE(v_gagnees::text, '{} (rejeu)');
END
$g$;

DROP TABLE _upsert_avant_horizon;

COMMIT;


-- ============================================================
-- VERIFICATION (lecture seule) — L'UNIQUE SELECT DU FICHIER.
-- Attendu, sur une seule ligne : tout a `true`, et 13 chateaux dont 0 avec
-- horizon (la colonne nait a NULL — rien ne bascule).
-- ⚠ NE RIEN AJOUTER APRES : le SQL Editor n'affiche que le dernier resultat.
-- ============================================================
SELECT
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema='public' AND table_name='chateaux'
      AND column_name='dispo_ouverte_jusqu_a' AND data_type='date') = 1        AS colonne_posee,
  (SELECT count(*) FROM public.chateaux)                                        AS chateaux,
  (SELECT count(*) FROM public.chateaux WHERE dispo_ouverte_jusqu_a IS NOT NULL) AS avec_horizon_doit_etre_0,
  (SELECT position('dispo_ouverte_jusqu_a' in pg_get_functiondef(p.oid)) > 0
     FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='est_disponible')                    AS est_disponible_lit_l_horizon,
  (SELECT position('LEFT JOIN public.disponibilites' in pg_get_functiondef(p.oid)) > 0
     FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='est_disponible')                    AS left_join_en_place,
  (SELECT count(DISTINCT m[1])
     FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     CROSS JOIN LATERAL regexp_matches(pg_get_functiondef(p.oid), '([a-z_]+)\s+=\s+v_row\.', 'g') AS m
    WHERE n.nspname='public' AND p.proname='admin_upsert_chateau')              AS colonnes_upsert_attendu_52;
