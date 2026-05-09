-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 2026-05-09 — Seed offre Briottières Module B
-- ═══════════════════════════════════════════════════════════════════════════
-- S1-δ Phase 5 — Fix data manquant détecté par tests-rls.sql Test #4.
--
-- Le seed S1-γ (commit 91ad4dc) avait omis la table offres. Cette migration
-- ajoute 1 offre Module B visible pour Briottières — la "Dernière Clé du
-- moment" éditoriale alignée sur le storytelling LCC.
--
-- Idempotent : ON CONFLICT (id) DO UPDATE SET (rejouable sans doublon).
-- Pré-requis : seed S1-γ appliqué (chateaux + modules + chambres).
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.offres (
  id, chateau_id, module_id, chambre_id,
  titre, description,
  prix_base_cents, prix_promo_cents, reduction_pct,
  date_debut, date_fin,
  visible, requires_role, ordre
)
SELECT
  '7e7b6a5c-9876-5432-8abc-def012345abc',
  c.id,
  m.id,
  ch.id,
  'Les Dernières Clés du moment — Chambre Verte',
  'Une nuit dans la chambre la plus demandée du château, à un tarif privilégié. Cinquante hectares de parc à l''anglaise, dîner aux chandelles à la table d''hôtes, lumière du matin sur le bocage angevin.',
  29000, 23780, 18.00,
  '2026-05-09', '2026-08-09',
  true, NULL, 1
FROM public.chateaux c
CROSS JOIN public.modules m
CROSS JOIN public.chambres ch
WHERE c.slug = 'les-briottieres'
  AND m.code = 'B'
  AND ch.chateau_id = c.id
  AND ch.nom = 'Chambre Verte'
ON CONFLICT (id) DO UPDATE SET
  titre            = EXCLUDED.titre,
  description      = EXCLUDED.description,
  prix_base_cents  = EXCLUDED.prix_base_cents,
  prix_promo_cents = EXCLUDED.prix_promo_cents,
  reduction_pct    = EXCLUDED.reduction_pct,
  visible          = EXCLUDED.visible,
  ordre            = EXCLUDED.ordre;


-- ═══════════════════════════════════════════════════════════════════════════
-- Vérification post-migration
-- ═══════════════════════════════════════════════════════════════════════════
SELECT
  o.titre,
  c.slug AS chateau,
  m.code AS module,
  ch.nom AS chambre,
  o.prix_base_cents / 100 || '€' AS "prix base",
  o.prix_promo_cents / 100 || '€' AS "prix promo",
  o.reduction_pct || '%' AS reduction,
  o.visible
FROM public.offres o
JOIN public.chateaux c ON c.id = o.chateau_id
JOIN public.modules m  ON m.id = o.module_id
LEFT JOIN public.chambres ch ON ch.id = o.chambre_id
WHERE o.id = '7e7b6a5c-9876-5432-8abc-def012345abc';
