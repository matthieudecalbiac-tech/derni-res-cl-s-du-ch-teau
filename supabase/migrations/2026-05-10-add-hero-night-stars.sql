-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 2026-05-10 — Ajout colonne hero_night_stars
-- ═══════════════════════════════════════════════════════════════════════════
-- Branche fix/vitrine-night-mode-polish — opt-in étoiles ciel nocturne par
-- château dans le hero de VitrineChateau.
--
-- Pourquoi un opt-in plutôt qu'un rendu uniforme : Briottières (id 7) ne
-- reçoit plus l'overlay étoilé en mode nuit (lune seule), tandis que Le
-- Blanc Buisson (id 8) le conserve en surimpression de sa vidéo nocturne.
-- Décision design Matthieu, 10 mai 2026.
--
-- Idempotent :
--   - ALTER TABLE ... ADD COLUMN IF NOT EXISTS → ré-exécution no-op.
--   - UPDATE par slug → idempotent par construction.
--
-- Application : Supabase Dashboard → SQL Editor → New query → paste → Run.
-- ═══════════════════════════════════════════════════════════════════════════

-- Ajouter la colonne hero_night_stars (default false pour tous les châteaux)
ALTER TABLE public.chateaux
  ADD COLUMN IF NOT EXISTS hero_night_stars boolean NOT NULL DEFAULT false;

-- Activer pour Le Blanc Buisson uniquement (id 8 legacy)
UPDATE public.chateaux
SET hero_night_stars = true
WHERE slug = 'blanc-buisson';
