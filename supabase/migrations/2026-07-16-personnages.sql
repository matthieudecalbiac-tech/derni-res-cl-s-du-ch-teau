-- ============================================================
-- "Histoire des lieux" — personnages + chateau_personnages (brique 1 : tables)
--
-- Catalogue de personnages ET d'evenements rattaches aux chateaux. Le NOM vit sur
-- le personnage (referentiel, reutilisable sur plusieurs chateaux) ; la NATURE du
-- lien et le TEXTE editorial vivent sur la LIAISON (chateau x personnage) : ils
-- different d'un chateau a l'autre. C'est le point structurant.
--
-- Deux patterns du schema existant, combines :
--   - personnages          = referentiel minimal (pattern `equipements`)
--   - chateau_personnages  = enfant editorial ordonne (pattern `chateau_timeline`),
--                            mais la liaison porte 2 champs editoriaux (nature, texte).
--
-- nature = text + CHECK (PAS enum PG) : meme raison que `categorie`. Une taxonomie
-- editoriale est volatile ; un CHECK se modifie par DROP/ADD CONSTRAINT
-- transactionnel, un ALTER TYPE (enum) non (recreation du type + reecriture colonne).
--
-- GRANTS : les policies d'ecriture ne servent a rien sans GRANT (cf. le trou
-- d'amenity_equipements, ecrivable seulement via la RPC SECURITY DEFINER). Ici on
-- accorde INSERT/UPDATE/DELETE a authenticated sur les DEUX tables -> les policies
-- (RLS is_admin() / is_chatelain_of()) sont reellement atteignables en ecriture directe.
--
-- Idempotent (IF NOT EXISTS / DROP IF EXISTS). Ne touche NI la RPC, NI les mappers,
-- NI l'UI (brique 1 = tables seules).
-- ============================================================

-- ── (a) Referentiel personnages (minimal) ──
CREATE TABLE IF NOT EXISTS public.personnages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom        text        NOT NULL,
  slug       text        NOT NULL UNIQUE,                    -- pour /personnage/:slug
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.personnages IS
  'Referentiel des entites rattachees aux chateaux (le nom vit ici, reutilisable sur plusieurs chateaux). Porte aussi des EVENEMENTS ("Ecole de jeunes filles"), pas seulement des personnes : la nature du lien (chateau_personnages.nature) les distingue. Minimal : ni portrait ni dates (a ajouter si besoin).';

-- ── (b) Liaison editoriale chateau_personnages ──
CREATE TABLE IF NOT EXISTS public.chateau_personnages (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),   -- surrogate, pas de PK composite
  chateau_id    uuid        NOT NULL REFERENCES public.chateaux(id)    ON DELETE CASCADE,
  personnage_id uuid        NOT NULL REFERENCES public.personnages(id) ON DELETE RESTRICT,
  nature        text        NOT NULL,
  texte         text,                                                -- editorial, remplissable plus tard
  ordre         integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  updated_at    timestamptz NOT NULL DEFAULT NOW(),

  CONSTRAINT chateau_personnages_nature_check CHECK (nature IN
    ('fait_histoire', 'a_habite', 'evenement', 'histoire_famille')),
  -- Un meme personnage peut avoir DEUX liens de natures DIFFERENTES sur un meme
  -- chateau (ex. "a habite" + "evenement"), mais pas deux fois la meme nature.
  CONSTRAINT chateau_personnages_unique UNIQUE (chateau_id, personnage_id, nature)
);

COMMENT ON TABLE public.chateau_personnages IS
  'Liaison editoriale chateau x personnage (pattern chateau_timeline). La liaison porte la NATURE du lien et le TEXTE, differents selon le chateau. ON DELETE : CASCADE cote chateau (les liens partent avec le chateau), RESTRICT cote personnage (un personnage encore lie ne se supprime pas silencieusement).';
COMMENT ON COLUMN public.chateau_personnages.nature IS
  'Nature du lien (text + CHECK, pas enum : taxonomie editoriale volatile). Valeurs : fait_histoire, a_habite, evenement, histoire_famille. Libelles lisibles cote front (helper).';

-- Sens inverse "quels chateaux pour ce personnage" (= la fiche personnage).
CREATE INDEX IF NOT EXISTS idx_chateau_personnages_personnage
  ON public.chateau_personnages (personnage_id);

-- ── (c) Triggers updated_at (fonction generique existante) ──
DROP TRIGGER IF EXISTS set_timestamp_personnages ON public.personnages;
CREATE TRIGGER set_timestamp_personnages
  BEFORE UPDATE ON public.personnages
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_chateau_personnages ON public.chateau_personnages;
CREATE TRIGGER set_timestamp_chateau_personnages
  BEFORE UPDATE ON public.chateau_personnages
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- ── (d) RLS ──
ALTER TABLE public.personnages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chateau_personnages  ENABLE ROW LEVEL SECURITY;

-- personnages : SELECT public, ecritures admin-only (pattern equipements).
DROP POLICY IF EXISTS personnages_select_public ON public.personnages;
CREATE POLICY personnages_select_public ON public.personnages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS personnages_insert_admin ON public.personnages;
CREATE POLICY personnages_insert_admin ON public.personnages
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS personnages_update_admin ON public.personnages;
CREATE POLICY personnages_update_admin ON public.personnages
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS personnages_delete_admin ON public.personnages;
CREATE POLICY personnages_delete_admin ON public.personnages
  FOR DELETE USING (public.is_admin());

-- chateau_personnages : SELECT public, INSERT admin, UPDATE chatelain|admin, DELETE admin
-- (pattern chateau_timeline : le chatelain edite les liens de SON chateau).
DROP POLICY IF EXISTS chateau_personnages_select_public ON public.chateau_personnages;
CREATE POLICY chateau_personnages_select_public ON public.chateau_personnages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS chateau_personnages_insert_admin ON public.chateau_personnages;
CREATE POLICY chateau_personnages_insert_admin ON public.chateau_personnages
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS chateau_personnages_update_chatelain_admin ON public.chateau_personnages;
CREATE POLICY chateau_personnages_update_chatelain_admin ON public.chateau_personnages
  FOR UPDATE
  USING (public.is_chatelain_of(chateau_id) OR public.is_admin())
  WITH CHECK (public.is_chatelain_of(chateau_id) OR public.is_admin());

DROP POLICY IF EXISTS chateau_personnages_delete_admin ON public.chateau_personnages;
CREATE POLICY chateau_personnages_delete_admin ON public.chateau_personnages
  FOR DELETE USING (public.is_admin());

-- ── (e) GRANTS (rendent les policies REELLEMENT atteignables) ──
GRANT SELECT ON public.personnages          TO anon, authenticated;
GRANT SELECT ON public.chateau_personnages  TO anon, authenticated;

-- Ecritures accordees a authenticated ; le RLS restreint ensuite (admin / chatelain).
-- NOTE personnages : on s'ECARTE ici du pattern equipements (qui n'a que GRANT
-- SELECT). equipements EST le trou : ses policies d'ecriture admin sont
-- inatteignables faute de GRANT, ce qui ne genait pas car ses 21 lignes sont
-- seedees par migration, jamais ecrites par l'app. personnages, lui, est un
-- catalogue gere via l'UI admin -> il LUI FAUT le GRANT. Le RLS WITH CHECK
-- is_admin() garde l'ecriture admin-only ; le GRANT rend juste la porte atteignable.
GRANT INSERT, UPDATE, DELETE ON public.personnages          TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chateau_personnages  TO authenticated;

-- service_role : SELECT pour generate-seed.cjs (dump base -> seed). On l'ajoute
-- des maintenant pour NE PAS reproduire la dette "seed.sql ne contient pas les
-- equipements" (equipements avait ete oublie ici -> 42501 en lecture service_role).
GRANT SELECT ON public.personnages          TO service_role;
GRANT SELECT ON public.chateau_personnages  TO service_role;

-- ============================================================
-- VERIFICATIONS (le Dashboard n'affiche que le DERNIER resultat : exécute
-- chaque bloc separement pour les voir tous).
-- ============================================================

-- (A) Tables créées + colonnes
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('personnages', 'chateau_personnages')
ORDER BY table_name, ordinal_position;

-- (B) Contraintes (PK, FK, UNIQUE, CHECK) sur les 2 tables
SELECT tc.table_name, tc.constraint_type, tc.constraint_name
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public' AND tc.table_name IN ('personnages', 'chateau_personnages')
ORDER BY tc.table_name, tc.constraint_type;

-- (C) Policies posées (attendu : 4 sur personnages, 4 sur chateau_personnages)
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('personnages', 'chateau_personnages')
ORDER BY tablename, cmd, policyname;

-- (D) Grants poses sur les 2 tables (par grantee)
SELECT table_name, grantee, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name IN ('personnages', 'chateau_personnages')
  AND grantee IN ('anon', 'authenticated', 'service_role')
GROUP BY table_name, grantee
ORDER BY table_name, grantee;
