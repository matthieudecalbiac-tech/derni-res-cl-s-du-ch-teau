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
- **Backend** : Supabase — **en service, plan Pro** (projet `lcc-prod`, eu-west-1, ref `ynoieryxfqiqjscqieum`). ⚠ Cette ligne annonçait « **planifié** » longtemps après la bascule : la base sert les demeures depuis le Sprint S1-δ, et tout le code passe par elle. Cf. § Plan Supabase Pro.
- **Paiement** : Stripe **planifié**
- **Déploiement** : Vercel — plan **Hobby** à ce jour. ⚠ **Un passage en Pro est requis** : l'usage est commercial, ce que le plan Hobby n'autorise pas. Décidé le 21 août 2026, à consigner ici quand ce sera fait.
- **Email transactionnel** : Brevo

#### Plan Supabase Pro — souscrit le 21 août 2026

Ce qui change, et pourquoi cela compte au-delà de la facture :

- **Sauvegardes quotidiennes automatiques, 7 jours de rétention.** ⚠ **C'est un prérequis à la mise en production** : à partir du moment où de vraies réservations sont enregistrées, une base sans sauvegarde n'est pas exploitable. Ce point était bloquant, il ne l'est plus.
- **Le projet ne se met plus en pause après inactivité.** Sur le plan gratuit, `lcc-prod` pouvait s'endormir — un premier visiteur après un creux payait le réveil, et une démo commerciale pouvait tomber sur une base assoupie. `lcc-prod` reste désormais actif en permanence.
- **Quotas** : 100 000 MAU · 8 Go de base · 250 Go d'egress · 100 Go de stockage. Dépassement facturé **à la consommation**, sans coupure.

⚠ **Ce plan ne change RIEN au code.** Ni les clés, ni la RLS, ni le schéma. Ne pas y voir une autorisation d'assouplir quoi que ce soit côté sécurité : les policies restent la seule barrière, et les dettes RLS tracées au Sprint S1 (rôles authentifiés hors scope des tests, `audit_log` élargi à `authenticated`) restent entières.

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

## Disponibilités — deux pièges à ne pas perdre (sous-audit A, 22 août 2026)

Ces deux points sont **écrits nulle part ailleurs** et coûteraient cher oubliés. L'architecture de la disponibilité est propre — table, RLS, point de bascule unique dans `disponibilitesService.js` — mais **aucune disponibilité réelle n'est enregistrée à ce jour**.

### ⚠ PIÈGE 1 — L'ordre de bascule n'est pas négociable

⚠ **CETTE NOTE A ÉTÉ CORRIGÉE le 22 août : la structure mesurée n'est pas celle que l'audit A supposait.**

L'audit avait lu le commentaire de schéma — *« Absence = disponible au prix par défaut »* — et en avait conclu une sémantique **binaire opt-out** : une ligne = une exception, donc table vide = tout ouvert. **La structure réelle est plus fine** :

```
disponibilites (chambre_id, date, est_disponible bool DEFAULT true,
                prix_special_cents, reservation_id → reservations ON DELETE CASCADE,
                note_interne, created_at, updated_at)
UNIQUE (chambre_id, date)     RLS : select public · write chatelain_of / admin
```

**Une ligne PAR JOUR, avec un booléen EXPLICITE.** Le piège binaire est donc **désamorcé** : une date bloquée s'écrit `est_disponible = false`, elle ne se déduit pas d'une absence.

⚠ ~~**Mais une question reste entière, et elle se tranchera à l'étape 2 du moteur : que signifie une date SANS LIGNE ?**~~ ✅ **TRANCHÉE le 23 août 2026** — cf. § Moteur de disponibilité ci-dessous. La réponse dépend désormais d'un drapeau par château (`chateaux.dispo_geree`) : hors gestion, la table n'est pas consultée ; en gestion, une date sans ligne est **indisponible**.

> **RÈGLE INCHANGÉE : remplir la table AVANT toute bascule.** ⚠ Elle n'est plus seulement une consigne : depuis l'étape 2.1, la bascule est une **opération de données** (`dispo_geree = true`, château par château) et non plus un changement de code global. La structure porte le garde-fou.

## Le PRIX — une seule source, et où la brancher (25 août 2026)

**Modèle tranché** : le châtelain fixe le prix de sa chambre, **c'est ce que le client paie**. Pas de commission détaillée à l'écran ; le taux (`chateau_modules.commission_pct_negociee`) reste **invisible du client** et ne sert qu'à la répartition, **bloquée par Stripe qui n'existe pas**.

```
prix d'une nuit N  =  COALESCE(disponibilites.prix_special_cents, chambres.prix_cents)
prix du sejour     =  SOMME des nuits [arrivee, depart)  +  cleaning_fee_cents UNE FOIS
```

### ⚠⚠ `prix_sejour` est l'UNIQUE lecteur — la source se décide en SQL, JAMAIS en JS

Le front l'appelle pour **afficher**, `demande-reservation` pour **facturer** : **littéralement la même fonction**. C'est ce qui rend *« afficher = facturer »* vrai **par construction** et non par vigilance. ⚠ **Deux codes qui « calculent pareil » ne garantissent rien ; un seul code, si.**

⚠ **`prixService` est la façade du FRONT, pas la seule porte.** `demande-reservation` est en **Deno**, déployée séparément, **sans accès à `src/`** — elle appelle la RPC en direct, et il n'y a pas d'autre option. **Une branche de mode posée en JS ne serait donc vue que par l'affichage** :

```
FRONT  prixService -> voit le mode -> AFFICHE le prix PMS
EDGE   RPC directe -> ignore le mode -> FACTURE le prix interne
```

⚠ **Ce serait la divergence afficher ≠ facturer, réintroduite au pire endroit.** Toute nouvelle source de prix se branche **en SQL**.

### ⚠ Le PMS sera un ÉCRIVAIN, pas un chemin de lecture

Le modèle de disponibilité est **hybride** à terme : la plupart des châteaux en **interne**, certains **synchronisés** avec leur PMS (un seul utilise Thaïs aujourd'hui — les systèmes réels restent à inventorier).

**→ Un PMS écrira ses tarifs dans `disponibilites.prix_special_cents`, et `prix_sejour` en restera l'unique lecteur.** ⚠ **Zéro changement chez les consommateurs** — et une fonction SQL appelant une API externe en synchrone serait de toute façon une mauvaise idée dans un calcul de prix.

### ⚠ `chateaux.mode_dispo` n'existe pas — et `dispo_geree` ne peut pas en tenir lieu

```
mode_dispo    ABSENTE. Seule trace : deux COMMENTAIRES.
dispo_geree   boolean NOT NULL DEFAULT false   -> DEUX etats seulement
```

`dispo_geree` dit *« la table LCC fait foi »* contre *« proxy historique »* — **pas** *« interne contre PMS »*. Un booléen ne peut pas porter un troisième état.

**À ajouter le jour du PMS** : une vraie colonne (enum), ⚠ **avec réémission auto-prouvée d'`admin_upsert_chateau`** — le piège des sept réémissions, dont la parade est écrite et éprouvée. **Coût connu et borné.**

### Le découpage P1 → P6, et son garde-fou central

| | | base ? |
|---|---|---|
| **P1** ✅ | `prix_sejour` en SQL + `GRANT` (⚠ **`service_role`**, l'oubli de 2.5) + 8 tests | ⚠ oui |
| **P2** ✅ | `prixService` — wrapper mince, **ne calcule rien** | non |
| P3 | ⚠ `demande-reservation` facture par la RPC | non |
| P4 | affichage du total réel + correction de `VitrineChateau:783` | non |
| P5 | ⚠ **calendrier tarifaire châtelain — le point de non-retour** | non |
| P6 | prix de base éditable par le châtelain | non |

⚠⚠ **Tant qu'aucun `prix_special_cents` n'existe, chaque étape est un NO-OP en valeur.** On peut brancher facturation puis affichage **sans changer un centime** — et **n'ouvrir la saisie qu'une fois les deux alignés**. Même garde-fou que *« remplir la table avant toute bascule »*.

⚠ **P3 avant P4** : si l'affichage lisait la nouvelle règle avant la facturation, on montrerait un total que le serveur n'enregistrerait pas. L'inverse est sans risque.

⚠ **`demande-reservation` REFUSE sur échec de la RPC** — l'inverse du contrôle de dates de 2.5, qui **ouvrait**. Là c'était une amélioration d'expérience adossée à la contrainte d'exclusion ; ici c'est un **montant** : mieux vaut une demande qui échoue qu'une demande à un prix faux. **Ne pas « harmoniser » les deux gardes.**

### ⚠ Un défaut connu, à corriger en P4

`VitrineChateau:783` affiche **le nom de la chambre choisie** accolé à `prixFinal`, qui vient de **l'offre Module B** — pas de cette chambre. Aujourd'hui masqué (Stripe n'encaisse rien, une seule offre B, et depuis le volet 2 elle est réservée aux connectés donc `prixBarre` est `null` pour un anonyme). ⚠ **Deviendrait un mensonge tarifaire dès qu'un prix spécial existera.**

⚠ **Et au lien dur du sous-audit B — *pas d'encaissement avant des disponibilités réelles* — il faut adjoindre celui-ci : PAS D'ENCAISSEMENT AVANT QUE LE PRIX AFFICHÉ SOIT LE PRIX FACTURÉ.**

## Moteur de disponibilité — les décisions, et l'étape 2.1 (23 août 2026)

Trois questions tranchées avant d'écrire la moindre ligne du moteur. Elles engagent tout le futur paiement : `estDisponible` sera consultée par l'écran **et** par le serveur au moment d'encaisser.

### Q1 — SQL, pas JS. Et pas pour la raison attendue

⚠ **Une `estDisponible` écrite en JS et exécutée dans le navigateur ne PEUT PAS voir ce qui bloque.** `reservations` est sous RLS : un visiteur anonyme n'en lit **rien**. Une lecture `.from("reservations")` depuis le front rendrait un tableau vide, et la fonction répondrait **« libre » sur une chambre réservée** — systématiquement, sans erreur, sans trace.

Ce n'est pas un risque de divergence entre deux implémentations, c'est une **incapacité structurelle**. D'où : fonction SQL `SECURITY DEFINER` (sans paramètre d'utilisateur, ne rendant qu'un booléen ou des dates — rien à fuiter), `GRANT EXECUTE` à `anon` et `authenticated`, et un wrapper JS mince dans `disponibilitesService`, qui reste le seul endroit du front à répondre à la question.

### Q2 — `chateaux.dispo_geree`, opt-in par château

```
false (défaut)  la table disponibilites est IGNORÉE — comportement historique (proxy urgence)
true            la table FAIT FOI, et une date SANS LIGNE vaut INDISPONIBLE
```

⚠ **Pourquoi l'opt-in, alors que le schéma disait l'inverse.** Les deux erreurs ne coûtent pas la même chose : un oubli en opt-in **ferme** une date — on perd une réservation, c'est rattrapable ; un oubli en opt-out **ouvre** une date — on promet une nuit qu'on ne peut pas tenir. La contrainte anti-survente protège la **base** contre la double vente ; elle ne protège pas la **promesse faite à l'écran**.

⚠ **Le COMMENT de `disponibilites` a été corrigé** — « Absence = disponible au prix par défaut » décrivait un opt-out jamais implémenté, qui aurait tout ouvert sur une table vide. `est_disponible` a reçu son premier COMMENT au passage : c'était la colonne qui porte la sémantique, et la seule non documentée des quatre.

### Q3 — L'offre qualifie le prix, elle ne bloque pas

Ordre de composition, pour les nuits `[arrivée, départ)` :

| ordre | source | verdict |
|---|---|---|
| 0 | bornes (`départ > arrivée`, `arrivée ≥ aujourd'hui`) | invalide |
| 1 | **réservation `confirmed`/`completed` chevauchante** | **indisponible, sans appel** |
| 2 | calendrier, si `dispo_geree` (ligne `false` **ou** absente) | indisponible |
| 3 | fenêtre d'offre (`offres.date_debut`/`date_fin`) | **ne bloque pas** |

⚠ **Le prédicat de la source 1 doit être écrit MOT POUR MOT comme la contrainte `reservations_pas_de_chevauchement`** — mêmes statuts, même `daterange(…, '[)')`. S'ils divergent, l'écran promet ce que la base refuse, et le visiteur reçoit un `23P01` après avoir cru réserver.

⚠ **`pending` n'occupe pas**, cohérent avec la décision produit de l'anti-survente : l'arbitrage appartient au châtelain.

⚠ **Hors fenêtre d'offre ≠ indisponible.** Une chambre peut être libre en dehors d'une offre Dernières Clés — elle n'est simplement pas à ce tarif. Confondre les deux fermerait le calendrier partout où il n'y a pas de promotion.

⚠ **Ne PAS faire écrire la source 1 dans la source 2.** `disponibilites.reservation_id` invite à marquer les jours réservés dans le calendrier ; ce seraient deux représentations du même fait, qui divergeraient à la première annulation manquée. La source 1 se dérive **à la lecture**, comme le palier du Club.

### Les cinq sous-étapes

| | contenu | visible ? |
|---|---|---|
| **2.1** ✅ | colonne `dispo_geree` + COMMENT corrigés + `admin_upsert_chateau` + toggle admin | non |
| **2.2** ✅ | `est_disponible` + `chateau_disponible` — SQL, `SECURITY DEFINER` | non |
| **2.3** ✅ | `jours_disponibles_chambre` + `_chateau` — `SETOF date`, pour le calendrier | non |
| **2.4** ✅ | wrapper JS — quatre **nouvelles** fonctions, les trois existantes intactes | non |
| **2.5** ✅ | contrôle des dates dans `demande-reservation` | **oui** |

⚠ **2.5 est le seul gain de sûreté du lot** : aujourd'hui l'Edge Function ne regarde **pas les dates du tout** — ses trois `ERR_INDISPO` portent sur le château, la chambre et le module.

⚠ **L'ordre est contraint** : la saisie (étape 3) doit exister **avant** qu'un château passe à `true`, sinon on le ferme. ~~Et l'étape 4 — retirer le proxy `urgence` des trois fonctions historiques — ne peut venir qu'une fois tous les châteaux servis basculés.~~ ✅ **L'étape 4 est ACCOMPLIE côté écran depuis le 24 août**, et pas comme prévu : le retrait des Dernières Clés du public a rendu les trois fonctions **inatteignables**, sans qu'une ligne bouge. Cf. § Simplification de l'offre.

### ⚠ `admin_upsert_chateau` : sept réémissions, et une liste blanche

Découvert en 2.1, et **à savoir avant d'ajouter la moindre colonne à `chateaux`** : le formulaire admin écrit par une RPC dont l'`UPDATE` **nomme ses colonnes une par une**. `jsonb_populate_record` peuple bien le rowtype, mais une colonne absente de cette liste est peuplée **puis jetée** — le champ serait saisi, sauvegardé, et sans effet, sans la moindre erreur.

**Ajouter une colonne exige donc de réémettre la fonction entière** — et sept migrations du dépôt le font déjà (`mode_paiement`, les 7 `img_*`, les 6 `accroche_*`, les 2 `titre_*`). ⚠ Même piège que `repondre_demande` : repartir de la mauvaise en perdrait d'autres en silence.

⚠ **La parade retenue, à réutiliser** : la migration 2.1 **se prouve elle-même**. Elle capture `pg_get_functiondef` avant, compare l'ensemble des colonnes assignées après, et **lève une exception avant le `COMMIT`** si une seule a disparu ou si le gain n'est pas exactement `{dispo_geree}`. Le contrôle est mécanique — il ne dépend pas de la relecture.

⚠ Le `COMMENT` de la fonction annonçait « 49 colonnes » ; le compte réel était **50**, puis **51**. L'écart préexistait, il est corrigé, et une requête le vérifie au lieu de l'affirmer.

### L'étape 2.2 — les deux fonctions, et le test qui les confronte (23 août 2026)

```
est_disponible(chambre, arrivée, départ)     l'atome
chateau_disponible(chateau, arrivée, départ) EXISTS sur la précédente — aucune logique propre
```

⚠ **`chateau_disponible` ne duplique rien.** L'accueil raisonne en châteaux, la vitrine en chambres : deux implémentations auraient divergé. Un château **sans chambre** rend `false` — on ne réserve pas ce qui n'existe pas.

⚠ **La source « calendrier » est une JOINTURE, pas une boucle.** Le `JOIN` élimine d'un coup les deux façons d'être fermée — ligne à `false` (le `WHERE`) et **absence de ligne** (le `JOIN` ne trouve rien). L'opt-in tient dans une comparaison de comptes.

⚠ **Les bornes rendent `false`, elles ne lèvent pas** : l'appelant est un écran, une plage inversée est une saisie, pas une panne.

⚠ **Collision de noms** : la FONCTION s'appelle `est_disponible`, et la COLONNE de `disponibilites` aussi. Toutes les références à la colonne sont qualifiées (`d.est_disponible`). Ne pas les déqualifier « pour alléger ».

#### ⚠ Le test de PARITÉ — confronter, pas relire

Le prédicat de la source 1 est copié **mot pour mot** de `reservations_pas_de_chevauchement`. Une copie « à l'œil » peut diverger d'un statut ou d'une borne sans que personne ne le voie — jusqu'au jour où un visiteur reçoit un `23P01` **après avoir cru réserver**.

Les tests 15-16 ne relisent donc pas les deux prédicats, ils les **confrontent** sur la même fenêtre : la fonction dit *disponible* → l'`INSERT` réel doit **passer** ; la fenêtre est occupée, elle dit *indisponible* → l'`INSERT` doit être **rejeté par la contrainte**. Les deux, ou aucun des deux.

⚠ **Modèle à réutiliser** partout où une lecture applicative double une contrainte de base : c'est le seul test qui voit l'écart qu'aucune relecture ne voit.

### L'étape 2.3 — la forme calendrier, et un piège à retenir pour 2.4/2.5 (23 août 2026)

```
jours_disponibles_chambre(chambre, du, au) -> setof date
jours_disponibles_chateau(chateau, du, au) -> setof date
```

**La règle n'est pas réécrite, elle est APPELÉE** : chaque nuit N passe par `est_disponible(chambre, N, N+1)`. Recopier le prédicat de `reservations_pas_de_chevauchement` une **troisième** fois (la contrainte, `est_disponible`, puis le calendrier) aurait garanti la divergence — et une divergence entre le calendrier et le contrôle se voit au pire moment : le visiteur clique sur une date verte et reçoit un refus.

**Coût mesuré, assumé** : ~90 accès index par mois affiché. ⚠ Si cela pesait un jour, la réponse serait **un cache côté appelant, pas une seconde copie de la règle**.

⚠ **La factorisation inverse a été considérée et écartée** : faire du calcul par nuit la primitive et réécrire `est_disponible` par-dessus serait plus élégant, mais imposerait de toucher une fonction déjà validée en production, pour un gain d'élégance et une perte de garantie. Le sens actuel de la dépendance (le calendrier appelle le contrôle) est aussi le bon sens de l'autorité.

#### ⚠ Deux objets différents — le décalage `D − 1`

```
est_disponible(ch, A, D)              un SÉJOUR — départ EXCLU, nuits A .. D-1
jours_disponibles_chambre(ch, du, au) un ENSEMBLE DE NUITS — du et au INCLUS
```

**Équivalence** : `est_disponible(ch, A, D)` est vrai **SSI** `jours_disponibles_chambre(ch, A, D − 1)` compte `D − A` nuits. On ne dort pas le soir du départ. Le test 07 confronte les deux fonctions sur trois plages plutôt que de faire confiance à la lecture.

#### ⚠⚠ LE CALENDRIER CHÂTEAU N'AUTORISE PAS UN SÉJOUR — à retenir pour 2.4 et 2.5

```
nuit 1   chambre A libre, chambre B prise
nuit 2   chambre A prise, chambre B libre
   -> les DEUX nuits sortent du calendrier château
   -> et pourtant chateau_disponible(château, nuit1, nuit3) = FAUX
```

`jours_disponibles_chateau` rend les nuits où **au moins une chambre** est libre — chambre qui peut **changer d'une nuit à l'autre**.

⚠ **Un écran qui affiche ces nuits en vert DOIT revalider la plage choisie par `chateau_disponible` avant de proposer une réservation.** Ce n'est pas un défaut : c'est ce que « au moins une chambre ce soir-là » veut dire, et l'alternative — ne montrer que les nuits couvertes par une même chambre sur tout un mois — n'aurait aucun sens pour un calendrier. Le **test 08 fixe ce comportement** ; son échec dans l'autre sens serait une **survente**.

#### La garde d'horizon lève, contrairement aux bornes de 2.2

366 jours maximum, sinon `22023`. ⚠ L'asymétrie est voulue : `est_disponible` rend `false` sur une plage aberrante — « non disponible » est une réponse honnête. Ici un **ensemble vide se lirait « rien n'est libre »**, réponse *fausse* et indiscernable d'un mois complet. Une fenêtre inversée rend en revanche l'ensemble vide **sans lever** : un intervalle vide n'a légitimement aucune nuit.

### L'étape 2.4 — le wrapper JS, et un verrou de fuseau (23 août 2026)

`disponibilitesService` porte désormais **deux moitiés**, et un bandeau les sépare dans le fichier :

```
moitié HISTORIQUE   chateauxDisponibles · datesAvecOffre · predicatDateOuverte
                    -> proxy editorial `urgence`. INTACTE, et desormais
                       SANS AUCUN CONSOMMATEUR (24 aout) : DernieresCles
                       etait le seul, et il a quitte le public.
                       ⚠ EN VEILLE, PAS MORTE — cf. § Simplification de l'offre.
moitié MOTEUR       estDisponible · chateauDisponible
                    joursDisponiblesChambre · joursDisponiblesChateau
                    -> quatre wrappers minces sur les RPC de 2.2 / 2.3
```

⚠ **Les deux coexistent volontairement.** Ce sont les historiques que l'écran consomme aujourd'hui ; poser le moteur à côté, testé, **avant** de débrancher le proxy — pas l'inverse. Aucun composant n'appelle encore la seconde moitié.

#### ⚠⚠ ON N'ENVOIE JAMAIS UN OBJET `Date` À UNE RPC

PostgREST le sérialiserait en ISO **UTC** ; le cast `::date` côté Postgres peut alors rendre **le jour précédent** selon l'heure et le fuseau du visiteur.

```
1er septembre, 00 h 30 heure locale (UTC+2)
  toISOString()  ->  "2026-08-31T22:30:00Z"   le MOIS precedent
  versJour()     ->  "2026-09-01"             les composantes LOCALES
```

⚠ **Ce module a déjà payé ce bug une fois** — cf. le commentaire de `minuit()` : *« une règle de disponibilité ne peut pas dépendre de l'heure à laquelle on la lit »*. `versJour()` ferme la question, et un test le verrouille **avec le contre-exemple `toISOString` écrit noir sur blanc**. Un tel défaut ne casse rien visiblement : il décale une journée, parfois, pour certains.

`cleJour()` a donc deux rôles désormais : clé interne du `Set`, et **format de transport** vers Postgres.

#### Ce que le test unitaire ne couvre pas, et pourquoi

**La règle métier n'est pas retestée en JS.** Elle vit en SQL et elle est prouvée là-bas — 16/16 et 11/11 **en base réelle**. La rejouer avec un client mocké ne prouverait que la qualité du mock. Le test JS verrouille le **contrat d'appel** : noms de RPC, noms de paramètres, format de date, normalisation du retour, propagation de l'erreur.

⚠ **Les trois fonctions historiques ne sont pas couvertes non plus** : les tester figerait ce qu'on veut retirer à l'étape 4. ⚠ **Et depuis le 24 août elles n'ont plus aucun consommateur** — ne pas écrire de test pour elles maintenant : ce serait garder un code que rien n'appelle.

### L'étape 2.5 — le contrôle des dates, et le `GRANT` qui l'aurait rendu inerte (23 août 2026)

**Le trou comblé** : `demande-reservation` ne regardait **pas les dates**. Ses trois `ERR_INDISPO` couvrent le château, l'appartenance de la chambre et le module. Un visiteur pouvait donc demander une chambre déjà vendue — la contrainte `reservations_pas_de_chevauchement` ne l'arrêtait pas non plus, puisqu'elle n'occupe que sur `confirmed` et que la demande entre en `pending`. Le refus n'arrivait qu'à la confirmation du châtelain, **et c'est lui qui portait la gêne**.

#### ⚠⚠ Le `GRANT` manquant aurait produit un correctif INERTE et SILENCIEUX

Mesuré le 23 août : `execute_service_role = FALSE` sur les **quatre** fonctions du moteur. Or `demande-reservation` tourne en `service_role`, et sa règle de repli est « ouvrir sur échec ». Sans le `GRANT`, l'appel aurait échoué en `42501` **à chaque demande**, journalisé, et n'aurait **jamais rien bloqué**.

⚠ **Le `REVOKE … FROM PUBLIC` de 2.2 et 2.3 visait l'accès non identifié, pas le backend.** `service_role` n'a pas été écarté par décision — il a été oublié par effet de bord. Et le `GRANT` **n'ouvre aucun pouvoir nouveau** : `service_role` lit déjà `reservations` en direct, en contournant la RLS. C'est de la plomberie, pas de la sécurité — l'argument du moindre privilège n'a ici aucune prise.

⚠ **Les quatre fonctions sont accordées, pas seulement `est_disponible`.** N'en accorder qu'une recréerait le même piège pour le prochain appelant serveur.

⚠ **L'ORDRE N'EST PAS NÉGOCIABLE** : migration `GRANT` → déploiement de l'Edge Function. Dans l'autre sens, le contrôle est inerte et rien ne le signale.

#### Trois choix de forme

- **Placé en fin de §3, avant la §6** — parce que **la §6 crée un compte utilisateur**. Refuser après elle laisserait un compte fantôme derrière chaque demande morte-née : le seul effet de bord de cette fonction qui survive à la requête.
- **Seul un `false` explicite bloque.** `dispoErr` ou un retour non booléen rejoignent la branche « on ouvre » : un problème de lecture n'est pas un refus. Écrire `!libre` aurait fait bloquer un `null` — l'inverse de la décision.
- **On ouvre sur échec.** Ce contrôle est une **amélioration d'expérience**, pas la barrière de sûreté : la barrière reste la contrainte d'exclusion, qui tranche à la confirmation. Transformer une erreur de lecture transitoire en panne du tunnel serait un mal plus grand que celui qu'on corrige. Le log dit « contrôle des dates IGNORÉ », pour qu'une relecture ne prenne pas un correctif inerte pour un correctif qui passe.

#### ⚠ `ERR_DATES_PRISES` — la seule exception à la règle des messages génériques

*« Ces dates ne sont plus disponibles pour cette chambre. »* Le message-valise `ERR_INDISPO` aurait mieux servi la discrétion, mais il protégerait une information que **le calendrier public montrera de toute façon** (étape 2.3), au prix d'un visiteur qui ne saurait pas que d'autres dates passeraient. Le sondage reste borné par le rate-limit — 3 par IP par 15 min, **jeton consommé même en cas d'échec**.

⚠ **La discrétion n'est pas abandonnée, elle est CIBLÉE** : les trois autres causes d'`ERR_INDISPO` (statut, `mode_paiement`, module) restent indiscernables entre elles.

#### Le déploiement, mesuré

```
.github/workflows/*.yml   aucune mention de supabase
package.json              supabase ^2.109.1 en devDependency (PAS dans le PATH)
supabase/.temp/           lien à ynoieryxfqiqjscqieum, du 17 juillet — GITIGNORÉ
```

Déploiement **manuel** : `./node_modules/.bin/supabase functions deploy demande-reservation`, depuis la machine qui porte le lien. Confirmation directe du TROU 3 du sous-audit C.

⚠ **Il n'y a pas de « version précédente » à restaurer côté Supabase** : le rollback consiste à redéployer depuis un commit antérieur. D'où la discipline retenue ici — **commiter avant de déployer**, pour que ce point de retour existe.

## Étape 3 — la SAISIE des disponibilités (24 août 2026)

Le moteur (2.1→2.5) **lit** les dates. L'étape 3 construit de quoi les **écrire**.

### ⚠ La décision produit, nommée honnêtement : un opt-OUT BORNÉ

*« Le châtelain ne fait que bloquer, le reste est ouvert »* — le geste Airbnb. ⚠ **Ce n'est pas une préservation de l'opt-in décidé le 23 août, c'est son remplacement.** L'argument d'alors était : *un oubli en opt-in ferme une date (rattrapable), un oubli en opt-out en ouvre une (on promet une nuit qu'on ne peut pas tenir)*. Avec ce geste, un châtelain qui oublie de bloquer **ouvre**. On l'accepte — un calendrier qu'il faut remplir pour exister ne sera jamais rempli — et **l'horizon est la borne qui rend ce risque fini**.

### Pourquoi une colonne, et pas 365 lignes par chambre

L'alternative était de matérialiser des lignes `true` sur un horizon glissant. **Écartée, et pas pour le volume** : 62 chambres (44 publiées) font ~22 600 lignes/an, négligeable face aux 8 Go du plan Pro. Écartée pour **l'entretien** — un horizon qui glisse demande un **cron**.

⚠⚠ **Et le mode de panne de ce cron aurait été SILENCIEUX.** S'il s'arrête, les dates lointaines cessent d'être réservables, une par jour, sans erreur ni log ni test rouge. On s'en apercevrait à la baisse des demandes. Sur un moteur de réservation, c'est le pire mode de panne possible — et ce dépôt porte déjà la dette « le cron n'est pas versionné ».

**Le choix retenu échange un risque permanent et silencieux contre une migration ponctuelle sur une fonction prouvée.**

### `chateaux.dispo_ouverte_jusqu_a` — les trois états d'une nuit

```
ligne est_disponible = false   FERMEE   le chatelain a bloque
ligne est_disponible = true    OUVERTE  ouverture explicite
PAS DE LIGNE                   OUVERTE  si nuit <= dispo_ouverte_jusqu_a
                               FERMEE   au-dela
```

⚠ **Rétrocompatible par construction.** `est_disponible` a gagné **une** branche : `COALESCE(d.est_disponible, v_horizon IS NOT NULL AND g.nuit::date <= v_horizon)` et un `LEFT JOIN`. Quand l'horizon est `NULL`, le second terme vaut `false` — **exactement** ce que produisait le `JOIN` interne, qui éliminait la nuit du compte. **Les seize tests de 2.2 sont passés INCHANGÉS**, parité #142 comprise : la rétrocompatibilité est prouvée par exécution, pas par raisonnement.

⚠ **Les trois fonctions filles héritent sans une ligne de plus** — elles appellent `est_disponible`, elles ne la copient pas. Dividende de la décision de 2.3.

#### Deux propriétés émergentes

- **Une ligne `true` est plus forte que l'horizon** : on peut ouvrir une date lointaine — un mariage réservé deux ans à l'avance — sans déplacer l'horizon. Gardé par un test.
- **Le calendrier s'arrête de lui-même à l'horizon** : `jours_disponibles_*` cesse de rendre des nuits au-delà, sans que cette limite soit codée nulle part. ⚠ Cohérent, mais un lecteur pourrait le prendre pour un défaut.

### Les RPC d'écriture — et pourquoi, alors que l'écriture directe était ouverte

Mesuré : la policy `disponibilites_write_chatelain_admin` **et** le `GRANT INSERT/UPDATE/DELETE TO authenticated` existent. Un `.from("disponibilites").upsert(…)` depuis le front **aurait fonctionné**. Ce n'est donc pas un choix de sécurité — elle était déjà tenue.

- ⚠ **L'atomicité** : « je bloque du 12 au 18 » = sept lignes. Un upsert client qui échoue à mi-chemin laisse une période **à moitié bloquée**, et l'écran affiche ce qu'il croit avoir écrit.
- ⚠ **La règle ne doit pas vivre dans le composant** — le contrat de `disponibilitesService` l'interdit. Faire calculer la liste des jours par le client, c'est exactement cela.
- **Un aller-retour au lieu de trente**, sur un réseau mobile.

```
poser_disponibilites(chambre, du, au, est_disponible, prix?)  -> integer
retirer_disponibilites(chambre, du, au)                       -> integer
calendrier_edition_chambre(chambre, du, au)                   -> table (6 etats)
```

⚠ **BORNES INCLUSIVES** — « du 12 au 18 » = **sept** nuits. C'est la convention de `jours_disponibles_*`, **pas** celle d'`est_disponible` (qui prend un séjour, départ exclu). Se tromper laisserait la **dernière nuit** d'une période bloquée ouverte, et le défaut ne se verrait qu'à la réservation.

⚠ **Ces fonctions LÈVENT sur une fenêtre invalide**, là où `est_disponible` rend `false`. Là, c'était un **écran qui interroge** ; ici c'est une **écriture**, et « 0 nuit écrite » se lirait « c'est fait ».

⚠ **Le prix spécial est PRÉSERVÉ** (`COALESCE`), sinon bloquer une date **effacerait un tarif saisi** — perte silencieuse sur une colonne que personne ne regarde. Limite assumée : on ne peut donc pas *effacer* un prix par `poser_` ; il faut `retirer_` puis reposer.

⚠ **`GRANT` à `authenticated` SEUL, jamais `anon`** — contrairement aux lectures de 2.2/2.3. Deux écrivent, la troisième expose **l'occupation**. Le `GRANT` à `anon` se justifiait par un retour sans rien à fuiter ; ce n'est plus le cas.

### ⚠ Un rouge instructif, gardé dans le test

Le test 10 a rougi : il attendait `ouverte_horizon` sur une nuit que **son propre décor** plaçait trois jours après l'horizon. **La fonction avait raison, l'assertion avait tort.** Le décor a été gardé tel quel — la fenêtre chevauche délibérément l'horizon — et le test est devenu **le gardien de la frontière** : borne `<=` incluse, ligne explicite plus forte que l'horizon, nuit au-delà sans ligne.

⚠ **Et la relecture de ce rouge a révélé un trou que rien n'aurait signalé** : le test de cohérence partait de l'horizon lui-même, donc ne couvrait que « = » et « > ». Aucune nuit strictement **dans** l'horizon n'était confrontée entre les deux fonctions. Fenêtre décalée de deux jours ; les trois positions sont couvertes.

### ✅ FAIT en 3.4a — le toggle réécrit, et le trou qu'il cachait

Cette section demandait de réécrire l'avertissement du toggle de 2.1, devenu **faux**
(*« toute date non saisie est fermée »* — or dans l'horizon, une date non saisie est
**ouverte**). C'est fait, et le chantier a révélé plus grave que le texte.

⚠ **L'horizon n'était saisissable NULLE PART.** 3.1 avait posé
`chateaux.dispo_ouverte_jusqu_a`, `est_disponible` la lisait — et **aucun écran ne
permettait de lui donner une valeur**. Un château passé en `dispo_geree` avec un
horizon `NULL` a un calendrier **entièrement fermé**, sans que rien ne le dise : le
drapeau donne l'impression d'avoir activé quelque chose alors que rien n'est ouvert.
Le seul remède était un `UPDATE` en SQL Editor.

Le champ est désormais dans la fiche admin, et **l'avertissement du drapeau est dérivé
de l'état en trois versions** — c'est lui qui porte le garde-fou :

| état | ce que l'écran dit |
|---|---|
| décoché | le château suit le proxy `urgence` historique |
| coché · horizon **vide** | ⚠ **« Aucune date n'est ouverte »** — le calendrier est fermé |
| coché · horizon posé | les dates sont ouvertes jusqu'au *(date lisible)* |

⚠ **`formatJourLisible` découpe la chaîne à la main**, jamais `new Date("YYYY-MM-DD")`
— que la spec interprète en **UTC**, ce qui affiche la veille à l'est de Greenwich.
Même piège que `jourISO` / `versJour`, déjà payé une fois par ce dépôt.

### Le plan restant

| | | |
|---|---|---|
| **3.1** ✅ | RPC d'écriture + lecture d'édition + horizon | SQL |
| **3.2** ✅ | lecture « mes châteaux / mes chambres » — `chatelainService.getMesChateaux()` | service |
| **3.3** ✅ | `CalendrierSaisie` — trois états, sélection de plage, **souris et doigt** | composant |
| **3.4** ✅ | second onglet du dashboard châtelain (+ l'horizon devient saisissable) | écran en service |
| **3.5** ✅ | `PanneauDisponibilites` extrait, puis `/admin/chateaux/:id/disponibilites` | additif |

**L'étape 3 est close** (PR #151, #152, #153 — 24 août 2026). Les dates se saisissent
désormais des deux côtés, sur le même composant et la même table.

### ⚠⚠ `fontainebleau` est le CHÂTEAU DE DÉMONSTRATION DU MOTEUR — état volontaire

**Ne pas prendre cet état pour un accident, et ne pas le « corriger » en passant.**

```
statut                  brouillon        -> INVISIBLE du public, la RLS le filtre
dispo_geree             true             -> le SEUL chateau gere du parc
dispo_ouverte_jusqu_a   2027-12-31
disponibilites          blocages de test ecrits depuis les deux ecrans
chateau_owners          AUCUN            -> le rattachement temporaire a ete retire
```

**Pourquoi il existe.** Le seul rattachement de propriété réel du parc est
`chateau-de-la-riviere` — **publié, mais ni géré ni pourvu d'un horizon**. Il ne
permet donc de tester *aucun* chemin d'écriture. `fontainebleau` a été rattaché
temporairement au compte châtelain pour valider 3.4c, puis **détaché** une fois
l'étape close : la propriété était fausse, l'état de gestion, lui, est utile.

⚠ **Conséquence à connaître avant de chercher une panne** : `fontainebleau`
**n'apparaît plus dans l'espace châtelain** (`getMesChateaux` lit `chateau_owners`).
Il ne s'atteint que par `/admin/chateaux/:id/disponibilites`. Ce n'est pas une
régression de 3.5 — c'est le retrait du rattachement de test.

⚠ **Deux échéances où il faudra le défaire**, et elles n'appellent pas le même geste :

- **avant une publication éventuelle** — un château servi ne doit pas porter des
  blocages posés pour l'exemple ;
- ~~**avant l'étape 4** *si* on veut un parc vierge pour mesurer la bascule du proxy
  `urgence`.~~ ⚠ **Caduque** : l'étape 4 s'est accomplie côté écran le 24 août, sans
  bascule à mesurer. Il n'y a plus d'échéance de ce côté — reste la première.

```sql
-- Le jour où l'on veut le rendre vierge (les blocages seuls) :
DELETE FROM public.disponibilites d
USING public.chambres ch, public.chateaux c
WHERE d.chambre_id = ch.id AND ch.chateau_id = c.id
  AND c.slug = 'fontainebleau';
```

### L'étape 3.2 — `getMesChateaux()`, et une inversion de rôle à ne pas « harmoniser »

**Une lecture plate, pas une RPC** — parce que `chateaux_select_public` fait `statut = 'publie' OR is_chatelain_of(id) OR is_admin()`. Le deuxième terme suffit : un châtelain voit ses châteaux **même en brouillon** à travers l'embed. Aucune règle à porter côté serveur ; le patron maison réserve les RPC à ce qui porte une règle ou une garde.

⚠ **Ce que ce service ne fait PAS : filtrer.** Pas de `.eq("user_id", …)`. C'est la RLS qui décide, et un filtre applicatif **masquerait** un défaut de policy au lieu de le révéler.

⚠ **`chateaux!inner`** — sans lui, un lien vers un château masqué par la RLS produit une ligne fantôme `chateaux: null` au lieu de disparaître. Piège déjà connu du dépôt (`SELECT_PERSONNAGE_FICHE`).

⚠ **Le tri est fait en JS, délibérément.** PostgREST sait ordonner un embed, mais la syntaxe dépend de la version sur un embed à deux niveaux — et surtout, **un tri délégué au serveur serait invisible du test unitaire**. Le mock rend les chambres en désordre et le test vérifie qu'elles ressortent triées. `ordre` étant nullable, le repli est `Infinity` : une chambre non ordonnée finit **en dernier**, pas en tête.

#### ⚠⚠ `tests-mes-chateaux.sql` inverse le rôle — et c'est tout son sens

```
tests 2.5 / 3.1   role `authenticated` autour des APPELS seulement,
                  verifications en postgres  -> CONTOURNER la RLS
tests-mes-chateaux  role endosse PENDANT LES LECTURES  -> EPROUVER la RLS
```

**En `postgres` (`BYPASSRLS`), les six `SELECT` rendraient tout et les verdicts passeraient au vert en ne prouvant rien.** Quiconque « harmoniserait » ce fichier sur le patron des autres le viderait de son sens **sans qu'aucun verdict ne change**. C'est écrit en tête du fichier.

⚠ **Et le cas qui compte est le BROUILLON.** La policy étant une disjonction, un test sur des châteaux publiés seuls est satisfait par le premier terme : il passerait au vert **même si `is_chatelain_of(id)` disparaissait**. Comme aucun châtelain n'est lié à un brouillon en base, le test en pose un temporairement, l'éprouve, et le retire — dans le même bloc `DO`, donc annulé proprement si le bloc lève.

⚠ **Un client obtient `[]`, pas `42501`.** La RLS ne refuse pas, elle ne rend rien. Un écran qui lirait « pas d'erreur » comme « accès accordé » afficherait **une page vide plutôt qu'un refus** — à traiter en 3.4.

### Les étapes 3.3 → 3.5 — les écrans, et cinq pièges qui ne vivent QUE là

⚠ **Cette section existe parce que ces pièges n'étaient écrits nulle part où on les lirait.** Ils vivaient dans des messages de commit et des corps de PR — c'est-à-dire hors de portée au moment d'agir. Relevé par l'audit global du 24 août 2026, qui a mesuré : `OngletDisponibilites`, `AdminChateauDisponibilites` et `utils/calendrierSaisie.js` avaient **zéro mention** dans ce fichier.

#### Qui fait quoi — cinq objets, une phrase chacun

```
utils/calendrierSaisie.js        la REGLE, sans DOM : aplatir un etat, borner une
                                 plage, compter des nuits, choisir l'ecriture
CalendrierSaisie.jsx             la GRILLE : un mois, le geste, rien d'autre
PanneauDisponibilites.jsx        le COEUR : chambre, mois, lecture, ecriture, garde
chatelain/OngletDisponibilites   l'HOTE chatelain : « quels sont MES domaines »
admin/AdminChateauDisponibilites l'HOTE admin : le chateau de l'URL
```

**La frontière** : les hôtes savent **QUI** regarde (`getMesChateaux` passe par la RLS, `getChateauAdminById` par `is_admin`), le cœur ne connaît que **des dates**. Il ne cherche pas son château, il le **reçoit**.

#### ⚠ PIÈGE 1 — `touch-action: none` est PERMANENT, et les marges sont le scroll

La grille refuse le défilement tactile. **On ne peut pas poser cette propriété « seulement pendant le glissement »** : le navigateur tranche au `touchstart`, avant de savoir ce que le doigt va faire. `pan-y` ne sauve rien non plus — une sélection sur plusieurs semaines est verticale.

**La conséquence est portée par la DISPOSITION** : sélecteurs au-dessus, barre d'action et pied en dessous. **Ce sont ces zones qui donnent la surface pour attraper la page.**

⚠ **Les retirer « pour gagner de la place » rendrait la page impossible à faire défiler sur téléphone**, et rien en CSS ni en test ne le signalerait.

#### ⚠ PIÈGE 2 — « Ouvrir » EFFACE, il n'écrit JAMAIS `poser(true)`

```
bloquer   poser_disponibilites(..., est_disponible = false)   ecrit une ligne
ouvrir    retirer_disponibilites(...)                          EFFACE la ligne
```

⚠ **Une ligne `est_disponible = true` est IMMUNE À L'HORIZON.** C'est une propriété voulue — elle permet d'ouvrir un mariage réservé deux ans à l'avance sans déplacer l'horizon — mais employée comme « rouvrir », elle sèmerait des nuits ouvertes **au-delà** de l'horizon, que plus rien ne refermerait.

La règle vit dans `actionPourSelection` (`utils/calendrierSaisie.js`), testée unitairement. **Ne pas la ré-implémenter en `if/else` « parce que c'est plus court ».**

#### ⚠ PIÈGE 3 — bornes INCLUSIVES à la saisie, EXCLUSIVES au séjour

```
poser_ / retirer_ / jours_disponibles_*   du 12 au 18 = SEPT nuits   [du, au]
est_disponible(chambre, A, D)             un SEJOUR, depart EXCLU     [A, D)
```

**On ne dort pas le soir du départ.** Confondre les deux laisserait la **dernière nuit** d'une période bloquée **ouverte** — et le défaut ne se verrait qu'à la réservation. Le test 12 de `tests-saisie-disponibilites.sql` confronte les deux fonctions plutôt que de les relire.

#### ⚠ PIÈGE 4 — deux hôtes, UN cœur

`PanneauDisponibilites` est monté par l'espace **châtelain** *et* par l'écran **admin**. **Toute modification touche les deux**, et l'un des deux est un écran en service sans filet E2E.

⚠ Son CSS (`panneau-disponibilites.css`, préfixe `pdi-`) a dû **sortir** de `chatelain.css` pour cette raison : `AdminLayout` ne charge que `admin.css`, les classes `che-` y auraient été **purement absentes** — dont celles qui portent les marges du piège 1. **Ne pas les y remettre.**

#### ⚠⚠ PIÈGE 5 — le geste tactile ne se vérifie QUE sur un vrai téléphone

**Aucun outil dont ce dépôt dispose ne le reproduit.** Ni Playwright, ni un émulateur : la latence tactile, les gestes système au bord de l'écran, le `pointercancel` d'un appel entrant n'y existent pas.

**→ Toute modification de `CalendrierSaisie.jsx`, de `calendrier-saisie.css` ou de `panneau-disponibilites.css` exige une re-validation MANUELLE sur un appareil réel.** C'est un coût permanent, à prévoir avant de planifier — pas une précaution facultative.

Ce qu'il faut y voir : le doigt-glisser sélectionne, la sélection **bute** sur l'horizon (`plageLimitee`), l'écriture **persiste après rechargement**, et **la page défile autour de la grille**.

⚠ Précédent : l'extraction du cœur (3.5a) était un déplacement prouvé mécaniquement — six écarts, tout le reste byte-identique — et elle a **quand même** été re-validée au doigt. Le point le plus exposé était le CSS changeant de feuille et de préfixe.

#### ⚠ La cible des tests SQL est DYNAMIQUE — fragilité latente depuis le décor

`tests-est-disponible.sql` et `tests-saisie-disponibilites.sql` choisissent leur cible **au moment de l'exécution** : *le premier château à ≥ 2 chambres, les brouillons d'abord, par ordre de slug*.

**Mesuré le 24 août : c'est `chantilly`** — le tri par slug le place avant `fontainebleau`.

⚠ **Mais le commentaire de `tests-est-disponible.sql` (ligne 327) affirme que « `orig_horizon` vaut NULL sur les 13 châteaux », et c'est FAUX depuis le décor** : `fontainebleau` porte `2027-12-31`. Si `chantilly` perdait une chambre ou changeait de slug, la cible deviendrait `fontainebleau` — et les tests passeraient **par coïncidence d'offsets** (les fenêtres sont à `CURRENT_DATE + 600` et `+900`, donc au-delà de cet horizon), pas pour la raison que le commentaire invoque.

**Fragilité LATENTE, pas active.** À savoir avant de conclure quoi que ce soit d'un rouge sur ces fichiers : **lire d'abord la ligne `SETUP`**, qui nomme la cible retenue et son état d'origine.

#### ⚠ À FAIRE — fixer la commission de `chateau-de-la-riviere`

`0,00 %`, module actif, sur un château **publié**. **C'est assumé, pas oublié** : la négociation n'a pas eu lieu, et Matthieu ajustera le taux.

⚠ **À fixer AVANT toute ouverture commerciale réelle** — sinon une réservation encaissée ne rapporterait rien, exactement le trou que `commissionService.js` documente déjà (« deux châteaux publiés ont encaissé 0 % sans que rien ne le signale »). L'écran `/admin/commissions` existe ; il reste à s'en servir.

### ⚠ Micro-dette — `chateau_owners` n'a ni ordre ni domaine principal

La table autorise **plusieurs domaines par châtelain** (`UNIQUE (user_id, chateau_id)`), mais ne porte **aucune** notion d'ordre ni de château principal. `getMesChateaux()` trie donc **par nom**, faute de mieux.

**Sans effet aujourd'hui** : un seul lien de propriété existe en base (mesuré le 24 août — `chateau-de-la-riviere`, publié, 5 chambres ; les douze autres châteaux n'ont aucun propriétaire). ⚠ À traiter le jour où un châtelain aura plusieurs domaines : l'ordre alphabétique n'est pas celui de son attention.

⚠ **Ne pas ajouter le calendrier comme 18ᵉ section d'`AdminChateauEdition`** : ce formulaire est un **REPLACE** qui envoie l'état complet à `admin_upsert_chateau`. Y mêler une saisie par plages ferait deux modèles d'écriture dans un même écran.

#### Convention : les RPC métier ne sont PAS rétro-portées

Vérifié le 23 août avant de le faire à tort. `schema.sql` ne contient **qu'une** fonction (`trigger_set_timestamp`) ; `policies.sql` n'en contient que **quatre** (les helpers RLS `is_admin`, `is_chatelain`, `is_chatelain_of`, `handle_new_user`). Toutes les RPC métier — `admin_upsert_chateau`, `repondre_demande`, `count_sejours_confirmes`, `admin_set_commission`, et désormais `est_disponible` / `chateau_disponible` — vivent **uniquement dans leurs migrations**, et ne sont mentionnées ailleurs qu'en commentaire.

⚠ **Conséquence, déjà payée** : il n'existe aucun fichier de référence pour l'état désiré d'une RPC, d'où le piège des sept réémissions d'`admin_upsert_chateau`. Le garde-fou `validate:schema` compare des **noms de tables** : il ne voit rien de tout cela.

### ⚠ Le SQL Editor n'affiche que le DERNIER résultat

Déjà écrit dans `2026-08-02-titres-editoriaux.sql`, et **oublié en 2.1** : le premier test finissait par un contrôle de propreté, qui masquait le tableau des cinq verdicts. Les tests passaient sans que personne puisse les lire. **Un fichier de test n'a qu'un seul `SELECT`, et c'est celui des verdicts** ; tout contrôle annexe se calcule dans le bloc `DO` et se verse dans la même table.

### ⚠ PIÈGE 2 — Le proxy `urgence` n'est pas une disponibilité

Mesure du 22 août sur les **sept** demeures servies :

| slug | `urgence` | fenêtre appliquée | reconnue ? |
|---|---|---|---|
| `blanc-buisson`, `chateau-de-bonnemare`, `chateau-royal-de-benays` | `J-15` | 15 j | oui |
| `chateau-de-la-riviere` | « Vitrine premium » | 15 j | **non → défaut** |
| `chateau-du-boulay-morin` | « Idéal week-end » | 15 j | **non → défaut** |
| `chateau-de-saint-paterne`, `les-briottieres` | `null` | 15 j | **non → défaut** |

**Les sept aboutissent à la même fenêtre.** Trois par une valeur reconnue, quatre par le repli silencieux : **le proxy ne discrimine rien**, et produirait le même résultat si toutes les valeurs étaient absentes.

⚠ **Et Briottières — seule demeure portant une offre, donc seule à ouvrir des dates — est à `null`.** Le calendrier ouvre donc quinze jours sur une **valeur par défaut**, sans aucune information de disponibilité réelle.

**Aujourd'hui c'est tenable** : le parcours produit une *demande*, filtrée par le châtelain, sans encaissement.

> **LIEN DUR : pas d'encaissement avant que des disponibilités réelles soient saisies.** Le jour où Stripe encaisse, ce défaut devient « on encaisse pour une nuit peut-être occupée ». Ce n'est pas un retard qu'on s'impose, c'est un garde-fou.

### Trois manques annexes, relevés au même audit

- **Aucune fonction ne prend une PLAGE.** `chateauxDisponibles` ne regarde que la date d'**arrivée** ; la durée n'entre nulle part. Réserver trois nuits demandera une **quatrième fonction**, pas seulement un nouveau corps.
- **`chateaux.mode_dispo` n'existe pas.** Mesuré : `column chateaux.mode_dispo does not exist`. Sa seule trace du dépôt est une **comparaison en commentaire** dans la migration `mode_paiement`. Ce n'est pas un placeholder d'architecture, c'est une intention mentionnée en passant.
- **Aucune UI de saisie.** Douze écrans admin, un dashboard châtelain, **aucun calendrier éditable**. Les trois composants calendrier du dépôt sont en lecture, côté visiteur. Seules les **policies** d'écriture existent (`disponibilites_write_chatelain_admin`) — la sécurité du chemin est prête avant le chemin.

## Simplification de l'offre — 3 modules publics → 2 (24 août 2026)

**Décision de Matthieu, qui a autorité sur l'offre.** Le site ne présente plus que **Les Vitrines** et **le Club**. Les **Dernières Clés** cessent d'être un module public autonome : elles deviennent une **offre réservée aux connectés**, à l'intérieur du Club.

```
volet 1  « Vitrine permanente » -> « Vitrines »        PR #155
volet 2+3  les Dernieres Cles quittent le public       PR #156 + 1 UPDATE
```

⚠ **Rien n'a été supprimé.** `DernieresCles.jsx`, `CalendrierDK`, `ContenuDernieresCles`, `dernieres-cles.css`, `offresService`, `MODULE_B_ID` et les colonnes `img_`/`accroche_barre_dernieres_cles` sont **en veille**, et chaque retrait porte en commentaire **le geste exact de sa réactivation**.

⚠ **Le renommage n'a touché que le NOM PUBLIC.** La clé technique `"permanent"` — colonnes `img_barre_permanent`, classes `.vc4-permanent-*`, sélecteurs de test, `MODULES[]` — est **inchangée**. La renommer exigerait une migration de colonnes **et** une réémission d'`admin_upsert_chateau` (le piège des sept réémissions), pour zéro gain visible.

⚠ **La marque n'est pas le module.** `index.html` et `global.css` portent « Les Dernières Clés du Château » : c'est le **nom du site** — le dépôt lui-même s'appelle ainsi. **Aucun `sed` global** sur cette chaîne.

### ⚠⚠ `modules.requires_auth_role` est un PIÈGE — la colonne n'est lue par PERSONNE

**Le plan validé prévoyait de réserver le module B par `UPDATE modules SET requires_auth_role = 'client'`.** La mesure l'a démenti à temps :

```
grep requires_auth_role sur src/ + supabase/  ->  4 resultats
  schema.sql   la declaration de colonne
  schema.sql   son COMMENT
  seed.sql     la liste de colonnes de l'INSERT
  (aucun lecteur)
```

⚠ **Son propre `COMMENT` porte le préfixe `[Plugeable]`** — la convention maison pour « déclaré, jamais branché ». Et `offres.requires_role` annonce : *« Hérité de `modules.requires_auth_role` par défaut »* — **cet héritage n'est implémenté nulle part.**

⚠ **L'`UPDATE` serait passé sans erreur et n'aurait rien changé.** C'est le pire mode de panne : celui qu'on prend pour un succès.

**LE VRAI LEVIER, ligne par ligne :**

```sql
UPDATE public.offres SET requires_role = 'client' WHERE module_id = <module>;
```

Appliqué par la RLS, `policies.sql:655` :

```sql
CREATE POLICY offres_select_visible ON public.offres FOR SELECT USING (
  (visible = true AND (requires_role IS NULL OR auth.uid() IS NOT NULL))
  OR public.is_chatelain_of(chateau_id) OR public.is_admin()
);
```

⚠ **La policy ne teste PAS le rôle**, seulement `auth.uid() IS NOT NULL` : **toute personne connectée** voit l'offre, pas seulement un « client ». C'est déjà le comportement du Club, et c'est cohérent avec « le Club est gratuit ».

⚠ **Cet `UPDATE` coupe aussi le prix barré de la vitrine publique** : `applyOffreModuleB` ne trouve plus d'offre, `chateau.prixBarre` vaut `null`, le hero retombe sur `prixDepart`. **Vérifié en production sur Briottières.**

⚠ **Mais il ne coupe AUCUN chemin en dur.** Menu, carte d'accueil, route, onglet, liens SEO, CTA, carte de barre latérale : **sept**, tous en code. **L'ordre est donc contraint — le code d'abord, la base ensuite** ; l'inverse ouvre une fenêtre où les portes mènent au vide.

### ✅ L'ÉTAPE 4 DU MOTEUR EST ACCOMPLIE — côté écran, sans qu'une ligne ait bougé

**Ne plus la chercher dans la liste des choses à faire.**

`DernieresCles.jsx` était le **seul consommateur** des trois fonctions historiques de `disponibilitesService` — `chateauxDisponibles`, `datesAvecOffre`, `predicatDateOuverte`, celles qui portent le **proxy éditorial `urgence`**. Retirer son chemin public les a rendues **inatteignables**.

⚠ **C'est exactement ce que l'étape 4 devait produire**, et elle l'obtient **sans toucher au code** — donc sans le risque qu'elle portait.

⚠ **NE PAS les supprimer pour autant.** Elles restent en veille avec le reste du module : les effacer casserait la réactivation. **Le proxy `urgence` n'est plus servi ; il n'est pas mort.**

⚠ **Ce qui reste vrai de l'étape 4** : le jour où les Dernières Clés reviendraient au public, ces trois fonctions **redeviendraient servantes**, et il faudrait alors les brancher sur le moteur — pas sur `urgence`. La dette n'est pas éteinte, elle est **dormante**, comme le module.

## Anti-survente & modèle de paiement cible (22 août 2026)

### ✅ Couche 1 — la survente est fermée en base

**Découvert en cherchant si `demande-reservation` consultait une disponibilité. La réponse était non — et personne ne le savait.** Ni l'Edge Function (ses trois `ERR_INDISPO` couvrent le château, l'appartenance de la chambre et le module, jamais les dates), ni la base (aucune contrainte de chevauchement) n'empêchaient de vendre deux fois la même nuit.

Contrainte d'exclusion partielle posée sur `reservations` — `migrations/2026-08-22-anti-survente.sql`, appliquée sur `lcc-prod`, test **6/6** :

```sql
EXCLUDE USING gist (chambre_id WITH =, daterange(date_arrivee, date_depart, '[)') WITH &&)
WHERE (status IN ('confirmed', 'completed'))
```

⚠ **`pending` N'OCCUPE PAS — décision produit.** Plusieurs demandes peuvent viser les mêmes dates ; **la confirmation tranche**. Faire occuper `pending` aurait supprimé l'arbitrage du châtelain et **gelé l'inventaire** : `repondre_demande` refuse de retraiter une demande, et **aucune expiration automatique des `pending` n'existe**.

⚠ **Borne `'[)'`** — arrivée incluse, départ exclu. Sans elle, un départ le 10 et une arrivée le 10 seraient en conflit alors que la chambre est **libre** ce soir-là.

**Il reste deux couches**, dans des chantiers distincts : un contrôle lisible dans `demande-reservation` (le `23P01` brut ne doit jamais atteindre un visiteur), et le traitement de la violation dans `repondre_demande` côté châtelain. ⚠ Aucune ne remplacera la contrainte : entre une lecture applicative et son écriture subsiste une fenêtre de course que **seule la base ferme**.

### ⚠ MODÈLE DE PAIEMENT CIBLE — autorisation à la demande, capture à la confirmation

**À ne pas coder maintenant** (dépend de l'immatriculation Atout France), mais **à décider maintenant** : c'est la bonne façon de brancher Stripe le moment venu, et ce n'est pas « un bouton payer ».

```
le voyageur saisit sa carte à la DEMANDE
   → Stripe AUTORISE : empreinte, montant pré-bloqué, RIEN n'est encaissé
   → le châtelain CONFIRME
      → SEULEMENT ALORS : capture, encaissement réel
   → refus, ou pas de réponse dans le délai
      → l'autorisation est RELÂCHÉE — le voyageur n'est jamais débité
```

**Ce modèle réconcilie les trois contraintes du projet** :

- **l'arbitrage du châtelain est préservé** — cohérent avec l'option B de l'anti-survente ci-dessus, et avec ce qui est annoncé aux associés ;
- **le voyageur s'engage sérieusement** — la carte est saisie, les demandes fantaisistes disparaissent ;
- **rien n'est encaissé sans confirmation.**

Stripe le gère nativement (`authorize` + capture différée). ⚠ **Ne pas partir sur un paiement instantané bloquant** : il retirerait au châtelain le choix entre deux candidats, et casserait le modèle établi au sous-audit B.

### ⚠ CHANTIER À AUDITER — l'espace châtelain affiche-t-il les demandes ?

Le châtelain **reçoit un email** à chaque demande. Mais **la demande apparaît-elle dans son tableau de bord**, pour qu'il réponde depuis l'interface plutôt que depuis sa boîte mail ?

**À auditer en lecture seule**, plus tard. Ne pas creuser avant : c'est un chantier, pas une note.

### Les trois emails transactionnels — comportement VOULU

Une demande déclenche **trois emails vers trois destinataires distincts** : le **client**, la **supervision LCC**, le **châtelain**. ⚠ **Ce n'est pas une duplication** — Matthieu les reçoit tous les trois en test parce qu'il porte les trois rôles.

**Aucun n'est à supprimer sans mesure.** Une revue de leur contenu et de leur pertinence est possible plus tard (l'email de supervision doit-il être systématique ?), mais elle devra s'appuyer sur l'usage réel.

⚠ Rappel de la dette du sous-audit C : **l'expéditeur est une adresse Gmail personnelle en dur** (`send-email:147`). À corriger au passage au domaine LCC dans Brevo.

### ⚠ CHANTIER À PART — l'email de notification au châtelain est à revoir

**Deux défauts mesurés sur le mail réellement reçu au test du 23 août 2026.** Ce n'est pas une hypothèse de lecture : c'est le contenu du message arrivé dans la boîte.

#### 1. Le CTA est FAUX

> *« Vous pouvez répondre directement au visiteur à l'adresse indiquée ci-dessus. »* — `send-email/index.ts:328`

⚠ **Le châtelain ne répond PAS par email.** Il répond depuis son **espace châtelain** (`repondre_demande`, accepter/refuser), ou à terme depuis son PMS. Suivre ce conseil **court-circuiterait tout le circuit** : la demande resterait `pending` indéfiniment, aucune réservation ne serait enregistrée, et **la commission serait perdue**.

⚠ Et le défaut se double d'un autre, réparé le 22 août mais qui montre que ce chemin n'a jamais été exercé : le bouton « Refuser » du tableau de bord ne fonctionnait pas non plus. **Le châtelain n'avait donc, en pratique, aucune voie correcte** — et l'email lui en indiquait une mauvaise.

#### 2. Fuite d'intermédiation

> `ligneFait("Contact", escapeHtml(p.emailClient))` — `send-email/index.ts:317` (et `:337`)

Le mail affiche **l'adresse email du client**. Cela contredit le rôle d'intermédiaire de LCC — et le dépôt le sait déjà : `reservations_chatelain_view` masque délibérément le contact client, et `chatelainService` commente *« la vue n'expose ni user_id ni contact client (LCC intermédiaire) »*. **L'email défait ce que la vue protège.** Un châtelain pourrait contourner la plateforme dès la première demande.

#### Décisions produit à trancher (Matthieu) — hors du chantier 2.5

- **Quel CTA ?** Un lien vers l'espace châtelain semble l'évidence, mais il suppose que le châtelain ait un compte et sache s'y connecter.
- **Masquer ou limiter le contact client ?** Prénom seul ? Rien du tout ? ⚠ Attention : le châtelain a des raisons légitimes de joindre un voyageur *une fois le séjour confirmé* — la question n'est pas la même avant et après.
- **Cohérence avec les trois emails transactionnels** : celui du client et celui de supervision partagent le même gabarit de faits. Toucher l'un demande de relire les trois.

#### Où c'est écrit (localisé le 23 août, lecture seule)

```
supabase/functions/send-email/index.ts:465   demande_chatelain -> gabaritChatelain
supabase/functions/send-email/index.ts:317   ligneFait("Contact", …emailClient)
supabase/functions/send-email/index.ts:328   le CTA fautif
```

`emailClient` vient du `payload` écrit par `demande-reservation` (§8) dans `email_log`. ⚠ **Deux endroits à traiter ensemble** : retirer l'affichage sans retirer le champ du payload laisserait la donnée voyager pour rien ; retirer le champ sans vérifier les autres gabarits casserait l'email de supervision, qui l'utilise légitimement.

### ⚠ QUESTION PRODUIT à trancher plus tard — le motif de refus

**`repondre_demande` est la seule des quatre RPC d'annulation à ne prendre aucun motif.** Les trois autres — `annuler_ma_reservation`, `admin_annuler_reservation`, `admin_forcer_statut` — acceptent un `p_motif text DEFAULT NULL` qu'elles écrivent dans `reservations.cancellation_reason`. Le châtelain, lui, refuse sans pouvoir dire pourquoi.

Deux choses à décider ensemble, **hors du chantier `cancelled_at`** (qui ne change pas la signature) :

1. **Le châtelain doit-il pouvoir motiver son refus ?** Cela suppose un champ dans la modale de confirmation de `ChatelainDashboard` et un paramètre de plus sur la RPC.
2. **Le motif doit-il atteindre le voyageur ?** ⚠ La réponse des trois autres RPC est **non**, et elle est écrite sur place : *« Le motif n'entre pas dans l'email — il reste en base pour le support »*. Texte libre non relu ; le rappeler avant de trancher autrement.

⚠ **La colonne est LISIBLE PAR LE CLIENT**, même si rien ne l'affiche aujourd'hui : `reservations_client_view` l'expose (`policies.sql:206`) et la vue est en `GRANT SELECT … TO anon, authenticated` avec `security_invoker`. Tout ce qu'on y écrit doit donc être rédigé comme si le voyageur pouvait le lire. Vaut aussi pour le marqueur d'`admin_forcer_statut`.

⚠ Le jour où un paramètre de motif sera ajouté, la forme est déjà établie par `admin_forcer_statut` : `COALESCE(p_motif, '<marqueur>')` — le motif humain s'il existe, la provenance à défaut.

### ⚠ LE REFUS N'A JAMAIS FONCTIONNÉ — réparé le 22 août 2026

**Depuis le 21 juillet, le bouton « Refuser » du tableau de bord châtelain était inopérant.** `repondre_demande` posait `status = 'cancelled'` sans `cancelled_at`, ce que `reservations_cancelled_coherent` (présente depuis le schéma initial du 8 mai) refuse en `23514`. Le châtelain lisait « Réessayez dans un instant » et pouvait réessayer indéfiniment.

⚠ **Trouvé par un test, pas par un incident** — le test 4 de la couche 3 anti-survente, écrit pour tout autre chose. Personne ne l'avait vu parce qu'**aucun châtelain n'avait encore refusé une demande**.

⚠ **La mesure qui a tranché, et la leçon qui va avec.** Une ligne `cancelled` existait en base avec `cancelled_at` renseigné, ce qui donnait à croire que le refus fonctionnait. **C'était une tautologie** : le CHECK interdit qu'il en soit autrement, quel que soit l'écrivain. Le vrai discriminant était `email_log` — `sejour_refuse` = **0**, contre `sejour_confirme` = **2** — un type d'email qu'aucune autre fonction ne produit. **Ne jamais conclure d'une colonne dont une contrainte garantit déjà la valeur.**

#### ⚠ RESTE À FAIRE — le test manuel du refus, dès qu'un accès châtelain sera disponible

La mécanique est prouvée **jusqu'à la RPC** : `supabase/tests-repondre-demande-anti-survente.sql` appelle la vraie `repondre_demande(…, 'refuser')` sous l'identité d'un châtelain, 5/5 en base de production. **La chaîne front, elle, a été lue et corrigée mais jamais exercée** — bouton de `ChatelainDashboard` → `chatelainService.repondreDemande` → RPC.

Il manquait au moment du commit un accès châtelain **et** une demande en attente sous la main. **Non bloquant** : vérification de confort, le maillon incertain est le plus court des trois. À faire au premier accès.

⚠ Même famille que le tunnel d'inscription (cf. § À VALIDER AVEC UN COMPTE DE TEST) : un chemin câblé en raisonnant depuis le code, jamais vu tourner.

## La frontière : ce qui marche, ce qui manque pour encaisser (sous-audit B, 22 août 2026)

### FAIT — et en service, pas en maquette

Le **flux de demande de séjour** fonctionne de bout en bout :

```
visiteur SANS COMPTE  →  Edge Function demande-reservation (service_role, hors RLS)
                         revalide tout · recalcule le prix ET la commission SERVEUR
                      →  demande durable en base
                      →  châtelain accepte / refuse via RPC repondre_demande
```

**Neuf réservations réelles en base** au 22 août : 5 `confirmed`, 3 `pending`, 1 `cancelled`.

⚠ **La mécanique économique est CODÉE**, sans paiement : le taux (`chateau_modules.commission_pct_negociee`) n'est **jamais exposé au front** et la commission est recalculée côté serveur — *« un montant venu du client serait falsifiable »*. Écran `/admin/commissions` + RPC `admin_set_commission`, appelée avec le **JWT de l'admin** (jamais en `service_role` : la garde interne lit `auth.uid()`).

⚠ **Ne pas se fier à `BookingFlowPlaceholder`** (9 lignes, route `/reserver/:slug`) : c'est un **stub sur une route morte**. Le vrai flux est câblé dans `VitrineChateau.jsx:334`. Cette confusion a fait classer la zone « placeholder » à tort lors du cadrage.

### MANQUE pour encaisser — trois choses, une seule est du développement

1. **Stripe** — le seul vrai chantier dev. 0 dépendance, 0 code, 0 clé ; `stripe_payment_intent_id`, `stripe_charge_id`, `payout_status`, `payout_sent_at` sont **déclarées et jamais écrites**.
2. **Atout France** — **bloqueur LÉGAL, hors du code** : immatriculation d'opérateur de voyages, préalable au *droit* d'encaisser. Délai subi. ⚠ Les commentaires du schéma l'empilent dans la même phrase que Stripe (« Stripe non branché, immatriculation Atout France non faite ») : **ce sont deux natures différentes**, à ne pas confondre dans un plan de charge.
3. **Disponibilités réelles** — le **lien dur** du sous-audit A.

### ⚠ PIÈGE — `mode_paiement = 'en_ligne'` rendrait un château NON réservable

```sql
CHECK (mode_paiement IN ('sur_place', 'en_ligne'))   DEFAULT 'sur_place'
```

La valeur est **autorisée en base** mais **rejetée par le code** : `demande-reservation:176` n'accepte qu'un château `publie` **et** `sur_place`. Basculer un château en `en_ligne` aujourd'hui le sortirait donc du parcours, en silence.

**C'est à IMPLÉMENTER, pas à basculer.** Les sept demeures sont en `sur_place`.

## Backend Edge — il fonctionne ; ce qui manque, c'est le filet (sous-audit C, 22 août 2026)

**1 194 lignes** en production : `demande-reservation` (538), `send-email` (640), `ping` (16).

⚠ **Trois trous avaient été relevés ; DEUX SONT TOMBÉS à la vérification hors dépôt.** Le cron existe, les emails arrivent. **Il ne reste qu'un défaut réel : l'absence de tests et de déploiement versionné.** Lire cette section en entier avant d'en citer un point — deux de ses alertes initiales étaient fausses, et elles sont conservées barrées pour que la leçon serve.

### Ce qui est bon, et qu'il faut savoir avant d'y toucher

- **Aucun secret exposé.** Balayage `eyJ…` / `sk_live` / `sk_test` / `xkeysib-` / `Bearer <token>` sur `supabase/functions/` et `src/` : **zéro**. Aucun secret journalisé non plus — `send-email:488` journalise l'**absence** du header, jamais sa valeur.
- **Les deux fonctions sensibles sont protégées, et le raisonnement est juste.** `demande-reservation` tourne en `service_role` et **revalide tout** (le visiteur n'a pas de session : `signInWithOtp` n'en crée pas de synchrone). `send-email` est derrière une barrière `X-Internal-Secret` posée **avant toute lecture, DB ou appel Brevo** — parce que *« l'anon key est publique, donc `verify_jwt` seul ne discrimine rien »*.
- **Le rate-limit est fermé en amont**, pas dans `send-email` : 3 demandes / 15 min par IP et 2 `pending` par compte, dans `demande-reservation`. `send-email` n'étant pas exposée, elle n'en a pas besoin.
- **Les états partiels sont traités, et c'est le meilleur passage du backend.** La demande est durable **avant** tout email ; `email_log` est écrit **synchrone avant le return** ; *« RIEN ci-dessous ne peut faire échouer le return »*. Reprise par `claim_emails` — `UPDATE … RETURNING` atomique, `tentatives` incrémenté **au claim et non à l'envoi** (une ligne qui tue le worker brûle son budget au lieu de boucler), reprise des drains morts à 10 min, plafond 5.

⚠ **Ne pas « simplifier » ces mécanismes sans avoir lu pourquoi ils existent.** Chacun répond à un incident ou à un raisonnement écrit sur place.

### 🟠 TROU 1 — REQUALIFIÉ · la délivrabilité tient ; reste l'image et le domaine

```js
// supabase/functions/send-email/index.ts:147
const SENDER = { name: "Les Clés du Château", email: "matthieu.de.calbiac@gmail.com" };
```

⚠ **L'AUDIT AVAIT CONCLU TROP VITE, ET LA MESURE L'A CORRIGÉ.** J'avais classé ce point 🔴 en raisonnant depuis cette seule ligne : « `gmail.com` publie une politique DMARC, donc l'envoi ne s'aligne pas, donc risque de spam ». Mesure de Matthieu le 22 août, logs Brevo du 30 juillet — **98 événements** :

```
statuts        Délivré · Ouvert · 1re ouverture     — TOUS positifs
spam           0        bounce  0        rejet  0
expéditeur     matthieu.de.calbiac@11712207.brevosend.com   (domaine Brevo VÉRIFIÉ)
```

**Brevo habille l'envoi avec son propre domaine authentifié.** L'adresse `gmail.com` du code n'est pas l'expéditeur technique réel : le risque DMARC que la lecture laissait craindre **ne se matérialise pas**. La délivrabilité tient aujourd'hui, et c'est mesuré, pas supposé.

**Ce qui reste — 🟠, non bloquant, lié au nom de domaine :**

1. **Image de marque.** Les emails partent en `@brevosend.com` / `@gmail.com`, pas en `@lesclesduchateau.fr`. Pour une plateforme patrimoniale qui vend des séjours d'exception, l'écart se voit.
2. **Robustesse à l'échelle.** Passer sur un domaine LCC authentifié (SPF/DKIM/DMARC) est la bonne pratique **avant gros volume** — pas une urgence à 98 événements.

**FIX** : configurer le domaine LCC comme expéditeur authentifié dans Brevo, **au moment du passage en public**. Le `SENDER` en dur de `send-email:147` sera alors à remplacer par l'adresse du domaine.

⚠ **Une deuxième leçon, la même semaine que celle du cron.** Deux fois de suite, une conclusion tirée du seul code s'est révélée fausse une fois l'infrastructure interrogée. Le code dit ce qu'il *demande* ; il ne dit pas ce que la plateforme en *fait*. Pour tout ce qui touche Brevo, Supabase ou Vercel : **mesurer côté service avant de conclure**.

### ✅ TROU 2 — LEVÉ · le balayage `pg_cron` existe, hors du dépôt

**L'audit avait relevé une absence qui n'en était pas une.** Aucun `cron.schedule` ni `CREATE EXTENSION … cron` dans les 46 migrations — c'est exact, et cela ne prouvait rien. Mesure de Matthieu le 22 août, `SELECT * FROM cron.job` :

```
jobname   drain-email-log
schedule  */2 * * * *        (toutes les 2 minutes)
active    true
appelle   send-email, avec X-Internal-Secret tiré du VAULT
```

**Le mécanisme de reprise de la file email fonctionne.** Le claim atomique, les tentatives bornées et la reprise des drains morts ont bien le déclencheur pour lequel ils ont été écrits. Les trois commentaires qui parlaient du balayage « comme d'un acquis » **disaient vrai**.

⚠ **LA LEÇON, ET ELLE VAUT POUR TOUT AUDIT FUTUR DE CE PROJET.** Une partie de l'infrastructure vit **côté Supabase** — `pg_cron`, le Vault, les secrets des Edge Functions — et elle est **invisible à toute lecture du dépôt**. Un `grep` qui ne trouve rien n'y démontre pas une absence : il démontre que la chose n'est pas *dans le code*. Ne jamais conclure « ça n'existe pas » sur une zone dont on sait qu'elle est partiellement hors dépôt — **interroger la base ou le Dashboard**, comme pour les données.

### 🟠 Dette mineure — le cron n'est pas versionné

Il vit dans Supabase, **pas dans les migrations**. Une **recréation du projet à zéro ne le recréerait pas**, et la file email resterait sans balayage — sans que rien ne le signale, puisque le nudge continuerait de fonctionner sur le chemin nominal.

Même famille que le trou 3 : le backend n'a pas de déploiement versionné. **Candidat au plan de remédiation, pas urgent.**

### 🔴 TROU 3 — PROUVÉ · zéro test, zéro déploiement reproductible

```
tests sur supabase/functions/   aucun fichier
déploiement en CI               aucun step
```

**1 194 lignes en production, déployées à la main, sans filet.** Le contraste est net : **front 288 tests, backend 0**. Aucune régression n'y serait détectée.

`config.toml` est posé à la main (sans `supabase init`, pour ne pas écraser `seed.sql`), et le lien au projet distant vit dans `supabase/.temp`, **gitignoré** : le déploiement dépend donc d'un **état local non versionné**.

**Candidat chantier de remédiation** : tests backend + déploiement reproductible — et **y inclure le cron** (cf. dette ci-dessus) ainsi que l'inventaire des secrets, qui souffrent du même mal : l'infrastructure réelle n'est pas décrite par le dépôt.

## Supabase — dérive du schéma & sécurité RLS (sous-audit D, 22 août 2026)

### La dérive : DEUX tables, pas neuf

⚠ **Le chiffre du cadrage était faux.** J'avais listé les tables créées par migration et affirmé qu'elles étaient absentes de `schema.sql` **sans faire la comparaison**. La voici :

```
tables déclarées dans schema.sql   21
tables créées par migration         9

absentes de schema.sql   →   messages · paliers                              (2)
rétro-portées            →   amenity_equipements · chateau_contacts          (7)
                             chateau_personnages · demande_rate_limit
                             email_log · equipements · personnages
```

**Sept sur neuf ont été rétro-portées** : la convention « `schema.sql` = état désiré final » est une discipline **observée**, pas abandonnée. Les 23 tables existent réellement en base, `messages` et `paliers` comprises.

**`schema.sql` est tenu à 91 % — ni mort, ni mensonger : « presque juste, donc trompeur ».** C'est plus dangereux qu'un fichier manifestement obsolète, auquel personne ne se fierait. Le risque concret n'est pas « des tables manquent », c'est qu'un lecteur **croie la référence complète** : `paliers` porte les niveaux du Club (réductions, surclassements) et elle est requêtée par `clubService.js:18`.

**✅ FAIT le 22 août 2026** — les deux tables sont rétro-portées (`schema.sql`, section **8 bis**), et le garde-fou est posé.

`scripts/validate-schema.cjs` · `npm run validate:schema` · branché **dans les deux jobs CI**, en fail-fast **avant l'installation de Playwright** (comme `validate:chateaux`, PR #12) : une dérive coûte cinq secondes, pas huit minutes.

**Preuve — le garde-fou a rougi avant de virer au vert**, et rougit encore sur une régression :

```
avant le rétro-port   ✗ 2 tables : messages (2026-07-09) · paliers (2026-07-04)   EXIT 1
après                 ✓ 23 déclarées, aucune dérive                               EXIT 0
paliers renommée      ✗ 1 table : paliers                                          ← détecte le retour
```

⚠ **Les définitions viennent de la BASE, pas des migrations.** `paliers` est touchée par **trois** migrations (création, GRANT, accents) : recopier la première aurait produit un état faux. Extraction par `pg_attribute` / `pg_constraint` / `pg_indexes` / `pg_policies` / `role_table_grants`. **Fidélité y compris sur ce qui manque** : aucune des deux tables ne porte de `COMMENT` en base, aucun n'a donc été inventé.

⚠⚠ **CE QUE LE GARDE-FOU NE VOIT PAS.** Il compare des **noms de tables**, pas des **structures**. Une colonne ajoutée par `ALTER TABLE` sans être reportée passera au vert. Il ferme la dérive **grossière** — celle qu'on a subie — pas la fine. Ne pas en conclure « `schema.sql` est à jour », seulement « aucune table entière ne manque ».

⚠⚠ **NE PAS RÉGÉNÉRER `schema.sql` depuis la base.** Un `db dump` serait vrai par construction mais **détruirait les 64 `COMMENT` rédigés à la main** — c'est là qu'est écrit « `en_ligne` DÉCLARÉ mais NON IMPLÉMENTÉ (Stripe non branché, immatriculation Atout France non faite) », qui a fondé le sous-audit B. Cette documentation est irremplaçable.

*Hygiène, candidat au plan de remédiation. Non urgent.*

### Sécurité RLS — bilan globalement BON (mesuré en base, pas déduit)

⚠ **Ces résultats viennent de requêtes SQL lancées par Matthieu sur la base réelle.** L'audit depuis les fichiers ne pouvait pas les établir : les fichiers *déclarent* l'activation, seule la base dit si elle *est* active. Un refus anon (401) ne prouve rien — la défense en profondeur du Sprint S1 fait qu'un GRANT absent renvoie 42501 **avant** toute évaluation RLS.

- ✅ **RLS activée sur les 23 tables** (`relrowsecurity = true` partout), les sensibles comprises : `reservations`, `users`, `email_log`, `messages`, `chateau_contacts`, `paliers`. **Le piège « policy écrite mais RLS désactivée » n'existe pas ici.**
- ✅ **Anon n'a aucun droit réel** de lecture ou d'écriture sur les tables sensibles — seulement `TRIGGER` / `TRUNCATE` / `REFERENCES`, inoffensifs.
- ✅ **`email_log` et `demande_rate_limit` : RLS active + 0 policy = verrouillage total.** C'est voulu et c'est bon — réservé au backend en `service_role`. ⚠ Ne pas « corriger » cette absence de policy en croyant à un oubli.
- ✅ **Les fonctions admin / châtelain `SECURITY DEFINER` sont toutes gardées** (`is_admin` / `is_chatelain*` / `auth.uid()`).
- ✅ **`handle_new_user`** est un trigger : pas de garde nécessaire, sûr.

### ⚠ Le seul point à durcir — gravité FAIBLE, avant ouverture publique

**`count_sejours_confirmes` et `palier_du_membre`** sont `SECURITY DEFINER`, prennent **`p_user_id` en paramètre**, et sont **`GRANT EXECUTE` à `PUBLIC` sans garde interne**.

Conséquence : un membre — ou un anonyme — connaissant un `user_id` (UUID) pourrait lire **le nombre de séjours et le palier Club d'un AUTRE membre**.

**Fuite mineure** : ni email, ni nom, ni donnée de paiement. Mais c'est **le seul écart au standard du projet** — toutes les autres `SECURITY DEFINER` sont gardées.

**FIX simple, quelques lignes**, au choix : garde `p_user_id = auth.uid()`, ou retrait de l'`EXECUTE` à `PUBLIC`, ou appel serveur uniquement.

#### ✅ CORRIGÉ le 22 août — migration appliquée et validée en production

`supabase/migrations/2026-08-22-garde-fonctions-club.sql`, appliquée sur `lcc-prod`.

La garde `(p_user_id = auth.uid() OR public.is_admin())` est posée dans **les deux** fonctions — garder la seule appelante aurait laissé `count_sejours_confirmes` directement appelable. `EXECUTE` retiré à `PUBLIC`, accordé à `authenticated` seul.

**Preuve — `supabase/tests-garde-club.sql`, 7/7 PASS en base de production :**

```
SETUP  auth.uid() posee                                    PASS
1      membre A -> count(A)          3 sejours             PASS  ← corps metier inchange
2      membre A -> palier(A)         Habitue [+ imbrique]  PASS
3      membre A -> count(B)          42501                 PASS  ← la fuite est fermee
4      membre A -> palier(B)         42501                 PASS  ← la fuite est fermee
5      anon -> count(A)              42501                 PASS
6      anon -> palier(A)             42501                 PASS
```

`PUBLIC` re-mesuré comme retiré, `authenticated` seul conservé. **`/club` vérifié en production** sur `lcc-black.vercel.app` : palier « Habitué » et séjours s'affichent, aucune régression. `clubService.js` **n'a pas été touché** — il passait déjà `user.id`, et c'était le meilleur indice que la garde avait la bonne forme.

⚠ **Le test est VERSIONNÉ et rejouable.** Un correctif de sécurité sans test qui le prouve dans les deux sens n'en est pas un.

#### ⚠ Ce qui avait été réévalué le 22 août — le déclencheur était DÉJÀ atteint

La première rédaction disait « tant que le Club ne compte que des comptes de test, le risque est nul ; il devient réel au premier membre authentique ». **La mesure en base a démenti la prémisse** :

```
8 clients · 1 membre_club · 1 chatelain · 1 admin
1 membre à 3 séjours confirmés  →  palier « Habitué » franchi
```

**Ce ne sont pas que des comptes de test**, et un palier a réellement été franchi. Le déclencheur que la note attendait est donc **techniquement passé**.

Le risque **concret** reste faible — ces comptes sont l'entourage de test, et la fuite se limite au palier Club et au nombre de séjours. Mais l'échéance n'est plus « un jour » :

> **→ C'ÉTAIT LE RANG 1 DE LA LISTE DE REMÉDIATION. ✅ FAIT le 22 août** — cf. section ci-dessus. Il restait à faire « avant d'ouvrir à de vrais inconnus », pas avant « les vrais membres » : ils étaient déjà là.

⚠ **La leçon, une de plus** : une note de dette dont le déclencheur est une hypothèse (« tant qu'il n'y a que des comptes de test ») vieillit mal. La base change sans que la note le sache. **Dater et mesurer les prémisses**, comme pour tout le reste.

## Club & paliers — le plus sain des cinq (sous-audit E, 22 août 2026)

**Rien à réparer.** Zéro code mort, données réelles, palier infalsifiable, cas limite couvert par la donnée, aucun écart à la stratégie. C'est le seul des cinq sous-audits qui ne produit pas de correctif.

### La mécanique — le palier n'est JAMAIS stocké

`getEspaceClub(userId)` agrège quatre lectures en parallèle : la grille `paliers`, la RPC `count_sejours_confirmes`, la RPC `palier_du_membre`, et `reservations` (filtrées par RLS). La progression est dérivée côté front **à partir de données serveur**.

⚠ **Le palier est dérivé à la lecture, jamais écrit.** Une colonne « palier » aurait divergé du compte réel de séjours à la première anomalie. C'est aussi ce qui rend le Club **insensible à une inscription incomplète** : rien n'a besoin d'être posé au moment de créer le compte.

### La grille — mesurée en base, pas lue dans un fichier

```
rang  id          nom         seuil  réduc  surclass  nuit  newsl  avantages
0     hote        Hôte          0      0 %    non      non   non    2
1     habitue     Habitué       2     10 %    non      non   non    2
2     familier    Familier      5     20 %    OUI      non   OUI    4
3     compagnon   Compagnon     9     50 %    OUI      OUI   OUI    4
```

**Rangs contigus 0-1-2-3, seuils croissants, avantages qui s'empilent.** Aucun placeholder.

**Le cas « 0 séjour » est couvert par la DONNÉE, pas par du code défensif** : `seuil_sejours = 0` sur `hote` satisfait la condition de `palier_du_membre`, donc aucun membre ne se retrouve sans palier. Le front garde tout de même sa ceinture (`palierActuel?.nom || "Hôte"`) — redondante aujourd'hui, utile si `hote` disparaissait un jour.

### Le reste, en bref

- **8 composants sur 8 vivants** (`PageClub` monté par `App.jsx` sur `/club` derrière `RequireAuth`, les sept autres montés par lui). **Zéro orphelin** — contrairement à `OngletsNiveau1`, `Services.jsx` ou la chaîne des ambiances.
- **Entièrement câblé sur la base, aucun mock.** Les seules occurrences de « placeholder » sont des attributs HTML de champs de saisie.
- **Zéro écart à la stratégie « Club gratuit »** : recherche `abonnement` / `cotisation` / `payant` / `subscription` → aucun résultat. Fidélité à l'usage, jamais au paiement.
- **Parcours d'inscription câblé de bout en bout** (`/inscription` → `lcc_auth_next` → email → `/auth/callback` → `/completer-profil`) mais **jamais validé E2E** — constat de `CLAUDE.md` inchangé. ⚠ Le Club n'y ajoute **aucun risque** : palier dérivé à la lecture, aucune écriture à l'inscription.

### Deux points, non bloquants

- ⚠ **PRODUIT (Dimitri) — la réduction de 50 % au palier `compagnon`.** Elle engage lourdement la marge sur les membres **les plus fidèles et les plus actifs**, alors que la commission LCC est déjà faible (8-12 %). Décision arbitrée, ou valeur de départ posée pour peupler la table ? **À trancher.**
- ⚠ **TECH mineur — `calculerProgression` suppose des rangs CONTIGUS** (`paliers.find(p => p.rang === rangActuel + 1)`). Ajouter un palier en laissant un trou de rang **casserait la progression silencieusement** : pas d'erreur, seulement « palier max atteint » affiché à tort. Sans effet aujourd'hui (0-1-2-3). **À savoir avant d'éditer la grille.**

## Onboarding d'un château — outillé et dégressif (sous-audit F, 22 août 2026)

**C'est la réponse à « la charge va exploser avec le nombre ». Elle est non.**

### Ce qui est outillé — création de A à Z, sans SQL

| écran | rôle |
|---|---|
| `AdminChateauNouveau` (83 l.) | crée la **coquille** : nom + slug auto-généré, éditable |
| `AdminChateauEdition` (871 l.) | **tout le reste — 17 sections** |

Identité · Localisation · Éditorial · Propriétaires · Média & thème · Mise en avant · **Chambres** · **Chronologie** · **Alentours** · **Équipements** · Histoire des lieux · **Galerie images** · trois blocs d'accroches · Chiffres clés (lecture seule) · Zone dangereuse.

**Les tables filles sont éditables depuis l'UI. Aucun SQL manuel n'est requis pour le contenu.** Seule la commission passe par un écran séparé (`/admin/commissions` + RPC `admin_set_commission`).

### Le filet de validation — 43 règles, en CI

`scripts/agents/validation-donnees.cjs` (24 ko) tourne à chaque run QA. **Ce n'est pas un lint, c'est un filet de CONTENU** :

```
UNICITÉ      id / slug / nom dupliqués · coordonnées identiques (copier-coller ?)
OBLIGATOIRE  slug kebab-case · région · département · chambres (nom, prix, capacité,
             superficie, description) · propriétaires · images ≥ 2
GÉOGRAPHIE   lat/lng dans les bornes France · cohérence région ↔ département
PRIX         prixBarre > prix · réduction ∈ [0,100] · réduction RECALCULÉE vs déclarée
NARRATION    accroche ≥ 20 (avert. < 40) · histoire ≥ 100 (< 200) · description ≥ 80
TYPO         apostrophe droite → ’ · guillemets droits → « » · double espace
PLACEHOLDER  détection de texte factice resté en place
IMAGES       chaque URL testée ; toutes inaccessibles = ERREUR
```

⚠ **C'est ce filet qui rend l'échelle tenable** : il relit à notre place. Sans lui, c'est la relecture manuelle qui aurait explosé avec le nombre — pas la saisie.

### Les images — Supabase Storage, mesuré

`BoutonTeleverser` → `uploadImage` → bucket `chateaux-images` → URL publique écrite dans le champ.

```
Storage 23 · /public local 5 · externe 0     (URLs, sur les publiés)
bucket : 132 fichiers · 30 Mo · 0,03 % du quota Pro (100 Go)
```

Les cinq châteaux ajoutés après la mise en place du téléversement sont **tous en Storage** ; les deux en `/public` sont les historiques. ✅ **Aucune inquiétude de quota avant des années.**

### La charge : fixe vs outillable

**Coût FIXE incompressible — le métier** : rédiger l'accroche, l'histoire, la description ; obtenir, trier et optimiser les photos. C'est précisément ce qu'on **ne veut pas** automatiser.

**Coût OUTILLABLE — déjà outillé** : saisie, upload, validation, publication.

**Pourquoi c'est dégressif** : l'apprentissage des 17 sections ne se paie qu'une fois ; les 43 règles rattrapent les oublis sans relecture ; les référentiels (`equipements`, régions, modules) se mutualisent ; sept histoires écrites donnent une forme, un rythme, une longueur cible — la page blanche est le coût du premier.

**Trois outillages qui allégeraient la part fixe**, par rentabilité :
1. **Import CSV/JSON** des champs structurés (chambres, alentours, timeline) — aujourd'hui saisis un par un. *Le plus rentable.*
2. **Optimisation d'image automatique au téléversement** (AVIF, redimensionnement) — le bucket accepte aujourd'hui ce qu'on lui donne.
3. **Pont depuis la prospection** — évite une re-saisie, pas la rédaction.

### ⚠⚠ DÉCOUVERTE 1 — IL Y A 13 CHÂTEAUX EN BASE, PAS 7. Correction majeure.

**Les six anciens mocks n'ont jamais été supprimés : ils ont été MIGRÉS en base**, très probablement avec un `statut` autre que `publie` — `chantilly`, `fontainebleau`, `pierrefonds`, `vaux-le-vicomte`, `ferte-saint-aubin`, `pierreclos`.

⚠ **MA MÉTHODE DE MESURE ÉTAIT FAUSSE, ET ELLE A CONTAMINÉ PLUSIEURS CONCLUSIONS DU 22 AOÛT.** J'interrogeais PostgREST **en `anon`**, or la policy `chateaux_select_public` filtre `statut = 'publie'`. Je lisais donc « 7 châteaux **publiés et visibles d'un anonyme** » et j'écrivais « 7 châteaux **en base** ». Ce n'est pas la même phrase.

**Ce qui doit être corrigé en conséquence :**

- La dette « Fontainebleau orphelin », que j'ai marquée **CADUQUE au motif qu'il « n'existe plus en base »** — c'est **faux**. Il existe, non publié. La dette reste caduque pour d'autres raisons (`data/chateaux.js`, `idsCartes`, `ChateauModal` ont bien disparu), mais **pas pour celle-là**.
- Le sous-audit D affirmait que `vaux-le-vicomte` « n'existe pas ». **Il existe, non publié.**
- ⚠ Le commentaire de `tests/e2e/s2-alpha-1-5-onglets-vitrine.spec.cjs` (Test 8, commit `d6225de`) écrit que Vaux « n'existe tout simplement plus en base ». **Le test reste JUSTE** — `getChateauBySlug` filtre sur `statut`, rend `null`, la 404 s'affiche — mais **sa justification écrite est fausse**. À corriger au prochain passage : la bonne formulation est « non servi », pas « inexistant ».
- Partout où ce fichier dit « les 7 demeures », lire **« les 7 demeures PUBLIÉES »**.

**Mesuré — le catalogue exact au 22 août : 7 publiés + 6 brouillons.**

```
PUBLIÉS (servis)      blanc-buisson · bonnemare · la-riviere · saint-paterne
                      boulay-morin · benays · briottieres

BROUILLONS (en base,  chantilly · ferte-saint-aubin · fontainebleau
NON servis)           pierreclos · pierrefonds · vaux-le-vicomte
```

**Les mocks n'ont pas été supprimés : ils ont été passés en brouillon.** Le filtre `statut = 'publie'` les masque au public — c'est cohérent, et c'est le comportement voulu.

⚠ **Les deux formulations sont vraies, mais leurs portées diffèrent** : « `vaux-le-vicomte` n'est pas servi » est exact ; « il n'existe pas en base » ne l'est pas. Cette confusion vient de ma méthode de mesure, pas d'un changement de la base. **Écrire « non servi » ou « non publié », jamais « inexistant ».**

### 🔴 DÉCOUVERTE 2 — COMMISSIONS À CORRIGER (revenu direct)

```
chateau-de-la-riviere   module B   0.00 %   est_actif = true   ⚠ PUBLIÉ  → rapporte 0 € si réservé
chantilly               module B   0.01 %                         brouillon → moins urgent
```

⚠ **La priorité est `chateau-de-la-riviere` : il est PUBLIÉ, donc réservable dès maintenant, à commission nulle.** `chantilly` est un brouillon — non servi, donc sans effet tant qu'il le reste ; à corriger avant sa publication.

**C'est exactement le trou qui a déjà coûté 0 %** et que `commissionService.js` documente : *« le taux se posait en SQL manuel, et deux châteaux publiés ont encaissé 0 % sans que rien ne le signale »*. L'écran `/admin/commissions` existe désormais — **il reste à s'en servir**.

**Correction par l'UI. Priorité : revenu direct.** Pour Dimitri et Matthieu.

### ⚠ DÉCOUVERTE 3 — la mutualisation des personnages est THÉORIQUE

Requête ③ : **aucune ligne**. **Aucun personnage ne sert plus d'un château** aujourd'hui. La structure `chateau_personnages` est bien du many-to-many, mais les faits ne l'exercent pas.

⚠ **Ne pas surestimer l'argument « réutilisation » dans le mail aux associés** : il est vrai pour les **équipements** et les **régions**, pas pour les personnages.

### ✅ DÉCOUVERTE 4 — le remplissage éditorial des publiés est bon

Histoire de **500 à 1 236 caractères**, 3 à 7 images. Les « courts » (~450-500) sont les **mocks non publiés** — `chantilly`, `fontainebleau`, `pierrefonds`, `ferte-saint-aubin` — à enrichir avant publication. ⚠ `pierrefonds` n'a **qu'une image**, sous le minimum de 2 exigé par l'agent : non publié, donc non bloquant, **mais bloquant le jour de sa publication**.

### Ce que le dépôt ne peut pas auditer

L'outil de prospection (`relaxed-jalebi`, table `lcc_prospection`) **n'existe ni en fichier ni en table Supabase**. Le pont prospection → mise en ligne est donc, au mieux, manuel. Hors de portée d'un audit du code.

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

### ✅ RÉGLÉE le 25 août — `useCarrousel`, et ce que l'extraction a appris

**La dette ci-dessous est REMBOURSÉE.** La plomberie vit dans **`src/hooks/useCarrousel.js`**, et les deux sections s'y branchent. ⚠ **La règle « toute correction dans l'une doit être reportée dans l'autre » n'a plus lieu d'être — ne pas la ré-appliquer.**

**Un hook, pas un composant** : ce qui est commun est du **comportement** (refs, observateur, mesures DOM, deux états) ; ce qui diffère est du **markup et du CSS**. ⚠ **Le hook ne connaît AUCUN réglage — il les MESURE.** Ni `--carte`, ni la gouttière, ni le facteur d'échelle n'y entrent : ils vivent en CSS. **C'est la limite à ne pas franchir en ajoutant des paramètres.** Un seul existe : `ouvrirAuMilieu`.

⚠⚠ **La non-régression a été prouvée par ÉQUIVALENCE TEXTUELLE, pas par test** — et c'est la leçon transposable. Le comportement de ces carrousels n'est pas mesurable (cf. la section suivante), mais **un code identique, si**. Le hook a été **extrait par script**, jamais retapé, puis confronté au code que chaque composant portait avant : **5 fonctions identiques au caractère près**, la sixième ne différant que du garde `ouvrirAuMilieu &&` — écart lui-même prouvé par égalité de chaînes.

⚠ **Extraction en DEUX commits, jamais un** : à chaque étape une section restait **témoin**. Si l'une avait cassé et pas l'autre, l'écart aurait été localisable. En un seul commit, les deux seraient tombées ensemble.

⚠ **Un bonus non prévu** : la section 2 n'annulait pas son `requestAnimationFrame` au démontage. Elle a hérité du nettoyage en se branchant — **1b-2 n'était donc pas un déplacement pur**.

<details><summary>La dette, telle qu'elle était écrite (conservée : l'écart entre ce qu'on prévoyait et ce qui est arrivé instruit)</summary>

### ⚠⚠ La plomberie du carrousel existe en DEUX exemplaires — dette NOMMÉE, extraction planifiée

**Refonte home, 24-25 août 2026.** `UneDeLaSemaine` (« Les clés à la une ») et `HeureAuxDemeures` (« Découvrez aussi ») portent **la même plomberie de carrousel, copiée**, et non une abstraction partagée :

```
callback ref + ResizeObserver     l'attache au noeud, contre l'early-return async
detection du centre par rect      getBoundingClientRect, jamais offsetLeft
pasCarte() mesure dans le DOM     --carte est en vw, une constante mentirait
fleches + bornes a 1 px + rAF
reserve laterale + --carte en vw  (anti-circularite du padding en %)
scale sur la CARTE, jamais l'item (qui porte le snap)
padding-block anti-rognage        overflow-x:auto force overflow-y:auto
```

⚠ **C'est un choix, pas un oubli — la « voie c ».** Extraire *pendant* la construction de la section 2 aurait rouvert la section 3, **validée à l'écran la veille**, sous la pression du chantier en cours. Dupliquer définitivement aurait laissé deux copies diverger en silence. La voie retenue : **copier maintenant, extraire à froid ensuite**, quand **deux références qui marchent** permettent de prouver que l'extraction ne casse rien.

⚠ **RÈGLE EN VIGUEUR JUSQU'À L'EXTRACTION : toute correction faite dans l'une doit être reportée dans l'autre.** Elle est écrite en tête des deux fichiers, mais elle ne tient que si on la lit — d'où cette entrée.

⚠ **Et cette plomberie a coûté cher à mettre au point** : quatre correctifs successifs sur la seule section 3 (deps `[]`, `rAF`, `ResizeObserver` dans un effet, puis enfin la callback ref). C'est précisément ce qui rend la duplication dangereuse **et** l'extraction délicate : le prochain qui corrigera l'un des deux exemplaires doit savoir que l'autre existe.

**→ Chantier suivant : extraire un composant de carrousel commun, brancher les deux sections dessus, re-valider les deux à l'écran.** ⚠ Desktop **et** mobile pour la section 3 ; desktop seul pour la section 2, qui est `display: none` sous 768 px.

</details>

### ⚠ Sur ce carrousel, la mesure automatisée MENT — quatre fois vérifié

Playwright et l'automatisation navigateur ont rapporté, sur ces deux sections : le **clic des flèches sans effet** (`scrollLeft` 0 → 0), le **focus qui ne suit pas** au défilement, un **`scale` calculé à 1** et une **opacité de fleur de lys à 0** — alors que **tout fonctionnait à la souris et au doigt**, vérifié par Matthieu à chaque fois.

⚠ **Ne pas conclure d'un test synthétique sur ce composant.** Les causes plausibles — clic sans activation utilisateur, `prefers-reduced-motion` forcé dans le navigateur d'automatisation — n'ont pas été isolées. **Le jugement est visuel, sur un vrai navigateur.**

⚠ Corollaire pour un futur filet E2E : **écrire un test qui vérifie ces effets produirait probablement un rouge permanent** sans défaut réel.

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

- ~~**[Phase 4.x] Fontainebleau orphelin du path UI nominal**~~ **CADUQUE** — mais ⚠ **pas pour la raison écrite ici le 21 août, qui était FAUSSE.** Cette dette raisonnait sur `data/chateaux.js` (supprimé), sur `HeureAuxDemeures.idsCartes`/`idsIndex` (qui n'existent plus) et sur `ChateauModal` (supprimé) : **ces trois motifs-là suffisent, et ils tiennent**.

  ⚠ **En revanche, « Fontainebleau n'existe plus en base » était faux.** Mesure du 22 août : il **existe**, en **brouillon**. Les six anciens mocks n'ont pas été supprimés, ils ont été passés en `statut` non publié. J'avais interrogé PostgREST en `anon`, dont la policy filtre `statut = 'publie'` — je lisais « publiés visibles » et j'écrivais « en base ». Cf. sous-audit F, découverte 1.

  ```
  PUBLIÉS (7, servis)    blanc-buisson · chateau-de-bonnemare · chateau-de-la-riviere
                         chateau-de-saint-paterne · chateau-du-boulay-morin
                         chateau-royal-de-benays · les-briottieres

  BROUILLONS (6, en base, NON servis)   chantilly · ferte-saint-aubin · fontainebleau
                                        pierreclos · pierrefonds · vaux-le-vicomte
  ```

  Absents : `vaux-le-vicomte`, `pierrefonds`, `chantilly`, `fontainebleau`, `ferte-saint-aubin`, `pierreclos`. Ils ne subsistent que comme **fixtures de test** (`__fixtures__/chateaux.fixtures.js`), ce qui est légitime.

- **[Données] `est_la_une` ne discrimine plus rien** : les **sept demeures PUBLIÉES** sont à `true` (mesuré le 21 août — ⚠ mesure faite en `anon`, donc sur les publiés seuls ; les 6 brouillons n'ont pas été regardés). Le champ n'est d'ailleurs consommé que pour **ordonner** la liste (`chateauxService.js:158`), jamais pour filtrer — le seul filtre est `.eq("statut", "publie")`. Même famille que le champ `urgence` en texte libre : un drapeau qui ne trie plus. Sujet **données**, pas code — à voir avec Dimitri.

- **[Purge] La chaîne des « ambiances » est morte en entier** (découvert le 21 août 2026). `src/utils/ambiance.js` **n'a aucun consommateur** — `grep` sur `utils/ambiance`, `getPhraseAmbiance`, `getMeteoPhrase` dans les `.jsx` ne rend rien — et il est le **seul** consommateur de `src/data/ambiances.js`. Les 64 phrases éditoriales de Tanguy ne sont donc plus affichées nulle part.

  ⚠ Et la divergence que cette même documentation redoutait a bien eu lieu : sur les **8** clés d'`ambiances.js`, **6 sont orphelines** (écrites pour des demeures qui n'existent plus), et **5 des 7 demeures servies n'ont aucune ambiance**.

  ⚠⚠ **NE PAS PURGER — décision de Matthieu, 21 août 2026.** Ce contenu reste en liste **avec sa réserve**, et n'a pas été touché par PR3. La question à trancher n'est pas technique : ces phrases étaient-elles **censées s'afficher** (auquel cas c'est du contenu perdu, à rebrancher) ou **abandonnées** (auquel cas la purge est légitime) ? Matthieu vérifie avec Tanguy. Tant que la réponse n'est pas connue, **le code mort reste** : effacer soixante-quatre phrases éditoriales sur une déduction de `grep` serait exactement le genre de raccourci que ce dépôt s'interdit.

- ~~**[Phase 4.x] Investigation "Load request cancelled" mobile-safari sur /bri-1.avif**~~ ✅ Résolue (Chantier 1.9, 7 mai 2026, commit `062c490`) — diagnostic empirique : reproduction locale Windows mobile-safari (`npx playwright` + agent console-errors mode mobile-safari only) a révélé qu'il s'agissait d'une **CLASSIFICATION ERRONÉE** dans l'agent QA, pas d'un bug applicatif. Les images sont chargées passivement via `background-image` inline CSS dans 5 composants (`VitrinePermanente`, `DernieresCles`, `ClubMembres`, `HeureAuxDemeures`, `UneDeLaSemaine`). Aucun useEffect avec cleanup AbortController sur les images. L'AbortController existe uniquement pour le fetch météo dans `VitrineChateau.jsx:42-96`, sans rapport. Mes 3 hypothèses initiales (re-render, Phase 2.3 abort, prefetch Safari) toutes invalidées. Fix dans `scripts/agents/console-errors.cjs:311-317` : reclassification des cancels (`/cancel|abort/i`) comme avertissement quel que soit l'origine. Les vraies régressions (404/500) restent couvertes par le test E2E `Images locales /bri-*.avif sans 404`. Baseline resserrée : `erreurs.max` 2→1, `avertissements.max` 1→2.

- **[Phase 4.2] `ChateauCarte` mutualisé** : implémentations dupliquées détectées dans `VitrinePermanente`, `DernieresCles`, `ClubMembres`, `HeureAuxDemeures`, `UneDeLaSemaine`. Fusion en un composant unique avec variantes (`eyebrow`, `editorial`, `last-minute`, `vitrine`, `club`).

### ⚠ À VALIDER AVEC UN COMPTE DE TEST — le tunnel d'inscription

Le retour post-authentification a été réparé le 19 août 2026 (`utils/cheminAuth.js`) : onze points d'entrée vers `/connexion` et `/inscription` posent désormais la destination, et les liens inter-auth la propagent. **Le parcours de CONNEXION est validé de bout en bout** — clic « Club Châtelains » → connexion → `/club` directement, vérifié en production par Matthieu.

**Le parcours d'INSCRIPTION ne l'est pas.** Il enchaîne :

```
/inscription?next=/club   dépose lcc_auth_next      ← câblé le 19 août, jamais vu tourner
  → email de confirmation
  → /auth/callback?type=signup   relit lcc_auth_next en source primaire
  → /completer-profil            le consomme et atterrit
```

Le dépôt du `next` par `/inscription` a été ajouté **en raisonnant depuis le code**, pas en observant le parcours : créer un compte demande une adresse réelle et un email de confirmation, ce que ni le filet E2E ni une sonde ne peuvent faire (le spec d'auth s'interdit de mocker le client Supabase).

**Ce qu'il faudrait vérifier avec un compte de test** : qu'après « Rejoindre le Club » → email → complétion du profil, on atterrisse bien sur `/club` et non sur l'accueil. Et que le `next` survive à l'ouverture d'un **nouvel onglet** depuis la boîte mail — c'est la raison du choix de `localStorage` plutôt que `sessionStorage`, mais elle n'a été vérifiée sur aucun des deux parcours.

Non bloquant : le défaut signalé par Matthieu était la connexion, et il est réglé.


### Dette relevée le 19 août 2026 (audit complet + chantiers de la session)

Chaque ligne a été **vérifiée par lecture ou mesure**, pas déduite. Les références sont datées : la base et le code évoluent, une dette non revérifiée est une hypothèse.

**Cassures silencieuses — l'utilisateur ne voit rien, ou voit du vide**

- ~~**Aucun `ErrorBoundary` dans tout le projet.**~~ ✅ Résolue (PR3, 21 août 2026) — `src/components/FiletErreur.jsx`, monté sous `BrowserRouter` et au-dessus d'`AuthProvider`.

  ⚠ **C'est le SEUL composant de classe du dépôt, et il n'y a pas d'alternative** : `getDerivedStateFromError` et `componentDidCatch` n'existent que sur une classe. Ce n'est pas un choix de style.

  ⚠ **Le repli recharge le document (`window.location.assign("/")`), il ne navigue pas.** Un boundary **ne se réinitialise pas tout seul** : un repli qui naviguerait par le routeur changerait l'URL **en restant affiché**, et le visiteur croirait le site mort. Un test garde ce comportement.

  ⚠ **En développement, React relance l'erreur dans la console même quand le filet l'attrape.** Ne pas en conclure qu'il est cassé : si le repli s'affiche, il a fait son travail.

  ⚠ **Il n'attrape PAS** les rejets de promesse (c'est le rôle des `.catch` — PR2a/PR2b), ni les erreurs des gestionnaires d'événement ou des minuteurs. React ne les lui donne pas.

- **⚠ L'accueil n'avait AUCUNE route à lui** (découvert et corrigé en PR3, 21 août 2026). Il n'était servi que par le catch-all `<Route path="*">`. Remplacer ce catch-all par la page 404 a donc **supprimé l'accueil du site** — `/` rendait « Cette porte n'existe pas ». Le build restait vert : Vite compile sans broncher une application dont l'accueil a disparu. Deux tests du filet l'ont attrapé avant le commit. `<Route path="/" element={homeEtOverlays} />` est désormais explicite ; ne pas la retirer.
- **Les hooks ne relancent jamais après une erreur réseau** (`useChateaux.js:26-48` — `useEffect` à deps `[excludeMocks]`, aucun `refetch` exposé). Une coupure d'une seconde laisse l'écran vide **jusqu'au rechargement**. Vérifié sur `main` avant et après la déduplication : comportement identique, donc antérieur à elle.
- **`error` est déstructuré puis jamais affiché** — `VitrinePermanente.jsx:27`, `DernieresCles.jsx:48`. Le hook signale la panne, l'écran la tait.
- **9 `.then` sans `.catch`** : `vitrine/ContenuClub.jsx:11`, `vitrine/ContenuDernieresCles.jsx:11`, `vitrine/offresResume.js:31,34`, `vitrine/OngletsNiveau1.jsx:34,43`, `contexts/AuthContext.jsx:50,80`, `auth/ReinitialiserMotDePasse.jsx:57`. Rejets non gérés, états bloqués en chargement.
- ~~**Aucune page 404**~~ ✅ Résolue côté **visiteur** (PR3, 21 août 2026) — `PageIntrouvable` sert la route `*` et les trois `Navigate` déguisées. ⚠ **La dette SEO reste ouverte, cf. ci-dessous.**

- **[SEO — chantier Julien] Le statut HTTP d'une URL inconnue est 200, pas 404.** Mesuré en production le 21 août : `/cette-page-nexiste-pas` répond **200**, exactement comme l'accueil. `vercel.json` réécrit `/(.*)` vers `index.html`, et ce rewrite est **nécessaire** au routage SPA — le retirer casserait le rechargement direct de `/vitrines`.

  La page 404 de PR3 règle ce que **le visiteur** voit ; elle ne change rien à ce que **Google** comprend. Aujourd'hui l'indexeur voit une infinité d'URL qui répondent toutes 200 — du contenu dupliqué à l'échelle du site.

  Deux voies, et l'arbitrage revient à Julien : **lister les routes valides** dans `vercel.json` (simple, mais la liste devrait rester synchronisée avec `App.jsx` — une nouvelle route oubliée deviendrait un 404 silencieux), ou une **fonction Edge** (pas de liste à tenir, plus de machinerie). ⚠ **Ne pas toucher au rewrite sans traiter les deux ensemble.**

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
- **`OngletsNiveau1.jsx` — le composant n'est monté nulle part** (découvert le 20 août 2026, pendant l'audit PR2a). `grep "<OngletsNiveau1"` ne rend **aucun résultat** : ses deux consommateurs (`BarreLaterale:2`, `VitrineChateau:9`) n'importent que les **exports nommés** `LIBELLES`, `PHRASES_BANDEAU`, `ICONES`. Son `useEffect` et ses **deux `.then` sans `.catch`** (lignes 34 et 43) ne s'exécutent donc jamais — c'est pourquoi PR2a les a **exclus** de son périmètre plutôt que de leur ajouter un `.catch` qui ne tournerait pas. Purge : extraire les trois constantes dans un module à elles, supprimer le composant.

**Santé générale**

- **Bundle : un seul chunk de ~987 kB** (277 kB gzip), au-dessus du seuil d'alerte de 500 kB. **Seul avertissement du build.** Aucun découpage.
- **Écrans sans aucun filet E2E** : `/resultats` en avait zéro jusqu'au 19 août (`retour-intelligent.spec.cjs` le couvre désormais), `/personnage/:slug`, **tout l'espace admin** (11 routes), `ChatelainDashboard`, `CarteInteractive`.
- **Public non responsive** (aucune media query < 768 px) : `page-personnage.css`, `partenaires.css`, `espace-professionnel.css`, `completer-profil.css`, `mot-de-passe-oublie.css`, `reinitialiser-mot-de-passe.css`, `transition-porte.css`, `panneau-filtres.css`, `calendrier-plage.css`, `barre-laterale.css`.
- **`playwright-e2e.cjs` perd le nom des tests flaky** : il ne consigne que le **compte** (`:56`), son tableau `details` ne se remplit qu'en cas d'erreur d'agent. Le nom vit dans le **log du run**, pas dans l'artefact — deux lignes suffiraient à l'y mettre.

### ⚠ Le job `qa-fast` tué par l'installation — cause trouvée, borne posée (20 août 2026)

**Deux annulations sur trois runs**, puis diagnostic. La note qui occupait cette place accusait le CDN de Playwright et annonçait le cache de `~/.cache/ms-playwright` comme « le correctif ». **C'était faux**, et la lecture des logs des runs tués l'a montré.

#### La cause, prouvée

```
16:56:35   npx playwright install chromium --with-deps
16:56:36   Installing dependencies...              ← apt démarre
16:57:06   Ign:2 http://azure.archive.ubuntu.com/ubuntu noble InRelease
16:57:07   Ign:2 …                                  ← il retente
   …       25 tentatives
17:11:33   job tué au plafond de 15 min
```

Le miroir **`azure.archive.ubuntu.com`** ne répondait pas ; `--with-deps` appelle apt, qui a bouclé quatorze minutes. **Le CDN de Playwright n'a jamais été sollicité** — 0 téléchargement dans les deux runs tués (`32272439650`, `32278755038`). Sur un run vert de comparaison : **0 `Ign:`**.

⚠ **Le cache des navigateurs n'aurait donc empêché aucune des deux annulations.** Il reste utile — le téléchargement pèse 14 à 17 s sur les deux jobs — mais **ce n'est pas le correctif de l'annulation**. Ne pas confondre les deux.

#### Le correctif posé : une borne d'étape, différente par job

Les profils ne sont pas les mêmes, et une borne unique aurait cassé des runs verts.

| | plafond du job | max **réussi** mesuré | borne d'étape |
|---|---|---|---|
| `qa-fast` | 15 min | **248 s** (10 runs : 21, 21, 23, 31, 34, 84, 132, 133, 234, 248) | **9 min** |
| `qa-full` | 60 min | **1564 s** — 26 min, et **vert** | **30 min** |

Un miroir bloqué produit désormais un **échec explicite** au lieu d'une annulation opaque, et libère le runner. Régression nulle : la borne de `qa-fast` laisse plus du double de marge sur son maximum observé, et celle de `qa-full` préserve le profil lent qui réussissait.

#### Ce qui a été écarté, et pourquoi

**Le retry automatique** : impossible dans le budget de `qa-fast`. Le job dispose de 900 s dont ~360 s de tests, soit ~540 s pour l'installation — deux essais imposeraient ≤ 250 s chacun, ce qui couperait des runs verts observés à 234 s et 248 s. **À rouvrir si le plafond du job monte.**

**Retirer `--with-deps`** : c'est le seul correctif qui retirerait *la cause* — plus d'apt, plus de miroir. Mais webkit est exigeant en bibliothèques système, et cela ne se vérifie qu'en CI. **Chantier séparé**, à mener avec un run de contrôle.

#### Pour diagnostiquer le prochain

Quand le plafond tombe pendant la préparation, les étapes suivantes passent en `skipped` : **aucun test ne tourne, et le run ne produit aucun artefact** (`total_count: 0`). Ce n'est ni un vert ni un rouge — il n'y a rien à lire, et relancer est l'action *diagnostiquée*, pas un réflexe. Avec la borne, le message est désormais explicite.


### Flakes sous surveillance

Un flake vert n'est pas un incident ; **deux occurrences du même sont un sujet**. On les compte plutôt que de les oublier.

| Test | Occurrences | Navigateur | Lecture |
|---|---|---|---|
| `blanc-buisson.spec.cjs:25` — « la home rend la section à la une » | **1** (18 août) | chromium | `toBeVisible` à 5 s sur `.une-semaine-carte`, qui n'existe pas tant que Supabase n'a pas répondu. Fragilité intrinsèque du test. |
| ⚠ **`blanc-buisson.spec.cjs:88`** — « Escape ferme la vitrine » | **3** (19 août ×2, **21 août**) | webkit | ⚠ **LE ✅ EST LEVÉ.** Corrigé le 20 août par `useLayoutEffect` (30/30 en boucle), il a **reparu le 21 août : 1 échec sur 15 passes webkit**, sur la même assertion `toHaveCount(0, {timeout: 2000})` avec `4 × locator resolved to 1 element`. La course décrite ci-dessous était réelle et sa fermeture mesurée — mais elle **n'était pas la seule**, ou pas entièrement close. Cause de la rechute **inconnue** ; ne pas ré-appliquer le raisonnement de 20 août sans nouvelle mesure. |
| ⚠ **`vitrines-tous-chateaux.spec.cjs:111`** — « Chaque vitrine servie rend ses sections » | **4** (20 et 21 août) | **3 × webkit**, 1 × mobile-safari | **SEUIL FRANCHI — à traiter juste après PR3.** Cf. § dédié ci-dessous. |
| `retour-intelligent.spec.cjs:52` — « resultats filtrés → château → retour » | **1** (21 août, `qa-full` #138) | chromium | Meurt sur la PREMIÈRE ligne, avant toute logique de retour : `waitForSelector('.pr-carte--cliquable', 15000)`. C'est le garde-fou du test, pas ce qu'il vérifie. ⚠ **Pas causé par PR3** — le commit `d6225de` ne touche aucun fichier de `/resultats` et cette route avait déjà la sienne ; vert sur les trois `qa-full` précédents. Famille **apparente** de `blanc-buisson:25` (attente d'un DOM qui dépend de Supabase) — à confirmer par mesure, pas à croire. |

**Si l'un se répète au prochain `main`, le traiter** — ce serait la deuxième fois sur le même geste, pas un hasard.

#### `vitrines-tous-chateaux:111` — le seuil est franchi (21 août 2026)

**Quatre occurrences en deux jours, dont trois sur webkit.** En CI, le rejeu automatique le rattrape et le run reste vert — ce n'est donc pas une urgence. ⚠ **Mais en local, où Playwright ne rejoue pas, il reste ROUGE** : c'est le seul échec hors tests visuels de la passe complète du 21 août. Il ne dépend d'aucun changement de PR1/PR2/PR3 — aucune de ces PR ne touche le catalogue ni son toggle.

| date | contexte | navigateur | rejoué ? |
|---|---|---|---|
| 20 août | passe locale (PR1) | mobile-safari | non — rouge |
| 21 août | `qa-full` sur `main` (#136) | webkit | oui — vert |
| 21 août | `qa-full` sur `main` (#137) | webkit | oui — vert |
| 21 août | passe locale (PR3) | webkit | non — rouge |

⚠ **Ce qui suit est une PISTE, pas un diagnostic.** Elle vient de la lecture et d'un run isolé, pas d'une mesure sous charge. Quatre fois cette semaine une cause « évidente » n'a pas résisté à la mesure (la dette « vidéo du Hero », le CDN Playwright accusé à la place d'apt, le « rejet non attrapé » de `getSession`, et le `.catch` inerte de la page de réinitialisation). **Diagnostic en lecture seule avant tout correctif.**

- Ce spec est **le seul qui garde volontairement le vrai clic Playwright** sur le toggle « Liste ». Les harnais QA passent par le DOM depuis le 18 août, précisément parce que ce clic échouait — mais ce spec teste *le geste*, pas l'*état de page*, et son commentaire l'explique. Ne pas l'aligner sur `scripts/lib/ouvrir-catalogue.cjs` sans avoir compris.
- Son propre commentaire (lignes 42-44) dit : « une fois sur mobile-safari en suite complète, jamais en isolé. Un délai plus long n'y changerait rien : le clic est **perdu, pas en retard** ».
- Vérifié le 20 août : **2/2 verts en isolé**. La piste est donc la **charge de la suite complète**, pas le geste lui-même.
- L'échec observé le 20 août portait sur `chateau-royal-de-benays` et mourait sur `locator('.tcl-onglet').filter({ hasText: 'Liste' })` après 10 s.

**Ce qu'il faudrait mesurer** : ce que le DOM porte au moment du clic perdu (le toggle est-il présent ? recouvert ? remonté ?), et si l'échec suit un rang dans la suite plutôt qu'un château.


#### La course peinture/effet en mode route — fermée le 20 août 2026

`blanc-buisson.spec.cjs:88` a atteint le seuil de deux occurrences. Le diagnostic a écarté **deux** hypothèses avant de trouver la bonne — dont celle qui était écrite ici.

**Ce que ce n'était pas.** Le saut multi-entrées `navigate(-(delta+1))` n'est **pas exercé** par ce test : il ouvre la vitrine par `goto` direct, donc `idxEntrée = 0`, donc la branche prise est `navigate("/")` — exactement ce que faisait le code **avant** le chantier du retour (vérifié sur `6a9412c`). Et la fermeture n'est lente nulle part : médiane **21 ms** en webkit, **17 ms** en chromium, pour un budget de test de 2 000 ms.

**Ce que c'était.** L'artefact CI est catégorique — `5 × locator resolved to 1 element` : l'overlay n'a pas bougé de deux secondes. L'échec est **binaire, pas lent**. La touche n'atteignait pas son écouteur.

```
VitrineChateau.jsx   const [visible, setVisible] = useState(mode === "route");
                     window.addEventListener("keydown", onKey)   ← dans un useEffect
```

En mode **route**, `visible` vaut `true` dès le premier rendu : `.vc3-overlay.vc3-visible` est peint immédiatement, le test le voit et presse `Escape`. Mais un `useEffect` s'exécute **après** la peinture. Entre les deux, une fenêtre où l'écran est à l'écran et où personne n'écoute. Le mode **calque** y échappe : `visible` y part à `false` et bascule après 40 ms, ce qui laisse le temps à l'effet.

**Un humain ne peut pas gagner cette course** — il faudrait presser la touche dans les millisecondes qui suivent l'apparition, et sur mobile il n'y a pas d'`Escape`. Ce n'était donc pas un défaut produit visible, mais une vraie fenêtre ouverte.

**Le correctif** : l'écouteur passe en `useLayoutEffect`, qui s'exécute **avant** la peinture. Le bloc ne fait que poser et retirer l'écouteur — rien de lourd n'est rendu synchrone. Les autres effets du composant restent en `useEffect`. Pas de rendu serveur ici (SPA Vite + `createRoot`), donc pas d'avertissement React.

| boucle webkit, 15 × 2 tests, mêmes conditions | résultat |
|---|---|
| avant | **26 / 30** |
| après | **30 / 30** |

⚠ `briottieres.spec.cjs:103` portait le même défaut sans l'avoir encore manifesté en CI. Les deux tests passent **sans modification** — c'est le juge : la course est fermée, pas contournée.

##### ⚠ Mais elle n'était pas la seule — rechute du 21 août 2026

Le titre de cette section dit « fermée », et **il faut le lire au sens strict** : la course peinture/effet décrite ci-dessus est bien fermée, et sa mesure (26/30 → 30/30) reste valable. Elle n'était simplement **pas la seule cause** de ce flake.

Boucle webkit du 21 août, 15 passes, code inchangé depuis le correctif : **`blanc-buisson:88` a échoué une fois**, sur la même assertion, avec la même signature —

```
> await expect(page.locator('.vc3-overlay')).toHaveCount(0, { timeout: 2000 });
    4 × locator resolved to 1 element — unexpected value "1"
```

⚠ **Ne pas ré-appliquer le raisonnement de 20 août.** Il a été juste, il a été mesuré, et il ne suffit pas. La cause de la rechute est **inconnue** — la chercher sur une nouvelle mesure, pas sur l'analogie avec celle-ci. C'est précisément le piège qui a fait vivre pendant des mois l'explication fausse de `vitrines-tous-chateaux` (« nœud détaché »), réfutée le 21 août.


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

#### ⚠ Trois chantiers visuels / DA — À PRÉCISER (Matthieu, 23 août 2026)

Notés à chaud pour ne pas se perdre. **Aucun n'a de périmètre établi** : ce sont des intentions, pas des spécifications, et il faudra un cadrage avant d'y toucher. ⚠ Ne pas les traiter comme des tickets prêts — les trois touchent la direction artistique, donc Tanguy.

- **(6) L'onglet « chambres » des vitrines est à reprendre.** ⚠ Reste à dire *ce qui* ne va pas — présentation, hiérarchie, densité, parcours vers la demande ? À préciser avant tout audit, sous peine de refaire ce qui convenait.
- **(7) Audit des fleurs de lys (⚜).** Où le motif est-il employé, avec quelle cohérence, et est-ce le bon signe pour LCC ? ⚠ C'est une question de **direction artistique**, pas de code : l'inventaire technique (où le glyphe apparaît) est trivial, l'arbitrage ne l'est pas.
- **(8) L'animation d'entrée de vitrine est à reprendre.** ⚠ Rappel de deux mesures qui la concernent : le clic du catalogue a déjà été perdu à cause d'animations décalées (`.tcl-row`, `animation-delay: 1.3s`), et `blanc-buisson:88` a rougi sur une course peinture/effet à l'ouverture. **Toucher à cette animation peut réveiller des flakes** — prévoir une passe QA, pas seulement un test visuel.

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

### ⚠ PORTÉE DU RESPONSIVE — l'espace admin en est EXCLU (décision du 24 août 2026)

L'exigence « desktop **et** mobile, les deux testés, les deux validés » vaut pour le **visiteur** et pour le **châtelain**. ⚠ **Elle ne vaut PAS pour l'espace admin.**

`/admin/*` est un **back-office**, utilisé depuis un poste de travail. Personne n'éditera dix-sept sections de fiche ou une grille de commissions au pouce. **Ne pas investir dans son responsive** — ni CSS, ni tests, ni relecture mobile.

⚠ **Deux conséquences à ne pas confondre.** Le **châtelain**, lui, est mobile par nature : il bloque une semaine depuis son téléphone, entre deux services. Son espace reste soumis à l'exigence complète — et `PanneauDisponibilites` étant partagé par les deux (cf. piège 4), **son responsive est requis par l'hôte châtelain, pas par l'hôte admin**. Le retirer « puisque l'admin n'en a pas besoin » casserait l'autre.

### ⚠ BUG À CORRIGER — redirection post-connexion, MOBILE UNIQUEMENT

**Vu le 24 août 2026.** Sur **mobile seulement** — desktop se comporte correctement —, après avoir validé « Connecter » depuis un compte **admin ou châtelain**, on atterrit sur la **home** au lieu de l'espace concerné.

⚠ **Ce n'est pas le défaut réparé le 19 août** (`utils/cheminAuth.js`, la destination posée par les onze points d'entrée) : celui-là est validé en production, et le parcours desktop passe. Ici seul le mobile dévie, ce qui écarte la logique de destination — elle est commune aux deux.

**Piste, non vérifiée** : un problème de **timing** entre l'établissement de la session et la redirection, plus visible sur mobile (réseau plus lent, cycle de vie de l'onglet différent). ⚠ **À mesurer avant de coder** — deux fois cette semaine une cause « évidente » n'a pas résisté à la mesure.

**Non bloquant aujourd'hui** : l'admin est desktop-only (ci-dessus), et le châtelain peut naviguer à la main vers son tableau de bord. ⚠ **Le devient le jour où un châtelain découvre la plateforme depuis son téléphone** — sa première impression serait « ça ne marche pas ».

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
