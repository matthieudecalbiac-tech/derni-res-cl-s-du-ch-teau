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
- **Cartes** : Leaflet 1.9 **en npm** (`leaflet ^1.9.4`) + `leaflet.markercluster ^1.5.3` — `react-leaflet` retiré en Chantier 2.2 avec la suppression de `CarteExplorer`
- **Tests** : Playwright 1.59 + axe-core 4.11 (E2E, visuels, a11y)
- **Performance** : Lighthouse 13 via scripts QA
- **Backend** : Supabase **planifié** (couche services async-ready depuis Phase 2.3 / 6 mai 2026, swap data layer trivial)
- **Paiement** : Stripe **planifié**
- **Déploiement** : Vercel
- **Email transactionnel** : Brevo

## Comment ajouter un nouveau château

C'est l'opération la plus fréquente. **Elle passe par l'Espace Admin, plus par aucun fichier.**

```
/admin/chateaux/nouveau        créer
/admin/chateaux/:id            éditer (AdminChateauEdition)
/admin/chateaux/:id/apercu     prévisualiser avant publication
```

Un château n'apparaît en surface qu'une fois **publié** (`statut`) : le service filtre dessus, et `getChateauBySlug` renvoie `null` sinon.

> ⚠ **La procédure décrite ici jusqu'au 19 août 2026 était inexécutable** : elle demandait d'éditer `src/data/chateaux.js`, fichier supprimé depuis. C'était l'opération la plus fréquente du projet, documentée sur un fichier disparu. Vérifier une procédure avant de la suivre — et la corriger quand elle ment.

### Photos

Deux voies, selon le château :
- **CDN public** (Unsplash ou autre) — URL collée dans le champ images.
- **Fichier local** dans `/public/`, format **AVIF** de préférence, préfixe alphabétique court désignant le château (`bb-` pour Le Blanc Buisson, `bri-` pour Les Briottières). Référence : `/<prefixe>-<nom>.avif`, slash initial, Vite résout depuis `/public/`.

Un château doit porter **au moins 2 images** : l'agent `validation-donnees` lève une **erreur** en dessous (`validation-donnees.cjs:374`) et `qa-baseline.json` fixe `erreurs.max = 0`. Un château à une seule image bloque donc la CI.

### Test après ajout

```bash
npm run dev
```

Naviguer vers la home, vérifier que le château apparaît dans les listes attendues, puis ouvrir sa vitrine — soit par le catalogue (toggle « Liste »), soit directement par `/chateau/<slug>`.

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

### Le retour — revenir d'où l'on vient (19 août 2026)

Le site ne savait pas revenir : **zéro `navigate(-1)` dans tout le dépôt**, tous les retours câblés en dur sur `/`. On cherchait, on ouvrait un château, on revenait — et la recherche était perdue.

```
window.history.state.idx  >  0   →  navigate(-1)    on reste dans le site
window.history.state.idx === 0   →  navigate("/")   arrivée directe, repli
```

Mesuré, pas supposé : `idx` vaut **0** sur une arrivée directe et **1** après une première navigation interne. Le repli est indispensable — sans lui, un visiteur venu d'un lien partagé **sortirait du site**. `window.history.state` peut valoir `null` : le `?? 0` n'est pas cosmétique.

**Une source, deux habillages** (`src/components/BoutonRetour.jsx`) : le composant porte la règle *et* le dessin pour `/resultats`, `/histoire`, `/personnage` ; le hook `useRetour()` porte la règle seule, pour la vitrine château qui garde son `.vc3-retour`.

**⚠ Fermer n'est pas reculer.** La vitrine écrit son thème dans l'URL (`?theme=`) : chaque thème consulté empile une entrée. Un simple `navigate(-1)` y recule d'un thème au lieu de sortir. `VitrineChateauRoute` mémorise donc `idxEntrée` (`useRef`, **posé une seule fois** — le composant se re-rend à chaque thème) et saute :

```
delta = idx_courant − idxEntrée
idxEntrée  >  0  →  navigate(-(delta + 1))
idxEntrée === 0  →  navigate("/")
```

Le cas 0 thème s'y réduit exactement à `navigate(-1)` : la formule **généralise**, elle ne remplace pas.

**Mobile** : sous 768 px le libellé s'efface, la flèche seule demeure, 44 × 44, `aria-label="Retour"`. Les quatre écrans portent le même geste au même endroit.

⚠ Si un lien **inter-château** (« châteaux voisins ») est ajouté un jour, réinitialiser `idxEntrée` au changement de `slug` — sinon `delta` se calculerait depuis l'entrée de la vitrine précédente. Vérifié le 19 août : aucun tel lien n'existe (alentours non cliquables, ni voisins ni carte dans la vitrine ; seules destinations `/inscription` et `/personnage/:slug`).

Filet : `tests/e2e/retour-intelligent.spec.cjs`.


### Une seule vitrine, pour tous les châteaux

**Il n'y a plus d'aiguillage.** `ChateauModal` a été supprimé : toute demeure servie ouvre `VitrineChateau`, mise en avant (`estLaUne`) ou non.

Deux voies de montage coexistent (*strangler fig*) :
- **route** `/chateau/:slug` via `VitrineChateauRoute` — voie canonique, partageable et indexable ;
- **overlay** depuis l'accueil et les vitrines permanentes, monté dans l'état d'`App`.

`VitrineChateau` distingue les deux par sa prop `mode`. Seule la voie *route* mémorise une entrée d'historique et sait en ressortir (cf. § Le retour, plus bas).

> ⚠ Cette section décrivait jusqu'au 19 août 2026 un aiguillage `estLaUne === true` en `App.jsx:118` vers `ChateauModal`. **Ni le composant ni la ligne n'existent** — `estLaUne` n'apparaît nulle part dans `App.jsx`.

### Données

**La base Supabase est la source de vérité.** Prix, disponibilités, images, histoire, timeline, coordonnées y vivent, et l'application y accède par `src/services/chateauxService.js`.

> ⚠ **`src/data/chateaux.js` n'existe plus** (vérifié le 19 août 2026). Seul `src/data/ambiances.js` subsiste dans ce dossier — 64 phrases éditoriales keyées par slug, un fichier statique à côté d'une base qui porte tout le reste. Divergence garantie si un slug change : à surveiller.
>
> Cette section décrivait `chateaux.js` comme « source unique » longtemps après sa disparition. Ne pas raisonner sur les fichiers de données : **interroger la base**.

#### Images d'un château — `images[]`, jamais `image`

Un château n'a **pas** de champ image au singulier. Il a `images` (`text[]` en base, `chateaux.images` ligne 172 de `schema.sql` ; exposé tel quel par `mapChateauBase`). Le champ `image` existe bien dans le modèle, mais il appartient à une **chambre** (`types/Chateau.js:45`, `chambres.image` en base) — ce n'est pas le même objet.

**Ne pas réintroduire `chateau.image`** : l'expression `c.image || c.images?.[0]` a l'air d'un repli, elle n'en est pas un — son premier terme est toujours `undefined`. Deux occurrences de ce motif inerte ont été retirées le 18 août 2026.

Le repli quand `images` est vide est **conventionnel** : on ne rend pas de source vide.
- Fond CSS (`backgroundImage`) : `style={c.images?.[0] ? { … } : undefined}` — le conteneur garde sa forme et montre son `background-color` crème.
- Balise `<img>` : la balise elle-même est conditionnée, pour qu'aucun `<img src={undefined}>` ne parte en requête.

### Styles & design tokens

- Un fichier CSS par composant dans `src/styles/`, importé directement depuis le composant.
- `src/styles/global.css` détient les design tokens (CSS custom properties sur `:root`, échelles d'espacement et d'ombre). Réutiliser ces tokens plutôt que d'introduire des couleurs ou polices nouvelles.
- Les **polices** sont chargées via CDN dans `index.html` (Google Fonts), pas en npm.
  ⚠ Leaflet, lui, **n'est pas dans `index.html`** : il vient de npm et son CSS est importé depuis `CarteInteractive.jsx`. Cette ligne l'affirmait jusqu'au 7 août 2026 — cf. Architecture § Cartes (Leaflet).

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

> ⚠ **Section réécrite le 7 août 2026.** Elle affirmait trois choses fausses : que Leaflet
> venait d'un CDN, qu'il avait été désinstallé de npm, et que `DernieresCles` en était le
> consommateur. Vérifié dans le code : aucune de ces trois affirmations ne tenait.

- **Leaflet vient de npm**, pas d'un CDN : `leaflet ^1.9.4` est une dépendance de `package.json`, et `index.html` **ne mentionne Leaflet nulle part** (ni script, ni feuille de style). Aucun `window.L` dans `src/`.
- **`CarteInteractive.jsx` est le seul consommateur** — `import L from "leaflet"` (ligne 2) et `import "leaflet/dist/leaflet.css"` (ligne 3). `DernieresCles` n'utilise plus Leaflet.
- **`leaflet.markercluster ^1.5.3`** ajouté le 7 août 2026 pour le regroupement des marqueurs en mobile. Import du JS + de `MarkerCluster.css` (positionnement seul).
  ⚠ `MarkerCluster.Default.css` est **volontairement omis** : c'est lui qui porte les cercles bleus de Leaflet. Le rendu des clusters est écrit dans `carte-interactive.css`, à la palette LCC (navy + anneau or). Ne pas l'importer « pour compléter » — il écraserait le style de marque.
- Le regroupement n'est actif que **sous 768 px**, décidé en JS (`matchMedia`) et non en CSS : un regroupement de marqueurs n'a aucune expression en feuille de style. C'est le seul endroit du projet où une bascule mobile se joue en JS.
- `CarteFrance.jsx` supprimé en Chantier 1.2 ; `CarteExplorer.jsx` supprimé en Chantier 2.2. `CarteChateaux.jsx` (SVG France, fluide) n'utilise **pas** Leaflet — il est monté dans `VitrinePermanente` et, depuis le 6 août 2026, dans l'encart « Explorer par région » de la home mobile.

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
| 1.10 — Listener response 4xx/5xx console-errors (Phase 1.x trou couverture C1 résolu) | 7 mai 2026 | `76c0dc2` | +18 / 0 lignes (nouveau listener `page.on('response')`), validé empiriquement local mobile-safari (0/0 post-fix, pas de double-comptage) | `pre-correlation-4xx` (sur `84543c0`) |
| 1.11 — Smoke E2E ChateauModal (5 châteaux non-estLaUne) | 7 mai 2026 | `f8ae8a4` + `5d8c81b` | +119 / −1 lignes (helper `ouvrirChateauModal` +49, spec `chateaux-modal-smoke.spec.cjs` nouveau +71). Validation empirique mobile-safari : 20/20 ✓ (15 verts au 1er run, 5 verts post-fix lookbehind regex). Couverture E2E pour les 5 châteaux qui étaient zéro-test : Vaux (1), Pierrefonds (2), Chantilly (3), Ferté-Saint-Aubin (5), Pierreclos (6). Path UI nominal `home → HeureAuxDemeures → ChateauModal`. | `pre-playwright-8-chateaux` (sur `9d59541`) |

### Surface du repo post-Phase 2.3

- `/src/components` : **18** composants `.jsx` (17 → 18, +1 : `SkeletonChateau` en Phase 2.3 C8)
- `/src/services` : **1** nouveau dossier (`chateauxService.js`, couche async Phase 2.3)
- `/src/styles` : **21** fichiers `.css` (21 → 21, +`skeleton-chateau.css` − `carte-explorer.css` supprimé Chantier 1.X du 4 mai)
- `/src/hooks` : **4** hooks `.js` (inchangé en nombre, refactor pattern `{ data, loading, error }` Phase 2.3)
- `App.jsx` : **178** lignes (inchangé)
- `.env.example` : nouveau fichier (documente `VITE_FAKE_LATENCY`)
- Bundle production : JS **422.6 kB** (421 → 422.6, +0.4 % pour async/loading + skeleton), CSS **206.7 kB** (206 → 206.7, +670 octets skeleton)

### Sprint S1-δ — Migration Supabase (mai 2026)

**Branche :** `feature/supabase-foundation`
**Objectif Sprint S1 :** infrastructure Supabase complète (schema + RLS + seed + client React) avant tout refactor UI.
**Statut au 8 mai 2026 PM :** 7 commits sur 7 du sprint S1 livrés (Phases 1-3 + Phase 4.1). Phase 4.2-4.7 à venir. Push sur origin à jour.

#### Phase 1 — Schema initial (S1-α)
- **Commit :** `98daa73` — feat(supabase): schema initial S1-α
- **Livré :** 14 tables (chateaux + 4 filles + modules + chateau_modules + offres + reservations + chambres + disponibilites + chateau_owners + users + audit_log + migrations_log), 5 enums, 18 indexes, 13 triggers, 64 COMMENT (789 lignes `supabase/schema.sql`)
- **Architecture :** multi-modules (A vitrine permanente, B Dernières Clés, C Club Châtelains, D événementiel reporté), conforme décisions business du pivot du 8 mai 2026

#### Phase 1.5 — README bootstrap
- **Commit :** `104f82a` — docs(supabase): README — bootstrap
- **Livré :** `supabase/README.md` (63 lignes) — ordre d'exécution schema → policies → seed, conventions

#### Phase 2 — RLS Policies (S1-β)
- **Commit :** `477fe6e` — feat(supabase): RLS policies S1-β
- **Livré :** 3 helpers SECURITY DEFINER (is_admin, is_chatelain, is_chatelain_of), 1 trigger user provisioning (handle_new_user), 14 ENABLE RLS, 2 vues publiques (chateau_modules_public, reservations_client_view), 46 policies (5 users + 20 chateaux/filles + 10 modules/offres + 8 commerce + 3 ops)
- **Décisions actées :** commissions invisibles client, chatelain READ-ONLY reservations, Module C caché 100% via requires_role NOT NULL
- **Dette notée :** RLS reservations_update_client_cancel autorise UPDATE trop large — à durcir S2 via RPC SECURITY DEFINER

#### Phase 3 — Seed initial (S1-γ)
- **Commit :** `91ad4dc` — feat(supabase): seed initial S1-γ
- **Livré :** 180 INSERT idempotents — 4 modules + 8 châteaux + 23 chambres + 48 amenities + 48 timeline + 36 alentours + 12 chateau_modules + 1 migrations_log
- **Générateur :** `scripts/generate-seed.cjs` (563 lignes, UUIDs SHA-1 déterministes pour idempotence)
- **Note :** seul 2 des 8 châteaux ont une offre Module B active (Briottières id 7 + Blanc Buisson id 8) — conforme stratégie "Dernières Clés rares par nature"

#### Phase 4 — Client React + GRANTs + smoke test (S1-δ Phase 1-2)
- **Commit :** `0eeedf6` — feat(supabase): client React + GRANTs + smoke test
- **Livré :** projet Supabase `lcc-prod` créé (eu-west-1, ref ynoieryxfqiqjscqieum), bootstrap appliqué, client React partagé `src/lib/supabase.js`, smoke test 5/5 ✓ (`scripts/smoke-test-supabase.cjs`), section 10 GRANTS Postgres ajoutée dans policies.sql (32 GRANTs nécessaires avec nouveau format sb_publishable_*)
- **Validation runtime :** count chateaux=8, count chambres=23, Briottières par slug, vue chateau_modules_public=12, INSERT bloqué (42501)
- **Dette notée :** audit_log GRANTs élargis à authenticated (durcir S5), 2 vulns npm audit non bloquantes (basic-ftp HIGH, ip-address MODERATE — pas exposées dans bundle browser)

#### Phase 5 — Audit chateauxService.js (S1-δ Phase 3)
- **Commit :** `ce674fc` — docs(supabase): audit Phase 3 chateauxService.js
- **Livré :** `supabase/AUDIT-PHASE3-chateauxService.md` (141 lignes) — service actuel 87 lignes 4 fonctions, 2 hooks consommateurs (useChateaux × 5 composants, useCompteurs × 1), mapping 38 colonnes documenté
- **4 trouvailles critiques :** prixBarre/reduction/chambresRestantes absents schema, id number→uuid casse idsCartes/idsIndex, distanceParis format change, parking/wifi/animaux strings vs bool
- **Décisions Phase 4 actées (8 mai PM) :**
  1. prixBarre/reduction via jointure offres (architecture pérenne multi-modules) + null pour châteaux sans offre Module B (option α)
  2. Slugs partout (Q1=C confirmé) — App.jsx estLaUne, HeureAuxDemeures arrays slugs
  3. Label brut distance_paris_label (ALTER TABLE)
  4. Helper `src/services/_mapping.js` aplatit amenities

#### Phase 4 sous-action 4.1 — Schema patch distance_paris_label
- **Commit :** `c6f3f06` — feat(supabase): ajout distance_paris_label S1-δ Phase 4.1
- **Livré :** colonne `distance_paris_label text` ajoutée dans schema.sql, migration `supabase/migrations/2026-05-08-add-distance-paris-label.sql` (idempotent), inauguration du dossier `supabase/migrations/`
- **Pattern inauguré :** chaque modif Supabase post-bootstrap = 1 fichier `migrations/YYYY-MM-DD-description.sql`. Le `schema.sql` représente l'état désiré final ; les migrations représentent l'historique chronologique pour les bases déjà déployées.
- **Sous-actions 4.2-4.7 à venir :** seed update populate, helper mapping, refactor service, refactor App.jsx, refactor HeureAuxDemeures.jsx, tests UI manuels

#### Phase 4 sous-action 4.2 — Seed update distance_paris_label
- **Commit :** `c3cbfff` — feat(supabase): seed update distance_paris_label S1-δ Phase 4.2
- **Livré :** migration `supabase/migrations/2026-05-09-populate-distance-paris-label.sql` (8 UPDATE par slug, idempotente)
- **Régénération :** `scripts/generate-seed.cjs` mis à jour (cols + values), `supabase/seed.sql` régénéré avec `distance_paris_label` dans chaque INSERT chateau
- **Données :** valeurs éditoriales d'origine respectées — id 1-6 format "X km · Y min", id 7-8 format "Xh de Paris"

#### Phase 4 sous-action 4.3 — Helper _mapping.js
- **Commit :** `e8890e2` — feat(react): helper mapping Supabase ↔ React + Vitest 32/32 S1-δ Phase 4.3
- **Livré :** infrastructure Vitest + helper de mapping Supabase ↔ React
  - `src/services/_mapping.js` (320 lignes) : 6 mappers atomiques + 1 wrapper `mapChateau`
  - `src/services/__fixtures__/chateaux.fixtures.js` (304 lignes) : BRIOTTIERES (avec offre B) + VAUX (sans offre B) + MINIMAL (edge case)
  - `src/services/__tests__/_mapping.test.js` (318 lignes, 32 tests Vitest, 7ms exec)
  - `vitest.config.js` (22 lignes) : env=node, exclude tests/ Playwright
  - `package.json` : +`vitest@^3.2.4` devDep + scripts `test:unit` (CI single-pass) + `test:unit:watch` (dev)
- **API publique :** `mapChateau(rowSupabase) → Chateau`
- **Mappers atomiques :** mapChateauBase, mapChambre, mapTimelineItem, mapAlentour, flattenAmenities, applyOffreModuleB
- **Helpers privés :** centsToEuros, safeArray, nullable
- **Décision γ actée :** contrat 2 niveaux de prix
  - `chateau.prix/prixBarre/reduction` : tarif Module B (null si pas d'offre B active)
  - `chateau.prixDepart` : "À partir de" depuis min(chambres.prix), toujours peuplé
  - Évite propagation de null dans 4-5 composants React (Phase 4.5/4.6)
- **Module B détecté par UUID** `MODULE_B_ID` (déterministe via SHA-1 seed)
- **Robustesse :** fallback null/[] systématique, JSDoc complète, aucun mapper ne crash
- **chambresRestantes :** hardcoded null (RPC count_chambres_disponibles en S2)

#### Phase 4 sous-action 4.4 — Refactor chateauxService.js Supabase-backed
- **Commit :** `40ef9dc` — feat(react): refactor chateauxService.js Supabase-backed S1-δ Phase 4.4
- **Livré :**
  - `src/services/chateauxService.js` refactor complet (200 lignes)
  - `src/services/__tests__/chateauxService.test.js` (193 lignes, 14 tests)
- **API publique (5 fonctions, drop-in replacement) :**
  - `getChateaux({ excludeMocks })` → cache global, 1 round-trip
  - `getChateauById(id)` / `getChateauBySlug(slug)` → lookups locaux
  - `getCompteurs({ excludeMocks })` → dérivé du cache (0 round-trip extra)
  - `invalidateCache()` → NEW Phase 4.4 (pour S2 booking flow + S5 admin UI)
- **Architecture cache :** Map mémoire TTL 5 min, 1 round-trip Supabase pour servir N requêtes UI. ⚠ **Le cache mémorise la PROMESSE, pas le résultat** — cf. § Perf du hero ci-dessous. Mémoriser le résultat ne protégeait que les appels arrivant *après* la réponse ; les composants montent au même tick, donc tous manquaient le cache. Sur reject, l'entrée est retirée : un échec ne doit jamais rester en cache pendant le TTL.
- **Helper centralisé :** `_isMock(chateau)` — `isDemoMock === true` (`chateauxService.js:138`, alimenté par `is_demo_mock` en base). ⚠ Ce fichier a longtemps écrit `estLaUne === false` : c'est faux, et les deux notions sont distinctes (une demeure peut être publiée sans être à la une).
- **VITE_FAKE_LATENCY conservé** pour DX tests UI Phase 4.7
- **Compat hook useChateaux** : aucun changement requis (signatures préservées)
- **Tests :** 46/46 (32 mapper + 14 service avec mock Supabase chaining via helpers `mockSupabaseSuccess`/`Error`)
- **Dette tracée** : `compteurs.chambresRestantes = 0` (mapper retourne null en Phase 4) — sera réparée S2 via RPC `count_chambres_disponibles()`
- **Dette tracée pour Sous-action 4.5 :**
  - JSDoc `useChateaux.js:13` mentionne encore `isDemoMock` (sémantique remplacée par `estLaUne === false` via `_isMock()` privé) — mise à jour cosmétique
  - `compteurs.chambresUrgentes` retourne désormais un count de châteaux avec urgence (pas la somme des chambres restantes). À renommer en `compteurs.nbChateauxUrgents` + adapter le wording JSX `BandeauOffres.jsx:13` ("${compteurs.nbChateauxUrgents} châteaux en dernière minute" plutôt que "chambres disponibles")
  - **Justification du report** : le scope strict de 4.4 est le service, pas le rename d'API consommée par les composants. 4.5 (App.jsx) est le bon moment pour toucher les composants connexes.

#### Phase 4 sous-action 4.5 — Refactor App.jsx + dette 4.5
- **Commit :** `d86fb7b` — refactor(react): App.jsx estLaUne + dette 4.5 wording S1-δ Phase 4.5
- **Périmètre réel (audit) :**
  - App.jsx ligne 114 : NO-OP ✅ déjà sur `estLaUne === true` (dette CLAUDE.md "À régler avant 9e château" déjà résolue dans Sprint 5-β v2 — à retirer de la liste dette technique)
- **Livré :**
  - `chateauxService.js` : retrait `compteurs.chambresUrgentes` (devenu inutile sans wording numérique côté JSX)
  - `BandeauOffres.jsx:13` : slogan fixe `"Les Dernières Clés du moment →"` (Option C cohérent avec storytelling LCC "Dernières Clés rares par nature")
  - `useChateaux.js:13` : JSDoc actualisée (référence `estLaUne === true` via `_isMock()` au lieu de l'obsolète `isDemoMock`)
  - `chateauxService.test.js` : assertion `chambresUrgentes` muée en `toBeUndefined()` (preuve que le champ est bien retiré)
- **Storytelling :** Option C choisie pour éviter les chiffres incohérents qu'il faudrait synchroniser avec la réalité. Le slogan reste vrai indéfiniment.
- **Tests :** 46/46 passing (32 mapper + 14 service après mutation assertion)
- **Validation visuelle requise :** Matthieu lance `npm run dev` et confirme que la home affiche correctement (sans erreur console, BandeauOffres avec slogan fixe, aiguillage VitrineChateau OK pour Briottières/Blanc Buisson)

#### Phase 4 sous-action 4.6 — Refactor HeureAuxDemeures.jsx + ambiances.js (en cours)
- **À commit prochain (Sous-action 4.6)**
- **Périmètre élargi (audit ACTION 1-2) :**
  - Découverte audit : `ambiances.js` keyé par numbers (1-8) → cassé avec UUIDs Supabase, lookup retourne `undefined` → storytelling météo/ambiance silencieusement disparu
  - Décision Option A actée : refactor `ambiances.js` keys numbers → slugs (cohérent avec Q1 "slugs partout")
  - Mapping 8/8 confirmé via commentaires fichier ambiances.js (concordance directe avec slugs seed Supabase S1-γ)
- **Livré :**
  - `src/data/ambiances.js` : 8 keys numbers (1-8) renommées en slugs (vaux-le-vicomte, pierrefonds, chantilly, fontainebleau, ferte-saint-aubin, pierreclos, les-briottieres, blanc-buisson)
  - JSDoc fichier ambiances.js explicitant le refactor + structure (8 châteaux × 8 phrases = 64 phrases éditoriales)
  - **Contenu éditorial 100% préservé** (les 64 phrases poétiques Tanguy intactes)
  - `src/components/HeureAuxDemeures.jsx` : `idsCartes [6,5,1]` et `idsIndex [7,8,2,3]` refactorés en `slugsCartes`/`slugsIndex` avec commentaire éditorial
  - Adaptation `ambiances[c.id]` → `ambiances[c.slug]`, `meteo[c.id]` → `meteo[c.slug]` (5 sites de modification : helpers `getAmbianceLieuDit`/`getPhrase` paramètres `id` → `slug`, fetch météo `affiches[i]?.slug`, JSX `meteo[c.slug]`)
  - `key={c.id}` JSX préservé (UUIDs string OK pour React keys)
- **Décisions design (Option C/A/A) :**
  - Q1 : slugs + commentaire éditorial (avec extension Option A pour ambiances.js — finding hors brief)
  - Q2 : amenities NO-OP (non utilisées dans HeureAuxDemeures)
  - Q3 : pas de tests Vitest (validation visuelle uniquement)
- **Tests :** 46/46 passing (mapper + service inchangés, refactor pure JSX + data)
- **Validation visuelle requise** : Matthieu lance `npm run dev` et confirme :
  - 3 cartes "Heure aux demeures" : Pierreclos + Ferté-St-Aubin + Vaux-le-Vicomte
  - 4 index : Briottières + Blanc Buisson + Pierrefonds + Chantilly
  - **CRITIQUE** : phrases poétiques d'ambiance affichées par château (matin/après-midi selon heure)
  - **CRITIQUE** : météo réelle affichée par château (température, condition)
  - Console DevTools : pas d'erreur rouge

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

### ~~Contraintes sur `src/data/chateaux.js`~~ — sans objet

Cette convention décrivait les trois contextes de chargement de `chateaux.js` et la règle « pur fichier `export const` ». **Les trois sont partis** : le fichier, `scripts/validate-chateaux.cjs` et `scripts/lib/charger-chateaux.cjs` n'existent plus (vérifié le 19 août 2026). Conservée barrée un temps, pour que personne ne la ré-applique à `ambiances.js` par analogie.

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

## Patterns CI / Dette à monitorer

### Flake WebKit runner Ubuntu (12 mai 2026)

Sur le run #25730231771 (commit `84ad228`, post-merge PR #20), 4 erreurs sur `webkit-desktop` : « WebKit encountered an internal error » en chaîne (preconnect `fonts.gstatic.com` → `/@vite/client` → resource → CTA Briottières introuvable → `scrollIntoViewIfNeeded` timeout 30 s → `Crash parcours`). Aucun précédent dans les 12 derniers runs `main`. Re-run sans modification = vert immédiat. **Conclusion** : flake transitoire du runner Ubuntu + Playwright WebKit, pas un bug applicatif. À monitorer si récurrence (> 2 fails WebKit « internal error » en 1 mois) → robustifier l'agent `console-errors.cjs` en classant ce pattern de message comme `flake_infra` non bloquant (ou retry du parcours WebKit).

### Clic du catalogue — corrigé à la source (18 août 2026)

Deux rouges `webkit-only` en trois mois partaient du même geste : le clic Playwright sur `.tcl-onglet` « Liste ». Un clic Playwright exige que l'élément **reçoive les événements** — il rejoue le hit-test jusqu'à ce que le point visé lui appartienne. Or l'accueil entre en animations décalées (`.tcl-row` : `animation-delay: 1.3s` ; `.hero-illus-img` : `translateX(60px)`), et pendant ce temps les couches voisines recouvrent le toggle. Le clic n'est pas en retard : il est **refusé**, en boucle, jusqu'au timeout de 30 s, et l'agent meurt en `agent-crash` — classé `critical`, donc bloquant en baseline alors qu'aucune règle axe n'est enfreinte (`compteurViolations: 0`).

Corrigé dans `scripts/lib/ouvrir-catalogue.cjs` : le clic passe par le DOM (`evaluate(el => el.click())`), qui ne fait aucun hit-test. La fonction y a été **extraite** — elle vivait en copies byte-identiques dans `a11y-axe.cjs` et `console-errors.cjs`.

⚠ **Une troisième copie subsiste, volontairement** : `tests/e2e/vitrines-tous-chateaux.spec.cjs`. Elle garde le vrai clic — c'est elle qui vérifie que le bouton est réellement cliquable. Ne pas l'aligner sur le module : les harnais cherchent à *atteindre* un état de page, ce spec teste le geste.

### Crash d'agent non attribué — fil ouvert (18 août 2026)

Observé **1 fois sur 57 passes locales** post-extraction (`agent-crash`, `webkit`, `a11y-axe`). La passe rouge avait traité **5 vitrines sur 7** et **12 checkpoints sur 15** → mort **en aval** du clic `ouvrirCatalogue` (déjà corrigé), pas dessus. Rapport local perdu : les agents écrasent `qa-reports/<agent>.json` à chaque passe. **Non reproduit** sur 40 passes webkit instrumentées ensuite.

**À lire sur l'artefact `qa-reports/` du prochain run CI qui rougirait sur `agent-crash`** — c'est là que le message complet sera disponible, pas en local. Ne pas re-runner à l'aveugle : diagnostic sur artefact d'abord (cf. section suivante).

### Pattern « diagnostic avant code » sur fail CI

Quand un fail CI apparaît après un fix d'agent, **ne pas supposer que le fix est en cause**. Étapes obligatoires :
1. Télécharger l'artefact CI du run échoué (`actions/runs/<id>/artifacts`, ou via l'UI GitHub → section Artifacts).
2. Lister les events réels (type / message / url / navigateur).
3. Chercher des patterns multi-events sur même navigateur ou même URL.
4. Comparer avec l'historique des runs précédents (`GET /repos/.../actions/runs?branch=main&per_page=10`).

Si le fail concerne **uniquement un navigateur** et **sans précédent dans l'historique** → flake infrastructure, pas bug applicatif. **Re-run avant de coder un fix v2.** Exemple : 12 mai 2026, run #25730231771, 4 erreurs WebKit (cf. ci-dessus) → fausse piste évitée en lisant l'artefact, re-run = vert. (À l'inverse, le run #25724409954 du même jour montrait 3 cancels Supabase sur 3 navigateurs → pattern reproductible → vrai sujet, fix légitime = exclusion des cancels, commit `b1e335a` / PR #20.)

## Hygiène du repo

- **Les `fix*.cjs` de la racine ont disparu** (vérifié le 19 août 2026) : ils servaient à réécrire en masse les URLs d'images de `src/data/chateaux.js`, lui-même supprimé. Plus rien à ne pas importer.
- Pour tout codemod **bulk**, écrire un script `.cjs` et l'exécuter avec `node`. Ne jamais utiliser `python -c '...'` inline. (Pour la maintenance ciblée, cf. Conventions de chantier § Edits ciblés.)
- `*-knowledge.txt` à la racine sont des snapshots de référence, pas du code vivant — **toujours présents** (4 fichiers). Ne pas modifier sans demande explicite.
- `lcc-backup*.bundle` sont des bundles git conservés comme sauvegardes — **toujours présents**.

## Dette technique

Liste des chantiers non bloquants identifiés. Mise à jour : retirer une ligne quand la dette est résolue, ou la déplacer dans Historique des chantiers.

- ~~**[Phase 1.x] Filtre baseline-check console-errors**~~ ✅ Résolue (Chantier 1.8, 7 mai 2026, commits `700bc69` + `8caf238`) — `IGNORE_PATTERNS` CDN externes posés (videos.pexels.com, images.pexels.com, images.unsplash.com, api.open-meteo.com, www.youtube.com, i.ytimg.com) + corrélation URL temporelle pour erreurs orphelines (fenêtre 5 sec, capte les "Failed to load resource: net::ERR_FAILED" et "429 Too Many Requests" sans URL exposée par Playwright). Calibré empiriquement sur l'artefact CI e52da93 : 63 occurrences → 1-2 résiduelles (96% bruit éliminé). `qa-baseline.json:console-errors.erreurs.max` resserré 3→2, `avertissements.max` resserré 3→1. Resserrement final à 0/0 conditionné par résolution Phase 4.4 (compute-pressure iframe YouTube) + Phase 4.x #9 bri-1.avif.

- ~~**[Phase 1.x] Trou couverture C1 — responses 4xx/5xx orphelines**~~ ✅ Résolue (Chantier 1.10, 7 mai 2026, commit `76c0dc2`) — listener `page.on('response', ...)` ajouté dans `console-errors.cjs:325-342`. Si `status >= 400` ET URL non filtrée par `estBruit()`, push event avec `urlEchouee` dans `events[]`. La corrélation URL du listener console (lignes 263-294) matche désormais automatiquement les responses 4xx/5xx. Validation empirique locale Windows mobile-safari : 0 erreur, 0 avertissement, pas de double-comptage observé. Pas de calibration baseline (`erreurs.max=1` reste correct, absorbe `compute-pressure` Chromium local — resserrement à 0 conditionné par résolution Phase 4.4 vidéo HTML5).

- **[Phase 1.x] Investiguer écart `validation-donnees.avertissements` local vs CI** : en local Windows, le validateur retourne 78 avertissements ; en CI Linux Ubuntu, 97. Probable cause : multi-browser playwright-e2e ou contexte Node différent. À investiguer pour comprendre si la métrique est fiable. Pas urgent (la baseline absorbe les deux valeurs avec max=100). ~1-2 h. Identifié 1er mai 2026.

- ~~**[Phase 1.x] Audit line endings + `.gitattributes`**~~ ✅ Résolue (Chantier 1.7, 7 mai 2026, commit `d677f0f`) — `.gitattributes` posé à la racine (UTF-8 sans BOM + CRLF, binaires flaggés `.bundle`/images/polices/médias, `.sh` en LF). `git add --renormalize .` a touché **0 fichier de code** : la discipline byte-level accumulée depuis Phase 1.6+ avait déjà rendu le repo conforme. Le filet est désormais purement préventif (futur collaborateur, IDE différent, copier-coller web).

- ~~**[Phase 1.x] CI workflow `validate:chateaux` pre-build**~~ ✅ Résolue (Chantier 1.X, 4 mai 2026, PR #12 `e0407fb`) — step ajouté dans `qa.yml` aux 2 jobs (qa-fast + qa-full), fail-fast en ~30s avant install Playwright.

- ~~**[Phase 1.x] Désinstaller `react-leaflet` + `leaflet` npm**~~ ✅ Résolue **partiellement** (Chantier 1.6, 3 mai 2026, commit `fc6e022`) — `react-leaflet` bien retiré. ⚠ **`leaflet` est revenu depuis** : `CarteInteractive.jsx` l'importe en npm (`leaflet ^1.9.4`), rejoint par `leaflet.markercluster ^1.5.3` le 7 août 2026. Cette ligne prétendait le contraire jusqu'au 7 août ; elle a induit en erreur pendant le chantier mobile. Ce n'est plus une dette : c'est l'architecture retenue, décrite dans Architecture § Cartes (Leaflet).

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

- **[Phase 4.x] ⚠ À VÉRIFIER EN BASE — Fontainebleau orphelin du path UI nominal** : référencé uniquement dans `data/chateaux.js`, absent de `HeureAuxDemeures.idsCartes [6,5,1]` et `idsIndex [7,8,2,3]`. Aucun parcours utilisateur ne l'ouvre en `ChateauModal` aujourd'hui. Hors couverture E2E `chateaux-modal-smoke.spec.cjs` (Sprint 5-β v2 — 1 château sur 6 mocks non-couvert). Soit (a) ajouter id 4 à `idsIndex` dans `HeureAuxDemeures.jsx:55` (+1 château dans la grille), soit (b) supprimer Fontainebleau de `chateaux.js` s'il est juste un mock orphelin. ~5-10 min selon décision business. Identifié Sprint 5-β v2 le 7 mai 2026.

- ~~**[Phase 4.x] Investigation "Load request cancelled" mobile-safari sur /bri-1.avif**~~ ✅ Résolue (Chantier 1.9, 7 mai 2026, commit `062c490`) — diagnostic empirique : reproduction locale Windows mobile-safari (`npx playwright` + agent console-errors mode mobile-safari only) a révélé qu'il s'agissait d'une **CLASSIFICATION ERRONÉE** dans l'agent QA, pas d'un bug applicatif. Les images sont chargées passivement via `background-image` inline CSS dans 5 composants (`VitrinePermanente`, `DernieresCles`, `ClubMembres`, `HeureAuxDemeures`, `UneDeLaSemaine`). Aucun useEffect avec cleanup AbortController sur les images. L'AbortController existe uniquement pour le fetch météo dans `VitrineChateau.jsx:42-96`, sans rapport. Mes 3 hypothèses initiales (re-render, Phase 2.3 abort, prefetch Safari) toutes invalidées. Fix dans `scripts/agents/console-errors.cjs:311-317` : reclassification des cancels (`/cancel|abort/i`) comme avertissement quel que soit l'origine. Les vraies régressions (404/500) restent couvertes par le test E2E `Images locales /bri-*.avif sans 404`. Baseline resserrée : `erreurs.max` 2→1, `avertissements.max` 1→2.

- **[Phase 4.2] `ChateauCarte` mutualisé** : implémentations dupliquées détectées dans `VitrinePermanente`, `DernieresCles`, `ClubMembres`, `HeureAuxDemeures`, `UneDeLaSemaine`. Fusion en un composant unique avec variantes (`eyebrow`, `editorial`, `last-minute`, `vitrine`, `club`).

### Dette relevée le 19 août 2026 (audit complet + chantiers de la session)

Chaque ligne a été **vérifiée par lecture ou mesure**, pas déduite. Les références sont datées : la base et le code évoluent, une dette non revérifiée est une hypothèse.

**Cassures silencieuses — l'utilisateur ne voit rien, ou voit du vide**

- **Aucun `ErrorBoundary` dans tout le projet.** Une exception au rendu blanchit l'application entière. ~4-6 h avec une page de repli patrimoniale.
- **Les hooks ne relancent jamais après une erreur réseau** (`useChateaux.js:26-48` — `useEffect` à deps `[excludeMocks]`, aucun `refetch` exposé). Une coupure d'une seconde laisse l'écran vide **jusqu'au rechargement**. Vérifié sur `main` avant et après la déduplication : comportement identique, donc antérieur à elle.
- **`error` est déstructuré puis jamais affiché** — `VitrinePermanente.jsx:27`, `DernieresCles.jsx:48`. Le hook signale la panne, l'écran la tait.
- **9 `.then` sans `.catch`** : `vitrine/ContenuClub.jsx:11`, `vitrine/ContenuDernieresCles.jsx:11`, `vitrine/offresResume.js:31,34`, `vitrine/OngletsNiveau1.jsx:34,43`, `contexts/AuthContext.jsx:50,80`, `auth/ReinitialiserMotDePasse.jsx:57`. Rejets non gérés, états bloqués en chargement.
- **Aucune page 404** : la route `*` (`App.jsx`) sert l'accueil pour n'importe quelle URL.

**Duplications restantes**

- **`offresService.js` porte le même motif de cache que `chateauxService` avant correction** — `_cache.get` → `await` → `_cache.set` (lignes **63** et **96**), sans déduplication des appels en vol. ⚠ **Aucune duplication `offres` n'a été observée sur la home** ; les autres écrans n'ont pas été mesurés. À traiter quand la mesure le justifiera, pas avant.
- **4 fonctions byte-identiques entre les deux agents QA** (`a11y-axe.cjs` / `console-errors.cjs`), vérifiées identiques le 19 août : `ouvrirVitrineParSlug` (31 l.), `ecrireRapport` (16), `checkVite` (11), `decouvrirChateauxServis` (11) ≈ **69 lignes**. `ouvrirCatalogue` a été extraite dans `scripts/lib/ouvrir-catalogue.cjs` ; ⚠ `decouvrirChateauxServis` consomme `BASE_URL`, son extraction est moins triviale.

**Navigation — Temps 2 de l'axe navigation**

- **Depuis `/resultats`, les 5 boutons d'overlay du Header ramènent à l'accueil sans rien ouvrir** (`PageResultats.jsx`, `versHome`). Cause structurelle : un overlay vit dans le `useState` d'`App`, qu'une route ne monte pas. Piste : donner une URL aux trois overlays de catalogue (`/vitrines`, `/dernieres-cles`, `/proprietaires`) — le Header cesserait alors d'avoir deux comportements.
- **`onOuvrirConciergerie` est une prop morte** (`PageResultats.jsx:115`) : `Header` n'en déclare que 4.
- **`conciergerieOuvert` n'est jamais mis à `true`** : l'overlay d'`App.jsx` est inatteignable, et `Services.jsx` n'est monté nulle part ailleurs.
- **Les cartes de `/resultats` sont des `<article role="button" onClick>`, pas des `<a href>`** : ni ouverture en nouvel onglet, ni URL au survol, ni indexation.

**Code et styles morts**

- **3 feuilles CSS entièrement orphelines — 1 802 lignes** : `editorial.css` (698), `offres.css` (593), `modal.css` (511). ⚠ `offres.css` avait été épargnée en Chantier 1.2 par une **collision de sous-chaîne** : `BandeauOffres` importe `bandeau-offres.css`, qui contient `offres.css`.
- **~200 classes CSS sans trace dans le JSX**, dominées par `espace-membre.css` (83, feuille pourtant importée par `VitrinePermanente`) et `partenaires.css` (37). ⚠ **Chiffre à dégonfler d'environ 20** : les classes concaténées (`"che-statut--" + d.status`, `"adm-badge--" + statut`) échappent au détecteur, de même que `googleapis` (un `@import`) et les `leaflet-*` posées par la librairie.
- **3 composants orphelins** : `CitationPont.jsx` (13 l., + `citation-pont.css` 51 l.), `placeholders/AdminDashboardPlaceholder.jsx` (7 l.), `placeholders/ClientAccountPlaceholder.jsx` (15 l.).
- **`body.vitrine-open` — 3 règles CSS mortes** (`global.css:434-437`). La classe n'est **posée par aucun code JavaScript** (vérifié le 19 août 2026) : les vitrines ne reçoivent donc jamais ce navy, elles posent leur propre fond. ⚠ La dette **[Phase 4.4] Vidéo Le Blanc Buisson** s'y réfère — la corriger implique de relire cette référence.

**Santé générale**

- **Bundle : un seul chunk de ~987 kB** (277 kB gzip), au-dessus du seuil d'alerte de 500 kB. **Seul avertissement du build.** Aucun découpage.
- **Écrans sans aucun filet E2E** : `/resultats` en avait zéro jusqu'au 19 août (`retour-intelligent.spec.cjs` le couvre désormais), `/personnage/:slug`, **tout l'espace admin** (11 routes), `ChatelainDashboard`, `CarteInteractive`.
- **Public non responsive** (aucune media query < 768 px) : `page-personnage.css`, `partenaires.css`, `espace-professionnel.css`, `completer-profil.css`, `mot-de-passe-oublie.css`, `reinitialiser-mot-de-passe.css`, `transition-porte.css`, `panneau-filtres.css`, `calendrier-plage.css`, `barre-laterale.css`.
- **`playwright-e2e.cjs` perd le nom des tests flaky** : il ne consigne que le **compte** (`:56`), son tableau `details` ne se remplit qu'en cas d'erreur d'agent. Le nom vit dans le **log du run**, pas dans l'artefact — deux lignes suffiraient à l'y mettre.

### Budget du job `qa-fast` — trop serré (19 août 2026)

`qa.yml:59` fixe `timeout-minutes: 15` sur le job de PR. **Une étape à elle seule en consomme jusqu'à la moitié** : `npx playwright install chromium --with-deps` télécharge depuis un CDN externe, et sa durée est erratique.

| run | durée de l'installation |
|---|---|
| 32242781000 | 41 s |
| 32263237928 | 234 s |
| 32237428375 | 358 s |
| 32246392332 | **491 s** (8 min) |
| 32272439650 | **> 14 min — job tué** |

Le run `32272439650` (PR #125) a été **annulé** au plafond, pendant cette étape. Conséquence à connaître pour le diagnostic : les étapes suivantes — serveur Vite, les quatre agents, vérification baseline — sont passées en `skipped`. **Aucun test n'a tourné, et le run n'a produit aucun artefact** (`total_count: 0`). Ce n'est donc ni un vert ni un rouge : il n'y a rien à lire, et relancer est l'action *diagnostiquée*, pas un réflexe.

Deux pistes, non tranchées : mettre les navigateurs Playwright en cache entre les runs (`actions/cache` sur `~/.cache/ms-playwright`), ou porter le plafond à 25 min. Le job `qa-full` de `main` dispose de 60 min (`qa.yml:142`) et n'est pas concerné.


### Flakes sous surveillance

Un flake vert n'est pas un incident ; **deux occurrences du même sont un sujet**. On les compte plutôt que de les oublier.

| Test | Occurrences | Navigateur | Lecture |
|---|---|---|---|
| `blanc-buisson.spec.cjs:25` — « la home rend la section à la une » | **1** (18 août) | chromium | `toBeVisible` à 5 s sur `.une-semaine-carte`, qui n'existe pas tant que Supabase n'a pas répondu. Fragilité intrinsèque du test. |
| `blanc-buisson.spec.cjs:88` — « Escape ferme la vitrine » | **1** (19 août) | mobile-safari | Sur le chemin du correctif de sortie. Cause plausible : le délai de `navigate(-(delta+1))` sur WebKit mobile. |

**Si l'un se répète au prochain `main`, le traiter** — ce serait la deuxième fois sur le même geste, pas un hasard.


### Dette DONNÉES / MÉTIER (distincte de la dette code)

Ces deux points ne sont pas des défauts de code : le mécanisme est juste, c'est la **donnée** qui ne l'exerce pas. Découverts en mesurant l'étape 3 de la refonte Prop 3 (17 août 2026).

- **[Données/Admin] ⚠ VALEURS À VÉRIFIER EN BASE — le champ `urgence` est en TEXTE LIBRE, alors qu'il est typé en union** : `src/types/Chateau.js:22` le déclare `"J-7"|"J-10"|"J-15"`, mais `AdminChateauEdition.jsx:544` l'expose via un `<Champ label="Urgence">` sans contrainte. Valeurs relevées en base **le 17 août 2026** — photographie datée, non revérifiée depuis (la base évolue ; ne pas s'y fier sans nouvelle mesure) :

  | slug | `urgence` |
  |---|---|
  | `blanc-buisson`, `chateau-de-bonnemare`, `chateau-royal-de-benays` | `J-15` |
  | `les-briottieres`, `chateau-de-saint-paterne` | `(null)` |
  | `chateau-de-la-riviere` | **« Vitrine premium »** |
  | `chateau-du-boulay-morin` | **« Idéal week-end »** |

  Conséquence : tout ce qui ne matche pas les trois valeurs retombe **silencieusement** sur `FENETRE_DEFAUT = 15` dans `disponibilitesService.js`. Le proxy de disponibilité ne discrimine donc rien en pratique — et Briottières, seul château porteur d'une offre, est à `null`, donc à 15 jours par défaut. Le calendrier ne mentira pas, mais il ne dira pas grand-chose tant que le champ n'est pas contraint. **À corriger** : soit un `<select>` à trois valeurs côté admin, soit un nettoyage de la donnée, soit les deux. ~1-2 h. **Ne pas le corriger dans le calendrier** : le contrat de découplage de `disponibilitesService.js` interdit d'y compenser une donnée sale.

- **[Données/Contenu] Un SEUL château porte une offre Module B visible** : au 17 août 2026, `offres` ne contient **qu'une** ligne visible (Briottières, Chambre Verte). Le calendrier n'a donc qu'une source à refléter, et la grille n'affiche qu'une carte. Non bloquant — le mécanisme est correct et se peuplera tout seul — mais **la démo Dernières Clés restera pauvre** tant que d'autres offres ne sont pas saisies. Sujet contenu, à coordonner avec Dimitri (stratégie) : cf. aussi la dette du générateur de seed (`buildOffresSQL()` absent, Sprint S2).

- **[Phase 4.4] Vidéo Le Blanc Buisson YouTube → HTML5 natif** : (a) −3 critical a11y absorbés au baseline ; (b) +1 erreur "Permissions policy violation: compute-pressure" en local Chromium (Phase 1.x C2 absorbée par baseline `console-errors.erreurs.max=2`, à resserrer post-migration). iframe YouTube `JQ9m51Bl900` actuelle non a11y-compliante. Migration vers vidéo HTML5 native dans `/public/` retire ces faux positifs et donne le contrôle complet sur le poster, l'autoplay et la coupure mobile. **Bloqueur business** : récupérer auprès de Maïté & Éric de la Fresnaye le master vidéo source haute qualité + cession de droits écrite pour usage LCC commercial. **Périmètre tech post-réception** : ⚠ à ré-établir. Le périmètre écrit ici (« 4 composants dont `ChateauModal` ») est **faux** — `ChateauModal` n'existe plus. Au 19 août 2026 il ne reste **qu'une** occurrence : `VitrineChateau.jsx:402`. Sera triviale après Phase 4.2 ChateauCarte mutualisé. **Reset baseline post-migration** : Sprint S1 Phase 5 a passé `qa-baseline.json:seuils.a11y-axe.violationsCritical.max` de 3 à 10 pour absorber 5 occurrences cross-browser du faux positif YouTube. Après migration HTML5 + suppression de `videoBackground: 'JQ9m51Bl900'` du legacy `src/data/chateaux.js` id 8, les 5 critical button-name disparaissent automatiquement → reset `max` à 0 (et `actuel` à 0).

- **[Phase 6.x] Sticky barre N1 (`.vc4-onglets-n1-wrap`) décolle au scroll** : le wrapper `ongletsN1Ref` (`VitrineChateau.jsx`, commit `79d6a36`, cible `scrollIntoView` du parcours dispo) est trop court pour le `position:sticky` — la barre d'onglets N1 se décolle dès qu'on scrolle au-delà. Fix = relocaliser le ref (forwardRef sur `OngletsNiveau1`) sans casser le scroll dispo. Test 11 de `s2-alpha-1-5-onglets-vitrine.spec.cjs` skippé en attendant (corps conservé pour réactivation). Pass polish Phase 6.x.

- **[Phase 6.x] Pass éditorial vitrine premium (avec Tanguy)** : bugs visuels préexistants détectés pendant test visuel Chantier 2.1 Phase A3 :
  - Coquille « Brouillaird » → « Brouillard » dans `VitrineChateau` diptyque (~ligne 322)
  - Image fond diptyque jour : URL Unsplash temple asiatique (Wat Pho/Wat Arun) à remplacer par image patrimoine français
  - Audit complet à faire de toutes les URLs Unsplash dans `chateaux.js` + composants pour cohérence patrimoniale française (vérifier qu'aucune photo non-française n'apparaît dans une vitrine)

- **[Phase 6.x] Pass éditorial Tanguy — déduplication images Unsplash** : Sprint S1 Phase 5 a réutilisé des URLs Unsplash entre châteaux pour atteindre `images.length ≥ 3` (fix erreurs validation-donnees) :
  - `photo-1566073771259-6a8506099945` : Chantilly + Vaux + Briottières + Fontainebleau + Pierrefonds (5 châteaux)
  - `photo-1520250497591-112f2f40a3f4` : Fontainebleau + Pierrefonds (2)
  - `photo-1562602833-0f4ab2fc46e3` : Vaux + Chantilly (2)
  - `photo-1578683010236-d716f9a3f461` : Fontainebleau + Ferté-Saint-Aubin (2)
  À remplacer par photos uniques par château validées par Tanguy lors du pass éditorial Phase 6.x.

- **[Phase 6.x] Pass éditorial Tanguy — sémantique images Pierrefonds** : Pierrefonds (forteresse arthurienne médiévale néo-gothique) reçoit en Sprint S1 Phase 5 deux URLs Unsplash au caractère plus Renaissance/classique (`photo-1566073771259-6a8506099945` + `photo-1520250497591-112f2f40a3f4`) au lieu de photos médiévales authentiques. À remplacer au pass éditorial Tanguy.

- **[Sprint S2 ou S5] Audit exhaustif violations a11y "serious"** : 30 violations a11y "serious" actuellement absorbées par baseline (`max=30 actuel=30`, tangent). Distribution probable : `color-contrast` (micro-textes or-sur-crème, eyebrows opacity 0.55, Cormorant italic gris clair) + `aria-prohibited-attr` iframe YouTube. Audit dédié à programmer pour identifier et corriger ou tracer chacune. Pas bloquant CI mais hygiène. ~2-3 h audit + ~5-10 h fix CSS tokens Tanguy.

### Dette responsive mobile (Sprint S5+ ou pré-prod)

**Détectée** : Sprint S1-δ Phase 4.7 (9 mai 2026) — Matthieu a testé en mode iPhone (375px) et tablet (768px) via Chrome DevTools Device Emulation.

**Décision Sprint S1** : ne pas fixer maintenant. Polish responsive appartient à Sprint 5 (Tanguy direction artistique) ou pré-prod (juin 2026). Refactor CSS isolé du sprint Supabase J+30.

**6 anomalies à corriger** :

1. ~~**Hero home mobile** : "LA VIE DE CHÂTEAU vous attend" ... derrière la voiture vidéo background~~ — **caduque**. Ni ce slogan ni cette vidéo n'existent depuis `50fb8a4` (29 juin 2026), qui a refondu le hero en deux colonnes. `Hero.jsx` fait 28 lignes de texte statique (« Votre route vers l'exception des châteaux de France »), sur fond crème, sans `<video>`. **Aucun `<video>` ne subsiste dans le dépôt.** Cf. § Perf du hero ci-dessous avant de chercher une vidéo.

2. **Bandeau Fondation Patrimoine mobile** : texte wrappe en 3 lignes ("Aidez-nous à préserver le patrimoine..."), lisible mais pas optimal.

3. **Header VitrinesPermanentes modal** : "Vitrines permanentes" wrappe en 2 lignes au lieu d'une. CSS à adapter dans `.vc3-*` ou équivalent.

4. **Menu hamburger superposition** : ouvrir le burger menu en mode mobile (avec modal VitrinesPermanentes ouvert) superpose le titre du modal et le titre du burger. À tester aussi en home directe (sans modal ouvert) pour isoler le bug.

5. **Header DernieresCles modal mobile** : "Les Clés du Château" + "Les Dernières Clés" affichés en 2 colonnes côte-à-côte alors qu'ils devraient être empilés verticalement.

6. **VitrineChateau en mode tablet (768px)** : layout cassé, retours à la ligne aberrants ("François de" / "Valbray" / "invente le" / "concept du" / "château-hôtel"). Grid CSS qui ne supporte pas la largeur intermédiaire. Test reproduction : DevTools → Tablet 768px → /chateau/les-briottieres → scroll timeline.

**Test reproduction global** : `npm run dev` → DevTools → Toggle device toolbar (Ctrl+Shift+M) → iPhone 14 Pro (375×812) ou Tablet (768px) → Naviguer home + modals + vitrine.

**Périmètre estimé fix** : ~6-10h refactor CSS + media queries + tests manuels Tanguy. À planifier en S5 dédié.

### Dette générateur de seed (Sprint S2)

**Détectée** : Sprint S1-δ Phase 5 (9-10 mai 2026) — le générateur `scripts/generate-seed.cjs` ne contient pas de `buildOffresSQL()`. L'INSERT INTO public.offres a été ajouté manuellement dans `supabase/seed.sql` en Phase 5.

**Risque** : si on régénère le seed via `node scripts/generate-seed.cjs > supabase/seed.sql`, l'INSERT offres sera perdu.

**Action S2 — finalisation** : ajouter `buildOffresSQL()` dans le générateur, alimenté par les offres définies dans `src/data/chateaux.js` ou équivalent. Une fois `buildOffresSQL()` ajouté, régénération complète de `supabase/seed.sql` possible sans perdre de données. Estimé ~30 min.

**Patches déjà appliqués (Sprint S1 Phase 4.3d, audit CI 9 mai 2026)** : 3 corrections d'hygiène pour empêcher les futures régénérations de reproduire la régression Phase 4.1 :
- `deriveOwnerInitiale(propData)` : honor `proprietaires.initiale` legacy (V/F) avant fallback `nom.charAt(0)`
- `deriveOwnerNomAffiche(propData)` : honor `proprietaires.nomAffiche` legacy (albray/resnaye) avant fallback strip "Famille "
- `chiffres_cles` : sérialise `c.chiffresCles` en JSONB (au lieu de hardcode NULL)

**Mitigation S1** : la migration `2026-05-09-seed-offre-briottieres.sql` est idempotente et peut être rejouée dans Supabase Dashboard si besoin.

#### Phase 5 — Tests RLS croisés Supabase (✅ TERMINÉE)
- **Validation effectuée Matthieu (10 mai 2026) : 23/23 PASS**
- **Hash commit** : `7e2c228`
- **Décisions actées Matthieu (Q1=A, Q2=A, Q3=C)** :
  - Q1 profondeur : smoke RLS (~30 min, 11 tests critiques)
  - Q2 format : script SQL exécutable dans Supabase Dashboard SQL Editor
  - Q3 gravité : cas par cas (haute = fix S1, moyenne = dette S2, basse = note S5)
- **Livré :**
  - `supabase/tests-rls.sql` (356 lignes) : 11 tests smoke + 12 loop filet sécurité = 23 vérifications
    - Pattern `CREATE TEMP TABLE rls_test_results` + `INSERT INTO` + `SELECT` final (RAISE NOTICE invisible dans Dashboard SQL Editor 2026)
    - GRANT INSERT/SELECT à anon sur la table temp (sinon 42501 sur la table de tests elle-même)
    - SET LOCAL ROLE 'anon' au début (transaction implicite SQL Editor)
    - Tests SELECT/INSERT privés wrappés BEGIN/EXCEPTION pour catcher 42501 sans tuer le DO block
  - `supabase/tests-rls-RESULTS.md` : rapport rempli avec 23 verdicts + synthèse defense-in-depth + notes
  - `supabase/seed.sql` (+30 lignes section 8. offres) : INSERT 1 offre Briottières Module B Chambre Verte (290€/237€/-18%, visible=true, requires_role=NULL)
  - `supabase/migrations/2026-05-09-seed-offre-briottieres.sql` (65 lignes) : migration idempotente ON CONFLICT DO UPDATE, exécutée et validée Matthieu via Supabase Dashboard
- **Découvertes techniques Phase 5 :**
  1. Defense-in-depth : anon sans GRANT sur tables privées obtient 42501 AVANT évaluation RLS. Le test PASS si l'erreur est levée.
  2. RAISE NOTICE invisible dans Supabase Dashboard SQL Editor 2026 — contourné par CREATE TEMP TABLE + SELECT final.
  3. SET LOCAL ROLE 'anon' nécessite GRANT INSERT/SELECT à anon sur table TEMP de collecte.
  4. Seed S1-γ avait omis la table `offres` (bug du générateur). Corrigé manuellement Phase 5, dette `buildOffresSQL()` tracée pour Sprint S2.
- **Hors scope reporté Sprint S2 :**
  - Tests authenticated client/chatelain/admin (nécessitent Auth Phase 3 + seed users)
  - Isolation client : voir mes résas vs autres
  - Châtelain SELECT chateau_modules privé avec commission
  - `buildOffresSQL()` dans le générateur de seed

## Perf du hero — ce qu'on croyait, et ce que c'était (18 août 2026)

Une dette de mémoire disait : « la vidéo de fond Pexels du Hero se recharge ~11 fois en 3 minutes, le composant remonte en boucle ». **Elle était fausse sur l'objet, juste sur le chiffre.** Elle est consignée ici pour qu'on cesse d'y renvoyer.

### Ce qui n'existe pas

- **Le Hero n'a plus de vidéo.** `Hero.jsx` fait 28 lignes de texte statique, fond crème. `bb9005e` (26 juin) avait remplacé les URL Pexels par des fichiers locaux, puis `50fb8a4` (29 juin) a retiré le `<video>`. **Aucun `<video>` ne subsiste nulle part dans le dépôt.**
- **Le Hero ne remonte pas.** Mesuré 3 min sur la home, desktop et mobile : `.acc-slogan` monté **1 fois**, **0 requête vidéo**. Il ne le peut pas : monté une fois dans `App.jsx`, **sans aucune prop**, sans `key`, `export default memo(Hero)`, et `App.jsx` n'a **aucun `useEffect`** ni minuterie.
- **Le LCP n'était pas en cause** : 620 ms desktop / 588 ms mobile en build de production. Les 4 496 ms qu'on peut lire en dev sont un artefact du serveur Vite non bundlé — ne pas conclure d'une mesure faite sur `npm run dev`.

### Ce qui se répétait vraiment

La **requête catalogue Supabase**, 6 fois par chargement de home en production (12 en dev — StrictMode double les montages, d'où le « ~11 » de la dette). 163 ko × 6 = 978 ko, dont **815 gaspillés**.

Cause : `_getAllCached` mémorisait le **résultat**, donc seulement après la réponse. Les six consommateurs de la home (`BandeauOffres`, `BarreRecherche`, `HeureAuxDemeures`, `PastillesInspiration`, `ToggleCarteListe`, `UneDeLaSemaine`) appellent au même tick, tous avant que le cache soit rempli. Corrigé en mémorisant la **promesse** — cf. Architecture § Services data.

| | avant | après |
|---|---|---|
| chargement de home | 6 requêtes | **1** |
| consommateur suivant (même contexte JS) | 0 | 0 *(cache résultat intact)* |
| réseau coupé | 18 requêtes | **3** |
| après rétablissement | +6 | **+1** *(l'échec n'est pas resté en cache)* |

⚠ **L'écran ne se répare pas après une panne réseau** — 0 château affiché dans les deux colonnes. Comportement **préexistant**, vérifié sur `main` avant le correctif : les hooks ne relancent pas leur `useEffect` après un `error`. Sujet distinct, non traité ici.

### Reste à faire

`src/services/offresService.js` porte **le même motif** : `_cache.get(cle)` → `await` → `_cache.set(cle, …)`, sans déduplication en vol, sur `getOffresPourChateau` et `getOffresClub`. Aucune requête `offres` dupliquée n'a été observée sur la home ; les autres écrans n'ont pas été mesurés. À traiter le jour où la mesure le justifie, pas avant.
