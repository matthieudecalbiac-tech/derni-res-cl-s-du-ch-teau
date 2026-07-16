-- ============================================================
-- personnages.biographie — texte editorial du PERSONNAGE (brique 1 ecran admin)
--
-- La biographie appartient au PERSONNAGE : elle est vraie PARTOUT, independamment
-- du chateau. A NE PAS confondre avec chateau_personnages.texte, qui porte le LIEN
-- avec UN chateau donne ("pourquoi ce chateau est concerne") et differe d'un
-- chateau a l'autre. Deux colonnes, deux niveaux : le referentiel vs la liaison.
--
-- text nullable, sans contrainte de longueur : pattern des colonnes editoriales
-- de chateaux (histoire, description, region_narrative...). Le trigger updated_at
-- (set_timestamp_personnages) couvre deja la colonne. Aucune RLS/GRANT a changer
-- (les policies table-level personnages_* existantes s'appliquent a la colonne).
--
-- Idempotent (ADD COLUMN IF NOT EXISTS). Enveloppe dans une transaction : un ALTER
-- en echec ne laisse pas la table a moitie modifiee.
-- ============================================================

BEGIN;

ALTER TABLE public.personnages
  ADD COLUMN IF NOT EXISTS biographie text;

COMMENT ON COLUMN public.personnages.biographie IS
  'Biographie du personnage (ou description de l''evenement). Appartient au PERSONNAGE : vraie partout, independante du chateau. A ne pas confondre avec chateau_personnages.texte (le LIEN avec un chateau donne, different selon le chateau). text nullable, sans limite de longueur (pattern editorial chateaux).';

COMMIT;

-- ============================================================
-- VERIFICATION (lecture seule) — biographie presente, text, nullable.
-- ============================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'personnages'
ORDER BY ordinal_position;
