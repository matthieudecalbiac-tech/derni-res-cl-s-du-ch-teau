# CLAUDE.md — Les Clés du Château

Ce fichier guide Claude Code lors de toute intervention sur ce dépôt, et sert également de référence à tout contributeur humain (Matthieu, co-fondateurs, futurs collaborateurs).

## Projet

### Objectif

**Les Clés du Château** est une plateforme patrimoniale française (en ligne sur [lcc-black.vercel.app](https://lcc-black.vercel.app)) qui propose des séjours d'exception dans des châteaux privés à moins de 3 h de Paris. Cible court terme : ~30 châteaux partenaires. UI, contenu, noms de composants et commentaires sont en français — préserver cette langue pour toute modification.

### Co-fondateurs

- **Dimitri** — Stratégie & développement
- **Julien** — SEO & avocat
- **Matthieu** — Développement & CRM
- **Tanguy** — Direction artistique

### Voix éditoriale (non négociable)

Quatre règles strictes qui s'appliquent à toute copie UI ou contenu du site :

1. **Fondation du Patrimoine** : toujours « **une partie de nos recettes** » est reversée. Jamais de pourcentage fixe, même si le user en mentionne un en conversation — la formule reste vague à l'écran.
2. **Statut partenariat** : pour tout château listé, parler de « **partenariat en cours de discussions** » plutôt que d'affirmer un partenariat conclu. Aucune affirmation engageante sans validation explicite.
3. **Citations propriétaires** : ne jamais inventer ni reformuler une citation attribuée à un propriétaire de château. Soit on a la quote validée par eux, soit le bloc citation est omis.
4. **« Le Blanc Buisson »** : toujours avec article (« Le Blanc Buisson », pas « Blanc Buisson » seul). Nom canonique du château id 8.

Ton général : **patrimonial / éditorial**, jamais promotionnel. Pas de superlatifs, pas de tropes d'urgence (« vite ! », « plus que X jours ! »), pas d'emoji dans la copy.

### Stack technique

- **Frontend** : React 19.2, Vite 6.4, JavaScript (pas de TypeScript pour l'instant)
- **Cartes** : Leaflet 1.9 + react-leaflet 5 (CDN pour Leaflet, npm pour react-leaflet)
- **Tests** : Playwright 1.59 + axe-core 4.11 (E2E, visuels, a11y)
- **Performance** : Lighthouse 13 via scripts QA
- **Backend** : Supabase **planifié** (Phase 2.3, pas encore branché)
- **Paiement** : Stripe **planifié**
- **Déploiement** : Vercel
- **Email transactionnel** : Brevo

## Comment ajouter un nouveau château

C'est l'opération la plus fréquente. Deux modes selon le niveau d'éditorialisation souhaité.

### Vitrine standard (id 1-6)

Édit `src/data/chateaux.js`, ajouter un objet en suivant le schéma des entrées id 1-6 (champs : `id`, `nom`, `slug`, `region`, `departement`, `distanceParis`, `urgence`, `chambresRestantes`, `prix`, `prixBarre`, `reduction`, `coordonnees`, `image`, `images`, `style`, `siecle`, `accroche`, `histoire`, `description`, `timeline`, `proprietaires`, `chambres`, `experiences`, `activites`, `alentours`, `tags`, `petitDejeuner`, `parking`, `wifi`, `animaux`, `couleurTheme`, `accentTheme`).

Photos : URL Unsplash ou autre CDN public. Pas de fichier local nécessaire.

Le château apparaîtra dans : `VitrinePermanente`, `DernieresCles` (si `urgence` défini), `CarteExplorer`, `ClubMembres`. Détail ouvert via `ChateauModal`.

### Vitrine premium (id 7+, layout `VitrineChateau`)

Édit `src/data/chateaux.js` avec `estLaUne: true` et le schéma riche : champs supplémentaires `chiffresCles`, `ville`, `regionNarrative`, `regionHistoire`, `proprietaires.initiale`, `proprietaires.nomAffiche`, `alentours[].icone`, `alentours[].description`, optionnel `videoBackground` (ID YouTube).

Photos : **locales** dans `/public/` avec préfixe alphabétique court désignant le château (`bb-` pour Le Blanc Buisson, `bri-` pour Briottières, etc.).

L'aiguillage vers le layout premium est automatique dès que `estLaUne: true` (cf. Architecture § Aiguillage).

### Photos locales

- Format préféré : **AVIF** (poids minimal, qualité préservée)
- Chemin : `/public/<prefixe>-<nom>.avif`
- Référence dans `chateaux.js` : `"/<prefixe>-<nom>.avif"` (slash initial, Vite résout depuis `/public/`)

### Test après ajout

```bash
npm run dev
```

Naviguer vers la home, vérifier que le château apparaît dans les overlays attendus. Pour une vitrine premium : ouvrir l'overlay `Vitrines permanentes` puis cliquer sur le château pour valider l'animation `TransitionPorte` puis `VitrineChateau`.

> ⚠ **Schéma data unifié à venir (Phase 2.1).** En attendant, copier intégralement un château existant comme template, puis adapter les valeurs.

## Commandes

Vite + React 19. Aucun runner de tests JS, aucun linter installé.

- `npm run dev` — démarre le serveur de dev Vite
- `npm run build` — build de production
- `npm run preview` — sert le build

`package-lock.json` est le lockfile en usage ; npm est branché via les scripts. (`pnpm-lock.yaml` a été retiré dans le commit `ede6b25` du 25 avril 2026 pour résoudre une désynchronisation déploiement Vercel.)

### Scripts QA

- `npm run qa` — E2E + visuel
- `npm run qa:fast` — E2E seulement
- `npm run qa:full` — E2E + visuel + Lighthouse
- `npm run qa:baseline` — vérifie les seuils contre `qa-baseline.json`
- `npm run qa:ci` — pipeline CI (qa:fast + baseline strict)
- `npm run qa:dashboard` — dashboard local des résultats

## Architecture

### Application shell (`App.jsx`)

`src/App.jsx` est le seul routeur du site. La page rend `Header` + `Hero` + quelques sections d'accueil, et toutes les autres « pages » (détail château, carte explorateur, auth, compte, club, à-propos, etc.) sont des composants overlay plein écran montés conditionnellement via un booléen `useState` dans `App`. Les callbacks de navigation (`onOuvrirX`) sont drillés depuis `App` vers `Header` (et autres). Pour ajouter une nouvelle page/overlay : ajouter un état `xxxOuvert` dans `App.jsx`, monter le composant conditionnellement à la fin, drill une prop `onOuvrirXxx` vers le déclencheur.

### Aiguillage vitrine standard / premium

L'aiguillage entre layout premium (`VitrineChateau`) et layout standard (`ChateauModal`) se fait via le flag **`estLaUne === true`** sur le château (`App.jsx:118`).

Pour promouvoir un château au layout vitrine premium, il suffit d'ajouter `estLaUne: true` dans son objet dans `chateaux.js` — **aucune modification d'`App.jsx` n'est requise**.

Châteaux actuellement avec `estLaUne` :
- **id 7 — Les Briottières**
- **id 8 — Le Blanc Buisson**

### Données

Source unique : `src/data/chateaux.js` (tableau exporté `chateaux`). Aucun backend pour l'instant — prix, disponibilités, images, histoire, timeline, coordonnées vivent ici. Auth, réservations et adhésion club sont des flux UI sans persistance.

> ⚠ **Schéma actuellement hétérogène entre id 1-6 et id 7-8** (cf. Dette technique Phase 2.1).

### Styles & design tokens

- Un fichier CSS par composant dans `src/styles/`, importé directement depuis le composant.
- `src/styles/global.css` détient les design tokens (CSS custom properties sur `:root`, échelles d'espacement et d'ombre). Réutiliser ces tokens plutôt que d'introduire des couleurs ou polices nouvelles.
- Les polices et CSS/JS Leaflet sont chargés via CDN dans `index.html` (pas d'imports npm).

#### Palette canonique

- **Navy** `#07101E`
- **Or** `#C09840`
- **Crème** `#F7F2E8`

#### Typographies canoniques

- **Playfair Display** — display / titres
- **Crimson Pro** — texte éditorial
- **Cormorant Garamond** — sérif secondaire / accents

Si un token de `global.css` diverge de ces valeurs canoniques, les valeurs canoniques ci-dessus gagnent — mettre à jour le token, ne pas introduire de variante parallèle.

#### Convention de nommage CSS — vitrines premium

Les classes CSS dans les composants vitrines (`VitrineChateau`, `VitrinePermanente`, `VitrineClub`, `VitrineDernieresCle` et leurs CSS) doivent utiliser le préfixe **`vc3-`**. Ne pas mélanger des classes nues dans le markup ou le CSS vitrine — tout scoper sous `vc3-` pour isoler les styles vitrine du reste du site.

### Cartes (Leaflet)

- `CarteExplorer` est le **seul** consommateur de `react-leaflet`.
- `DernieresCles` charge Leaflet via `window.L` (CDN), pas via `react-leaflet`.
- `CarteFrance.jsx` a été supprimé en Chantier 1.2.

### Animations

`src/hooks/useScrollAnimation.js` est un petit hook `IntersectionObserver` (`const [ref, visible] = useScrollAnimation()`) utilisé pour déclencher des fade-in au scroll. Préférer ce hook plutôt qu'une logique observer ad hoc.

## Roadmap stratégique post-audit (avr 2026)

### PHASE 1 — Démine immédiat ✅ TERMINÉE

- ✅ **1.1 Fix bugs visibles** (`8f429db`) — 28 avr 2026
- ✅ **1.2 Purge code mort** (`7696328` + `0d51c1a`) — 30 avr 2026
- ✅ **1.3 MAJ doc CLAUDE.md** (commit présent) — 30 avr 2026

### PHASE 2 — Data layer SOLIDE (~6-8 h)

- **2.1** Schéma unifié `chateaux.js` (réconcilier id 1-6 et id 7-8)
  - ✅ Phase A3 toolkit (PR #8, mergée 30 avr 2026)
  - ⏳ Phase B enrichissement éditorial (en cours)
  - 🔒 Phase C activation auto-validation
- **2.2** Service `useChateaux` + `useCompteurs` (point d'entrée unique, helper `useNombreEnLettres`)
- **2.3** Async-ready Supabase prep (préparation du swap d'implémentation)

### PHASE 3 — Suppression mensonges factuels (~2 h)

`Hero`, `VitrinePermanente`, `BandeauOffres`, `HeureAuxDemeures` consomment des chiffres en dur (« 81 domaines », « 31 demeures », etc.). À transformer en consommateurs de `useCompteurs()` exposé par la Phase 2.2 — actualisation automatique selon le nombre réel de châteaux dans `chateaux.js`.

### PHASE 4 — Cohérence visuelle (~4-5 h)

- **4.1** Tokens design conformes brand book (Navy/Or, Playfair/Crimson dans `global.css`)
- **4.2** `ChateauCarte` mutualisé (5+ duplicats fusionnés)
- **4.3** Pass A11y color-contrast
- **4.4** Vidéo Le Blanc Buisson YouTube → HTML5 natif
- **4.5** `offres.css` à creuser (suppression possible si BandeauOffres ne l'utilise pas)

### PHASE 5 — Modules data-driven (~3 h)

- **5.1** Module C (Club) connecté à `chateaux.js` (suppression `CHATEAUX_CLUB` hardcodé)
- **5.2** Module D (Événementiel) data-driven
- **5.3** `HeureAuxDemeures` sélection dynamique (suppression hardcoding ids `[6,5,1]` + `[7,8,2,3]`)

### PHASE 6 — Pass éditorial Tanguy (asynchrone)

Photos manquantes (Pierrefonds, Chantilly, Ferté-Saint-Aubin), 78 apostrophes droites, ton final.

## Historique des chantiers

| Chantier | Date | Hash | Bilan | Tag de prudence |
|---|---|---|---|---|
| 1.1 — 7 bugs visibles | 28 avr 2026 | `8f429db` | +14 / −7 lignes, 7 fichiers | — |
| 1.2 — Purge code mort | 30 avr 2026 | `7696328` + `0d51c1a` | +2 / −3 784 lignes, 22 fichiers | `pre-purge-1.2` (sur `47f782c`) |
| 2.1 Phase A3 — Toolkit Chateau | 30 avr 2026 | PR #8 (`faf1333`) | +607 / −26 lignes, 10 fichiers (4 nouveaux + 6 modifiés) | — |
| 1.3 — MAJ doc CLAUDE.md | 30 avr 2026 | (commit présent) | doc only | — |

### Surface du repo post-Chantier 1.2

- `/src/components` : **18** composants `.jsx` (32 → 18, −14)
- `/src/styles` : **21** fichiers `.css` (28 → 21, −7)
- `App.jsx` : **188** lignes (216 → 188, −28)
- Bundle production : JS **574 kB**, CSS **227 kB**

## Conventions de chantier

### Pattern « 2 commits pour les chantiers de purge »

Pour les chantiers de suppression de code mort, séparer en 2 commits :

1. **Déconnexion logique** — modifier les fichiers vivants pour supprimer toutes les références au code à purger (imports, states, JSX, props).
2. **Suppression disque** — `git rm` les fichiers physiques.

Garantit que chaque commit laisse `main` avec un build clean (atomicité). Permet `git revert <commit2>` granulaire si un fichier supprimé s'avère utile.

### Tag de prudence avant chantiers structurels

```bash
git tag pre-<chantier> main && git push origin pre-<chantier>
```

Filet de sécurité 6 mois pour rollback ou diff comparatif.

Tags actifs : `pre-purge-1.2` (posé sur `47f782c`).

### Discipline byte-level pour les Edits

Avant un Edit sur fichier source, en cas de doute sur les caractères invisibles (NBSP, CRLF, indentation 4 vs 6 vs 8 espaces) :

```bash
awk 'NR==X' fichier.jsx | od -c | head -5
```

Permet de détecter les U+00A0 (NBSP) typiques des textes français collés depuis Word/web, ou les CRLF/LF mal préservés.

### Edits ciblés un par un (jamais sed multi-stage)

Pour la maintenance ciblée d'`App.jsx` ou autres fichiers vivants (refactor, purge), préférer **N Edits ciblés successifs à 1 sed multi-stage**.

Justification : risque de corruption silencieuse de l'encodage UTF-8/CRLF, patterns sed fragiles, pas de diff intermédiaire reviewable. Pattern validé en Chantiers 1.1 (7 Edits) et 1.2 (16 Edits).

**Exception** : codemods bulk sur `chateaux.js` (transformations homogènes appliquées à toutes les entrées) restent légitimes en script `.cjs` — cf. Hygiène du repo.

### Dry-run avant Edits multi-fichiers

Pour les chantiers touchant **≥3 fichiers**, faire un dry-run d'inventaire **avant exécution** :

1. Pour chaque fichier impacté : lister chemin import à ajouter (vérifier profondeur relative), Edits exacts (OLD/NEW), inspection byte-level préalable (NBSP, indentation, encoding).
2. Identifier les pièges potentiels : matches multiples du même pattern, structures JSX environnantes, faux positifs sed/grep.
3. Faire valider le rapport par le user avant exécution.

Justification : 10 min de dry-run = 30 min de débogage évitées. Pattern validé en Chantier 2.1 Commit 4 (5 fichiers, 14 Edits, 0 régression).

## Hygiène du repo

- `fix.cjs`…`fix9.cjs` à la racine sont des scripts Node one-shot ayant servi à réécrire les URLs d'images dans `src/data/chateaux.js` et `src/components/VitrineChateau.jsx`. Ils ne font pas partie du build — ne pas les importer ni les étendre ; écrire un nouveau `fixN.cjs` uniquement pour une migration similaire ponctuelle.
- Pour tout find/replace ou codemod **bulk** sur `chateaux.js` (transformation homogène sur toutes les entrées), écrire un script `.cjs` et l'exécuter avec `node`. Ne jamais utiliser `python -c '...'` inline. (Pour la maintenance ciblée d'autres fichiers, cf. Conventions de chantier § Edits ciblés.)
- `*-knowledge.txt` à la racine sont des snapshots de référence, pas du code vivant. Ne pas modifier sans demande explicite.
- `lcc-backup*.bundle` sont des bundles git conservés comme sauvegardes.

## Dette technique

Liste des chantiers non bloquants identifiés. Mise à jour : retirer une ligne quand la dette est résolue, ou la déplacer dans Historique des chantiers.

- **[Phase 1.x] Filtre baseline-check console-errors** : ajouter des `IGNORE_PATTERNS` dans `scripts/agents/console-errors.cjs` pour ignorer les HTTP 4xx/5xx vers domaines externes (`api.open-meteo.com`, `images.pexels.com`, `images.unsplash.com`, `www.youtube.com`). Permet de redescendre `qa-baseline.json:console-errors.erreurs.max` de 3 à 1 (3 absorbe la variance CDN actuellement). Estimé 1-2 h. Branche candidate : `refactor/console-errors-filter`. Identifié le 25 avril 2026 suite au run CI #18.

- **[Phase 1.x] Convention import sans extension à formaliser** : règle implicite du repo (`from "../data/chateaux"` sans `.js`) non documentée. À formaliser dans CLAUDE.md § Architecture, soit via une note explicite, soit via ESLint si on ajoute un linter plus tard. Identifié pendant Chantier 2.1 Phase A3 (1er mai 2026 — relecture 30 avr).

- **[Phase 1.x] Audit line endings + `.gitattributes`** : `UneDeLaSemaine.jsx` était en LF dans un repo majoritairement CRLF (détecté pendant Chantier 2.1 Phase A3). Probablement d'autres fichiers en LF dans le repo. À régler via `.gitattributes` à la racine forçant CRLF sur `.jsx/.js/.cjs/.md/.css/.json/.html`, puis `git add --renormalize .`. ~30 min.

- **[Phase 1.x] CI workflow `validate:chateaux`** : ajouter `npm run validate:chateaux` en pre-build dans `.github/workflows/qa.yml` (ou job dédié). Empêche le merge d'un château incomplet. ~15 min. À faire **après Phase B** (sinon CI plante immédiatement avec 98 erreurs actuelles).

- **[Phase 2.1] Schéma data unifié id 1-6 vs 7-8** : incohérence détectée par audit du 29 avril 2026. id 1-6 ont `tags`/`experiences`/`noteSur5`/`activites` (objets) ; id 7-8 ont `chiffresCles`/`regionNarrative`/`proprietaires.initiale`/`activites` (strings). À réconcilier en un schéma unique avant de pouvoir réutiliser un composant `ChateauCarte` (Phase 4.2) ou un service `useChateaux` (Phase 2.2) sans branchements multiples.

- **[Phase 2.2] Service `useChateaux` + `useCompteurs`** : centraliser `getChateaux` / `getChateauBySlug` / `getChateauById` dans un seul service. Exposer `useCompteurs()` pour les chiffres affichés en surface (Phase 3). Ajouter helper `useNombreEnLettres(n)` pour l'écriture des nombres en français (« trente-et-une demeures »).

- **[Phase 3] Compteurs dynamiques (ajout stratégique Matthieu)** : les surfaces vivantes affichent des chiffres en dur qui ne reflètent pas la data réelle.
  - `Hero.jsx` : « 81 domaines sélectionnés »
  - `VitrinePermanente.jsx` : « 81 Domaines / 7 Régions »
  - `BandeauOffres.jsx` : « 8 chambres » + « 31 demeures »
  - `HeureAuxDemeures.jsx` : « VOIR LES TRENTE-ET-UNE DEMEURES »
  
  À transformer en consommateurs de `useCompteurs()` (Phase 2.2) pour actualisation automatique selon le contenu réel de `chateaux.js`.

- **[Phase 4.2] `ChateauCarte` mutualisé** : 5+ implémentations dupliquées détectées dans `VitrinePermanente`, `CarteExplorer`, `DernieresCles`, `ClubMembres`, `HeureAuxDemeures`, `UneDeLaSemaine`. Fusion en un composant unique avec variantes (`eyebrow`, `editorial`, `last-minute`, `vitrine`, `club`).

- **[Phase 4.4] Vidéo Le Blanc Buisson YouTube → HTML5 natif** : −3 critical a11y absorbés au baseline. iframe YouTube `JQ9m51Bl900` actuelle non a11y-compliante. Migration vers vidéo HTML5 native dans `/public/` retire ces faux positifs et donne le contrôle complet sur le poster, l'autoplay et la coupure mobile.

- **[Phase 4.5] `offres.css` à creuser** : épargné en Chantier 1.2 par prudence (importé par `BandeauOffres` vivant). À vérifier si `BandeauOffres` utilise réellement les classes de `offres.css` ou si l'import est lui-même mort. Si mort : suppression possible (~593 lignes).

- **[Phase 6.x] Pass éditorial vitrine premium (avec Tanguy)** : bugs visuels préexistants détectés pendant test visuel Chantier 2.1 Phase A3 :
  - Coquille « Brouillaird » → « Brouillard » dans `VitrineChateau` diptyque (~ligne 322)
  - Image fond diptyque jour : URL Unsplash temple asiatique (Wat Pho/Wat Arun) à remplacer par image patrimoine français
  - Audit complet à faire de toutes les URLs Unsplash dans `chateaux.js` + composants pour cohérence patrimoniale française (vérifier qu'aucune photo non-française n'apparaît dans une vitrine)
