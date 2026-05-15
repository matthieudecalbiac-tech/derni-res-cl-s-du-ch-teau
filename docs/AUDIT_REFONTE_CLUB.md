# Audit refonte Club — Sprint S2-α.2.5 préparation

**Branche** : `audit/refonte-club-discovery` (depuis `main` SHA `358a847`)
**Date** : 2026-05-15
**Scope** : discovery READ-ONLY pour préparer la refonte unification Club.
**Contraintes respectées** : code applicatif **non modifié** ; seul ce fichier markdown créé.

---

## A. Système A — modale Rejoindre / Connecter

### A.1 — Fichier source modale "REJOINDRE LE CLUB"

- **Chemin** : `src/components/AuthModal.jsx`
- **Architecture** : composant unique avec deux modes (`mode = "inscription" | "connexion"`) basculables via `setMode()` et `modeInitial` prop.
- **Niveaux Blue/Silver/Gold/Platinum** : hardcodés dans le fichier lui-même, lignes 4-15 :
  ```js
  const NIVEAUX = [
    { nom: "Blue",     dot: "blue",     seuil: "Dès l'inscription", reservations: 0 },
    { nom: "Silver",   dot: "silver",   seuil: "3 réservations",    reservations: 3 },
    { nom: "Gold",     dot: "gold",     seuil: "7 réservations",    reservations: 7 },
    { nom: "Platinum", dot: "platinum", seuil: "15 réservations",   reservations: 15 },
  ];
  ```
- **Champs formulaire inscription** (state `form`, ligne ~32-40) : `nom`, `prenom`, `email`, `telephone`, `motDePasse`, `parrain` (optionnel), `cgu` (boolean).
- **Validation** : regex simple email + 6 caractères minimum mot de passe (lignes 63-68). Aucun appel backend.
- **Génération numéro membre** : fonction locale `genererNumeroMembre()` ligne 17-20 :
  ```js
  function genererNumeroMembre() {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `LDCC-${num}`;
  }
  ```

### A.2 — Fichier source modale "BON RETOUR"

- **Chemin** : `src/components/AuthModal.jsx` (**même fichier** que A.1, en mode `connexion`).
- **Pas de fichier séparé** pour l'écran "Bon retour".
- L'animation transition post-login (lys + texte fade-in + fondu noir) est dans un **3e composant** : `src/components/ClubBienvenue.jsx` (~50 lignes), déclenché via `clubBienvenueOuvert` après login réussi.

### A.3 — Mécanisme de stockage de l'auth Système A

- **localStorage** : ❌ **ZÉRO** occurrence dans `AuthModal.jsx`. Grep `localStorage|setItem|getItem` : 0 match.
- **state React** : useState local (`form`, `nouveauMembre`, `loading`, `erreur`, `mode`, `etape`) + **callback de levée** `onConnexion(membre)` qui remonte vers `App.jsx`.
- **App.jsx state** : `userConnecte` (useState), pas de Context global, pas de Redux/Zustand/Jotai.
- **Persistance backend** : ❌ **AUCUNE**. Aucun `fetch`, `axios`, `supabase.from(...)`, `supabase.auth.signUp`, `XMLHttpRequest` dans `AuthModal.jsx`.

### A.4 — Endpoint API d'inscription/connexion

**Inexistant**. Le formulaire simule un délai puis appelle `onConnexion(membre)` directement avec l'objet `membre = { ...form, niveau: "Blue", numero: "LDCC-XXXX", reservations: 0 }`.

### A.5 — Verdict

**Système A = mock front-only sans persistance backend. Confirmé.**

L'utilisateur "connecté" existe uniquement dans le state React `userConnecte` de `App.jsx`. Reload de page (F5) → `userConnecte = null` → utilisateur "déconnecté".

### A.6 — Comptes Système A en prod

**0 compte persisté**. Aucune persistance → aucune donnée utilisateur n'a jamais été sauvegardée nulle part. La refonte ne nécessite **aucune migration de données** pour Système A.

---

## B. Page CLUB DES CHÂTELAINS publique

### B.1 — Route ou modale ?

**Modale plein écran** (overlay z-index élevé sur la home). Pas une route React Router.

### B.2 — URL exacte

❌ **Pas d'URL** — déclenché par state `clubOuvert` dans `App.jsx` (ligne 49). Le composant est rendu conditionnellement à la fin du `homeEtOverlays` JSX.

### B.3 — Fichier composant

- **Chemin** : `src/components/ClubChatelains.jsx`
- **Props** : `{ onClose, onOuvrirAuth, user, ongletInitial }`
- **Style** : `src/styles/club-chatelains.css` (à vérifier si déduplicable)

### B.4 — Comment l'utilisateur y arrive

3 chemins identifiés :
1. **Bouton header "Rejoindre le Club"** : `Header.jsx:123` → `onOuvrirClub?.()` → `App.jsx setClubOuvert(true)`.
2. **Burger menu item "Club des Châtelains"** : `Header.jsx:24-26` (data array) → `action: "club"` → handler ligne 95 → `onOuvrirClub?.()`.
3. **BandeauOffres** sur la home : `<BandeauOffres onOuvrirClub={() => setClubOuvert(true)} />` (App.jsx:102).

### B.5 — Source des données niveaux Blue/Silver/Gold/Platinum

**Hardcodés dans `ClubChatelains.jsx`** lignes 66-87 (tableau `NIVEAUX` interne au fichier). Duplicate des niveaux définis aussi dans `AuthModal.jsx` (cf A.1) — **dette : deux sources de vérité divergentes possibles**.

---

## C. Page "Vos offres exclusives membres"

### C.1 — Route ou modale ?

**Modale plein écran** (idem ClubChatelains).

### C.2 — URL exacte

❌ **Pas d'URL** — state `clubMembresOuvert` dans `App.jsx` (ligne 51).

### C.3 — Fichier composant

- **Chemin** : `src/components/ClubMembres.jsx`
- **Props** : `{ user, onClose }`
- **Style** : `src/styles/club-membres.css`

### C.4 — Source des offres listées

**Dérivation à la volée depuis `useChateaux()`** — pas de field dédié.

Confirmation grep : `chateaux.js` ne contient **aucun champ** `offresClub`, `offres_club`, `clubOffres`, `membre_club`.

Logique `ClubMembres.jsx` lignes 73, 184 :
```js
const { chateaux, loading, error } = useChateaux();
// ...
{chateaux.map(c => {
  const prixFinal = c.prixBarre ? Math.round(c.prixBarre * (1 - (c.reduction || 0) / 100)) : derivePrix(c);
  const packages = PACKAGES_CHATEAU[c.id] || ["Séjour prestige…", "Visite privée…"];
  // ...
})}
```

→ Les "offres exclusives membres" sont en réalité **TOUS les châteaux** affichés avec :
- Le prix réduit (`prixBarre × (1 - reduction/100)`) du data layer chateaux (pas un système d'offre Module C dédié).
- Des **packages hardcodés** dans une const `PACKAGES_CHATEAU` keyé par `chateau.id` (1-8), fallback à 3 strings génériques.

**Aucun lien avec la table Supabase `public.offres`** ni avec `src/data/mockOffres.js` (Sprint α.1.5).

### C.5 — Système de numérotation des membres "N° 2835"

`ClubMembres.jsx:74` :
```js
const numeroMembre = user?.id || Math.floor(Math.random() * 9000 + 1000);
```

- **À la création** (inscription via `AuthModal`) : `genererNumeroMembre()` produit `LDCC-NNNN` (4 digits aléatoires). Stocké dans `user.numero` dans le state App.
- **À l'affichage** (`ClubMembres`) : `user?.id` (jamais set par AuthModal — c'est `user.numero` qui existe), fallback à un **nouveau random** à chaque render → l'affichage `N° 2835` change potentiellement à chaque ouverture de la modale.
- **Stockage** : ❌ **Aucun**. Front-only, ré-généré ou perdu.

---

## D. Espace membre Sprint α.2 (route /mon-compte)

### D.1 — État actuel

**Placeholder** : `<RoutePlaceholder route="/mon-compte"><span>{t("common.loading")}</span></RoutePlaceholder>`. Affiche "Chargement…" via i18n. Pas de contenu réel.

### D.2 — Fichier composant

- **Chemin** : `src/components/placeholders/ClientAccountPlaceholder.jsx` (16 lignes)
- Utilise `RoutePlaceholder` générique (`s2-placeholder.css`)

### D.3 — Routes wrappées dans `<RequireAuth>` sur `feature/s2-alpha-2-auth-supabase`

| Path | Composant | Protection |
|------|-----------|------------|
| `/mon-compte` | `ClientAccountPlaceholder` | `<RequireAuth>` |
| `/chatelain/dashboard` | `OwnerDashboardPlaceholder` | `<RequireAuth><RequireRole role="chatelain">` |
| `/admin/dashboard` | `AdminDashboardPlaceholder` | `<RequireAuth><RequireRole role="admin">` |

Les 3 routes sont en état placeholder, pas d'implémentation métier.

---

## E. Header global + menu hamburger

### E.1 — Fichier composant

- **Chemin** : `src/components/Header.jsx`
- **Style** : `src/styles/header.css`

### E.2 — Bouton "CONNEXION"

`Header.jsx:120-122` :
```jsx
<button className="header-connexion" onClick={() => { fermer(); onConnexion?.(); }}>
  Connexion
</button>
```

- Wire dans `App.jsx:94` : `onConnexion={() => ouvrirAuth("connexion")}` → `ouvrirAuth("connexion")` (App.jsx:61-65) → `setAuthMode("connexion")` + `setAuthOuvert(true)` → ouvre `AuthModal` en mode connexion.

### E.3 — Bouton "REJOINDRE LE CLUB"

`Header.jsx:123-125` :
```jsx
<button className="header-cta" onClick={() => { fermer(); onOuvrirClub?.(); }}>
  Rejoindre le Club
</button>
```

- Wire dans `App.jsx:87` : `onOuvrirClub={() => setClubOuvert(true)}` → ouvre `ClubChatelains` modale.

### E.4 — Menu hamburger

- **Existant** : ✅ oui, dans `Header.jsx`
- **Bouton** : `Header.jsx:127-129` `<button className="header-burger" aria-label="Ouvrir le menu" / "Fermer le menu">`
- **Breakpoint** : visible toutes tailles (CSS), affichage menu plein écran au click.
- **État** : ✅ fonctionnel
- **7 items définis** dans le data array haut du fichier (lignes 8-58) :

| # | Titre | Action | Composant déclenché |
|---|-------|--------|----------------------|
| 01 | Vitrines permanentes | `vitrines` | `VitrinePermanente` |
| 02 | Les Dernières Clés | `dernieres` | `DernieresCles` |
| 03 | **Club des Châtelains** | **`club`** | **`ClubChatelains`** ← cible refonte |
| 04 | Conciergerie | `conciergerie` | `Services` |
| 05 | Les Clés de l'Événementiel | `evenementiel` | `ClesEvenementiel` |
| 06 | À propos | `apropos` | `APropos` |
| 07 | Propriétaires | `proprietaires` | `PartenairesChateaux` |

### E.5 — État user dans le header

- **Header.jsx** reçoit `userConnecte` en prop (App.jsx:95) **mais ne l'affiche pas** : `grep userConnecte src/components/Header.jsx` retourne 0 occurrence dans le JSX (la prop est lue mais non rendue).
- Pas d'avatar, pas de nom, pas de menu déroulant connecté.
- Sur **branche `feature/s2-alpha-2-auth-supabase`** : aucun changement Header.jsx (toujours Système A). Donc même état post-α.2 : pas de UI auth-aware côté header.

---

## F. Routing global App.jsx

### F.1 — Routes sur `main` (post-merge α.1.5, SHA `358a847`)

| Path | Composant | Protection |
|------|-----------|------------|
| `/reserver/:chateauSlug` | `BookingFlowPlaceholder` | public (stub) |
| `/reservation/:id/confirmation` | `BookingConfirmationPlaceholder` | public (stub) |
| `/mon-compte` | `ClientAccountPlaceholder` | `<RequireAuth>` (stub Phase 2 α.2) |
| `/chatelain/dashboard` | `OwnerDashboardPlaceholder` | `<RequireAuth><RequireRole role="chatelain">` (stubs) |
| `/admin/dashboard` | `AdminDashboardPlaceholder` | `<RequireAuth><RequireRole role="admin">` (stubs) |
| `/auth/callback` | `AuthCallbackPlaceholder` | public (stub) |
| `/chateau/:slug` | `VitrineChateauRoute` | public |
| `*` | `homeEtOverlays` | public (catch-all home + overlays) |

### F.2 — Différentiel sur `feature/s2-alpha-2-auth-supabase`

Diff vs main :
- ➕ **Nouvelle route** : `<Route path="/connexion" element={<Connexion />} />` (page magic link)
- ♻️ **Route modifiée** : `/auth/callback` → `AuthCallback` (vraie impl) au lieu de `AuthCallbackPlaceholder` (stub supprimé)
- `RequireAuth` passé du stub `return children` à la vraie impl (redirect `/connexion` si !user)

### F.3 — Aiguillage VitrineChateau vs ChateauModal (dette mentionnée)

**La dette est OBSOLÈTE.** `App.jsx:131-135` (post-α.1.5 sur main) utilise déjà :
```jsx
{(transitionChateau || chateauSelectionne) && (
  (transitionChateau || chateauSelectionne).estLaUne === true
    ? <VitrineChateau ... />
    : <ChateauModal ... />
)}
```

→ Aucun hardcode `chateau.id === 7 || === 8`. La dette mentionnée dans le brief refonte (lignes 137-140) n'existe plus. **À retirer du tracking dette.**

---

## G. Offres Module C dans le data model

### G.1 — Champ `offresClub` dans `src/data/chateaux.js`

❌ **N'existe pas.** Grep `offresClub|offres_club|clubOffres|membre_club|offre.*club` dans `chateaux.js` : 0 match.

### G.2 — Format actuel des offres Module C

Aucun format dédié pour Module C dans le JSON local. Ce qui ressemble à des "offres Club" dans `ClubMembres.jsx` est en réalité :
- Le prix barré + réduction du chateau (Module B style)
- Des packages hardcodés dans `PACKAGES_CHATEAU[c.id]` (3 strings par chateau, dans `ClubMembres.jsx` lui-même)

### G.3 — Table Supabase

✅ **Table `public.offres` existe** dans `supabase/schema.sql:419` (Sprint S1-γ). Architecture multi-modules : 1 ligne offre par couple `(chateau_id, module_id)`. Les offres Module C seraient liées au `module.code = "club"`.

✅ **Mock côté front** : `src/data/mockOffres.js` (Sprint α.1.5) contient **1 offre Module C** : `offre-club-001` chateauSlug `les-briottieres`, titre "Soirée privée des Vendanges", prix 850 €.

**État réel des offres Club** :
- Supabase prod : 0 offre Module C seedée (seul `offre-bri-001` Module B seedée, cf migration `2026-05-09-seed-offre-briottieres.sql`)
- mockOffres.js : 1 offre Module C front-only
- ClubMembres : ignore complètement ces 2 sources, dérive ses cards depuis les **prix du chateau** (Module B-style)

→ **Triple incohérence**. À unifier sur Supabase `public.offres` post-refonte.

---

## H. Dépendances externes auth + variables d'env

### H.1 — package.json deps auth

```json
"@supabase/supabase-js": "^2.105.4"
```

**Seule dépendance auth.** Aucun `firebase`, `auth0`, `next-auth`, `lucia`, `clerk`, `gotrue`, `magic-sdk` installé.

### H.2 — Variables d'env auth

`.env.example` :
```
VITE_SUPABASE_URL=https://ynoieryxfqiqjscqieum.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...REPLACE_WITH_YOUR_ANON_KEY
```

**Pas d'autres clés tierces auth.** Pas de `VITE_AUTH0_*`, `VITE_FIREBASE_*`, etc.

---

## I. Tests E2E touchant l'auth ou le Club

### I.1 — Liste exhaustive (état `main`)

| Fichier | Couverture | Touche auth/Club ? |
|---------|------------|--------------------|
| `_helpers.cjs` | helpers utilitaires (`ouvrirVitrine`, `getChateaux`) | ❌ non |
| `blanc-buisson.spec.cjs` | Vitrine premium Le Blanc Buisson (id 8) | ❌ non |
| `briottieres.spec.cjs` | Vitrine premium Briottières (id 7) | ❌ non |
| `chateaux-modal-smoke.spec.cjs` | Modal `ChateauModal` pour les 6 mocks id 1-6 | ❌ non |
| `s2-alpha-1-5-onglets-vitrine.spec.cjs` | Vitrine 2 niveaux onglets, 12 tests dont **Test 5** sur modale stub Club VitrineChateau (`.vc3-reserve-modal` contenant "Club Châtelain") + Test 4 fallback `?onglet=club` | ✅ **Club** (UI modale stub, pas auth) |
| `s2-alpha-1-routing-smoke.spec.cjs` | Routes S2-α.1 : `/mon-compte`, `/chatelain/dashboard`, `/reserver/:slug`. Tests adaptés Phase 5.1 (vérifient redirect post-RequireAuth — sur branche α.2 seulement) | ✅ **routing auth** (sur main : stubs) |
| `vitrines-tous-chateaux.spec.cjs` | Tests paramétrés sur tous les estLaUne | ❌ non |

**Aucun test E2E ne touche AuthModal, ClubChatelains, ClubBienvenue ou ClubMembres** (Système A).

### I.2 — Verdict par fichier post-refonte

| Fichier | Verdict | Raison |
|---------|---------|--------|
| `_helpers.cjs` | **Garder tel quel** | helpers réutilisables |
| `blanc-buisson.spec.cjs` | **Garder** | scope vitrine, pas auth |
| `briottieres.spec.cjs` | **Garder** | idem |
| `chateaux-modal-smoke.spec.cjs` | **Garder** | scope mocks 1-6 modal |
| `s2-alpha-1-5-onglets-vitrine.spec.cjs` | **Adapter** Test 4 + Test 5 : la modale stub Club Châtelain disparaît au profit d'une redirection `/connexion` (si non-connecté) ou rendu ContenuClub direct (si membre Supabase). Réécrire les assertions modale. | UI stub change |
| `s2-alpha-1-routing-smoke.spec.cjs` | **Garder** (déjà adapté Phase 5.1 sur α.2) | comportement RequireAuth Sprint α.2 |
| `vitrines-tous-chateaux.spec.cjs` | **Garder** | scope vitrine paramétrée |

Sur la branche `feature/s2-alpha-2-auth-supabase`, ajout de `tests/e2e/s2-alpha-2-auth.spec.cjs` (6 tests, Mini-Phase 6.1) qui couvre déjà `/connexion`, `/auth/callback`, RequireAuth, localStorage + `?next=` fallback. **À conserver** post-refonte (peut nécessiter ajout d'1-2 tests sur `/club` public + `/le-cercle` privé).

---

## J. Recommandations synthétiques

### J.1 — Mémo refonte (5-8 lignes)

**À garder** :
- Sprint α.2 acquis : `AuthContext`, `Connexion.jsx`, `AuthCallback.jsx`, `RequireAuth.jsx`, `useClubMember`, localStorage `lcc_auth_next`, whitelist anti open-redirect, table Supabase `public.users` + enum `user_role` (avec `membre_club`).
- Table `public.offres` (architecture multi-modules) et `mockOffres.js` côté front.

**À supprimer** (Système A complet) :
- `src/components/AuthModal.jsx` (~340 lignes)
- `src/components/ClubChatelains.jsx` (~300 lignes)
- `src/components/ClubBienvenue.jsx` (~50 lignes, animation transition post-login)
- `src/components/ClubMembres.jsx` (~250 lignes)
- States `App.jsx` : `authOuvert`, `authMode`, `userConnecte`, `clubOuvert`, `clubBienvenueOuvert`, `clubMembresOuvert` (+ handlers `ouvrirAuth`, `gererConnexion`)
- Props Header `onConnexion`, `onOuvrirClub` à remplacer par navigation router.
- Const `NIVEAUX` dupliquée (AuthModal + ClubChatelains) → source unique côté Supabase `loyalty_levels`.

**À créer** :
- Route + page `/club` publique éditoriale (reprise du contenu `ClubChatelains` onglets Présentation/Avantages/Niveaux/Aperçu, **lue depuis Supabase loyalty_levels**).
- Route + page `/le-cercle` privée (`<RequireAuth>`) reprenant le contenu `ClubMembres` (profil + niveau + points + offres Module C agrégées + historique réservations placeholder α.3).
- Composant `<HeaderUserMenu>` auth-aware (avatar/nom + dropdown si user connecté, sinon "Connexion" + "Rejoindre" CTA renvoyant vers `/club`).
- Tables Supabase `loyalty_levels` (4 lignes Blue/Silver/Gold/Platinum), `loyalty_user_state` (FK auth.users + niveau + points + numéro membre auto-incrémenté), `loyalty_history` (trigger sur `reservations` pour incrémenter points).
- Service `loyaltyService.js` côté front pour lire le state membre.
- Adaptation `chateauxService` pour exposer les offres Module C depuis `public.offres`.

### Risques principaux

1. **Perte UX éditoriale `ClubChatelains`** : 4 onglets riches (Présentation, Avantages, Niveaux & progression, Aperçu offres) avec du contenu marketing soigné. Doit être porté intégralement vers `/club` public — risque de raccourcir le contenu et perdre l'aspect "patrimonial" (cf mémoire `feedback_editorial_voice`).

2. **Animation `ClubBienvenue`** (3.8s transition fade lys + nom) très soignée. Ne s'intègre pas naturellement dans un flow magic link (le user revient via `/auth/callback`, pas après un submit form). Soit on la garde post-callback (déclenchée par première connexion détectée DB), soit on l'abandonne. Décision UX éditoriale à arbitrer avec Tanguy.

3. **Numérotation membres `LDCC-NNNN` vs UUID Supabase** : le format actuel "N° 2835" est cosmétique mais hum-friendly. UUID Supabase (`auth.users.id`) est opaque. Options : (a) ignorer le matricule (`user.email` + `niveau` suffisent), (b) ajouter une colonne `numero_membre serial` auto-incrémenté dans `public.users` ou `loyalty_user_state`. Choix business à valider.

### J.2 — Estimation horaire refonte Claude Code

Tâches détaillées (fourchette basse — haute) :

| Tâche | Bas | Haut |
|-------|-----|------|
| Setup `/club` publique éditoriale (4 onglets repris) | 2.5 h | 3.5 h |
| Setup `/le-cercle` espace membre (profil + offres + historique stub) | 3 h | 4 h |
| Header refactor : bouton Connexion → `<Link to="/connexion">`, Rejoindre → `<Link to="/club">`, ajout `<HeaderUserMenu>` auth-aware | 1.5 h | 2.5 h |
| Tables Supabase loyalty_* : schema + RLS + seed 4 niveaux + trigger réservation→points + migration .sql | 2 h | 3 h |
| Hook `useLoyalty()` + service `loyaltyService.js` côté front | 1 h | 1.5 h |
| Adaptation `chateauxService` exposer offres Module C depuis `public.offres` | 1 h | 1.5 h |
| Tests E2E : adapter Test 4/5 spec α.1.5 + nouveau spec `s2-alpha-2-5-club.spec.cjs` (Tests `/club` public + `/le-cercle` privé + Header buttons) | 2 h | 3 h |
| Cleanup : `git rm` AuthModal + ClubChatelains + ClubBienvenue + ClubMembres + CSS associés + states App.jsx + props Header | 0.5 h | 1 h |
| qa:fast + test manuel preview Vercel + ajustements | 1.5 h | 2 h |
| Commit + push + PR + body + mémoires LCC enrichies | 1 h | 1.5 h |

**Total fourchette : 15 h – 23 h** Claude Code.

Hypothèses :
- Pas de design Tanguy attendu (réutilisation tokens vc3/vc4 + design Club existant).
- Animation `ClubBienvenue` abandonnée (sinon +1h pour le porter).
- Pas de migration de comptes utilisateurs (cf A.6 : 0 compte persisté).
- Brevo SMTP custom différé (cf dette α.2 — magic link Supabase built-in suffisant pour démo).

---

## Annexe — Branches et SHAs de référence

| Repère | SHA | Description |
|--------|-----|-------------|
| Tag `pre-s2-alpha-1-5` | `3512df9` | État avant Sprint α.1.5 |
| Merge PR #23 sur main | `358a847` | Sprint α.1.5 livré |
| Tag `pre-s2-alpha-2` | `358a847` | État avant Sprint α.2 |
| Branche α.2 HEAD | `44d6d29` | Sprint α.2 complet (8 commits) |
| Tag `pre-s2-alpha-2-phase-6-1` | `db9c37b` | Pré Mini-Phase 6.1 (filet rollback) |

---

*Rapport généré le 2026-05-15 sur branche `audit/refonte-club-discovery`. Aucun code applicatif modifié.*
