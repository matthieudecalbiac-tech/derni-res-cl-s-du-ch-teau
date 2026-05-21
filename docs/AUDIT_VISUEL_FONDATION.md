# Audit visuel pré-meeting Fondation du Patrimoine

> **Contexte** — Meeting Fondation du Patrimoine à J+3. Démo live de la plateforme
> en visioconférence (partage d'écran). Cet audit recense **tout ce qui pourrait
> gêner la démo**, classé P0 (bloquant) / P1 (visible non-bloquant) / P2
> (perfectionniste). **Audit en LECTURE SEULE — aucun patch appliqué ici.**
>
> Branche : `audit/visuel-fondation-j1` · Base : `main` `b7b3b6f` (post-merge α.2
> + hotfix build top-level await) · Date : 21 mai 2026.

---

## Synthèse exécutive

| Niveau | Nombre |
|---|---|
| **P0 — bloquant démo** | **2** |
| **P1 — visible non-bloquant** | **7** |
| **P2 — perfectionniste** | **7** |

**Temps estimé patches P0 :** ~1 h – 1 h 15 (les deux cumulés).
**Temps estimé P0 + sélection P1 rapides & Fondation-sensibles (P1-1, P1-4, P1-5) :** ~1 h 45 – 2 h.

**Recommandation J2 matin :** patcher **les 2 P0 + P1-1 (chiffres home), P1-4 (wording
Fondation /connexion), P1-5 (coquilles Blanc Buisson)**. Ces trois P1 sont rapides
(~30 min cumulés) et directement exposés soit sur le parcours démo, soit à la
crédibilité face à la Fondation. Le reste des P1/P2 est reportable post-meeting.

### Les 5 risques majeurs pour la démo

1. **Transition entre onglets de la vitrine premium qui « saute »** (P0-1) — sur
   le cœur même du parcours démo (vitrine Briottières / Blanc Buisson). Signalé
   par Matthieu.
2. **Clic sur un château mock dans « Les Dernières Clés » → redirige vers la
   home** (P0-2) — landmine dans un des 3 produits phares ; 6 châteaux sur 8
   renvoient à l'accueil quand on les clique.
3. **Système A encore câblé sur le Header** (P1-2) — le bouton « Connexion » de
   l'en-tête ouvre l'ANCIENNE modale mot de passe (avec login fictif), pas le
   nouveau magic link α.2.
4. **Incohérence des chiffres sur la home** (P1-1) — « 81 domaines » (Hero) vs
   « 31 demeures » (Bandeau + Heure aux demeures), sur la même page. Risque de
   crédibilité face à un partenaire institutionnel.
5. **Placeholders de routes au look « dev »** (P1-3) — badge monospace affichant
   le chemin brut + « Écran en attente d'implémentation ».

---

## P0 — Bloquant démo (à patcher impérativement J2)

### P0-1 — Transition entre onglets de la vitrine premium « saute »

- **Élément** — Vitrine premium (`VitrineChateau`), bascule entre les onglets
  Niveau 1 : Permanent ↔ Dernières Clés ↔ Club Châtelains.
- **Fichiers** — `src/services/offresService.js`,
  `src/components/vitrine/ContenuDernieresCles.jsx`,
  `src/components/vitrine/ContenuClub.jsx`,
  `src/components/vitrine/OngletsNiveau1.jsx`,
  `src/components/VitrineChateau.jsx`, `src/styles/vitrine-onglets.css`.
- **Problème observé** — Quatre causes cumulées (« l'affichage n'est pas
  instantané et les offres sautent un peu », dixit Matthieu) :
  1. **Latence mock artificielle** — `offresService.js` ligne 8 :
     `LATENCE_MOCK_MS = 200`. Chaque appel `getOffresPourChateau` /
     `compterOffresPourChateau` attend 200 ms. Résultat : à chaque clic sur
     « Dernières Clés » ou « Club », `ContenuDernieresCles`/`ContenuClub`
     affichent `<p class="vc4-loading">Chargement des offres…</p>` pendant
     ≥ 200 ms avant les cartes.
  2. **Aucun cache** — les offres sont re-fetchées à chaque montage du
     composant. Revenir sur un onglet déjà visité ré-affiche « Chargement… ».
  3. **Remount complet** — le rendu conditionnel
     `{moduleEffectif === "x" && <Contenu… />}` démonte/remonte entièrement le
     sous-composant à chaque switch (`offres` repart à `null`).
  4. **Aucun `min-height` sur la zone de contenu** — `.vc4-contenu-permanent`,
     `.vc4-contenu-dc`, `.vc4-contenu-club` n'ont pas de hauteur minimale. Les
     trois contenus ont des hauteurs différentes → reflow vertical (« ça
     saute ») de tout ce qui suit (`IntroTroncCommun`, Niveau 2, `ContenuTheme`).
     Aucune transition CSS de fondu entre contenus.
- **Fix proposé** —
  (a) `LATENCE_MOCK_MS = 0` dans `offresService.js` (la latence mock ne sert
      qu'aux tests de loading state — inutile et nuisible en démo) ;
  (b) ajouter un cache module-level dans `offresService.js` (Map clé
      `slug+module`) pour que le 2ᵉ accès soit immédiat ;
  (c) ajouter un `min-height` au conteneur de contenu d'onglet dans
      `vitrine-onglets.css` pour absorber le reflow ;
  (d) optionnel — un fondu CSS court (`opacity` transition) sur le swap.
- **Estimation — 30 min** (a+b+c ; le fondu (d) ajoute ~15 min si retenu).

### P0-2 — Clic sur un château mock dans « Dernières Clés » / « Club Membres » → redirige vers la home

- **Élément** — Listes de châteaux dans l'overlay `DernieresCles` (et
  `ClubMembres`, Système A).
- **Fichiers** — `src/components/VitrineChateauRoute.jsx`,
  `src/components/DernieresCles.jsx`, `src/components/ClubMembres.jsx`.
- **Problème observé** — `VitrineChateauRoute.jsx:23` :
  `if (!chateau.estLaUne) return <Navigate to="/" replace />;`. Or `DernieresCles`
  liste **les 8 châteaux** (filtre par date uniquement) et chaque clic appelle
  `navigate('/chateau/<slug>?onglet=dernieresCles')`. Pour les 6 châteaux mocks
  (id 1-6, `estLaUne: false`), la route les renvoie immédiatement vers `/`.
  Conséquence : l'overlay se ferme, l'utilisateur clique un château… et atterrit
  sur la home. Effet « lien cassé ». Idem pour les marqueurs de la carte Leaflet
  (`ouvrirChateauModuleB`) et pour `ClubMembres` (`ouvrirChateauModuleC`).
- **Fix proposé** — Option recommandée : **filtrer la liste `DernieresCles` aux
  châteaux ayant réellement une offre Module B** (`modules.dernieresCles === true`
  → Briottières + Blanc Buisson uniquement). Cohérent avec la stratégie
  « Dernières Clés rares par nature ». Pour `ClubMembres` (Système A, neutralisé
  J2), même logique ou neutralisation directe. Alternative plus lourde : faire
  rendre `ChateauModal` aux mocks dans `VitrineChateauRoute` (TODO α.2 ligne 22).
- **Estimation — 30 min** (option filtre).

---

## P1 — Visible mais non-bloquant (patches sélectionnés J2 si temps)

### P1-1 — Incohérence des chiffres affichés sur la home

- **Élément** — Compteurs éditoriaux hardcodés.
- **Fichiers** — `Hero.jsx:85` (« 81 »), `BandeauOffres.jsx:21` (« 31 demeures »),
  `HeureAuxDemeures.jsx:188` (« TRENTE-ET-UNE DEMEURES »),
  `VitrinePermanente.jsx:57,59` (« 81 » / « 7 Régions »), `APropos.jsx:55`
  (« 81 »), `PartenairesChateaux.jsx:122` (« 81 »).
- **Problème observé** — Deux nombres différents (**81** et **31**) pour la même
  réalité, visibles sur la **même page** (Hero puis Bandeau puis Heure aux
  demeures). Par ailleurs la plateforme ne contient que **8 châteaux** réels —
  annoncer « 81 domaines sélectionnés » à un partenaire institutionnel qui peut
  vérifier est un risque de crédibilité.
- **Fix proposé** — Unifier sur une valeur unique et défendable (décision
  Matthieu/Dimitri). Dette déjà tracée (CLAUDE.md « Cibles éditoriales depuis
  Espace Admin Phase 5.x ») — ici, simple uniformisation du wording.
- **Estimation — 15 min.**

### P1-2 — Header « Connexion » et « Rejoindre le Club » câblés sur le Système A

- **Élément** — Boutons de l'en-tête persistant.
- **Fichiers** — `App.jsx:96` (`onConnexion={() => ouvrirAuth("connexion")}`),
  `App.jsx:89` (`onOuvrirClub`), `Header.jsx:120,123`.
- **Problème observé** — Le bouton **« Connexion »** du Header ouvre l'ancienne
  modale `AuthModal` (Système A : formulaire mot de passe, login simulé qui
  hardcode « Matthieu de Calbiac · Silver · 3 réservations »). Le bouton
  **« Rejoindre le Club »** ouvre l'overlay `ClubChatelains` (Système A). Le
  nouveau parcours magic link α.2 (`/connexion`) n'est atteignable que par la
  modale stub « Club Châtelain » de la vitrine premium, par URL directe, ou par
  `RequireAuth`. Pendant la démo, le Header est toujours visible → un clic sur
  « Connexion » montre l'ancien système.
- **Fix proposé** — Re-câbler « Connexion » → `navigate('/connexion')` ; « Rejoindre
  le Club » → nouvelle entrée Club discovery (cible de la refonte J2) ou
  `/connexion`. **C'est précisément le périmètre de la branche
  `audit/refonte-club-discovery` / neutralisation Système A prévue J2.**
- **Estimation — 15-20 min** (re-câblage) — intégré au chantier J2 Club.

### P1-3 — Placeholders de routes S2 au look « développeur »

- **Élément** — Écrans des routes transactionnelles non implémentées.
- **Fichiers** — `src/components/placeholders/RoutePlaceholder.jsx` (+ 5
  composants : `BookingFlowPlaceholder`, `BookingConfirmationPlaceholder`,
  `ClientAccountPlaceholder`, `OwnerDashboardPlaceholder`,
  `AdminDashboardPlaceholder`), `src/styles/s2-placeholder.css`.
- **Problème observé** — `RoutePlaceholder` affiche le **chemin brut en
  monospace** (ex. `/admin/dashboard`) + le texte « Écran en attente
  d'implémentation — Sprint S2-α.2 / α.3. ». Très « dev ». Atténuation : aucune
  de ces routes (`/reserver/:slug`, `/reservation/:id/confirmation`,
  `/mon-compte`, `/chatelain/dashboard`, `/admin/dashboard`) n'est liée depuis
  l'UI — elles ne sont atteignables qu'en tapant l'URL. Risque réel surtout si
  l'on tape une URL ou si un `?next=` pointe vers une route protégée.
- **Fix proposé** — Rendre `RoutePlaceholder` patrimonial : retirer le badge
  monospace + le wording sprint, remplacer par une carte sobre (lys ⚜ + « Cet
  espace ouvre prochainement »). Ou simplement ne pas naviguer vers ces routes
  pendant la démo.
- **Estimation — 25 min** (placeholder patrimonial).

### P1-4 — Wording Fondation incorrect sur `/connexion`

- **Élément** — Pied de page de la page magic link α.2.
- **Fichiers** — `src/components/auth/Connexion.jsx:85` et `:184`.
- **Problème observé** — Le footer affiche « ⚜ Une partie de **chaque
  réservation** est reversée à la Fondation du Patrimoine ». La règle de voix
  éditoriale (CLAUDE.md, non négociable) impose **toujours « une partie de nos
  recettes »**. `/connexion` est sur le parcours démo α.2 et le sujet est
  Fondation-sensible.
- **Fix proposé** — Remplacer par « Une partie de nos recettes est reversée à la
  Fondation du Patrimoine » (×2 occurrences).
- **Estimation — 5 min.**

### P1-5 — Coquilles dans la vitrine Blanc Buisson (sur le parcours démo)

- **Élément** — Texte éditorial du château id 8, visible sur
  `/chateau/blanc-buisson` (parcours de validation α.2).
- **Fichiers** — `src/data/chateaux.js`.
- **Problème observé** — Coquilles dans l'histoire / les chambres / les
  alentours de Blanc Buisson, et une dans Briottières :
  - l. 1216 « échauguéttes » → « échauguettes »
  - l. 1216 « mélant » → « mêlant »
  - l. 1216 « Góthique » → « gothique »
  - l. 1244 « fenêtres à méneaux » → « meneaux »
  - l. 1301 « Vernón — vieille ville » → « Vernon »
  - l. 1176 « L'antééthèse » (Briottières, alentours) → « L'antithèse »
- **Fix proposé** — Corrections directes dans `chateaux.js` (Edits ciblés).
- **Estimation — 10 min.**

### P1-6 — Bandeau Fondation absent de la vitrine premium

- **Élément** — Vitrine premium `VitrineChateau`.
- **Fichiers** — `src/styles/vitrine-chateau.css:231-234` (CSS `.vc3-fondation*`
  présente), aucun composant JSX consommateur.
- **Problème observé** — La classe `.vc3-fondation` existe dans le CSS mais
  **aucun composant ne rend ce markup** — il a vraisemblablement été retiré lors
  de la refonte α.1.5 (2 niveaux d'onglets). Conséquence :
  `/chateau/blanc-buisson` et `/chateau/les-briottieres` n'affichent **pas** de
  bandeau Fondation (seule subsiste la petite ligne « Une partie sera reversée… »
  dans la modale de réservation, `VitrineChateau.jsx:269`). À savoir avant le J2
  où l'on prévoit d'ajouter le logo Fondation : il faudra **re-créer le markup**,
  le CSS est déjà prêt.
- **Fix proposé** — Re-poser un bloc `.vc3-fondation` dans `VitrineChateau` (ou un
  sous-composant `vitrine/`), wording « une partie de nos recettes » + mention
  « partenariat en cours de discussions » si pertinent + emplacement logo.
- **Estimation — 20-30 min** (chantier J2).

### P1-7 — Footer minimal — mentions légales / RGPD absentes

- **Élément** — `PiedPatrimoine` (footer de la home).
- **Fichiers** — `src/components/PiedPatrimoine.jsx`, `src/styles/pied-patrimoine.css`.
- **Problème observé** — Le footer ne contient **que** la ligne Fondation. Pas de
  mentions légales, CGU, politique de confidentialité, copyright, ni contact.
  Pour la **démo** : ce n'est pas cassé — le footer patrimonial épuré paraît
  intentionnel. Pour la **prod** : dette RGPD réelle (mentions légales
  obligatoires). _(L'auteur du brief d'audit suggérait P0 ; classé P1 ici car
  non bloquant pour une démo — mais à traiter impérativement avant mise en prod
  publique.)_
- **Fix proposé** — Footer complet post-meeting : liens mentions légales / CGU /
  confidentialité / contact + copyright.
- **Estimation — 1-2 h** (post-meeting).

---

## P2 — Perfectionniste (reporté post-meeting, α.2.5+)

### P2-1 — Emoji dans la copy (violation voix éditoriale « pas d'emoji »)

- **Fichiers / occurrences** — `ChateauModal.jsx` : ⏳ (l.361), 🗝 (l.449),
  📍 (l.337) · `AuthModal.jsx` : 🏰 logo (l.178) · `ClubChatelains.jsx` :
  🔒 (l.322).
- **Problème** — La voix éditoriale interdit les emoji dans la copy. Note :
  `AuthModal` et `ClubChatelains` sont Système A → les emoji disparaîtront avec
  la neutralisation J2. Reste `ChateauModal` (vitrine mock).
- **Fix** — Remplacer par les glyphes maison (⚜ ◆ ✦) ou retirer.
- **Estimation — 10 min** (ChateauModal seul).

### P2-2 — Tropes d'urgence dans `ChateauModal`

- **Fichiers** — `ChateauModal.jsx:360-366` (`cp-resa-urgence` : « Plus que X
  chambres » + ⏳).
- **Problème** — La voix éditoriale interdit les tropes d'urgence (« vite »,
  « plus que X »).
- **Fix** — Reformuler en patrimonial neutre ou retirer le bloc.
- **Estimation — 10 min.**

### P2-3 — Apostrophes droites vs courbes

- **Fichiers** — `src/data/chateaux.js`.
- **Problème** — Les châteaux mocks (id 1-6) utilisent l'apostrophe droite `'`,
  les premium (id 7-8) l'apostrophe courbe `’`. Incohérence typographique.
- **Fix** — Codemod `.cjs` d'uniformisation (apostrophe courbe partout) — pass
  éditorial Tanguy.
- **Estimation — 30 min.**

### P2-4 — Coquilles mineures supplémentaires

- **Fichiers** — `APropos.jsx:265` « patrimoine **bati** » → « bâti » ·
  `chateaux.js:1087-1088` « au **coeur** » → « cœur » (Briottières) ·
  `chateaux.js:1124` « à **portee** de fenêtre » → « portée ».
- **Estimation — 5 min.**

### P2-5 — Code mort : `VitrineClub` / `VitrineDernieresCle` orphelins

- **Fichiers** — `src/components/VitrineClub.jsx`,
  `src/components/VitrineDernieresCle.jsx`.
- **Problème** — `ClubMembres` ne déclenche jamais `transitionChateau` (le
  setter `setTransitionChateau` n'est jamais appelé) → `VitrineClub` est mort.
  `DernieresCles` utilise `navigate(...)` → `VitrineDernieresCle` orphelin.
  Dette déjà tracée (nettoyage Sprint S5).
- **Fix** — Suppression Sprint S5 (pattern 2 commits de purge).

### P2-6 — Images Unsplash dupliquées / génériques

- **Fichiers** — `src/data/chateaux.js`.
- **Problème** — `photo-1566073771259-6a8506099945` réutilisée sur 5 châteaux
  (Vaux, Pierrefonds, Chantilly, Fontainebleau **et Briottières** image[2]).
  Dette déjà tracée (pass éditorial Tanguy Phase 6.x).
- **Fix** — Pass éditorial Tanguy.

### P2-7 — `ClubChatelains` : conflation de marque

- **Fichiers** — `ClubChatelains.jsx:187-188`.
- **Problème** — « **Les Dernières Clés du Château** propose deux façons
  d'accéder… » conflate la marque (« Les Clés du Château ») avec le produit
  (« Dernières Clés »). Système A — disparaîtra à la neutralisation J2.

---

## État détaillé par route / modale

### Routes (react-router)

| Élément | Type | Verdict | Note |
|---|---|---|---|
| `/` (home + overlays) | Route | OK · P1-1 | Hero / Bandeau / Citation / UneDeLaSemaine / HeureAuxDemeures / footer rendent OK. Incohérence chiffres 81/31. |
| `/chateau/les-briottieres` | Route | OK · P0-1 | Vitrine premium. Transition onglets à corriger. |
| `/chateau/blanc-buisson` | Route | OK · P0-1 · P1-5 | Vitrine premium (hero iframe YouTube). Transition onglets + coquilles. |
| `/chateau/vaux-le-vicomte` | Route | ⚠ P0-2 | Mock `estLaUne:false` → redirige vers `/`. |
| `/chateau/pierrefonds` | Route | ⚠ P0-2 | Idem — redirige vers `/`. |
| `/chateau/chantilly` | Route | ⚠ P0-2 | Idem — redirige vers `/`. |
| `/chateau/fontainebleau` | Route | ⚠ P0-2 | Idem — redirige vers `/`. |
| `/chateau/ferte-saint-aubin` | Route | ⚠ P0-2 | Idem — redirige vers `/`. |
| `/chateau/pierreclos` | Route | ⚠ P0-2 | Idem — redirige vers `/`. |
| `/connexion` | Route | OK · P1-4 | Page magic link α.2, soignée et patrimoniale. Wording Fondation à corriger. |
| `/auth/callback` | Route | OK | Handler magic link propre (timeout 10 s, anti open-redirect). |
| `/mon-compte` | Route (auth) | P1-3 | Placeholder « dev ». Non liée depuis l'UI. |
| `/chatelain/dashboard` | Route (auth+role) | P1-3 | Placeholder « dev ». `RequireRole` est un stub passant. |
| `/admin/dashboard` | Route (auth+role) | P1-3 | Placeholder « dev ». Non liée. |
| `/reserver/:slug` | Route | P1-3 | Placeholder « dev ». Non liée, non auth-gated. |
| `/reservation/:id/confirmation` | Route | P1-3 | Placeholder « dev ». Non liée. |

### Modales burger menu (7 items)

| Élément | Type | Verdict | Note |
|---|---|---|---|
| Vitrines permanentes | Overlay `VitrinePermanente` | OK | Grille des 8 châteaux. Aiguillage `estLaUne` correct (premium → `VitrineChateau`, mock → `ChateauModal`). Affiche « 81 » (P1-1). |
| Les Dernières Clés | Overlay `DernieresCles` | ⚠ P0-2 | Calendrier + liste 8 châteaux + carte Leaflet. Clic sur mock → bounce home. |
| Club des Châtelains | Overlay `ClubChatelains` | P1-2 (Système A) | Overlay complet (4 onglets, niveaux Blue/Silver/Gold/Platinum). Système parallèle — à neutraliser J2. |
| Conciergerie | Overlay `Services` | OK | Contenu complet (5 prestations). |
| Les Clés de l'Événementiel | Overlay `ClesEvenementiel` | OK | Contenu complet. Châteaux événementiels = mocks invented (hors périmètre court terme). |
| À propos | Overlay `APropos` | OK · P1-1 · P2-4 | Contenu riche et bien écrit. Chiffre « 81 ». Coquille « bati ». |
| Propriétaires | Overlay `PartenairesChateaux` | OK · P1-1 | Page recrutement partenaires complète (3 configs + formulaire). Chiffre « 81 ». |

### Modales overlay home — Système A (à neutraliser J2)

| Élément | Type | Verdict | Note |
|---|---|---|---|
| `AuthModal` | Modale Système A | P1-2 / P2-1 | Auth mot de passe parallèle. Login simulé hardcode « Matthieu de Calbiac · Silver ». Emoji 🏰. Atteignable via Header « Connexion ». |
| `ClubChatelains` | Overlay Système A | P1-2 / P2-1 / P2-7 | Voir burger menu ci-dessus. Emoji 🔒. |
| `ClubBienvenue` | Animation Système A | OK | Fondu lys + nom, 3,8 s. Déclenché après login Système A uniquement. |
| `ClubMembres` | Overlay Système A | P0-2 (Système A) | « Vos offres exclusives », calendrier + 8 châteaux. Clic mock → bounce home. |
| `CompteUser` | Overlay Système A | — | Atteignable seulement après login Système A (`userConnecte`). |

### Vitrines & composants transverses

| Élément | Type | Verdict | Note |
|---|---|---|---|
| `VitrineChateau` (premium) | Composant | P0-1 / P1-6 | Onglets N1 (Permanent/DC/Club) + N2 (Aperçu/Histoire/Famille/Lieu/Services/Chambres). Transition saute. Bandeau Fondation absent. |
| `ChateauModal` (mock id 1-6) | Composant | OK · P2-1 · P2-2 | Modale s'ouvre proprement, photos OK, contenu OK. Emoji + tropes d'urgence. Les 8 châteaux ont un schéma data complet (images, prixBarre, chambres) — pas de crash. |
| `TransitionPorte` | Animation | OK | Animation porte 3,5 s + carte France SVG. |
| Console runtime | — | OK | 0 `console.log` résiduel. Les 3 `console.error` (`AuthContext`, `lib/supabase`, `chateauxService`) sont du logging d'erreur légitime. |
| Images locales `/public/` | Assets | OK | Les 9 fichiers référencés (`bri-*`, `bb-*`) existent tous sur disque. |

### Cas particulier — Chantilly (id 3), futur vitrine partenaire Fondation J2 PM

- **État actuel** — Mock `estLaUne: false`, schéma data **complet et de bonne
  qualité éditoriale** : histoire riche (Montmorency / Grand Condé / duc d'Aumale
  / Institut de France), `description`, `timeline` 7 entrées, `chiffresCles` 4,
  `proprietaires` (citation + description), 3 chambres (450/620/890 €),
  6 activités, 4 alentours détaillés, `regionNarrative` + `regionHistoire`.
- **Suffisant pour devenir vitrine partenaire ?** — **Contenu éditorial : oui,
  de qualité.** Faiblesses à traiter J2 PM :
  1. Ouvre actuellement en `ChateauModal` (layout mock), pas en `VitrineChateau`
     premium — `estLaUne` est `false`. Bascule possible : Chantilly possède déjà
     `chiffresCles`, `ville`, `regionNarrative/Histoire`, `proprietaires.initiale`
     / `nomAffiche`, `alentours[].icone` ; il manque `proprietaires.nbGenerations`
     et `modules.dernieresCles/club` si l'on veut les onglets.
  2. **Photos** : 3 URLs Unsplash dont une (`photo-1566073771259…`) partagée par
     5 châteaux — à remplacer par des photos propres à Chantilly.
- **Verdict** — Base solide ; J2 PM = décider le flip `estLaUne` + remplacer les
  photos + compléter 1-2 champs premium.

---

## Recommandations stratégiques pour la démo

### Pages / actions à éviter de cliquer pendant la démo

- **Ne pas cliquer un château mock dans « Les Dernières Clés »** (Vaux,
  Pierrefonds, Chantilly, Fontainebleau, Ferté-St-Aubin, Pierreclos) tant que
  P0-2 n'est pas corrigé → bounce vers la home.
- **Ne pas utiliser le bouton « Connexion » / « Rejoindre le Club » du Header**
  tant que P1-2 n'est pas re-câblé → ouvre le Système A (vieille modale mot de
  passe / login fictif).
- **Ne pas taper d'URL** `/reserver/…`, `/mon-compte`, `/admin/dashboard`, etc.
  → placeholder « dev ».

### Parcours démo optimal (5-7 clics, narratif fluide)

1. **Home** — montrer le Hero (vidéo), scroller jusqu'au Bandeau « Trois façons
   de franchir le seuil » et à « La une de la semaine ».
2. **Cliquer Briottières ou Blanc Buisson** dans « La une de la semaine »
   → animation `TransitionPorte` → **vitrine premium**.
3. **Parcourir les onglets** Permanent → Dernières Clés (après fix P0-1).
4. **Onglet Club Châtelains** → modale stub « Bienvenue au Club » →
   bouton **« Se connecter → »**.
5. **`/connexion`** — formulaire magic link α.2 (la story d'authentification
   livrée cette semaine).
6. Optionnel : montrer un overlay riche du burger (À propos, ou Conciergerie).

### Écrans à protéger par captures statiques de secours

- La **transition entre onglets** de la vitrine premium (si P0-1 n'est pas
  totalement réglé J2 matin) — avoir une capture propre de chaque onglet.
- L'écran **`/connexion`** et le **succès magic link** — au cas où l'envoi
  d'email serait lent en live.
- Une vue propre de la **vitrine Blanc Buisson** (hero + onglets) comme filet.

---

_Audit réalisé le 21 mai 2026 — lecture seule, 0 patch appliqué. Branche
`audit/visuel-fondation-j1`. À valider par Matthieu avant exécution des patches
J2 matin._
