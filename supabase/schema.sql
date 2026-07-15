-- ═══════════════════════════════════════════════════════════════════════════
-- LES CLÉS DU CHÂTEAU — SCHEMA SUPABASE (S1-α)
-- ═══════════════════════════════════════════════════════════════════════════
-- Fichier         : supabase/schema.sql
-- Branche         : feature/supabase-foundation
-- Cible           : Postgres 15+ (Supabase managed)
-- Convention      : snake_case, IDs uuid, money en cents (int), enums Postgres
--
-- ARCHITECTURE
--   - 14 tables (1 auth + 5 contenu château + 3 modules/offres + 2 commerce
--                + 1 disponibilités + 2 ops)
--   - 5 enums (user_role, reservation_status, payout_status,
--              alentour_type, amenity_type)
--   - JSONB pour contenu éditorial monolithique (chiffres_cles, evenement_meta)
--   - TEXT[] pour collections homogènes (images, equipements)
--   - Tables séparées pour collections ordonnées avec CRUD admin
--     (timeline, alentours, amenities)
--   - Flatten 1:1 pour proprietaires (7 colonnes prop_*)
--   - Architecture multi-modules A/B/C/D (Permanent / Dernières Clés
--     / Club / Événementiel) avec offres routées par module
--   - Stripe Connect prêt dès J1 sur chateau_owners
--   - Colonnes plugeable (futurables) ajoutées dès J1 en nullable
--
-- IDEMPOTENCE
--   Le fichier peut être ré-exécuté sans erreur :
--   - CREATE EXTENSION IF NOT EXISTS
--   - DO blocks pour ENUMs (CREATE TYPE ne supporte pas IF NOT EXISTS)
--   - CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS
--   - DROP TRIGGER IF EXISTS avant CREATE TRIGGER
--
-- HORS PÉRIMÈTRE S1-α (à venir)
--   - RLS policies         → S1-β
--   - Données seed         → S1-γ
--   - Application migration → S1-δ
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. EXTENSIONS POSTGRES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- gen_random_uuid() pour primary keys uuid (PG13+ l'inclut nativement,
-- mais on déclare l'extension explicitement pour la robustesse).


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. TYPES ENUM (5 types)
-- ═══════════════════════════════════════════════════════════════════════════
-- Chaque CREATE TYPE est encapsulé dans un DO block car CREATE TYPE
-- ne supporte pas IF NOT EXISTS.

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('client', 'membre_club', 'chatelain', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payout_status AS ENUM ('pending', 'sent', 'failed', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alentour_type AS ENUM (
    'patrimoine', 'gastronomie', 'nature', 'spirituel',
    'sport', 'village', 'culture', 'histoire'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE amenity_type AS ENUM ('service', 'activite');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE chateau_statut AS ENUM ('brouillon', 'publie', 'archive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. FONCTIONS UTILITAIRES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.trigger_set_timestamp() IS
  'Trigger générique BEFORE UPDATE — met à jour automatiquement updated_at à NOW().';


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. TABLES — AUTH & UTILISATEURS
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 4.1 — users (miroir de auth.users avec rôle métier)
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.users (
  id                  uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               text        NOT NULL,
  role                user_role   NOT NULL DEFAULT 'client',
  full_name           text,
  first_name          text,
  last_name           text,
  civilite            text,
  telephone           text,
  marketing_consent   boolean     NOT NULL DEFAULT false,
  referral_code       text        UNIQUE,
  created_at          timestamptz NOT NULL DEFAULT NOW(),
  updated_at          timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.users IS
  'Profils LCC — miroir de auth.users avec rôle métier (client/chatelain/admin) et attributs profil.';
COMMENT ON COLUMN public.users.role IS
  'Rôle métier : client (réserve), chatelain (gère un château), admin (back-office LCC).';
COMMENT ON COLUMN public.users.marketing_consent IS
  '[Plugeable] Opt-in marketing RGPD. Inutilisé en MVP, prévue pour Brevo (newsletter, séquences).';
COMMENT ON COLUMN public.users.referral_code IS
  '[Plugeable] Code parrainage unique. Inutilisé en MVP, prévue pour programme ambassadeur.';
COMMENT ON COLUMN public.users.first_name IS
  'Prénom — collecté en post-confirmation email via /completer-profil (Sprint alpha.2.5 Phase B4.5).';
COMMENT ON COLUMN public.users.last_name IS
  'Nom — collecté en post-confirmation email via /completer-profil.';
COMMENT ON COLUMN public.users.civilite IS
  'Civilité (M / Mme / Mx) — optionnelle, collectée /completer-profil. full_name conservé pour transition.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. TABLES — CHÂTEAUX & CONTENU
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 5.1 — chateaux (table cœur)
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chateaux (
  id                          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identité & SEO
  nom                         text         NOT NULL,
  slug                        text         NOT NULL UNIQUE,
  region                      text,
  departement                 text,
  ville                       text,
  accroche                    text,
  siecle                      text,
  style                       text,
  distance_paris              integer,                     -- minutes (cible LCC : ≤ 180)
  distance_paris_label        text,                        -- "55 km · 45 min" (label brut éditorial)
  urgence                     text,                        -- ex. "DERNIÈRES CLÉS"

  -- Géo
  coordonnees_lat             numeric(9,6),
  coordonnees_lng             numeric(9,6),

  -- Contenu éditorial
  histoire                    text,
  description                 text,
  region_narrative            text,
  region_histoire             text,
  chiffres_cles               jsonb,                       -- 4 entrées { titre, valeur, sous-titre }

  -- Médias
  images                      text[]       NOT NULL DEFAULT ARRAY[]::text[],
  video_background_youtube_id text,

  -- Propriétaires (flatten 1:1, 7 colonnes)
  prop_nom                    text,
  prop_depuis                 text,
  prop_initiale               text,
  prop_nom_affiche            text,
  prop_portrait               text,                        -- chemin /xxx-portrait.avif
  prop_citation               text,
  prop_description            text,

  -- Aiguillage layout & flags
  est_la_une                  boolean      NOT NULL DEFAULT false,
  is_demo_mock                boolean      NOT NULL DEFAULT false,
  hero_night_stars            boolean      NOT NULL DEFAULT false,   -- opt-in étoiles overlay nuit (cf. fix/vitrine-night-mode-polish)

  -- Mise en avant sur la home (contrôle admin — niveau 2, cf. migration 2026-07-13-mise-en-avant-home)
  une_de_la_semaine           boolean      NOT NULL DEFAULT false,   -- vedette curatée section "Les clés à la une"
  ordre_home                  integer,                               -- ordre section "Découvrez aussi" (null = fin de tri)

  -- Stats commerciales
  note_sur_5                  numeric(3,2),
  nb_avis                     integer      NOT NULL DEFAULT 0,
  date_disponible             date,                        -- prochaine date de dispo affichée

  -- Theme visuel
  couleur_theme               text,
  accent_theme                text,

  -- Caractéristiques (booleans)
  petit_dejeuner              boolean      NOT NULL DEFAULT false,
  parking                     boolean      NOT NULL DEFAULT false,
  wifi                        boolean      NOT NULL DEFAULT false,
  animaux                     boolean      NOT NULL DEFAULT false,

  -- Cycle de vie éditorial : on prépare, on diffuse, on retire sans détruire.
  -- Un bootstrap neuf n'a pas d'existant à sauver : le défaut est 'brouillon'.
  -- (La migration 2026-07-10 crée la colonne en 'publie' puis bascule le défaut,
  --  pour ne pas vider le catalogue des bases déjà déployées.)
  statut                      public.chateau_statut NOT NULL DEFAULT 'brouillon',

  created_at                  timestamptz  NOT NULL DEFAULT NOW(),
  updated_at                  timestamptz  NOT NULL DEFAULT NOW(),

  CONSTRAINT chateaux_note_valide CHECK (note_sur_5 IS NULL OR (note_sur_5 >= 0 AND note_sur_5 <= 5)),
  CONSTRAINT chateaux_avis_positif CHECK (nb_avis >= 0)
);

COMMENT ON TABLE  public.chateaux IS
  'Cœur du domaine — un château partenaire LCC. Source de vérité après migration depuis src/data/chateaux.js.';
COMMENT ON COLUMN public.chateaux.est_la_une IS
  'Si true, aiguillage automatique vers le layout VitrineChateau premium (cf. CLAUDE.md § Aiguillage).';
COMMENT ON COLUMN public.chateaux.is_demo_mock IS
  'Si true, château mock historique (id 1-6 du dataset). Sera filtré via excludeMocks en prod.';
COMMENT ON COLUMN public.chateaux.chiffres_cles IS
  'JSONB — 4 entrées éditoriales { titre, valeur, sous-titre }. Lecture en bloc, jamais query indépendant.';
COMMENT ON COLUMN public.chateaux.video_background_youtube_id IS
  'ID YouTube vidéo de fond (vitrine premium). À migrer vers HTML5 natif en Phase 4.4.';
COMMENT ON COLUMN public.chateaux.distance_paris IS
  'Distance Paris en minutes (porte-à-porte voiture). Cible LCC ≤ 3 h = 180 min.';
COMMENT ON COLUMN public.chateaux.date_disponible IS
  '[Plugeable] Prochaine date de disponibilité affichée. Dérivable de disponibilites en MVP.';


-- ───────────────────────────────────────────────────────────────────────────
-- 5.2 — chambres
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chambres (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chateau_id          uuid        NOT NULL REFERENCES public.chateaux(id) ON DELETE CASCADE,

  nom                 text        NOT NULL,
  description         text,
  superficie          text,                                    -- ex. "27 m²" — texte (donnée hétérogène)
  capacite            integer     NOT NULL,
  prix_cents          integer     NOT NULL,                    -- cents/nuit
  image               text,
  equipements         text[]      NOT NULL DEFAULT ARRAY[]::text[],

  -- Plugeable (Phase 5.x)
  pricing_rules       jsonb,
  min_stay_nights     integer     NOT NULL DEFAULT 1,
  max_stay_nights     integer,
  cleaning_fee_cents  integer     NOT NULL DEFAULT 0,

  ordre               integer     NOT NULL DEFAULT 0,

  created_at          timestamptz NOT NULL DEFAULT NOW(),
  updated_at          timestamptz NOT NULL DEFAULT NOW(),

  CONSTRAINT chambres_prix_cents_positif    CHECK (prix_cents > 0),
  CONSTRAINT chambres_capacite_valide       CHECK (capacite BETWEEN 1 AND 20),
  CONSTRAINT chambres_min_stay_valide       CHECK (min_stay_nights >= 1),
  CONSTRAINT chambres_max_stay_coherent     CHECK (max_stay_nights IS NULL OR max_stay_nights >= min_stay_nights),
  CONSTRAINT chambres_cleaning_fee_positif  CHECK (cleaning_fee_cents >= 0)
);

COMMENT ON TABLE  public.chambres IS
  'Chambres louables d''un château — granularité réservation et tarif.';
COMMENT ON COLUMN public.chambres.prix_cents IS
  'Prix nuit en cents (entier). Évite arrondis float. Ex. 32000 = 320,00 €.';
COMMENT ON COLUMN public.chambres.pricing_rules IS
  '[Plugeable] JSONB règles tarifaires (saison haute, weekend, last-minute). Inutilisé en MVP.';
COMMENT ON COLUMN public.chambres.min_stay_nights IS
  '[Plugeable] Nuits minimum imposées. Default 1, override par chambre.';
COMMENT ON COLUMN public.chambres.max_stay_nights IS
  '[Plugeable] Nuits maximum (cap pour chambres demandées). Inutilisé en MVP.';
COMMENT ON COLUMN public.chambres.cleaning_fee_cents IS
  '[Plugeable] Frais ménage forfaitaires en cents. Inutilisé en MVP (inclus dans prix).';


-- ───────────────────────────────────────────────────────────────────────────
-- 5.3 — chateau_amenities (services + activités fusionnés)
-- ───────────────────────────────────────────────────────────────────────────
-- Type service : équipement always-on (spa, parking, jardin, bibliothèque)
-- Type activite : expérience ponctuelle (dîner aux chandelles, balade à cheval)

CREATE TABLE IF NOT EXISTS public.chateau_amenities (
  id                       uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  chateau_id               uuid          NOT NULL REFERENCES public.chateaux(id) ON DELETE CASCADE,
  type                     amenity_type  NOT NULL,
  categorie                text,
  nom                      text          NOT NULL,
  description              text,
  icone                    text,
  image                    text,
  inclus                   boolean       NOT NULL DEFAULT true,
  prix_supplement_cents    integer,
  duree_minutes            integer,
  ordre                    integer       NOT NULL DEFAULT 0,
  created_at               timestamptz   NOT NULL DEFAULT NOW(),
  updated_at               timestamptz   NOT NULL DEFAULT NOW(),

  CONSTRAINT amenities_supplement_valide CHECK (prix_supplement_cents IS NULL OR prix_supplement_cents >= 0),
  CONSTRAINT amenities_duree_valide      CHECK (duree_minutes IS NULL OR duree_minutes > 0),
  CONSTRAINT chateau_amenities_categorie_check CHECK (categorie IS NULL OR categorie IN
    ('bien_etre', 'gastronomie', 'sport', 'nature', 'culture', 'famille'))
);

COMMENT ON TABLE  public.chateau_amenities IS
  'Services (spa, parking, jardin) et activités (dîner, balade) d''un château — fusionnés via type enum.';
COMMENT ON COLUMN public.chateau_amenities.type IS
  'service = équipement always-on, activite = expérience ponctuelle réservable séparément.';
COMMENT ON COLUMN public.chateau_amenities.categorie IS
  'Catégorie éditoriale (liste fermée de 6, une seule, nullable) pour les filtres par expérience : bien_etre, gastronomie, sport, nature, culture, famille. DISTINCTE de `type` (service/activite) qu''elle traverse. NULL pour les services purement pratiques (wifi, recharge, animaux).';
COMMENT ON COLUMN public.chateau_amenities.inclus IS
  'true = inclus dans le prix de la nuit. false = supplément (cf. prix_supplement_cents).';
COMMENT ON COLUMN public.chateau_amenities.prix_supplement_cents IS
  '[Plugeable] Supplément en cents si non-inclus. NULL si inclus ou non-tarifé.';
COMMENT ON COLUMN public.chateau_amenities.duree_minutes IS
  '[Plugeable] Durée d''une activité (sert au moteur de réservation futur). NULL pour les services.';


-- ───────────────────────────────────────────────────────────────────────────
-- 5.3.1 — equipements (référentiel filtrable) + amenity_equipements (liaison N-N)
-- ───────────────────────────────────────────────────────────────────────────
-- Troisième niveau de qualification d'un service, après `type` et `categorie` :
-- les équipements filtrables, en relation N-N. Référentiel enrichissable par
-- simple INSERT (pas de migration). Seed des 21 : cf. migration + seed.sql.

CREATE TABLE IF NOT EXISTS public.equipements (
  slug    text    PRIMARY KEY,
  libelle text    NOT NULL,
  ordre   integer NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.equipements IS
  'Référentiel d''équipements filtrables (piscine, sauna, tennis...). Enrichissable par simple INSERT (pas de migration). `ordre` groupe par catégorie pour l''affichage.';

CREATE TABLE IF NOT EXISTS public.amenity_equipements (
  amenity_id      uuid NOT NULL REFERENCES public.chateau_amenities(id) ON DELETE CASCADE,
  equipement_slug text NOT NULL REFERENCES public.equipements(slug),
  PRIMARY KEY (amenity_id, equipement_slug)
);

COMMENT ON TABLE public.amenity_equipements IS
  'Liaison N-N entre un service (chateau_amenities) et ses équipements filtrables. ON DELETE CASCADE côté amenity : la réécriture REPLACE du bloc 5 de la RPC purge les liaisons automatiquement.';

CREATE INDEX IF NOT EXISTS idx_amenity_equipements_slug
  ON public.amenity_equipements (equipement_slug);


-- ───────────────────────────────────────────────────────────────────────────
-- 5.4 — chateau_timeline
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chateau_timeline (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chateau_id  uuid        NOT NULL REFERENCES public.chateaux(id) ON DELETE CASCADE,
  annee       text        NOT NULL,                         -- text : peut être "1485", "XVIe siècle", "Aujourd'hui"
  evenement   text        NOT NULL,
  ordre       integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.chateau_timeline IS
  'Frise chronologique d''un château — événements historiques marquants.';
COMMENT ON COLUMN public.chateau_timeline.annee IS
  'Année ou plage texte (ex. "1485", "XVIe siècle", "Aujourd''hui") — pas un int.';
COMMENT ON COLUMN public.chateau_timeline.ordre IS
  'Ordre d''affichage éditorial. Permet de réorganiser sans toucher annee.';


-- ───────────────────────────────────────────────────────────────────────────
-- 5.5 — chateau_alentours
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chateau_alentours (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  chateau_id  uuid          NOT NULL REFERENCES public.chateaux(id) ON DELETE CASCADE,
  nom         text          NOT NULL,
  distance    text,                                         -- ex. "20 min" — texte éditorial
  type        alentour_type NOT NULL,
  icone       text,                                         -- caractère unicode ex. "⚜", "◆"
  description text,
  ordre       integer       NOT NULL DEFAULT 0,
  created_at  timestamptz   NOT NULL DEFAULT NOW(),
  updated_at  timestamptz   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.chateau_alentours IS
  'Points d''intérêt à proximité d''un château (8 catégories enum).';
COMMENT ON COLUMN public.chateau_alentours.type IS
  'Catégorie filtrable. Enum strict — toute nouvelle valeur exige ALTER TYPE.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. TABLES — MODULES & OFFRES (architecture multi-modules A/B/C/D)
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 6.1 — modules (référentiel statique 4 lignes)
-- ───────────────────────────────────────────────────────────────────────────
-- A = Vitrine Permanente, B = Les Dernières Clés, C = Club des Châtelains,
-- D = Événementiel (slot prévu mais inactif).

CREATE TABLE IF NOT EXISTS public.modules (
  id                              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  code                            text          NOT NULL UNIQUE,    -- 'A', 'B', 'C', 'D'
  nom                             text          NOT NULL,           -- 'Vitrine Permanente', etc.
  description                     text,
  commission_min_pct              numeric(5,2),
  commission_max_pct              numeric(5,2),
  politique_annulation_default    text          NOT NULL DEFAULT 'flexible',
  requires_auth_role              user_role,                        -- ex. 'client' pour Module C
  est_actif                       boolean       NOT NULL DEFAULT true,
  created_at                      timestamptz   NOT NULL DEFAULT NOW(),
  updated_at                      timestamptz   NOT NULL DEFAULT NOW(),

  CONSTRAINT modules_code_valide        CHECK (code IN ('A', 'B', 'C', 'D')),
  CONSTRAINT modules_commission_valide  CHECK (
    commission_min_pct IS NULL OR commission_max_pct IS NULL
    OR commission_max_pct >= commission_min_pct
  )
);

COMMENT ON TABLE  public.modules IS
  'Référentiel statique des 4 modules LCC — A/B/C/D. Seed obligatoire (S1-γ).';
COMMENT ON COLUMN public.modules.code IS
  'Code court : A=Permanent, B=Dernières Clés, C=Club, D=Événementiel.';
COMMENT ON COLUMN public.modules.requires_auth_role IS
  '[Plugeable] Rôle minimum requis pour voir les offres du module. NULL = public. ''client'' = auth requise (Module C).';
COMMENT ON COLUMN public.modules.commission_min_pct IS
  '[Plugeable] Commission LCC minimum (%). Sert d''indicateur business — la commission réelle est négociée par château (cf. chateau_modules).';
COMMENT ON COLUMN public.modules.commission_max_pct IS
  '[Plugeable] Commission LCC maximum (%). Idem.';
COMMENT ON COLUMN public.modules.politique_annulation_default IS
  '[Plugeable] Politique d''annulation par défaut au moment de la réservation. Override possible par offre.';


-- ───────────────────────────────────────────────────────────────────────────
-- 6.2 — chateau_modules (M:N château × module)
-- ───────────────────────────────────────────────────────────────────────────
-- Quels modules sont activés pour quels châteaux + commission négociée.

CREATE TABLE IF NOT EXISTS public.chateau_modules (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  chateau_id                  uuid          NOT NULL REFERENCES public.chateaux(id) ON DELETE CASCADE,
  module_id                   uuid          NOT NULL REFERENCES public.modules(id)  ON DELETE RESTRICT,
  est_actif                   boolean       NOT NULL DEFAULT true,
  commission_pct_negociee     numeric(5,2),
  created_at                  timestamptz   NOT NULL DEFAULT NOW(),
  updated_at                  timestamptz   NOT NULL DEFAULT NOW(),

  CONSTRAINT chateau_modules_unique UNIQUE (chateau_id, module_id),
  CONSTRAINT chateau_modules_commission_valide CHECK (
    commission_pct_negociee IS NULL
    OR (commission_pct_negociee >= 0 AND commission_pct_negociee <= 100)
  )
);

COMMENT ON TABLE  public.chateau_modules IS
  'Liaison M:N château × module — quels modules sont activés pour chaque château.';
COMMENT ON COLUMN public.chateau_modules.commission_pct_negociee IS
  '[Plugeable] Commission négociée pour ce couple château×module. Override des bornes modules.commission_min/max_pct.';


-- ───────────────────────────────────────────────────────────────────────────
-- 6.3 — offres (cœur business multi-modules)
-- ───────────────────────────────────────────────────────────────────────────
-- chambre_id NULL = offre château global (privatisation, package multi-chambres).

CREATE TABLE IF NOT EXISTS public.offres (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  chateau_id          uuid          NOT NULL REFERENCES public.chateaux(id) ON DELETE CASCADE,
  module_id           uuid          NOT NULL REFERENCES public.modules(id)  ON DELETE RESTRICT,
  chambre_id          uuid          REFERENCES public.chambres(id) ON DELETE CASCADE,

  titre               text          NOT NULL,
  description         text,
  prix_base_cents     integer       NOT NULL,
  prix_promo_cents    integer,
  reduction_pct       numeric(5,2),
  date_debut          date,
  date_fin            date,
  capacite_max        integer,
  conditions          text,
  visible             boolean       NOT NULL DEFAULT true,
  requires_role       user_role,
  evenement_meta      jsonb,                                -- Module D futur (capacité, type, etc.)
  ordre               integer       NOT NULL DEFAULT 0,

  created_at          timestamptz   NOT NULL DEFAULT NOW(),
  updated_at          timestamptz   NOT NULL DEFAULT NOW(),

  CONSTRAINT offres_prix_base_positif    CHECK (prix_base_cents > 0),
  CONSTRAINT offres_prix_promo_valide    CHECK (prix_promo_cents IS NULL OR prix_promo_cents > 0),
  CONSTRAINT offres_reduction_valide     CHECK (reduction_pct IS NULL OR (reduction_pct >= 0 AND reduction_pct <= 100)),
  CONSTRAINT offres_dates_coherentes     CHECK (date_fin IS NULL OR date_debut IS NULL OR date_fin >= date_debut),
  CONSTRAINT offres_capacite_valide      CHECK (capacite_max IS NULL OR capacite_max > 0)
);

COMMENT ON TABLE  public.offres IS
  'Offres commerciales par module et par château — cœur du business multi-modules. Granularité chambre ou château global.';
COMMENT ON COLUMN public.offres.chambre_id IS
  'NULL = offre château global (privatisation, package multi-chambres). Sinon référence une chambre précise.';
COMMENT ON COLUMN public.offres.requires_role IS
  '[Plugeable] Rôle minimum pour voir l''offre. Hérité de modules.requires_auth_role par défaut, override par offre. Utilisé pour Module C invisibilité totale.';
COMMENT ON COLUMN public.offres.evenement_meta IS
  '[Plugeable Module D] JSONB libre — capacité événement, type (mariage, séminaire), prestataires. Inutilisé en MVP.';
COMMENT ON COLUMN public.offres.prix_promo_cents IS
  '[Plugeable] Prix promotionnel temporaire. NULL = pas de promo (utiliser prix_base_cents).';


-- ═══════════════════════════════════════════════════════════════════════════
-- 7. TABLES — RÉSERVATIONS & DISPONIBILITÉS
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 7.1 — chateau_owners (M:N user×château avec Stripe Connect)
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chateau_owners (
  id                              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                         uuid        NOT NULL REFERENCES public.users(id)    ON DELETE RESTRICT,
  chateau_id                      uuid        NOT NULL REFERENCES public.chateaux(id) ON DELETE CASCADE,
  role_dans_domaine               text        NOT NULL DEFAULT 'proprietaire',

  -- Stripe Connect (Phase 5.2)
  stripe_connected_account_id     text,
  stripe_charges_enabled          boolean     NOT NULL DEFAULT false,
  stripe_payouts_enabled          boolean     NOT NULL DEFAULT false,

  created_at                      timestamptz NOT NULL DEFAULT NOW(),
  updated_at                      timestamptz NOT NULL DEFAULT NOW(),

  CONSTRAINT chateau_owners_unique UNIQUE (user_id, chateau_id)
);

COMMENT ON TABLE  public.chateau_owners IS
  'Liaison M:N user×château avec Stripe Connect. Un chatelain peut gérer N châteaux.';
COMMENT ON COLUMN public.chateau_owners.role_dans_domaine IS
  'Rôle dans le château (libre) : "proprietaire", "regisseur", "majordome", etc.';
COMMENT ON COLUMN public.chateau_owners.stripe_connected_account_id IS
  '[Plugeable Stripe] ID compte Stripe Connect du chatelain. Recevra paiements moins commission LCC.';
COMMENT ON COLUMN public.chateau_owners.stripe_charges_enabled IS
  '[Plugeable Stripe] Compte Connect peut accepter paiements. Synchronisé via webhook account.updated.';
COMMENT ON COLUMN public.chateau_owners.stripe_payouts_enabled IS
  '[Plugeable Stripe] Compte Connect peut recevoir virements. Synchronisé via webhook account.updated.';


-- ───────────────────────────────────────────────────────────────────────────
-- 7.2 — reservations
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reservations (
  id                          uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid                NOT NULL REFERENCES public.users(id)    ON DELETE RESTRICT,
  chambre_id                  uuid                NOT NULL REFERENCES public.chambres(id) ON DELETE RESTRICT,
  module_id                   uuid                NOT NULL REFERENCES public.modules(id)  ON DELETE RESTRICT,
  offre_id                    uuid                REFERENCES public.offres(id)            ON DELETE SET NULL,

  date_arrivee                date                NOT NULL,
  date_depart                 date                NOT NULL,
  prix_total_cents            integer             NOT NULL,
  commission_lcc_cents        integer             NOT NULL DEFAULT 0,

  status                      reservation_status  NOT NULL DEFAULT 'pending',

  -- Stripe (Phase 5.2)
  stripe_payment_intent_id    text,
  stripe_charge_id            text,

  -- Plugeable (Phase 5.x)
  cancellation_policy         text                NOT NULL DEFAULT 'flexible',
  payout_status               payout_status       NOT NULL DEFAULT 'pending',
  payout_sent_at              timestamptz,
  cancellation_reason         text,
  cancelled_at                timestamptz,

  created_at                  timestamptz         NOT NULL DEFAULT NOW(),
  updated_at                  timestamptz         NOT NULL DEFAULT NOW(),

  CONSTRAINT reservations_dates_valides    CHECK (date_depart > date_arrivee),
  CONSTRAINT reservations_prix_positif     CHECK (prix_total_cents > 0),
  CONSTRAINT reservations_commission_valide CHECK (commission_lcc_cents >= 0 AND commission_lcc_cents <= prix_total_cents),
  CONSTRAINT reservations_payout_coherent  CHECK (
    (payout_status = 'sent' AND payout_sent_at IS NOT NULL)
    OR (payout_status <> 'sent')
  ),
  CONSTRAINT reservations_cancelled_coherent CHECK (
    (status = 'cancelled' AND cancelled_at IS NOT NULL)
    OR (status <> 'cancelled')
  )
);

COMMENT ON TABLE  public.reservations IS
  'Réservations commerciales — cœur monétisation LCC. Stripe Connect en Phase 5.2.';
COMMENT ON COLUMN public.reservations.module_id IS
  'Module via lequel la réservation a été initiée (A/B/C/D). Détermine la politique d''annulation et le payout.';
COMMENT ON COLUMN public.reservations.offre_id IS
  'Offre source (peut être supprimée — ON DELETE SET NULL pour préserver l''historique commercial).';
COMMENT ON COLUMN public.reservations.prix_total_cents IS
  'Prix total séjour en cents. = nb nuits × prix chambre + cleaning_fee + supplements amenities, hors marges Stripe.';
COMMENT ON COLUMN public.reservations.commission_lcc_cents IS
  '[Plugeable] Part LCC sur prix_total_cents (snapshot au moment de la réservation). Inutilisé en MVP.';
COMMENT ON COLUMN public.reservations.cancellation_policy IS
  '[Plugeable] Snapshot de la politique d''annulation (text libre — ''flexible''/''moderate''/''strict'').';
COMMENT ON COLUMN public.reservations.payout_status IS
  '[Plugeable] État du virement Stripe Connect vers le chatelain.';
COMMENT ON COLUMN public.reservations.payout_sent_at IS
  '[Plugeable] Date émission virement Stripe vers compte Connect du chatelain.';
COMMENT ON COLUMN public.reservations.cancellation_reason IS
  '[Plugeable] Motif d''annulation (texte libre, saisi par client ou admin).';
COMMENT ON COLUMN public.reservations.cancelled_at IS
  '[Plugeable] Date d''annulation. NOT NULL si status=''cancelled'' (CHECK contraint).';


-- ───────────────────────────────────────────────────────────────────────────
-- 7.3 — disponibilites
-- ───────────────────────────────────────────────────────────────────────────
-- Stockage explicite (et non calculé) car les chatelains ferment manuellement
-- des dates (entretien, usage privé). Lien optionnel vers reservations
-- pour traçabilité (date bloquée par quelle réservation).

CREATE TABLE IF NOT EXISTS public.disponibilites (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chambre_id          uuid        NOT NULL REFERENCES public.chambres(id)     ON DELETE CASCADE,
  date                date        NOT NULL,
  est_disponible      boolean     NOT NULL DEFAULT true,
  prix_special_cents  integer,
  reservation_id      uuid        REFERENCES public.reservations(id) ON DELETE CASCADE,
  note_interne        text,
  created_at          timestamptz NOT NULL DEFAULT NOW(),
  updated_at          timestamptz NOT NULL DEFAULT NOW(),

  CONSTRAINT disponibilites_unique_chambre_date UNIQUE (chambre_id, date),
  CONSTRAINT disponibilites_prix_special_valide CHECK (prix_special_cents IS NULL OR prix_special_cents > 0)
);

COMMENT ON TABLE  public.disponibilites IS
  'Calendrier disponibilités par chambre. Une ligne = 1 chambre × 1 date. Absence = disponible au prix par défaut.';
COMMENT ON COLUMN public.disponibilites.prix_special_cents IS
  '[Plugeable] Override prix chambre pour cette date (ex. saison haute). NULL = utilise chambres.prix_cents.';
COMMENT ON COLUMN public.disponibilites.reservation_id IS
  '[Plugeable] Réservation qui a verrouillé cette date. Permet de libérer auto si annulation.';
COMMENT ON COLUMN public.disponibilites.note_interne IS
  'Note privée chatelain (jamais exposée client). Ex. "Bloqué entretien", "Famille du propriétaire".';


-- ═══════════════════════════════════════════════════════════════════════════
-- 8. TABLES — TRAÇABILITÉ
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 8.1 — audit_log
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  action      text        NOT NULL,
  table_name  text        NOT NULL,
  row_id      uuid,
  changes     jsonb,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.audit_log IS
  'Journal d''audit append-only — actions critiques (CRUD admin, webhooks Stripe, modifs offres).';
COMMENT ON COLUMN public.audit_log.user_id IS
  'Auteur de l''action. NULL pour actions système (webhook, job CRON).';
COMMENT ON COLUMN public.audit_log.changes IS
  'JSONB { before, after } — capture l''état avant et après la mutation.';


-- ───────────────────────────────────────────────────────────────────────────
-- 8.2 — migrations_log
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.migrations_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_migration   text        NOT NULL UNIQUE,
  executed_at     timestamptz NOT NULL DEFAULT NOW(),
  rows_affected   integer,
  notes           text
);

COMMENT ON TABLE  public.migrations_log IS
  'Trace des seeds et transformations data exécutés (S1-γ, S1-δ, etc.). Différent des migrations Supabase système.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 9. TRIGGERS updated_at
-- ═══════════════════════════════════════════════════════════════════════════
-- DROP TRIGGER IF EXISTS systématique avant CREATE — Postgres ne supporte pas
-- CREATE TRIGGER IF NOT EXISTS. migrations_log exclu (pas de updated_at).

DROP TRIGGER IF EXISTS set_timestamp_users ON public.users;
CREATE TRIGGER set_timestamp_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_chateaux ON public.chateaux;
CREATE TRIGGER set_timestamp_chateaux
  BEFORE UPDATE ON public.chateaux
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_chambres ON public.chambres;
CREATE TRIGGER set_timestamp_chambres
  BEFORE UPDATE ON public.chambres
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_chateau_amenities ON public.chateau_amenities;
CREATE TRIGGER set_timestamp_chateau_amenities
  BEFORE UPDATE ON public.chateau_amenities
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_chateau_timeline ON public.chateau_timeline;
CREATE TRIGGER set_timestamp_chateau_timeline
  BEFORE UPDATE ON public.chateau_timeline
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_chateau_alentours ON public.chateau_alentours;
CREATE TRIGGER set_timestamp_chateau_alentours
  BEFORE UPDATE ON public.chateau_alentours
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_modules ON public.modules;
CREATE TRIGGER set_timestamp_modules
  BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_chateau_modules ON public.chateau_modules;
CREATE TRIGGER set_timestamp_chateau_modules
  BEFORE UPDATE ON public.chateau_modules
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_offres ON public.offres;
CREATE TRIGGER set_timestamp_offres
  BEFORE UPDATE ON public.offres
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_chateau_owners ON public.chateau_owners;
CREATE TRIGGER set_timestamp_chateau_owners
  BEFORE UPDATE ON public.chateau_owners
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_reservations ON public.reservations;
CREATE TRIGGER set_timestamp_reservations
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_disponibilites ON public.disponibilites;
CREATE TRIGGER set_timestamp_disponibilites
  BEFORE UPDATE ON public.disponibilites
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_audit_log ON public.audit_log;
CREATE TRIGGER set_timestamp_audit_log
  BEFORE UPDATE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


-- ═══════════════════════════════════════════════════════════════════════════
-- 10. INDEXES
-- ═══════════════════════════════════════════════════════════════════════════
-- chateaux.slug UNIQUE et disponibilites.(chambre_id, date) UNIQUE sont déjà
-- inline (cf. tables). Indexes additionnels pour FKs et requêtes courantes.

-- FK & contenu château
CREATE INDEX IF NOT EXISTS idx_chambres_chateau_id
  ON public.chambres (chateau_id);

CREATE INDEX IF NOT EXISTS idx_chateau_amenities_chateau_type_ordre
  ON public.chateau_amenities (chateau_id, type, ordre);

CREATE INDEX IF NOT EXISTS idx_chateau_timeline_chateau_ordre
  ON public.chateau_timeline (chateau_id, ordre);

CREATE INDEX IF NOT EXISTS idx_chateau_alentours_chateau_ordre
  ON public.chateau_alentours (chateau_id, ordre);

-- Modules & offres
CREATE INDEX IF NOT EXISTS idx_chateau_modules_chateau_actifs
  ON public.chateau_modules (chateau_id) WHERE est_actif = true;

CREATE INDEX IF NOT EXISTS idx_chateau_modules_module
  ON public.chateau_modules (module_id);

CREATE INDEX IF NOT EXISTS idx_offres_chateau_module_visible
  ON public.offres (chateau_id, module_id, visible);

CREATE INDEX IF NOT EXISTS idx_offres_dates
  ON public.offres (date_debut, date_fin) WHERE date_debut IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_offres_chambre_id
  ON public.offres (chambre_id);

-- Owners & réservations
CREATE INDEX IF NOT EXISTS idx_chateau_owners_user_id
  ON public.chateau_owners (user_id);

CREATE INDEX IF NOT EXISTS idx_chateau_owners_chateau_id
  ON public.chateau_owners (chateau_id);

CREATE INDEX IF NOT EXISTS idx_reservations_user_id
  ON public.reservations (user_id);

CREATE INDEX IF NOT EXISTS idx_reservations_chambre_dates
  ON public.reservations (chambre_id, date_arrivee, date_depart);

CREATE INDEX IF NOT EXISTS idx_reservations_status
  ON public.reservations (status);

CREATE INDEX IF NOT EXISTS idx_reservations_module_id
  ON public.reservations (module_id);

-- Disponibilités
CREATE INDEX IF NOT EXISTS idx_disponibilites_reservation_id
  ON public.disponibilites (reservation_id);

-- Audit
CREATE INDEX IF NOT EXISTS idx_audit_log_user_created
  ON public.audit_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_row
  ON public.audit_log (table_name, row_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- FIN DU SCHEMA S1-α
-- ═══════════════════════════════════════════════════════════════════════════
-- Récap : 14 tables, 5 enums, 13 triggers updated_at, 18 indexes additionnels.
--
-- Prochaines étapes :
--   - S1-β : RLS policies (lecture publique chateaux, écriture chatelain/admin,
--            invisibilité Module C aux non-clients via requires_role)
--   - S1-γ : Seed depuis src/data/chateaux.js (8 châteaux + 23 chambres
--            + 4 modules + amenities + timeline + alentours)
--   - S1-δ : Application migration (chateauxService.js → Supabase client)
-- ═══════════════════════════════════════════════════════════════════════════
