# AUDIT PHASE 3 — chateauxService.js (8 mai 2026)

Audit lecture seule en préparation de Phase 4 (refactor service vers Supabase).

## 1. État actuel

| Élément | Valeur |
|---|---|
| Source de données | `src/data/chateaux.js` (1 291 lignes, ESM) |
| Service | `src/services/chateauxService.js` (87 lignes) |
| Cache | **aucun** (chaque appel re-lit `chateauxData` en mémoire) |
| Latence simulée | `VITE_FAKE_LATENCY` ms (lu une fois au load via IIFE, L21-26) |
| Pattern async | toutes les fonctions sont `async` depuis Phase 2.3 (4 mai 2026) |
| Pattern erreur | `{ data, loading, error }` exposé par les hooks (pas le service) |

## 2. Interface publique (4 fonctions)

| Fonction | Params | Return | Notes |
|---|---|---|---|
| `getChateaux({ excludeMocks })` | `{ excludeMocks?: bool=false }` | `Promise<Chateau[]>` | Filtre `isDemoMock` côté client |
| `getChateauBySlug(slug)` | `string` | `Promise<Chateau \| null>` | `0 consommateurs` actuellement (préparé Phase 3+ URLs SEO) |
| `getChateauById(id)` | `number` | `Promise<Chateau \| null>` | Pattern dominant via `useChateauById` |
| `getCompteurs({ excludeMocks })` | `{ excludeMocks?: bool=false }` | `Promise<Compteurs>` | 7 champs : `total`, `parRegion`, `regionsCouvertes`, `urgences`, `urgentesJ7`, `chambresRestantes`, `chambresUrgentes` |

## 3. Consommateurs

### Niveau 1 — Hooks (2 fichiers, seuls importateurs directs du service)
- `src/hooks/useChateaux.js` (3 hooks : `useChateaux`, `useChateau`, `useChateauById`)
- `src/hooks/useCompteurs.js` (1 hook)

Aucun composant n'importe `chateauxService.js` directement (règle CLAUDE.md respectée).

### Niveau 2 — Composants (6 fichiers, via hooks)
| Fichier | Hook | Ligne |
|---|---|---|
| `src/components/BandeauOffres.jsx` | `useCompteurs()` | 5 |
| `src/components/ClubMembres.jsx` | `useChateaux()` | 63 |
| `src/components/DernieresCles.jsx` | `useChateaux()` | 48 |
| `src/components/HeureAuxDemeures.jsx` | `useChateaux()` | 46 |
| `src/components/UneDeLaSemaine.jsx` | `useChateaux()` | 8 |
| `src/components/VitrinePermanente.jsx` | `useChateaux()` | 26 |

`useChateau(slug)` et `useChateauById(id)` : **0 consommateur composant** détecté (les composants travaillent sur la liste retournée par `useChateaux`).

## 4. Mapping snake_case Supabase → camelCase React

### 4.1 — Champs racine (transformation simple : rename / unflatten / cast)

| React (camelCase) | Supabase (snake_case) | Transformation |
|---|---|---|
| `chateau.id` | `chateaux.id` | uuid string (était `number`) — **breaking** |
| `chateau.nom` | `chateaux.nom` | identique |
| `chateau.slug` | `chateaux.slug` | identique |
| `chateau.region` | `chateaux.region` | identique |
| `chateau.departement` | `chateaux.departement` | identique |
| `chateau.ville` | `chateaux.ville` | identique |
| `chateau.accroche` | `chateaux.accroche` | identique |
| `chateau.siecle` | `chateaux.siecle` | identique |
| `chateau.style` | `chateaux.style` | identique |
| `chateau.distanceParis` | `chateaux.distance_paris` | rename — **type change** (était string `"55 km · 45 min"`, devient int minutes 45). Composants attendent du texte affichable. |
| `chateau.urgence` | `chateaux.urgence` | identique |
| `chateau.histoire` | `chateaux.histoire` | identique |
| `chateau.description` | `chateaux.description` | identique |
| `chateau.regionNarrative` | `chateaux.region_narrative` | rename camelCase |
| `chateau.regionHistoire` | `chateaux.region_histoire` | rename camelCase |
| `chateau.chiffresCles` | `chateaux.chiffres_cles` | rename + JSONB (structure identique) |
| `chateau.images` | `chateaux.images` | identique (text[]) |
| `chateau.videoBackground` | `chateaux.video_background_youtube_id` | rename |
| `chateau.estLaUne` | `chateaux.est_la_une` | rename |
| `chateau.parking/wifi/animaux` | `chateaux.parking/wifi/animaux` | **type change** : était string ("Parking gratuit"), devient bool |

### 4.2 — Champs nested (unflatten requis depuis colonnes plates Supabase)

| React (objet imbriqué) | Supabase (colonnes plates) | Transformation |
|---|---|---|
| `chateau.coordonnees.lat` | `chateaux.coordonnees_lat` | unflatten `{ lat, lng }` |
| `chateau.coordonnees.lng` | `chateaux.coordonnees_lng` | idem |
| `chateau.proprietaires.nom` | `chateaux.prop_nom` | unflatten 7 colonnes prop_* en `{ nom, depuis, initiale, nomAffiche, portrait, citation, description }` |
| `chateau.proprietaires.depuis` | `chateaux.prop_depuis` | idem |
| `chateau.proprietaires.initiale` | `chateaux.prop_initiale` | idem |
| `chateau.proprietaires.nomAffiche` | `chateaux.prop_nom_affiche` | idem (rename camelCase) |
| `chateau.proprietaires.portrait` | `chateaux.prop_portrait` | idem |
| `chateau.proprietaires.citation` | `chateaux.prop_citation` | idem |
| `chateau.proprietaires.description` | `chateaux.prop_description` | idem |

### 4.3 — Joins 1-N (tables séparées)

| React (array imbriqué) | Supabase (table) | Transformation |
|---|---|---|
| `chateau.chambres[]` | `chambres` | join + `prix = prix_cents / 100` (cast euros) + `equipements` direct |
| `chateau.timeline[]` | `chateau_timeline` | join + `ORDER BY ordre` |
| `chateau.alentours[]` | `chateau_alentours` | join + `ORDER BY ordre` |
| `chateau.activites[]` | `chateau_amenities WHERE type='activite'` | join + filter type + `ORDER BY ordre` |

### 4.4 — Champs ABSENTS du schema Supabase (⚠ blocker Phase 4)

Trois propriétés utilisées dans les composants **n'existent pas dans `chateaux.sql`** :
| React | Schema | Décision Phase 4 |
|---|---|---|
| `chateau.prixBarre` | absent | À traiter en S2 via `offres.prix_promo_cents` (sémantique correcte) ou ALTER TABLE chateaux |
| `chateau.reduction` | absent | Idem — propriété d'offre commerciale, pas du château |
| `chateau.chambresRestantes` | absent | Calcul dynamique `disponibilites` (count est_disponible=true à venir) |
| `chateau.activites` | absent direct (existe via `chateau_amenities`) | join requis, structure objet `{nom, description, icone}` à reconstruire |

## 5. Recommandations Phase 4

### 5.1 — Stratégie de fetch (validé Q2=C)
- **Option A retenue** : auto-joins Supabase JS via syntaxe `select('*, chambres(*), chateau_timeline(*), chateau_alentours(*), chateau_amenities(*)')` — **1 round-trip** réseau
- Option B rejetée : 4 requêtes séparées avec `Promise.all`
- Option C (RPC SQL custom) : pas nécessaire en MVP

### 5.2 — Architecture refactor
- **Helper de mapping centralisé** : `src/services/_mapping.js` exportant `mapChateauRowToReact(row, joins)` — 1 endroit pour tous les renames + unflatten
- **Cache Map local** dans `chateauxService.js` (perf — éviter re-fetch sur navigation overlay)
- **Garder `VITE_FAKE_LATENCY`** (DX dev) — la latence Supabase réelle deviendra additive en prod
- **Conserver pattern `{ data, loading, error }`** dans les hooks (déjà en place Phase 2.3)

### 5.3 — Dettes connexes à nettoyer en parallèle (Q1=C)
- **`App.jsx:114`** — hardcode `(transitionChateau || chateauSelectionne).estLaUne === true` → utilisable tel quel après mapping (estLaUne sera dispo)
- **`HeureAuxDemeures.jsx:50,55`** — `idsCartes = [6, 5, 1]` et `idsIndex = [7, 8, 2, 3]` reposent sur les **anciens id integer**. Avec UUIDs Supabase, ces hardcodes cassent. Solution : remplacer par filtres slug ou flags (ex. `isDemoMock` + `estLaUne`)

## 6. Risques identifiés

1. **Type `chateau.id` change** (number → uuid string) — impact sur tous les `===` et `find(c => c.id === N)`. **5 occurrences** dans `HeureAuxDemeures.jsx`.
2. **`distanceParis` change de type** (string parsable "55 km · 45 min" → int minutes 45). Soit on reformate côté React, soit on stocke aussi le label brut. À trancher.
3. **`prixBarre`/`reduction`/`chambresRestantes` absents du schema** — bloquant pour `BandeauOffres`, `DernieresCles`, `VitrinePermanente`. Décision Phase 4 : ALTER TABLE chateaux + seed update, ou refactor composants pour lire depuis `offres`/`disponibilites`.
4. **`parking/wifi/animaux` type change** (string description → bool) — actuellement affiché en JSX comme texte ("Parking gratuit"). À reformater en JSX (bool → label).
5. **Cache Map** — invalidation à prévoir si admin Phase 5.x édite le contenu (TTL 5 min ou invalidation explicite via `chateauxService.invalidate()`).

## 7. Estimation effort Phase 4

| Tâche | Estimation |
|---|---|
| Helper `_mapping.js` (38 colonnes + 4 joins) | 2-3 h |
| Refactor `chateauxService.js` async Supabase | 2 h |
| Cache Map + invalidation | 1 h |
| Fix `idsCartes`/`idsIndex` (HeureAuxDemeures) | 1 h |
| Reformat `parking/wifi/animaux` JSX bool→label | 30 min |
| Décision + impl `prixBarre`/`reduction`/`chambresRestantes` | 2-4 h selon option |
| Tests E2E + smoke RLS croisés | 2-3 h |
| **TOTAL Phase 4** | **~10-15 h** |
