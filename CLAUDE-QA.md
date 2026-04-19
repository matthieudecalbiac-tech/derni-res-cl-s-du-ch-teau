# Agent QA · Les Clés du Château

## Vue d'ensemble

L'agent QA est une suite automatisée qui teste les vitrines LCC (Briottières, Blanc Buisson) et les parcours critiques. Trois couches :

1. **E2E Playwright** (`tests/e2e/`) — parcours utilisateur complet
2. **Régression visuelle** (`tests/visual/`) — comparaison pixel-perfect
3. **Lighthouse** (`scripts/lighthouse.cjs`) — scores perf / a11y / SEO

Le dashboard local (`localhost:9323`) centralise tout.

## Commandes principales

```bash
# Installer les dépendances (une seule fois)
npm install
npx playwright install

# Lancer tout + dashboard
npm run qa:dashboard     # Terminal 1 : dashboard toujours ouvert
npm run qa:fast          # Terminal 2 : run rapide E2E
npm run qa:full          # Ou : run complet avec Lighthouse

# Quand tu modifies volontairement le design
npm run qa:update-snaps  # Régénère les screenshots de référence

# Tester la prod (le jour où Vercel sera en ligne)
npm run qa:prod
```

## Ce que fait Claude Code quand un test casse

1. Lire le rapport : `npx playwright show-report`
2. Identifier si c'est un vrai bug ou une régression visuelle voulue
3. Si bug → proposer un fix en PR
4. Si design voulu → lancer `npm run qa:update-snaps` puis commiter

## Règles pour Claude Code

- **Jamais de modification directe sur `main`** — toujours branche + PR
- Les tests QA doivent passer avant tout merge
- Si un test échoue à cause d'un bug détecté légitime (météo hardcodée, chiffres en dur), NE PAS "tricher" le test : corriger le code source
- Les fichiers `/tests/` et `/scripts/qa-*.cjs` ne dépendent pas de `type:module` → extension `.js` OK pour Playwright specs (Playwright gère), `.cjs` pour les scripts Node

## Bugs suivis (statut initial)

Voir le dashboard, section "Bugs suivis". Trois bugs ouverts détectés à l'analyse :
- Météo hardcodée "Rugles · Normandie"
- Chiffres clés hero en dur (1290, 3, 8 ha, 1949)
- Découpage `proprietaires.nom[0]` instable

Quand ces bugs seront corrigés côté code source, les tests correspondants deviendront verts automatiquement.

## Architecture de décision

- Si un test e2e échoue sur Chromium mais pas sur Safari → bug de timing, ajouter un `waitForSelector`
- Si un test échoue sur Safari uniquement → vrai bug de rendu, corriger le CSS
- Si un test visuel échoue avec <1% de diff → tolérance à augmenter
- Si un test visuel échoue avec >5% de diff → régression confirmée, investiguer
