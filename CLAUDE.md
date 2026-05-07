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
- **Cartes** : Leaflet 1.9 (CDN dans `index.html`) — `react-leaflet` (npm) retiré en Chantier 2.2 avec la suppression de `CarteExplorer`
- **Tests** : Playwright 1.59 + axe-core 4.11 (E2E, visuels, a11y)
- **Performance** : Lighthouse 13 via scripts QA
- **Backend** : Supabase **planifié** (couche services async-ready depuis Phase 2.3 / 6 mai 2026, swap data layer trivial)
- **Paiement** : Stripe **planifié**
- **Déploiement** : Vercel
- **Email transactionnel** : Brevo

## Comment ajouter un nouveau château

C'est l'opération la plus fréquente. Deux modes selon le niveau d'éditorialisation souhaité.

### Vitrine standard (id 1-6)

Édit `src/data/chateaux.js`, ajouter un objet en suivant le schéma des entrées id 1-6 (champs : `id`, `nom`, `slug`, `region`, `departement`, `distanceParis`, `urgence`, `chambresRestantes`, `prix`, `prixBarre`, `reduction`, `coordonnees`, `image`, `images`, `style`, `siecle`, `accroche`, `histoire`, `description`, `timeline`, `proprietaires`, `chambres`, `experiences`, `activites`, `alentours`, `tags`, `petitDejeuner`, `parking`, `wifi`, `animaux`, `couleurTheme`, `accentTheme`).

Photos : URL Unsplash ou autre CDN public. Pas de fichier local nécessaire.

Le château apparaîtra dans : `VitrinePermanente`, `DernieresCles` (si `urgence` défini), `ClubMembres`. Détail ouvert via `ChateauModal`.

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

- `DernieresCles` est le **seul** consommateur actuel — utilise Leaflet via `window.L` (CDN dans `index.html`), pas via npm.
- `react-leaflet` (npm) **retiré en Chantier 2.2** avec la suppression de `CarteExplorer.jsx` (seul consommateur historique).
- `CarteFrance.jsx` supprimé en Chantier 1.2 ; `CarteExplorer.jsx` supprimé en Chantier 2.2.

### Animations

`src/hooks/useScrollAnimation.js` est un petit hook `IntersectionObserver` (`const [ref, visible] = useScrollAnimation()`) utilisé pour déclencher des fade-in au scroll. Préférer ce hook plutôt qu'une logique observer ad hoc.

### Hooks data (`src/hooks/`)

Service centralisé d'accès aux données châteaux. Tous les composants **doivent** passer par ces hooks plutôt que d'importer directement `chateaux` depuis `src/data/chateaux.js`. Préparation Phase 2.3 (Supabase async).

Tous les hooks data retournent depuis Phase 2.3 (6 mai 2026) le pattern `{ data, loading, error }` (async via `chateauxService`). Pattern cancellation uniforme (`let cancelled = false` + cleanup).

- **`useChateaux({ excludeMocks })`** — retourne `{ chateaux, loading, error }`. Initial state `chateaux = []`.
- **`useChateau(slug)`** — retourne `{ chateau, loading, error }`. Initial state `chateau = null`. Préparé Phase 3+ pour URLs SEO `/chateau/<slug>`.
- **`useChateauById(id)`** — retourne `{ chateau, loading, error }`. Initial state `chateau = null`.
- **`useCompteurs({ excludeMocks })`** — retourne `{ compteurs, loading, error }`. Initial state objet 7 champs à zéro (`total`, `parRegion`, `regionsCouvertes`, `urgences`, `urgentesJ7`, `chambresRestantes`, `chambresUrgentes`). Étendu en Phase 2.2.bis (3 mai 2026), refactor async Phase 2.3 (6 mai 2026).
- **`nombreEnLettres(n)`** + **`useNombreEnLettres(n)`** — convertit 0-9999 en lettres françaises (réforme 1990). Prêt pour Phase 2.2.bis (« quatre-vingts demeures »).
- **`useScrollAnimation()`** (existant) — `IntersectionObserver` pour fade-in scroll.

⚠ **Règle stricte** : aucun composant ne doit `import { chateaux } from "../data/chateaux"`. Le grep `git grep "from.*data/chateaux" src/components/` doit retourner **0 résultat**.

### Services data (`src/services/`)

Couche d'abstraction async entre les hooks et la source de vérité (Phase 2.3, 6 mai 2026).

- **`src/services/chateauxService.js`** — 4 fonctions async exportées :
  - `getChateaux({ excludeMocks })` → `Promise<Chateau[]>`
  - `getChateauBySlug(slug)` → `Promise<Chateau | null>`
  - `getChateauById(id)` → `Promise<Chateau | null>`
  - `getCompteurs({ excludeMocks })` → `Promise<Compteurs>`

Aujourd'hui : lit `src/data/chateaux.js` (statique).
Demain : `await supabase.from("chateaux").select(...)` — hooks et composants ne changeront pas.

**Mock latency** : `VITE_FAKE_LATENCY=300 npm run dev` simule la latence Supabase pour tester les loading states. Variable lue une fois au load via IIFE. Désactivée par défaut (0). Cf. `.env.example`.

⚠ **Règle stricte** : aucun hook ne doit `import { chateaux } from "../data/chateaux"`. Tous les hooks data passent désormais par `chateauxService`.

## Roadmap stratégique post-audit (avr 2026)

### PHASE 1 — Démine immédiat ✅ TERMINÉE

- ✅ **1.1 Fix bugs visibles** (`8f429db`) — 28 avr 2026
- ✅ **1.2 Purge code mort** (`7696328` + `0d51c1a`) — 30 avr 2026
- ✅ **1.3 MAJ doc CLAUDE.md** (commit présent) — 30 avr 2026

### PHASE 2 — Data layer SOLIDE (~6-8 h)

- **2.1** Schéma unifié `chateaux.js` (réconcilier id 1-6 et id 7-8) ✅ TERMINÉE
  - ✅ Phase A3 toolkit (PR #8 `faf1333`, mergée 30 avr 2026)
  - ✅ Phase B+C remplissage technique mocks + filet runtime (PR #9 `720cbdb`, mergée 1er mai 2026)
- **2.2** Service `useChateaux` + `useCompteurs` + helper `useNombreEnLettres` ✅ TERMINÉE
  - ✅ Hooks créés + 5/5 composants vivants migrés + cleanup CarteExplorer mort (PR #10 `1f02992`, mergée 3 mai 2026)
  - ✅ **Phase 2.2.bis** ✅ TERMINÉE PARTIELLEMENT (3 mai 2026, branche `feat/dynamic-counters`)
    - Extension `useCompteurs` (`chambresRestantes` + `chambresUrgentes`)
    - Migration `BandeauOffres` « 8 chambres » → `compteurs.chambresUrgentes` (correction bug factuel : 8 → 33)
    - Cibles éditoriales (Hero 81, BandeauOffres 31, VitrinePermanente 81/7, HeureAuxDemeures « TRENTE-ET-UNE », APropos + PartenairesChateaux 7) restent hardcodées : décision Matthieu — seront branchées sur Espace Admin (Phase 5.x) pour modification 1-click par Dimitri/Tanguy sans deploy.
- **2.3** Async-ready Supabase prep ✅ TERMINÉE (4-6 mai 2026, branche `feat/async-ready-supabase`)
  - Couche services `src/services/chateauxService.js` — 4 fonctions async (`getChateaux`, `getChateauBySlug`, `getChateauById`, `getCompteurs`)
  - Hooks `useChateaux`/`useCompteurs` refactor pattern `{ data, loading, error }` + cancellation
  - Migration 6 composants (BandeauOffres, UneDeLaSemaine, VitrinePermanente, HeureAuxDemeures, ClubMembres, DernieresCles)
  - Création `SkeletonChateau` (placeholder patrimonial) pour DernieresCles
  - Mock latency `VITE_FAKE_LATENCY` env var (cf. `.env.example`)

### PHASE 3 — Auth & rôles (~30-50 h) 🔒

Fondation des 3 espaces utilisateurs.

- **3.1** Authentification Supabase (signup/login/reset, magic links + Google OAuth) — ~10-15 h
- **3.2** Modèle de rôles (admin / client / hôtel) — schemas Supabase `user_profiles`, `chateau_owners`, `wishlists` — ~8-10 h
- **3.3** Row Level Security (RLS) Supabase — policies par rôle — ~6-8 h
- **3.4** Routing protégé React (`ProtectedRoute`, 3 espaces) — ~6-10 h

### PHASE 4 — Espaces utilisateurs (~80-120 h) 🔒

- **4.1** Espace Client (~25-35 h) : profil, wishlist, réservations, club, avis
- **4.2** Espace Hôtel (~30-40 h) ⭐ DIFFÉRENCIATEUR LCC : calendrier dispos, tarifs, vitrine éditable, réservations, finances. UI patrimoniale, jamais « dashboard SaaS B2B ».
- **4.3** Espace Admin (~25-35 h) : CRUD châteaux, dashboards, modération, finances, contenu éditorial

### PHASE 5 — Réservation transactionnelle (~40-60 h) 🔒

- **5.1** Calendrier disponibilités client — ~10-15 h
- **5.2** Stripe Payment Intents (Connect platform) — ~15-20 h
- **5.3** Email transactionnel Brevo — ~8-10 h
- **5.4** Webhooks Stripe → Supabase Edge Functions — ~7-15 h

### PHASE 6 — Pass éditorial Tanguy (~15-25 h) 🔒

En parallèle des Phases 3-5. Audit URLs Unsplash, coquilles, cohérence éditoriale. Coordonné avec Tanguy (direction artistique).

### PHASE 7 — Module D événementiel (Q3/Q4 2026, ~50-70 h) 🔒

Location châteaux pour événements privés (mariages, séminaires). Hors scope court terme.

## Historique des chantiers

| Chantier | Date | Hash | Bilan | Tag de prudence |
|---|---|---|---|---|
| 1.1 — 7 bugs visibles | 28 avr 2026 | `8f429db` | +14 / −7 lignes, 7 fichiers | — |
| 1.2 — Purge code mort | 30 avr 2026 | `7696328` + `0d51c1a` | +2 / −3 784 lignes, 22 fichiers | `pre-purge-1.2` (sur `47f782c`) |
| 1.3 — Refonte CLAUDE.md FR + roadmap | 30 avr 2026 | `5abf983` | doc only, +232 / −45 lignes | — |
| 2.1 Phase A3 — Toolkit Chateau | 30 avr 2026 | PR #8 (`faf1333`) | +607 / −26 lignes, 10 fichiers (4 nouveaux + 6 modifiés) | — |
| 1.4 — MAJ doc post-Phase A3 | 30 avr 2026 | `0917548` | doc only, +25 lignes | — |
| 2.1 Phase B+C — Conformité schéma + filet | 1er mai 2026 | PR #9 (`720cbdb`) | +179 / −154 lignes cumulées, 7 commits atomiques (data + main.jsx + qa-baseline.json), 3 bugs résolus avec discipline | `pre-schema-2.1` (sur `0917548`) |
| 1.5 — MAJ doc post-Phase B+C | 1er mai 2026 | `7002416` | doc only, +61 / −23 lignes | — |
| 2.2 — Service useChateaux + cleanup CarteExplorer | 2-3 mai 2026 | PR #10 (`1f02992`) | +206 / −406 lignes, 10 commits, 5 composants migrés + 1 mort retiré, bundle JS −28 % (583→421 kB) | `pre-phase-2.2` (sur `7002416`) |
| 1.6 — MAJ doc post-Phase 2.2 | 3 mai 2026 | (commit présent) | doc only | — |
| 2.2.bis — Extension useCompteurs + migration BandeauOffres | 3 mai 2026 | PR #11 (`aad16f9`) | +45 / −28 lignes (2 fichiers), correction bug factuel 8 → 33 chambres | `pre-phase-2.2.bis` (sur `fc6e022`) |
| 1.7 — MAJ doc post-Phase 2.2.bis | 4 mai 2026 | `a3d44bb` | doc only, +24 / −10 lignes (PR #11) | — |
| 1.X — npm audit fix vite + postcss | 4 mai 2026 | `0ade589` | +6 / −6 lignes lockfile, 3 GHSA résolues (vite Path Traversal + WebSocket File Read, postcss XSS) | `pre-fix-npm-audit` (sur `aad16f9`) |
| 1.X — Memoize chateauxFiltres | 4 mai 2026 | `35a0581` | +5 / −2 lignes, useEffect Leaflet stabilisé | `pre-fix-memoize-chateauxFiltres` (sur `0ade589`) |
| 1.X — CI validate:chateaux fail-fast | 4 mai 2026 | PR #12 (`e0407fb`) | +6 / 0 lignes, fail-fast schema avant install Playwright | `pre-fix-ci-validate-chateaux` (sur `35a0581`) |
| 2.3 — Async-ready Supabase prep | 4-6 mai 2026 | PR à venir | +335 / −63 lignes (8 commits, 9 fichiers : 3 nouveaux + 6 modifiés), 6 composants migrés, SkeletonChateau patrimonial | `pre-phase-2.3` (sur `e0407fb`) + `pre-c8-dernierescles` (sur `1967cd3`) |
| 1.7 — `.gitattributes` posé (discipline byte-level préventive) | 7 mai 2026 | `d677f0f` | +78 / 0 lignes, 1 fichier (`.gitattributes`), 0 fichier reformaté par `--renormalize` (repo déjà conforme CRLF/UTF-8 sans BOM) | `pre-gitattributes-renorm` (sur `62724da`) |
| 1.8 — Filtre baseline-check console-errors (IGNORE_PATTERNS + corrélation URL) | 7 mai 2026 | `700bc69` + `8caf238` | +31 / 0 lignes (script: 24 logique corrélation URL + 7 patterns CDN), qa-baseline.json calibré empiriquement (63 occ → 1-2 résiduelles, 96% bruit CDN éliminé) | `pre-console-errors-filter` (sur `e52da93`) |
| 1.9 — Reclassif cancels console-errors (Phase 4.x bri-1.avif résolue) | 7 mai 2026 | `062c490` | +6 / −1 lignes (commentaire 4 + const isCancel + ternaire avec parenthèses), qa-baseline.json erreurs.max 2→1 et avertissements.max 1→2 | `pre-bri-1-avif-investigation` (sur `6f6c1d5`) |

### Surface du repo post-Phase 2.3

- `/src/components` : **18** composants `.jsx` (17 → 18, +1 : `SkeletonChateau` en Phase 2.3 C8)
- `/src/services` : **1** nouveau dossier (`chateauxService.js`, couche async Phase 2.3)
- `/src/styles` : **21** fichiers `.css` (21 → 21, +`skeleton-chateau.css` − `carte-explorer.css` supprimé Chantier 1.X du 4 mai)
- `/src/hooks` : **4** hooks `.js` (inchangé en nombre, refactor pattern `{ data, loading, error }` Phase 2.3)
- `App.jsx` : **178** lignes (inchangé)
- `.env.example` : nouveau fichier (documente `VITE_FAKE_LATENCY`)
- Bundle production : JS **422.6 kB** (421 → 422.6, +0.4 % pour async/loading + skeleton), CSS **206.7 kB** (206 → 206.7, +670 octets skeleton)

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

### Convention encoding CRLF après Edit multi-lignes

Le tool Edit (Claude Code) peut convertir CRLF → LF silencieusement sur les Edits déplaçant un bloc de >10 lignes. Le diff Git affiche alors TOUT le fichier comme modifié (pollution Git history massive).

Convention : exécuter `unix2dos` systématiquement après tout Edit multi-lignes ou déplacement de bloc, MÊME si le fichier semblait correctement encodé avant.

Précédent identifié : `BandeauOffres.jsx` Phase 2.2.bis (3 mai 2026) — 28 lignes déplacées top-level → body, CRLF perdu silencieusement, restauré via `unix2dos` avant commit.

### Runtime rouge intermédiaire dans PR atomique

Vite build est compilation pure (pas de TypeScript) → ne détecte pas les type mismatches cross-fichier. Un build VERT ne valide PAS le runtime. Pour les PR atomiques (multi-commits qui se complètent), accepter un runtime cassé entre commits intermédiaires si la PR finale rétablit l'invariant.

Précédent identifié : Phase 2.3 C2 (4 mai 2026) — refactor `useChateaux`/`useCompteurs` pour pattern `{ data, loading, error }`. Build vert mais composants attendaient un Array → runtime cassé pendant 6 commits (C2-C7) jusqu'à migration progressive.

Garde-fous :
- Tag de prudence sur main avant la branche atomique (`pre-phase-X.Y`)
- Build sanity à chaque commit pour détecter les syntax errors (mais pas les type errors)
- PR atomique obligatoire — aucun commit intermédiaire mergeable seul
- Test visuel local AVANT merge final pour preuve runtime end-to-end

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

### Contraintes sur `src/data/chateaux.js`

Le fichier `chateaux.js` est chargé dans **3 contextes** distincts :

1. **Vite (dev + prod)** : import ESM moderne, tolère absence d'extension.
2. **Script CLI Node natif** (`scripts/validate-chateaux.cjs`) : import dynamique, exige extension `.js`.
3. **Hack CI CommonJS** (`scripts/lib/charger-chateaux.cjs` via `new Function('module', 'exports', code)`) : exécute le code en CommonJS, NE supporte PAS les `import` ESM top-level.

**RÈGLE** : `chateaux.js` doit rester un **pur fichier `export const`**, sans `import` ni autre side-effect (`forEach`, `console.log`, etc.). Pour activer un filet runtime, passer par `src/main.jsx` avec `import.meta.env.DEV` (cf. apprentissage Phase B.5, 1er mai 2026).

### Régressions volontaires sur métriques CI (`qa-baseline.json`)

Le système `qa-baseline.json` + `qa-check-baseline.cjs` détecte les régressions sur les métriques d'agents CI (a11y-axe, console-errors, validation-donnees, playwright-e2e). Quand une régression est **volontaire et acceptée** (ex : nouvelle dette consciente après un pivot stratégique), suivre cette procédure :

1. Mettre à jour le seuil `max` de la métrique concernée dans `qa-baseline.json` (ajouter une marge de ~3 unités pour absorber les futures fluctuations).
2. Mettre à jour la valeur `actuel` (= ce que la CI verra).
3. Étendre la `dette` pour distinguer les sources (ex : « X historiques + Y nouveaux liés à <raison> »).
4. **Ajouter une entrée en tête de `meta.revisions`** (ordre chronologique inversé) avec : `date`, `agent`, `champ`, `ancien`, `nouveau`, `raison` détaillée.
5. **Commit séparé** : `chore(qa): révision baseline <agent>.<champ>`.

Test local avant push : `node scripts/qa-check-baseline.cjs --strict` doit retourner exit 0 (« OK »).

Apprentissage Phase B+C (1er mai 2026) : régression `validation-donnees.avertissements` 78 → 97 (+19 placeholder Phase B), absorbée en `max=100`.

### Convention deps `useMemo` / `useEffect` / `useCallback` consommant `chateaux`

Pour **tout** `useMemo` / `useEffect` / `useCallback` qui consomme `chateaux` (directement ou via une fonction qui le reçoit en argument) : **ajouter `chateaux` aux deps**.

Justification : `useChateaux()` retourne aujourd'hui une référence stable (mémoisée), mais Phase 2.3 (Supabase async) introduira `{ chateaux, loading, error }` avec référence changeante. Les deps correctes garantissent un re-calcul automatique.

Bénéfices anticipés :
- Phase 2.3 : zéro régression au branchement async
- Phase 4 : `useChateaux({ excludeMocks })` retourne une autre référence → recalcul automatique
- ESLint `react-hooks/exhaustive-deps` (futur Phase 3+) : warning pré-corrigé

Apprentissages Chantier 2.2.D.3 (`HeureAuxDemeures`, fix preventif) et 2.2.D.6 (`CarteExplorer`, **bug latent réel** : useEffect ne se serait jamais re-déclenché si `chateaux` changeait — composant retiré, mais convention acquise).

## Hygiène du repo

- `fix.cjs`…`fix9.cjs` à la racine sont des scripts Node one-shot ayant servi à réécrire les URLs d'images dans `src/data/chateaux.js` et `src/components/VitrineChateau.jsx`. Ils ne font pas partie du build — ne pas les importer ni les étendre ; écrire un nouveau `fixN.cjs` uniquement pour une migration similaire ponctuelle.
- Pour tout find/replace ou codemod **bulk** sur `chateaux.js` (transformation homogène sur toutes les entrées), écrire un script `.cjs` et l'exécuter avec `node`. Ne jamais utiliser `python -c '...'` inline. (Pour la maintenance ciblée d'autres fichiers, cf. Conventions de chantier § Edits ciblés.)
- `*-knowledge.txt` à la racine sont des snapshots de référence, pas du code vivant. Ne pas modifier sans demande explicite.
- `lcc-backup*.bundle` sont des bundles git conservés comme sauvegardes.

## Dette technique

Liste des chantiers non bloquants identifiés. Mise à jour : retirer une ligne quand la dette est résolue, ou la déplacer dans Historique des chantiers.

- ~~**[Phase 1.x] Filtre baseline-check console-errors**~~ ✅ Résolue (Chantier 1.8, 7 mai 2026, commits `700bc69` + `8caf238`) — `IGNORE_PATTERNS` CDN externes posés (videos.pexels.com, images.pexels.com, images.unsplash.com, api.open-meteo.com, www.youtube.com, i.ytimg.com) + corrélation URL temporelle pour erreurs orphelines (fenêtre 5 sec, capte les "Failed to load resource: net::ERR_FAILED" et "429 Too Many Requests" sans URL exposée par Playwright). Calibré empiriquement sur l'artefact CI e52da93 : 63 occurrences → 1-2 résiduelles (96% bruit éliminé). `qa-baseline.json:console-errors.erreurs.max` resserré 3→2, `avertissements.max` resserré 3→1. Resserrement final à 0/0 conditionné par résolution Phase 4.4 (compute-pressure iframe YouTube) + Phase 4.x #9 bri-1.avif.

- **[Phase 1.x] RÉVISER convention import — extension `.js` requise pour modules chargés par Node natif** : Vite tolère l'absence d'extension, mais Node natif (utilisé par `scripts/validate-chateaux.cjs` via dynamic import) exige `.js` explicite. Apprentissage Phase B.5 (1er mai 2026) : `chateaux.js` qui importe `validateChateau` doit utiliser `from "../utils/validateChateau.js"` (avec extension). À formaliser : convention « extension `.js` partout » ou « exception documentée pour modules chargés par Node ». ~1-2 h migration de tous les imports si Option A (cohérence).

- **[Phase 1.x] Trou couverture C1 — responses 4xx/5xx orphelines** : la corrélation URL temporelle de C1 (commit `700bc69`) écoute uniquement les events `requestfailed` Playwright (fenêtre 5 sec). Les réponses HTTP 4xx/5xx (ex: Open-Meteo `429 Too Many Requests`) ne génèrent PAS de `requestfailed` dans Playwright — elles sont émises comme `response` avec status d'erreur. Conséquence : un message console orphelin "Failed to load resource: 429..." n'est PAS corrélé à son URL externe et reste classé erreur (sauf si l'URL est dans IGNORE_PATTERNS C2). Découvert le 7 mai 2026 lors du Sprint 4-β reproduction locale mobile-safari (1 erreur 429 Open-Meteo orpheline observée). Fix : étendre le listener corrélation URL pour aussi écouter `response` avec `response.status() >= 400`, et inclure son URL dans la fenêtre événementielle 5 sec. ~30-45 min. Branche candidate : `refactor/console-errors-correlation-4xx`.

- **[Phase 1.x] Optimisation bundle prod — extraire filet dev** : le filet `validateChateau` activé en B.5 bis via `import.meta.env.DEV` dans `main.jsx` génère +9 kB résiduels en prod (overhead runtime ESM des dynamic imports, malgré constant folding de Rollup). Solution : extraire dans `src/dev/validateAtBoot.js` chargé via dynamic import sans top-level await depuis `main.jsx`. ~30 min. Identifié 1er mai 2026.

- **[Phase 1.x] Documenter `scripts/lib/charger-chateaux.cjs`** : utilise un hack `new Function('module', 'exports', code)` pour exécuter `chateaux.js` en mode CommonJS dans les agents CI (a11y-axe, console-errors, playwright-e2e). Ce hack ne supporte PAS les `import` ESM. **Règle implicite** : `chateaux.js` doit rester un pur fichier `export const`, sans `import` top-level. Apprentissage Phase B.5 (1er mai 2026) : le commit B.5 initial avait ajouté un import qui cassait 3 agents CI. Rectifié en B.5 bis en déplaçant le filet dans `main.jsx`. Cf. nouvelle convention « Contraintes sur `chateaux.js` ».

- **[Phase 1.x] Investiguer écart `validation-donnees.avertissements` local vs CI** : en local Windows, le validateur retourne 78 avertissements ; en CI Linux Ubuntu, 97. Probable cause : multi-browser playwright-e2e ou contexte Node différent. À investiguer pour comprendre si la métrique est fiable. Pas urgent (la baseline absorbe les deux valeurs avec max=100). ~1-2 h. Identifié 1er mai 2026.

- ~~**[Phase 1.x] Audit line endings + `.gitattributes`**~~ ✅ Résolue (Chantier 1.7, 7 mai 2026, commit `d677f0f`) — `.gitattributes` posé à la racine (UTF-8 sans BOM + CRLF, binaires flaggés `.bundle`/images/polices/médias, `.sh` en LF). `git add --renormalize .` a touché **0 fichier de code** : la discipline byte-level accumulée depuis Phase 1.6+ avait déjà rendu le repo conforme. Le filet est désormais purement préventif (futur collaborateur, IDE différent, copier-coller web).

- ~~**[Phase 1.x] CI workflow `validate:chateaux` pre-build**~~ ✅ Résolue (Chantier 1.X, 4 mai 2026, PR #12 `e0407fb`) — step ajouté dans `qa.yml` aux 2 jobs (qa-fast + qa-full), fail-fast en ~30s avant install Playwright.

- ~~**[Phase 1.x] Désinstaller `react-leaflet` + `leaflet` npm**~~ ✅ Résolue (Chantier 1.6, 3 mai 2026, commit `fc6e022`) — `npm uninstall react-leaflet leaflet`, package.json/lock allégés, build inchangé (tree-shake déjà fait).

- ~~**[Phase 1.x] Suppression `src/styles/carte-explorer.css`**~~ ✅ Résolue (Chantier 1.6, 3 mai 2026, commit `fc6e022`) — `git rm` du fichier orphelin.

- ~~**[Phase 4.x] Memoize `chateauxFiltres` dans `DernieresCles.jsx`**~~ ✅ Résolue (Chantier 1.X, 4 mai 2026, commit `35a0581`) — wrap `useMemo([chateaux, dateArrivee])`, useEffect Leaflet stabilisé, +5/-2 lignes, +20 octets bundle.

- **[Phase 2.2.bis] Compteurs dynamiques (ajout stratégique Matthieu)** — ✅ RÉSOLUE PARTIELLEMENT (3 mai 2026)
  - ✅ `BandeauOffres.jsx` « 8 chambres » → `compteurs.chambresUrgentes` (commit `fd564cd`, branche `feat/dynamic-counters`)
  - ⏸ Reste à brancher (Phase 5.x via Espace Admin, cf. nouvelle dette ci-dessous) :
    - `Hero.jsx` : « 81 domaines »
    - `BandeauOffres.jsx` : « 31 demeures »
    - `VitrinePermanente.jsx` : « 81 / 7 Régions »
    - `HeureAuxDemeures.jsx` : « TRENTE-ET-UNE DEMEURES »
    - `APropos.jsx` + `PartenairesChateaux.jsx` : « 7 Régions couvertes »

- **[Phase 5.x] Cibles éditoriales depuis Espace Admin** : les chiffres affichés en surface (81 domaines, 31 demeures, 7 régions, « TRENTE-ET-UNE DEMEURES », etc.) seront branchés sur un champ DB éditable via l'Espace Admin construit en Phase 5.x. Permet à Dimitri (stratégie) et Tanguy (DA) de modifier en 1 click sans deploy. Décision Matthieu 3 mai 2026 lors de Phase 2.2.bis : refus de créer `src/data/objectifs.js` (dette qui serait supprimée à l'arrivée de l'admin).

- **[Phase 4.x] Polish DernieresCles ternaire indentation** : après wrap `loading ? Skeleton : map` en C8 (6 mai 2026), le body de `chateauxFiltres.map()` reste à 16 espaces au lieu de 18 idéal (cosmétique, fonctionnel). Sera corrigé automatiquement au prochain Prettier save format si configuré. ~1 min. Identifié 6 mai 2026.

- **[Phase 4.x] SkeletonChateau réutilisable VitrinePermanente / ClubMembres** : actuellement utilisé uniquement dans `DernieresCles` (Phase 2.3 C8). Si UX premium souhaitée pour les autres listes, intégrer le ternaire `{ loading ? <SkeletonChateau /> : map }`. ~30 min total (2 composants × 15 min). Identifié 6 mai 2026.

- ~~**[Phase 4.x] Investigation "Load request cancelled" mobile-safari sur /bri-1.avif**~~ ✅ Résolue (Chantier 1.9, 7 mai 2026, commit `062c490`) — diagnostic empirique : reproduction locale Windows mobile-safari (`npx playwright` + agent console-errors mode mobile-safari only) a révélé qu'il s'agissait d'une **CLASSIFICATION ERRONÉE** dans l'agent QA, pas d'un bug applicatif. Les images sont chargées passivement via `background-image` inline CSS dans 5 composants (`VitrinePermanente`, `DernieresCles`, `ClubMembres`, `HeureAuxDemeures`, `UneDeLaSemaine`). Aucun useEffect avec cleanup AbortController sur les images. L'AbortController existe uniquement pour le fetch météo dans `VitrineChateau.jsx:42-96`, sans rapport. Mes 3 hypothèses initiales (re-render, Phase 2.3 abort, prefetch Safari) toutes invalidées. Fix dans `scripts/agents/console-errors.cjs:311-317` : reclassification des cancels (`/cancel|abort/i`) comme avertissement quel que soit l'origine. Les vraies régressions (404/500) restent couvertes par le test E2E `Images locales /bri-*.avif sans 404`. Baseline resserrée : `erreurs.max` 2→1, `avertissements.max` 1→2.

- **[Phase 4.2] `ChateauCarte` mutualisé** : implémentations dupliquées détectées dans `VitrinePermanente`, `DernieresCles`, `ClubMembres`, `HeureAuxDemeures`, `UneDeLaSemaine`. Fusion en un composant unique avec variantes (`eyebrow`, `editorial`, `last-minute`, `vitrine`, `club`).

- **[Phase 4.4] Vidéo Le Blanc Buisson YouTube → HTML5 natif** : (a) −3 critical a11y absorbés au baseline ; (b) +1 erreur "Permissions policy violation: compute-pressure" en local Chromium (Phase 1.x C2 absorbée par baseline `console-errors.erreurs.max=2`, à resserrer post-migration). iframe YouTube `JQ9m51Bl900` actuelle non a11y-compliante. Migration vers vidéo HTML5 native dans `/public/` retire ces faux positifs et donne le contrôle complet sur le poster, l'autoplay et la coupure mobile. **Bloqueur business** : récupérer auprès de Maïté & Éric de la Fresnaye le master vidéo source haute qualité + cession de droits écrite pour usage LCC commercial. **Périmètre tech post-réception** : 4 composants à migrer (VitrineChateau, ChateauModal, VitrineDernieresCle, VitrineClub) + 2 fichiers CSS (vitrine-chateau.css, chateau-page.css). Sera triviale après Phase 4.2 ChateauCarte mutualisé.

- **[Phase 4.5] `offres.css` à creuser** : épargné en Chantier 1.2 par prudence (importé par `BandeauOffres` vivant). À vérifier si `BandeauOffres` utilise réellement les classes de `offres.css` ou si l'import est lui-même mort. Si mort : suppression possible (~593 lignes).

- **[Phase 6.x] Pass éditorial vitrine premium (avec Tanguy)** : bugs visuels préexistants détectés pendant test visuel Chantier 2.1 Phase A3 :
  - Coquille « Brouillaird » → « Brouillard » dans `VitrineChateau` diptyque (~ligne 322)
  - Image fond diptyque jour : URL Unsplash temple asiatique (Wat Pho/Wat Arun) à remplacer par image patrimoine français
  - Audit complet à faire de toutes les URLs Unsplash dans `chateaux.js` + composants pour cohérence patrimoniale française (vérifier qu'aucune photo non-française n'apparaît dans une vitrine)
