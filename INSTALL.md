# ⚜ Agent QA · Les Clés du Château — Installation

## Ce que tu obtiens

Une suite de tests automatisée qui protège ton travail de dev quotidien et un dashboard local patrimonial (navy / or / crème) consultable à la demande sur `localhost:9323`.

## Installation pas à pas

### Étape 1 · Copier les fichiers dans ton repo

Depuis le dossier `lcc-qa/` fourni, copie ces éléments à la racine de `derni-res-cl-s-du-ch-teau/` :

```
lcc-qa/playwright.config.cjs     →  playwright.config.cjs
lcc-qa/tests/                    →  tests/
lcc-qa/scripts/                  →  scripts/
lcc-qa/dashboard/                →  dashboard/
lcc-qa/CLAUDE-QA.md              →  CLAUDE-QA.md (ou merger dans CLAUDE.md)
```

### Étape 2 · Installer les dépendances

Dans le terminal VS Code, à la racine du repo :

```powershell
npm install --save-dev @playwright/test lighthouse chrome-launcher
npx playwright install chromium webkit
```

Le deuxième télécharge les navigateurs headless (~300 Mo, une seule fois).

### Étape 3 · Ajouter les scripts dans package.json

Ouvre ton `package.json` et ajoute dans la section `"scripts"` :

```json
"qa": "node scripts/qa-run.cjs",
"qa:fast": "node scripts/qa-run.cjs --fast",
"qa:visual": "node scripts/qa-run.cjs --visual",
"qa:full": "node scripts/qa-run.cjs --perf",
"qa:update-snaps": "node scripts/qa-run.cjs --update-snaps",
"qa:dashboard": "node scripts/qa-dashboard.cjs",
"qa:report": "npx playwright show-report",
"qa:prod": "cross-env QA_TARGET=prod node scripts/qa-run.cjs --fast"
```

Pour que `cross-env` fonctionne sur Windows PowerShell :

```powershell
npm install --save-dev cross-env
```

### Étape 4 · Vérifier que ton serveur dev tourne

Dans un terminal VS Code :

```powershell
npm run dev
```

Attendu : `Local: http://localhost:5174/`. Laisse ce terminal ouvert.

### Étape 5 · Premier run

Dans un **second** terminal VS Code :

```powershell
npm run qa:fast
```

Attendu (déroulé normal) :

```
━━ Tests E2E ━━
→ npx playwright test tests/e2e --reporter=list,json

Running 22 tests using 1 worker
  ✓ Briottières > La home charge et propose les châteaux
  ✓ Briottières > On peut ouvrir la vitrine Briottières
  ✗ Briottières > BUG: météo hardcodée sur "Rugles"     ← attendu, c'est un bug réel
  ...
```

Les **3 tests "Bugs latents"** échoueront au premier run — c'est volontaire. Ils deviendront verts quand tu corrigeras les vrais bugs dans le code source.

### Étape 6 · Ouvrir le dashboard

```powershell
npm run qa:dashboard
```

Ton navigateur s'ouvre sur `http://localhost:9323` — tu vois le bilan, les étapes, les bugs suivis, et deux boutons pour relancer un run à la demande.

## Utilisation quotidienne

Workflow type pendant que tu développes :

1. Terminal A : `npm run dev` (serveur Vite, toujours ouvert)
2. Terminal B : `npm run qa:dashboard` (dashboard, toujours ouvert)
3. Tu codes tranquillement
4. Avant un commit : clic sur "Run rapide" dans le dashboard
5. Si tout est vert → tu push

Une fois par semaine : clic sur "Run complet + Lighthouse" pour avoir les scores perf.

## Quand un test visuel échoue suite à une modif voulue

Tu as modifié volontairement le design (nouvelle couleur, nouveau layout). Le test visuel détecte un diff. Normal.

```powershell
npm run qa:update-snaps
```

Ça régénère les screenshots de référence. Tu commites les nouveaux `.png`.

## Quand un vrai bug est détecté

Tu as le choix :

- Le corriger toi-même dans le code source
- Demander à Claude Code de le faire via une PR :
  ```
  claude "Les tests Playwright détectent que la météo est hardcodée sur Rugles dans VitrineChateau.jsx. Propose une PR qui lit chateau.ville depuis chateaux.js avec fallback."
  ```

## Dépannage

**"Cannot find module @playwright/test"** → relancer `npm install`

**"Browser not found"** → `npx playwright install chromium webkit`

**Le serveur Vite n'est pas détecté** → vérifie que `npm run dev` tourne bien sur 5174, pas sur 5173

**Test "met2o hardcodée" échoue** → normal, c'est un vrai bug que le test remonte. À corriger côté code source.

**Dashboard ne s'ouvre pas** → vérifie que le port 9323 n'est pas occupé par autre chose

## Pour aller plus loin plus tard

- Ajouter des tests pour les modules B/C/D au fur et à mesure
- Brancher sur GitHub Actions pour run automatique à chaque push (quand vous déploierez sur Vercel)
- Ajouter un test "Fondation du Patrimoine" qui vérifie que le badge est visible et que jamais un pourcentage fixe n'apparaît dans le DOM
