-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 2026-05-09 — Populate chateaux.distance_paris_label
-- ═══════════════════════════════════════════════════════════════════════════
-- S1-δ Phase 4 sous-action 4.2
--
-- Population de la colonne distance_paris_label pour les 8 châteaux du seed
-- avec les valeurs éditoriales d'origine de src/data/chateaux.js.
--
-- Idempotent : UPDATE par slug, rejouable sans dommage.
-- Pré-requis : migration 2026-05-08-add-distance-paris-label.sql appliquée.
--
-- Note : id 8 utilise le slug 'blanc-buisson' (sans préfixe 'le-'),
--        cohérent avec src/data/chateaux.js et le seed S1-γ.
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE public.chateaux SET distance_paris_label = '55 km · 45 min'   WHERE slug = 'vaux-le-vicomte';
UPDATE public.chateaux SET distance_paris_label = '85 km · 1h10'     WHERE slug = 'pierrefonds';
UPDATE public.chateaux SET distance_paris_label = '48 km · 35 min'   WHERE slug = 'chantilly';
UPDATE public.chateaux SET distance_paris_label = '65 km · 50 min'   WHERE slug = 'fontainebleau';
UPDATE public.chateaux SET distance_paris_label = '155 km · 1h30'    WHERE slug = 'ferte-saint-aubin';
UPDATE public.chateaux SET distance_paris_label = '370 km · 3h'      WHERE slug = 'pierreclos';
UPDATE public.chateaux SET distance_paris_label = '2h15 de Paris'    WHERE slug = 'les-briottieres';
UPDATE public.chateaux SET distance_paris_label = '2h de Paris'      WHERE slug = 'blanc-buisson';

-- Vérification post-migration
SELECT slug, distance_paris, distance_paris_label
FROM public.chateaux
ORDER BY distance_paris;
