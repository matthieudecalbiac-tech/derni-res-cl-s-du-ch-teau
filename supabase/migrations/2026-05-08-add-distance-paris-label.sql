-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 2026-05-08 — Ajout chateaux.distance_paris_label
-- ═══════════════════════════════════════════════════════════════════════════
-- S1-δ Phase 4 sous-action 4.1
--
-- Ajout d'une colonne text "label brut" pour l'affichage éditorial
-- de la distance Paris (ex: "55 km · 45 min"), distincte de la
-- colonne int distance_paris utilisée pour les tris/filtres.
--
-- Idempotent : ADD COLUMN IF NOT EXISTS.
-- Application : SQL Editor Supabase → New query → paste → Run.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.chateaux
  ADD COLUMN IF NOT EXISTS distance_paris_label text;

COMMENT ON COLUMN public.chateaux.distance_paris_label IS
  'Label brut éditorial (ex: "55 km · 45 min") pour affichage direct dans le JSX. La colonne distance_paris (int, en minutes) reste utilisée pour tris et filtres.';

-- Vérification post-migration
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'chateaux'
--   AND column_name LIKE 'distance_paris%';
