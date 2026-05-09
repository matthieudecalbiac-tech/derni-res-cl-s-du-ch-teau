-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 2026-05-09 — Fix chiffres_cles + prop_initiale + prop_nom_affiche
-- ═══════════════════════════════════════════════════════════════════════════
-- S1-δ Phase 5 — Fix régression seed Phase 4.1 détectée par audit CI E2E.
--
-- 3 régressions sémantiques introduites par scripts/generate-seed.cjs Phase 4.1
-- pour les 2 châteaux premium (Briottières + Blanc Buisson) :
--   1. chiffres_cles hardcodé à NULL (au lieu d'utiliser chateau.chiffresCles
--      du legacy src/data/chateaux.js).
--   2. deriveOwnerInitiale(propNom) = propNom.charAt(0) → ignore le champ
--      proprietaires.initiale legacy ("V" pour Valbray, "F" pour Fresnaye).
--   3. deriveOwnerNomAffiche(propNom) strip "Famille " → ignore le champ
--      proprietaires.nomAffiche legacy ("albray" / "resnaye").
--
-- Conséquences UI (composant VitrineChateau.jsx) :
--   - .vc3-chiffre-val rendu 0 fois au lieu de 4 (4 tests E2E fail)
--   - .vc3-portrait-init rend "A"/"M" au lieu de "V"/"F" (3 tests fail)
--   - .vc3-portrait-reste rend nom complet au lieu de "albray"/"resnaye"
--
-- Idempotent : UPDATE par slug (ré-exécution donne même résultat).
-- Application : SQL Editor Supabase → New query → paste → Run.
-- ═══════════════════════════════════════════════════════════════════════════

-- Briottières (id 7 legacy)
UPDATE public.chateaux
SET
  chiffres_cles = '[
    {"val":"1485","lab":"Année de fondation"},
    {"val":"7","lab":"Générations"},
    {"val":"50 ha","lab":"Parc à l''anglaise"},
    {"val":"1979","lab":"Ouverture aux hôtes"}
  ]'::jsonb,
  prop_initiale    = 'V',
  prop_nom_affiche = 'albray'
WHERE slug = 'les-briottieres';

-- Le Blanc Buisson (id 8 legacy)
UPDATE public.chateaux
SET
  chiffres_cles = '[
    {"val":"1290","lab":"Année de fondation"},
    {"val":"3","lab":"Familles en 7 siècles"},
    {"val":"8 ha","lab":"Parc classé"},
    {"val":"1949","lab":"Monument Historique"}
  ]'::jsonb,
  prop_initiale    = 'F',
  prop_nom_affiche = 'resnaye'
WHERE slug = 'blanc-buisson';

-- Vérification post-migration
SELECT
  slug,
  prop_initiale,
  prop_nom_affiche,
  jsonb_array_length(chiffres_cles) AS nb_chiffres
FROM public.chateaux
WHERE slug IN ('les-briottieres', 'blanc-buisson')
ORDER BY slug;
