# Sprint S2 — Audit & cadrage du booking flow client

> Document de référence pour les ~40-60 h de développement du Sprint S2. Source de vérité jusqu'à la mise en prod live (cible fin juin / début juillet 2026).
>
> Statut : **doc validé — section 6 arbitrée par Matthieu le 12 mai 2026**. Décisions techniques actées. Actions Matthieu en cours : (1) appel comptable pour TVA, (2) discussion châtelains pour politique d'annulation per-château.

---

## 1. Contexte & objectifs Sprint S2

### Décisions actées (ne pas remettre en question)

- **Périmètre** : booking complet bout en bout (option A retenue ; le palier intermédiaire « résa `pending` sans Stripe » a été rejeté).
- **Prestataire paiement** : Stripe Connect Express (Mangopay / Lemonway rejetés).
- **Cible prod live** : fin juin / début juillet 2026. Qualité prioritaire sur le délai.
- **Mode dev mai-juin** : Stripe **TEST uniquement**. Aucune entité légale requise pour développer et démontrer.
- **Argument commercial** : 5+ pitchs prospects châtelains mai-juin → une démo bout en bout en mode test est un argument vendeur.
- **Châtelains à onboarder** : les 2 existants — Les Briottières (id 7) et Le Blanc Buisson (id 8) — progressivement.
- **Schéma** : pas de refonte. On part de l'existant `lcc-prod` (refactor service déjà fait en Phase 2.3). Le delta S2 est volontairement minimal (cf. § 4.1).
- **Statut LCC** : pas encore immatriculée. La bascule Stripe **live** est conditionnée par la création d'une SAS/SASU en mai-juin (cf. § 7).
- **Backend** : Supabase prod ref `ynoieryxfqiqjscqieum` (eu-west-1).
- **Stack** : React 19.2 / Vite 6, Supabase, Stripe Connect, Vercel, Brevo. *(Note : `package.json` indique `react@^19.2.4` — le doc utilise donc React 19, pas 18.2.)*
- **Git** : branches `feature/*` pour tout chantier > 1 jour ; tag `pre-<chantier>` avant.
- **CSS** : préfixe `vc3-*` pour les composants vitrines premium.
- **Rédaction produit/UX** : français, ton patrimonial jamais promotionnel ; Fondation du Patrimoine = « une partie de nos recettes » (jamais un pourcentage à l'écran).

### Livrable cible Sprint S2

Une **démo bout en bout fonctionnelle en mode Stripe TEST**, déployée sur une preview Vercel, **démontrable à un prospect châtelain en 15 minutes sans intervention dev**.

### Critères de « done »

1. Un client peut réserver Les Briottières (compte TEST), payer 1 € avec une carte de test Stripe, recevoir l'email de confirmation Brevo, et voir sa réservation dans son espace client.
2. Le châtelain TEST voit la réservation dans son dashboard, peut la confirmer (si validation manuelle activée) et voit le payout simulé.
3. Tout passe la CI (`qa:ci` + E2E) sans régression de baseline.

---

## 2. Inventaire de l'existant

État des lieux factuel, fondé sur la lecture du code au 12 mai 2026.

### 2.1 Tables Supabase (14, posées Sprint S1)

| Table | Rôle |
|---|---|
| `users` | Miroir de `auth.users` + rôle métier (`client` / `chatelain` / `admin`), `full_name`, `telephone`, `marketing_consent`, `referral_code`. |
| `chateaux` | Table cœur. Inclut `prop_*` (propriétaire flatten), `est_la_une`, `is_demo_mock`, `hero_night_stars`, `note_sur_5`, `nb_avis`, `couleur_theme`, etc. |
| `chambres` | Chambres louables. `prix_cents`, `capacite`, `min_stay_nights`, `max_stay_nights`, `cleaning_fee_cents`, `pricing_rules` (jsonb, plugeable). |
| `chateau_amenities` | Services + activités fusionnés (`type` = `service` / `activite`). |
| `chateau_timeline` | Frise historique par château. |
| `chateau_alentours` | Points d'intérêt autour du château. |
| `modules` | Référentiel statique A/B/C/D. `commission_min_pct`, `commission_max_pct`, `politique_annulation_default`, `requires_auth_role`. |
| `chateau_modules` | M:N château × module + `commission_pct_negociee` (override). |
| `offres` | Offres commerciales par module / château / chambre. `prix_base_cents`, `prix_promo_cents`, `reduction_pct`, `date_debut/fin`, `capacite_max`, `visible`, `requires_role`. |
| `chateau_owners` | M:N user × château. **Contient déjà** `stripe_connected_account_id`, `stripe_charges_enabled`, `stripe_payouts_enabled` (marqués `[Plugeable Stripe]`). |
| `reservations` | Réservations. `user_id` (**NOT NULL**), `chambre_id`, `module_id`, `offre_id`, `date_arrivee`, `date_depart`, `prix_total_cents`, `commission_lcc_cents`, `status` (enum `pending`/`confirmed`/`cancelled`/`completed`), **`stripe_payment_intent_id`**, **`stripe_charge_id`**, `cancellation_policy`, `payout_status` (enum `pending`/`sent`/`failed`/`manual`), `payout_sent_at`, `cancellation_reason`, `cancelled_at`. |
| `disponibilites` | Calendrier par chambre. 1 ligne = 1 chambre × 1 date. `est_disponible`, `prix_special_cents`, `reservation_id`, `note_interne` (privée châtelain). UNIQUE (chambre, date). |
| `audit_log` | Journal append-only — actions critiques (CRUD admin, webhooks, modifs offres). |
| `migrations_log` | Trace des migrations appliquées hors bootstrap. |

Enums : `user_role`, `reservation_status`, `payout_status`, `alentour_type`, `amenity_type`.

**Conclusion clé** : la table `reservations` et les colonnes Stripe Connect sur `chateau_owners` **existent déjà**. Le booking n'est pas un greenfield côté schéma — le delta est petit (§ 4.1).

### 2.2 RLS existantes (Sprint S1 Phase 2)

- 3 helpers `SECURITY DEFINER` : `is_admin()`, `is_chatelain()`, `is_chatelain_of(p_chateau_id)`.
- Trigger `handle_new_user` : provisionne automatiquement `public.users` à l'inscription Supabase Auth.
- 14 tables avec `ENABLE ROW LEVEL SECURITY`. ~46 policies.
- 2 vues publiques : `chateau_modules_public` (cache la commission), `reservations_client_view` (cache `commission_lcc_cents` + `stripe_*`, `security_invoker`).
- `reservations` : `select_owner` (client voit ses lignes / châtelain voit les chambres de ses châteaux / admin voit tout), `insert_client_admin`, `update_client_cancel` (**trop large — dette S1 notée : à remplacer par RPC `cancel_my_reservation`**), `update_admin`. **Pas de policy DELETE** (volontaire).
- `disponibilites` : `select` public, `write` châtelain du château / admin.
- `chateau_owners` : `select` self / admin, `write` admin.

### 2.3 Services frontend

- `src/lib/supabase.js` : client unique, configuré avec `auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }` — l'infra auth est **prête mais non utilisée**.
- `src/services/chateauxService.js` (Phase 2.3) : 5 fonctions async — `getChateaux({ excludeMocks })`, `getChateauById(id)`, `getChateauBySlug(slug)`, `getCompteurs({ excludeMocks })`, `invalidateCache()`. Cache `Map` mémoire TTL 5 min, 1 round-trip pour servir N requêtes UI. Helper privé `_isMock(chateau)` (`estLaUne === false`). Respecte `VITE_FAKE_LATENCY`. **C'est le modèle des nouveaux services S2** (`bookingService.js`, `paymentService.js`, `ownerService.js`).
- `src/services/_mapping.js` : mappers snake_case Supabase → camelCase React (6 atomiques + `mapChateau`).
- Hooks : `useChateaux`, `useChateau`, `useChateauById`, `useCompteurs`, `useNombreEnLettres`, `useScrollAnimation`. **Pas de `useAuth`, pas d'AuthContext, pas de hook réservation.**

### 2.4 Composants UI critiques

- `src/App.jsx` (178 lignes) : **unique routeur**. Toutes les « pages » sont des overlays plein écran montés conditionnellement via des `useState` booléens dans `App` (`vitrinesOuvert`, `dernieresOuvert`, `authOuvert`, `compteOuvert`, `clubOuvert`, etc.). Aiguillage château : `ouvrirChateau` → `setTransitionChateau` → animation `TransitionPorte` → `setChateauSelectionne` → `estLaUne === true ? <VitrineChateau> : <ChateauModal>` (App.jsx:113-117). **Pas de react-router.**
- `src/components/VitrineChateau.jsx` : layout premium (id 7-8). Contient une **modale de réservation factice** (`vc3-reserve-modal`, ~l.530-560) : sélecteur chambre, 2 `<input type="date">` Arrivée/Départ **sans state**, bouton « Confirmer la réservation → » **sans `onClick`**. 5 CTA « Réserver » qui tous appellent `setReserve(true)`. Mention Fondation.
- `src/components/ChateauModal.jsx` : layout standard (id 1-6). Carte sticky « Réserver ce séjour » : sélecteur chambre, prix barré/promo, 3 champs (Arrivée, Départ, Voyageurs) **sans state**, bouton « Réserver maintenant » → `setReserve(true)` (toggle local). Aucune persistance.
- `src/components/AuthModal.jsx` : **stub UI** (importe `auth.css`, un `<input type="password">`, aucun import Supabase, aucun `signIn`/`signUp`).
- `src/components/CompteUser.jsx` : **stub UI** (aucun import Supabase).

### 2.5 Stripe

`grep -ri stripe` → 3 fichiers, **zéro code applicatif** : `supabase/schema.sql` (colonnes `stripe_*` commentées `[Plugeable Stripe]`), `supabase/policies.sql` (commentaires), `CLAUDE.md` (roadmap). `package.json` dépendances : `@supabase/supabase-js`, `react`, `react-dom` — **aucun `@stripe/stripe-js`, `@stripe/react-stripe-js`, ni `stripe` (Node SDK)**.

### 2.6 Brevo

`grep -ri brevo|sendinblue` → 2 fichiers, **zéro implémentation** : `supabase/schema.sql` (commentaire sur `users.marketing_consent`), `CLAUDE.md`. Pas de SDK Brevo, pas de templates, pas de service email.

### 2.7 Edge Functions Supabase

**Aucune.** Pas de dossier `supabase/functions/`. Aucune fonction déployée.

### 2.8 Variables d'environnement

`.env.example` actuel : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_FAKE_LATENCY`. À ajouter en S2 (cf. § 4.6) : `VITE_STRIPE_PUBLISHABLE_KEY` (client), `STRIPE_SECRET_KEY` (Edge only, **jamais** préfixé `VITE_`), `STRIPE_WEBHOOK_SECRET` (Edge), `STRIPE_CONNECT_CLIENT_ID` (si onboarding OAuth), `SUPABASE_SERVICE_ROLE_KEY` (Edge only), `BREVO_API_KEY` (transactionnel), `BREVO_TEMPLATE_BOOKING_CONFIRMATION` / `..._REMINDER_D7` / `..._REMINDER_D1` / `..._CANCELLED` / `..._OWNER_NEW_BOOKING` / `..._PAYOUT_COMPLETED` (IDs templates Brevo).

### 2.9 Delta à produire en Sprint S2 (résumé)

| Domaine | État | Delta S2 |
|---|---|---|
| Schéma `reservations`, `disponibilites`, `chateau_owners` | Posé S1 | Quelques colonnes (`stripe_checkout_session_id`, `confirmed_at`) + RPC + mécanisme de hold dates |
| RLS | Posées S1 | Affiner `update_client_cancel` → RPC ; policies pour nouvelles tables/colonnes |
| Auth client | Infra prête, non câblée | Câbler Supabase Auth + `AuthContext` + remplacer stubs `AuthModal`/`CompteUser` |
| Flow réservation UI | Factice | Composant `<BookingFlow>` réel, branché sur services |
| Stripe | Zéro | SDK front + Edge Functions `create-checkout-session` + `stripe-webhook` + Connect Express onboarding |
| Brevo | Zéro | SDK Edge + 6 templates + Edge Function d'envoi + cron rappels |
| Edge Functions | Zéro | 4-6 fonctions (cf. § 4.2) |
| Dashboards châtelain / admin | Inexistants | 2 nouveaux écrans overlay |

---

## 3. User flow détaillé

### 3.1 Parcours client (réservation)

| # | Étape | Écran / composant | Événement technique | Table impactée | RLS |
|---|---|---|---|---|---|
| 1 | Découverte | Home `App.jsx` (entrée SEO, lien direct pitch, ou navigation) | `chateauxService.getChateaux()` | `chateaux` (read) | `select` public |
| 2 | Vitrine château | `VitrineChateau.jsx` (id 7-8, état actuel OK) ou `ChateauModal.jsx` (id 1-6) | — | — | — |
| 3 | Clic CTA « Réserver » | Ouverture `<BookingFlow>` (nouveau, overlay monté depuis `App.jsx` sur le modèle des autres overlays) | — | — | — |
| 4 | Choix chambre + dates | `<BookingFlow>` étape 1 (UI à concevoir — recommandation : multi-étapes **inline dans l'overlay**, pas de nouvelle route, cf. § 6 décision 12) | Lecture dispos : RPC `count_chambres_disponibles(chambre_id, date_arrivee, date_depart)` ou requête `disponibilites` | `disponibilites` (read), `chambres` (read) | `select` public |
| 5 | Auth / identification | `<BookingFlow>` étape 2 — Supabase Auth (recommandation : magic link, cf. § 6 décision 4) | `supabase.auth.signInWithOtp({ email })` → callback → session ; trigger `handle_new_user` crée la ligne `users` | `auth.users`, `public.users` (insert via trigger) | trigger `SECURITY DEFINER` |
| 6 | Récap + paiement | `<BookingFlow>` étape 3 — récap commande, mention Fondation, puis bouton « Payer » | (a) front appelle Edge Function `create-checkout-session` ; (b) Edge crée une ligne `reservations` `status='pending'` + Stripe Checkout Session ; (c) redirect Stripe Checkout (recommandation S2, cf. § 6 décision 5) ; (d) hold dates : insert lignes `disponibilites` `est_disponible=false` avec TTL (cf. § 6 décision 8) ou table `reservation_holds` | `reservations` (insert `pending`), `disponibilites` (insert hold) | `insert_client_admin` + service_role côté Edge |
| 7 | Confirmation à l'écran | Page de retour `?session_id=...` → `<BookingFlow>` étape 4 « Réservation confirmée » | front interroge `reservations_client_view` filtré sur la session ; le statut bascule `confirmed` via le webhook (asynchrone — afficher un état « en cours de confirmation » si le webhook n'a pas encore tourné) | `reservations` (read via vue) | `select_owner` |
| 8 | Email confirmation | — (déclenché serveur) | `stripe-webhook` reçoit `checkout.session.completed` → passe `reservations.status='confirmed'`, `confirmed_at=now()` → appelle Edge `send-transactional-email` (template `booking_confirmation`) | `reservations` (update), `audit_log` (insert), `email_log` (insert, optionnel) | service_role |
| 9 | Rappels J-7 / J-1 | — (cron) | Edge `cron-send-reminders` (Supabase Scheduled Function, quotidienne) → sélectionne les `reservations` `confirmed` dont `date_arrivee` ∈ {J+7, J+1} → `send-transactional-email` (templates `booking_reminder_d7` / `_d1`) | `reservations` (read) | service_role |
| 10 | Mon compte client | `<ClientAccount>` (nouveau — remplace le stub `CompteUser`) — liste des résas, statuts, montants, lien facture Stripe | `bookingService.getMyBookings()` → `reservations_client_view` | `reservations` (read via vue) | `select_owner` |

Notes :
- Le **hold de dates** (étape 6) est indispensable pour éviter le double-booking pendant que le client est sur Stripe Checkout. Mécanisme et TTL : décision 8.
- Si le paiement échoue ou expire : `stripe-webhook` reçoit `checkout.session.expired` ou `payment_intent.payment_failed` → passe `reservations.status='cancelled'` + libère le hold (`disponibilites` lignes supprimées ou `est_disponible=true`).

### 3.2 Parcours châtelain (owner)

| # | Étape | Écran / composant | Événement technique |
|---|---|---|---|
| 1 | Onboarding Stripe Connect Express | Lien généré par Edge `create-connect-onboarding-link` → redirection vers le flow **Stripe-hosted** (recommandé) | Stripe crée le compte connecté ; `account.updated` webhook met à jour `chateau_owners.stripe_charges_enabled` / `stripe_payouts_enabled` / `stripe_connected_account_id`. Une fois par châtelain (~15 min). |
| 2 | Login dashboard | `<OwnerDashboard>` (nouveau overlay) — auth via `auth.uid()`, rôle `chatelain` dans `users` | `supabase.auth.getSession()` ; `is_chatelain()` côté RLS |
| 3 | Vue d'ensemble | `<OwnerDashboard>` accueil — réservations à venir, taux d'occupation, revenus à venir (hors commission, c.-à-d. ce que le châtelain touchera) | `ownerService.getDashboard()` → agrégation côté Edge `get-owner-dashboard` (recommandé : pré-agréger serveur pour éviter de drainer toutes les lignes) ou requêtes RLS-protégées directes |
| 4 | Détail d'une résa | `<OwnerDashboard>` détail | lecture `reservations` filtré par `is_chatelain_of(chateau_id)` |
| 5 | Confirmation / refus manuel | bouton « Confirmer » / « Refuser » si politique = validation owner ; sinon auto-confirmé (cf. § 6 décision 9) | Edge `owner-confirm-booking` (JWT châtelain requis, vérifie `is_chatelain_of`) → `reservations.status='confirmed'` ; en cas de refus → `cancelled` + remboursement Stripe (`refunds.create` + `application_fee_refund`) |
| 6 | Blocage manuel de dates | calendrier `<OwnerDashboard>` — vacances, événement privé, maintenance | **Réutilise `disponibilites`** : insert/update lignes `est_disponible=false`, `note_interne='...'`, `reservation_id=NULL`. Pas de nouvelle table. RLS `disponibilites_write_chatelain_admin`. |
| 7 | Suivi des payouts | `<OwnerDashboard>` finances — payouts Stripe Connect, dates, montants | lecture `reservations.payout_status` / `payout_sent_at` ; `transfer.created` / `transfer.failed` webhooks tiennent ces champs à jour |
| 8 | Avis clients post-séjour | — | **Reporté Sprint S3** (cf. § 6 décision 13) |

### 3.3 Parcours admin LCC

| # | Étape | Écran / composant | Événement technique |
|---|---|---|---|
| 1 | Login dashboard admin | `<AdminDashboard>` (nouveau overlay) — `role='admin'` dans `users` | `is_admin()` côté RLS |
| 2 | Vue d'ensemble | toutes résas, tous châteaux, revenus globaux (dont commission LCC) | requêtes RLS-protégées (admin = full read) |
| 3 | Commission par château / module | édition `chateau_modules.commission_pct_negociee` (ou taux unique S2, cf. § 6 décision 3) | update `chateau_modules` (RLS `write_admin`) |
| 4 | Support — consultation résa client | lecture seule d'une résa client (avec commission visible) | `reservations` (admin read) |
| 5 | Gestion des châteaux | ajout, désactivation temporaire (`chateau_modules.est_actif=false`) | update `chateau_modules` ; pour l'ajout complet d'un château, voir le process existant (`chateaux.js` legacy → seed) — hors scope booking S2 |
| 6 | Audit log | qui a fait quoi quand (conformité + debug) | lecture `audit_log` (admin read) ; les Edge Functions écrivent dans `audit_log` à chaque mutation critique |

---

## 4. Architecture technique

### 4.1 Schéma Supabase — delta nécessaire

Le schéma S1 couvre déjà l'essentiel. Le delta S2 est volontairement minimal.

#### Colonnes à ajouter

```sql
-- reservations : lien Checkout Session + horodatage confirmation
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

-- chateaux : politique d'annulation par défaut (owner-specific, décision #2)
ALTER TABLE public.chateaux
  ADD COLUMN IF NOT EXISTS default_cancellation_policy text DEFAULT 'flexible'
    CHECK (default_cancellation_policy IN ('flexible', 'moderate', 'strict', 'custom'));

-- (les colonnes stripe_payment_intent_id, stripe_charge_id, status,
--  payout_status, cancellation_* sur reservations existent déjà — ne rien re-créer)
```

`chateau_amenities` / `offres` : **aucune colonne à ajouter** pour S2. `chateau_owners.stripe_connected_account_id` existe déjà ; pas besoin de `chateaux.stripe_destination_account_id` — la destination est dérivée via `chateau_owners`. `chateaux.default_cancellation_policy` est lu au moment de la création de la résa et copié dans `reservations.cancellation_policy` (colonne snapshot text déjà existante).

#### Table optionnelle (S2-δ, traçabilité Brevo)

```sql
CREATE TABLE IF NOT EXISTS public.email_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  template_key    text NOT NULL,            -- 'booking_confirmation', etc.
  recipient_email text NOT NULL,
  brevo_message_id text,                     -- retour API Brevo
  status          text NOT NULL DEFAULT 'sent',  -- 'sent' | 'bounced' | 'failed'
  error_detail    text,
  created_at      timestamptz NOT NULL DEFAULT NOW()
);
-- RLS : SELECT admin only ; INSERT service_role only.
```

#### Table optionnelle (mécanisme de hold — alternative à `disponibilites`)

Si on ne veut pas polluer `disponibilites` avec des holds temporaires (cf. § 6 décision 8) :

```sql
CREATE TABLE IF NOT EXISTS public.reservation_holds (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chambre_id    uuid NOT NULL REFERENCES public.chambres(id) ON DELETE CASCADE,
  date_arrivee  date NOT NULL,
  date_depart   date NOT NULL,
  expires_at    timestamptz NOT NULL,       -- now() + TTL (décision 8)
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT reservation_holds_dates_valides CHECK (date_depart > date_arrivee)
);
CREATE INDEX IF NOT EXISTS idx_reservation_holds_expires ON public.reservation_holds(expires_at);
-- Purge : le cron quotidien (cron-send-reminders ou dédié) DELETE WHERE expires_at < now().
-- RLS : SELECT public (pour calcul de dispo) ; INSERT/DELETE service_role only.
```

#### RPC (fonctions PL/pgSQL `SECURITY DEFINER`)

- `count_chambres_disponibles(p_chambre_id uuid, p_arrivee date, p_depart date) → integer` — lit `disponibilites` + `reservations` actives + `reservation_holds` non expirés, renvoie 1 (dispo) ou 0. Résout la dette S1 `compteurs.chambresRestantes = 0`.
- `cancel_my_reservation(p_reservation_id uuid, p_reason text) → void` — vérifie `auth.uid() = reservations.user_id`, applique la politique d'annulation (décision 2), passe `status='cancelled'`, `cancelled_at=now()`. **Remplace la policy `update_client_cancel` trop large** (dette S1).
- `create_booking_draft(...)` — *optionnel* ; on peut aussi laisser l'Edge Function `create-checkout-session` faire l'insert via service_role. Recommandation : insert côté Edge (centralise la logique de prix/commission).

### 4.2 Edge Functions Supabase

Aucune n'existe → tout est à créer dans `supabase/functions/`. Runtime Deno.

| Fonction | Trigger | Inputs | Outputs | Sécurité | Idempotence |
|---|---|---|---|---|---|
| `create-checkout-session` | POST depuis le front | `{ chambre_id, date_arrivee, date_depart, offre_id? }` + JWT client | `{ checkout_url }` (ou `client_secret` si Elements) | JWT client requis ; calcule prix + commission serveur (ne jamais faire confiance au montant client) ; pose le hold | clé d'idempotence Stripe = hash(`user_id`+`chambre_id`+dates) pour éviter les doubles sessions |
| `stripe-webhook` | POST depuis Stripe | événement Stripe brut + header `Stripe-Signature` | `200` | **vérification de signature impérative** (`STRIPE_WEBHOOK_SECRET`) ; service_role pour les updates | dédup par `event.id` (table `audit_log` ou colonne dédiée) — Stripe renvoie les événements en cas de timeout |
| `send-transactional-email` | interne (appelée par `stripe-webhook` et `cron-send-reminders`) | `{ template_key, recipient_email, data }` | `{ brevo_message_id }` | service_role only (jamais exposée au front) ; `BREVO_API_KEY` (clé transactionnelle) | log dans `email_log` avant envoi ; si Brevo renvoie une erreur retriable, ré-essai borné |
| `create-connect-onboarding-link` | POST depuis le dashboard châtelain | `{ chateau_id }` + JWT châtelain | `{ onboarding_url }` | JWT châtelain + `is_chatelain_of` | crée le compte Connect une seule fois (réutilise `stripe_connected_account_id` s'il existe) |
| `owner-confirm-booking` | POST depuis le dashboard châtelain | `{ reservation_id, action: 'confirm'|'reject', reason? }` + JWT châtelain | `{ status }` | JWT châtelain + `is_chatelain_of(reservation.chambre→chateau)` | transition d'état idempotente (confirmer une résa déjà confirmée = no-op) ; refus → `refunds.create` + `application_fee_refund` |
| `cron-send-reminders` | Supabase Scheduled Function (quotidienne, ex. 09:00 Europe/Paris) | — | — | service_role ; pas d'entrée externe | sélectionne par `date_arrivee` ∈ {J+7, J+1} ; marque `email_log` pour ne pas renvoyer ; purge aussi `reservation_holds` expirés |
| `get-owner-dashboard` | GET depuis le dashboard châtelain *(optionnel — peut se faire en requêtes RLS directes)* | JWT châtelain | `{ resasAVenir, tauxOccupation, revenusAVenir, payouts }` | JWT châtelain ; agrège serveur | lecture pure, naturellement idempotent |

### 4.3 Stripe Connect Express

- **Onboarding** : flow **Stripe-hosted** (Account Links). Recommandé — Stripe gère le KYC, l'UI, la conformité. Le flow custom est déconseillé (charge réglementaire).
- **Modèle de charge** : **Destination charges** avec `transfer_data[destination]` = `chateau_owners.stripe_connected_account_id` et `application_fee_amount` = commission LCC. C'est le modèle standard pour une plateforme type OTA : LCC est le marchand de référence (le client voit « Les Clés du Château » sur son relevé), les fonds transitent par le compte plateforme puis sont reversés au châtelain moins la commission. Direct charges (le châtelain est le marchand) compliquerait la gestion des remboursements et de la facturation côté plateforme ; Separate charges & transfers serait plus souple mais plus lourd à opérer pour S2.
- **`application_fee_amount`** : calculé **côté serveur** dans `create-checkout-session`, sur le **montant total payé par le client** (TTC affiché — la question TVA/autoliquidation est traitée § 6 décision 7). Pourcentage = `chateau_modules.commission_pct_negociee` (ou taux unique S2 — décision 3). Stocké dans `reservations.commission_lcc_cents` au moment de la création (snapshot).
- **Webhooks à écouter (minimum)** : `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `checkout.session.expired`, `charge.refunded`, `account.updated`, `transfer.created`, `transfer.failed`.
- **Remboursements** : `refunds.create({ payment_intent, amount })` pour partiel ou total ; `refund_application_fee: true` (ou `application_fee_refund` proportionnel) selon la politique d'annulation (décision 2). En mode démo S2, on remboursera surtout le total (annulation/refus owner).

### 4.4 Brevo (transactionnel)

- **Templates à créer côté Brevo** (IDs référencés en env vars) : `booking_confirmation`, `booking_reminder_d7`, `booking_reminder_d1`, `booking_cancelled`, `owner_new_booking`, `payout_completed`.
- **API** : `transactionalEmails.sendTransacEmail` (SDK `@getbrevo/brevo`) depuis l'Edge Function `send-transactional-email`, avec interpolation des `params` (nom client, château, dates, montant, lien espace client).
- **Suivi delivery** : webhooks Brevo optionnels (bounces, opens) — non prioritaire S2, mais `email_log.status` permet déjà un suivi basique.
- **Séparation transactionnel / marketing** : deux clés API distinctes côté Brevo. S2 n'utilise que la **transactionnelle**. Le marketing (newsletter, séquences) reste hors scope (lié à `users.marketing_consent`, plugeable).
- **Ton** : les emails reprennent la voix patrimoniale (cf. § 1). La mention Fondation = « une partie de nos recettes ».

### 4.5 Frontend (React)

- **Nouveaux composants** (servis comme **routes** react-router, cf. point Routing ci-dessous — pas comme overlays) :
  - `<BookingFlow>` — orchestrateur multi-étapes (chambre+dates → auth → récap+paiement → redirect Checkout), route `/reserver/:chateauSlug`.
  - `<BookingConfirmation>` — page de retour post-Stripe, route `/reservation/:id/confirmation?session_id=...`.
  - `<StripeCheckoutButton>` — bouton qui appelle `create-checkout-session` et redirige (Checkout hosted, décision 5). `<StripePaymentForm>` (Elements + `@stripe/react-stripe-js`) reporté S3.
  - `<OwnerDashboard>` — route `/chatelain/dashboard`.
  - `<AdminDashboard>` — route `/admin/dashboard`.
  - `<ClientAccount>` — remplace le stub `CompteUser`, route `/mon-compte` ; liste des réservations + liens factures Stripe.
  - `<AuthForm>` — remplace le stub `AuthModal` ; magic link (décision 4). Handler de callback : route `/auth/callback`.
- **Routing** : adoption de **`react-router-dom` dès S2** pour les nouveaux écrans transactionnels (booking flow, confirmation, compte client, dashboards, callback auth). Les overlays existants (home, vitrines château, modales `ChateauModal`/`VitrineChateau`, Club, etc.) **restent en l'état** (état local d'`App.jsx`) — pattern *strangler fig*, migration progressive en S3+ (`/`, `/chateau/:slug`, …). Setup : `npm i react-router-dom`, `<BrowserRouter>` dans `main.jsx`, `<Routes>` à côté du rendu overlay existant dans `App.jsx`. Routes initiales : `/reserver/:chateauSlug`, `/reservation/:id/confirmation`, `/mon-compte`, `/chatelain/dashboard`, `/admin/dashboard`, `/auth/callback`. (Décision 12.)
- **Services frontend à créer** (modèle `chateauxService.js`) : `bookingService.js` (`createCheckoutSession`, `getMyBookings`, `cancelMyBooking`, `checkAvailability`), `ownerService.js` (`getDashboard`, `confirmBooking`, `refundBooking`, `createBlock`, `setDefaultCancellationPolicy`, `getOnboardingLink`), éventuellement `adminService.js`. Pas de `paymentService.js` séparé (Checkout hosted → logique paiement côté Edge).
- **Auth** : magic link via Supabase Auth (`supabase.auth.signInWithOtp({ email })`). Le compte utilisateur est créé dans `auth.users` + `public.users` via le trigger `handle_new_user` (déjà en place). Compte persistant — compatible Club des Châtelains et système de fidélité futurs. Nouveau `AuthContext` + hook `useAuth()` (session, user, role) ; le `userConnecte` local actuel d'`App.jsx` est remplacé par le contexte. Garde de route : un `<RequireAuth>` / `<RequireRole role="chatelain">` wrap les routes protégées.
- **État global** : Context API React suffit (auth + booking en cours). Pas de Zustand/Redux pour ce périmètre.

#### 4.5.1 — i18n (pré-structure S2)

`react-i18next` installé dès S2, avec un **unique fichier `src/i18n/fr.json`**. Tous les composants nouveaux S2 consomment `useTranslation()` et `t('clef.sous_clef')` — **aucun string en dur**. Pas de sélecteur de langue visible en S2. En S3 : ajout d'un `en.json`, traduction du contenu éditorial, activation du sélecteur. Coût marginal S2-α : ~3 h. (Décision 14.)

### 4.6 Sécurité

- **Vérification de signature Stripe** sur `stripe-webhook` — impératif, non négociable.
- **RLS sur toutes les tables** — aucune table accessible « public » sans policy. Nouvelles tables (`email_log`, `reservation_holds`) : RLS dès la création.
- **Validation JWT côté Edge Functions** — `create-checkout-session`, `owner-confirm-booking`, `create-connect-onboarding-link` exigent un JWT valide ; les fonctions d'agrégation vérifient le rôle (`is_chatelain`, `is_admin`).
- **Secrets** — Supabase secrets (`supabase secrets set ...`) pour `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`. Jamais en clair, jamais préfixé `VITE_` (qui finit dans le bundle browser). Seuls `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY` sont côté client (et c'est sûr — la clé publishable est faite pour ça, l'anon key est protégée par RLS).
- **CORS** — Edge Functions : restreindre aux domaines connus (preview Vercel + prod). Le webhook Stripe n'a pas besoin de CORS (server-to-server).
- **Rate limiting** — Supabase ne fournit pas de rate-limiter natif sur les Edge Functions ; mitigations : clé d'idempotence Stripe, dédup webhook par `event.id`, et si besoin un compteur léger en table (`audit_log`) sur les actions sensibles. À surveiller, pas bloquant S2.
- **Montants** — toujours recalculés serveur (`create-checkout-session`). Le front n'envoie jamais un montant ; il envoie chambre + dates, le serveur fait foi.

---

## 5. Phases d'implémentation Sprint S2

Découpage en sous-sprints livrables (~10-15 h chacun). Chaque sous-sprint = branche `feature/s2-<lettre>-<slug>`, PR, merge sur `main`, tag `pre-*` avant les chantiers structurels.

### S2-α (~13-18 h) — Infra (router + i18n + auth) + schéma booking + paiement happy path

- Setup `react-router-dom` : `<BrowserRouter>` dans `main.jsx`, `<Routes>` dans `App.jsx` à côté des overlays existants, 5-6 routes initiales (`/reserver/:chateauSlug`, `/reservation/:id/confirmation`, `/mon-compte`, `/chatelain/dashboard`, `/admin/dashboard`, `/auth/callback`), wrappers `<RequireAuth>` / `<RequireRole>` (~3-5 h).
- Setup `react-i18next` + `src/i18n/fr.json` unique ; tous les nouveaux strings via `t('clef')` (~3 h).
- Câbler Supabase Auth : `AuthContext`, `useAuth()`, `<AuthForm>` (magic link, `signInWithOtp`), route `/auth/callback`, remplacer le stub `AuthModal`, brancher `App.jsx` sur le contexte.
- Migration : colonnes `reservations.stripe_checkout_session_id` + `confirmed_at` ; `chateaux.default_cancellation_policy` ; RPC `count_chambres_disponibles` + `cancel_my_reservation` ; table `reservation_holds` (décision 8).
- `bookingService.js` (`createCheckoutSession`, `getMyBookings`, `checkAvailability`).
- Edge Functions `create-checkout-session` + `stripe-webhook` (sans Connect encore — Checkout sur le compte plateforme).
- `<BookingFlow>` minimal (chambre+dates → auth → récap → redirect Checkout) + `<BookingConfirmation>`.
- `<ClientAccount>` minimal (liste résas).
- **Done** : un client peut réserver Les Briottières via `/reserver/les-briottieres`, payer 1 € avec une carte test, le webhook passe la résa `confirmed`, elle apparaît dans `/mon-compte`.

### S2-β (~10-15 h) — Stripe Connect Express + destination charges

- Edge `create-connect-onboarding-link` ; onboarding hosted des 2 comptes test (Briottières, Le Blanc Buisson) ; webhook `account.updated` → maj `chateau_owners.stripe_*`.
- `create-checkout-session` enrichie : `transfer_data[destination]` + `application_fee_amount` calculé serveur ; snapshot `reservations.commission_lcc_cents`.
- Webhooks `transfer.created` / `transfer.failed` → maj `reservations.payout_status` / `payout_sent_at`.
- **Done** : la même réservation déclenche un transfer simulé vers le compte connecté du châtelain, commission prélevée, visible dans le dashboard Stripe test.

### S2-γ (~10-15 h) — Dashboard châtelain

- `<OwnerDashboard>` (route `/chatelain/dashboard`, garde `<RequireRole role="chatelain">`) : vue d'ensemble (résas à venir, taux d'occupation, revenus à venir hors commission), détail résa, **bouton « Annuler avec remboursement »** (`owner-confirm-booking` action `reject` → `refunds.create` ; pas d'état `pending_owner_validation` — décision 9), blocage de dates (via `disponibilites`), suivi payouts.
- **Sélecteur de politique d'annulation par défaut** dans le dashboard châtelain (`flexible` / `moderate` / `strict` / `custom`) → alimente `chateaux.default_cancellation_policy` (décision 2).
- `ownerService.js`.
- (optionnel) Edge `get-owner-dashboard` pour l'agrégation.
- **Done** : le châtelain test voit la résa, peut l'annuler → remboursement Stripe, bloque une plage de dates qui devient indisponible côté client, choisit sa politique d'annulation par défaut.

### S2-δ (~10-15 h) — Brevo transactionnel + rappels

- Templates Brevo (6) ; env vars ; Edge `send-transactional-email` ; table `email_log` (optionnelle).
- Branchement : `stripe-webhook` → `booking_confirmation` + `owner_new_booking` ; refus/annulation → `booking_cancelled` ; `transfer.created` → `payout_completed`.
- Edge `cron-send-reminders` (Scheduled Function quotidienne) → `booking_reminder_d7` / `_d1` ; purge `reservation_holds` expirés.
- **Done** : la réservation génère les emails attendus (vérifiables dans la boîte de test), les rappels partent aux bonnes échéances (testable en forçant `date_arrivee`).

### S2-ε (~10-15 h) — Dashboard admin + audit log + E2E

- `<AdminDashboard>` (overlay) : vue globale, édition commission (`chateau_modules.commission_pct_negociee` ou taux unique), support lecture résa, audit log.
- Edge Functions écrivent dans `audit_log` à chaque mutation critique (création résa, confirmation, refus, remboursement, payout, modif commission).
- Tests E2E Playwright : parcours booking complet (avec carte test Stripe), parcours châtelain confirmation, parcours admin lecture. Mise à jour `qa-baseline.json` si nouvelles métriques (procédure documentée).
- **Done** : `npm run qa:ci` vert, E2E booking complet vert, démo bout en bout reproductible en 15 min.

---

## 6. Décisions — arbitrées par Matthieu le 12 mai 2026

> Chaque décision : Question → Options → Recommandation argumentée → **✅ Décision actée le 12 mai 2026**. Les blocs Question / Options / Reco sont conservés comme contexte historique. Actions Matthieu encore en cours : #7 (appel comptable TVA), #2 + #10 (échange avec les châtelains).

**1. Acompte ou total à la réservation ?**
Options : (a) 100 % à la résa ; (b) 30 % acompte + 70 % à J-30 avant arrivée ; (c) 30 % acompte + 70 % au check-in.
Recommandation : **(a)** pour S2 — un seul PaymentIntent, pas de table `payments` multi-échéances, pas de relance de solde à coder. Option (b) en S3 si les châtelains le demandent.
**✅ Décision actée le 12 mai 2026 : 100 % à la réservation.** Un seul PaymentIntent, conforme à la reco.

**2. Politique d'annulation**
Options : flexible (remboursable jusqu'à J-7), modérée (jusqu'à J-30), stricte (non remboursable). Et : une seule politique LCC, ou owner-specific (`reservations.cancellation_policy` existe déjà comme snapshot text) ?
Recommandation : **flexible**, **politique unique LCC** pour S2 (simplicité démo) ; passer en owner-specific en S3 (le champ est déjà là).
**✅ Décision actée le 12 mai 2026 : owner-specific — chaque châtelain choisit sa politique.** Implication : nouvelle colonne `chateaux.default_cancellation_policy` (`flexible` / `moderate` / `strict` / `custom`) + sélecteur dans le dashboard châtelain (S2-γ) ; `reservations.cancellation_policy` (snapshot text existant) reçoit la valeur à la création de la résa.

**3. Taux de commission par module**
Options : taux unique pour tout S2 (ex. une valeur à fixer) ; ou table de config par module / par château (`modules.commission_min/max_pct` + `chateau_modules.commission_pct_negociee` existent déjà).
Recommandation : **un taux unique paramétré en seed** pour S2 (la mécanique `application_fee` est la même quel que soit le taux) ; activer le `commission_pct_negociee` par château en S2-ε via le dashboard admin. *(Aucun chiffre proposé ici — à fixer par Matthieu.)*
**✅ Décision actée le 12 mai 2026 : 10 % pour la démo S2** (taux unique paramétré en seed). Les vrais taux seront fixés plus tard, probablement par module (ordres de grandeur évoqués : A ~11-15 %, B ~7-10 %, C ~8-12 %), négociables par château via `chateau_modules.commission_pct_negociee` en S2-ε.

**4. Auth client**
Options : magic link ; email + mot de passe ; guest checkout (paie sans compte — implique relâcher `reservations.user_id NOT NULL` ou créer un user « shadow ») ; SSO Apple/Google.
Recommandation : **magic link** pour S2 — zéro mot de passe à gérer, friction minimale, et `reservations.user_id NOT NULL` reste respecté (le compte est créé au moment de la résa via le trigger `handle_new_user`).
**✅ Décision actée le 12 mai 2026 : magic link** (Supabase Auth natif, `signInWithOtp`). Le compte (`auth.users`) persiste — compatible Club des Châtelains et fidélité futurs.

**5. Stripe Checkout (hosted) vs Stripe Elements (embedded)**
Recommandation : **Checkout hosted** pour S2 — rapide à intégrer, conformité PCI par défaut, page de paiement Stripe-maintenue. Migration vers Elements en S3 si une UX paiement « premium » intégrée à la vitrine est souhaitée.
**✅ Décision actée le 12 mai 2026 : Stripe Checkout hosted**, avec branding LCC (logo + navy/or via Stripe Dashboard → Branding ; mention Fondation du Patrimoine intégrable dans l'en-tête de la session).

**6. Devise(s)**
Recommandation : **EUR seul** pour S2. GBP/USD éventuellement plus tard (peu probable, marché français).
**✅ Décision actée le 12 mai 2026 : EUR seul S2.** La clientèle internationale paie en EUR (conversion côté banque émettrice).

**7. TVA**
Question : prix affiché TTC côté client ; TVA gérée par le châtelain (autoliquidation / franchise selon son statut pro ou particulier). Le statut châtelain (pro vs particulier) impacte la facturation et l'`application_fee`.
Recommandation : pour S2 (mode démo), afficher **TTC** sans ventilation TVA à l'écran ; la question juridique précise (qui émet la facture, qui collecte la TVA) doit être tranchée avec un comptable avant le live. À ne pas sous-estimer pour la bascule prod.
**✅ Décision actée le 12 mai 2026 : à confirmer avec un comptable cette semaine.** Le dev S2 démarre en TTC affiché simple. Questions au comptable : régime TVA de la future SAS LCC ; commission Stripe Connect HT vs TTC ; statut juridique et régime TVA de Briottières + Le Blanc Buisson ; auto-liquidation plateforme/châtelain ; TVA nuitée + petit-déjeuner (chambres d'hôtes vs hôtel pro). Pistes : Dougs, Legalstart, comptable local. *(→ « Actions Matthieu » en cours.)*

**8. TTL du hold de dates**
Question : combien de temps les dates sont « réservées » pendant que le client est sur Stripe Checkout ?
Options : 15 min / 30 min ; mécanisme via `reservation_holds` (table dédiée) ou via `disponibilites` (lignes `est_disponible=false` temporaires).
Recommandation : **15 min**, via **table `reservation_holds` dédiée** (purge propre par le cron, pas de pollution du calendrier `disponibilites` qui sert aussi à l'affichage public). Stripe Checkout Session expire par défaut à 24 h — on configurera `expires_at` plus court côté Stripe aussi.
**✅ Décision actée le 12 mai 2026 : 15 min, table `reservation_holds` dédiée.** Conforme à la reco.

**9. Confirmation auto vs validation manuelle owner**
Question : après paiement réussi, la résa passe `confirmed` automatiquement, ou le châtelain doit confirmer dans son dashboard ?
Recommandation : **auto-confirmation** pour S2 — friction minimale pour la démo prospect, et le châtelain garde la possibilité d'annuler (avec remboursement) s'il y a un souci. La validation manuelle (`reservations.cancellation_policy` / un flag par château) peut s'activer en S3.
**✅ Décision actée le 12 mai 2026 : auto-confirmation + bouton « Annuler avec remboursement »** dans le dashboard châtelain. Pas d'état intermédiaire `pending_owner_validation` — plus simple côté code et UX.

**10. Format de séjour minimum**
Options : 1 nuit / 2 nuits min / 3 nuits min / week-end strict. `chambres.min_stay_nights` existe déjà (défaut 1).
Recommandation : à **demander à Arnaud (Briottières) et Maïté & Éric (Le Blanc Buisson)** avant S2-α. En attendant, S2 respecte `min_stay_nights` tel qu'en base (défaut 1).
**✅ Décision actée le 12 mai 2026 : 1 nuit par défaut S2** ; les châtelains ajusteront en S3 via leur dashboard (`chambres.min_stay_nights` existe déjà, défaut 1 — simple valeur de seed).

**11. Politique no-show**
Question : remboursement partiel ? aucun ? décision du châtelain ?
Recommandation : **aucun remboursement** en no-show pour S2 (cohérent avec une politique flexible côté annulation anticipée) ; affiner avec les châtelains en S3.
**✅ Décision actée le 12 mai 2026 : aucun remboursement no-show par défaut.** Geste commercial possible au cas par cas via le bouton « Rembourser cette réservation » du dashboard châtelain (appel `refunds.create`).

**12. Routing frontend**
Options : introduire react-router ; rester sur le pattern overlay / état local d'`App.jsx`.
Recommandation : **rester sur l'état local** pour S2 — cohérent avec toute la stack actuelle, pas de big-bang. Gérer les 1-2 cas d'URL nécessaires (retour Stripe `?session_id=`) par lecture de `window.location.search` au montage.
**✅ Décision actée le 12 mai 2026 : voie hybride — `react-router-dom` progressif (strangler fig).** RÉVISE la reco ci-dessus. react-router pour les NOUVEAUX écrans S2 (booking flow, confirmation, compte client, dashboards, callback auth) ; les overlays existants restent inchangés. Routes initiales : `/reserver/:chateauSlug`, `/reservation/:id/confirmation`, `/mon-compte`, `/chatelain/dashboard`, `/admin/dashboard`, `/auth/callback`. Setup : `npm i react-router-dom`, `<BrowserRouter>` dans `main.jsx`, `<Routes>` à côté des overlays dans `App.jsx`. Coût marginal S2-α : +3-5 h. Migration progressive des overlays en S3+ (`/`, `/chateau/:slug`, …).

**13. Avis post-séjour**
Recommandation : **Sprint S3** — non critique pour le booking flow lui-même. `chateaux.note_sur_5` / `nb_avis` existent déjà comme cibles futures.
**✅ Décision actée le 12 mai 2026 : reporté Sprint S3.** Aucun impact S2 ; `chateaux.note_sur_5` / `nb_avis` restent en seed.

**14. Multi-langue (i18n)**
Recommandation : **français seul** pour S2 ; anglais en S3+ si des prospects étrangers se manifestent.
**✅ Décision actée le 12 mai 2026 : pré-structure i18n dès S2, EN activé S3.** Setup `react-i18next` + `src/i18n/fr.json` unique dès S2 ; tous les nouveaux strings via `t('clef')`, jamais en dur ; pas de sélecteur visible S2. S3 : ajout `en.json` + traduction contenu éditorial + activation du sélecteur. Coût marginal S2-α : +3 h.

---

## 7. Risques & dépendances

| # | Risque | Impact | Probabilité | Mitigation |
|---|---|---|---|---|
| 1 | Bascule Stripe **live** conditionnée par l'immatriculation LCC (SAS/SASU). Retard d'immat → retard prod live. | **Élevé** | Moyenne | Tout S2 se fait en mode **TEST** (aucune entité requise). Lancer la création de la société en parallèle dès mai. La démo prospect ne dépend pas du live. |
| 2 | Onboarding Stripe Connect Express bloqué si KYC échoue. | Moyen | Faible | En mode test, le KYC est simulé (pas de vrais documents). Briottières (Arnaud) et Le Blanc Buisson (Maïté & Éric) sont déjà des **structures juridiques opérationnelles** → KYC live techniquement faisable. À préparer en amont les pièces requises : SIRET, RIB, pièce d'identité du dirigeant, justificatif d'activité. Prévoir un délai de traitement Stripe. |
| 3 | Webhooks Stripe pendant un downtime des Edge Functions Supabase → événements manqués. | Moyen | Faible | Stripe ré-essaie automatiquement (jusqu'à 3 jours). Dédup par `event.id`. Un job de réconciliation (admin) peut rejouer les sessions manquantes via l'API Stripe. |
| 4 | Flake CI WebKit « internal error » (déjà observé et tracé dans CLAUDE.md, 12 mai 2026). | Faible | Faible | Documenté ; re-run = vert. Si récurrence (> 2 fails/mois), classer le pattern message comme `flake_infra` non bloquant dans `console-errors.cjs`. |
| 5 | Limites du plan Brevo (volume d'emails transactionnels gratuits). | Faible | Faible | Volume S2 négligeable (démo + tests). Surveiller à la montée en charge prod ; basculer sur un plan payant si besoin. |
| 6 | Plus de 2 châtelains signent avant la fin de S2 → retard sur l'onboarding manuel. | Moyen | Faible | L'onboarding est court (~15 min, flow Stripe-hosted). Documenter un runbook d'onboarding châtelain dès S2-β pour le rendre réplicable. |
| 7 | Question TVA / facturation non tranchée avant le live (qui émet la facture, qui collecte la TVA, statut pro/particulier du châtelain). | **Élevé** (pour le live) | Moyenne | Hors scope dev S2 mais **bloquant pour la prod** : à traiter avec un comptable en mai-juin, en parallèle de l'immatriculation. À garder en vue dans toute décision d'archi paiement. |
| 8 | Double-booking si le hold de dates est mal géré (TTL trop long, purge défaillante, race condition). | Moyen | Faible | Table `reservation_holds` + index sur `expires_at` + purge cron quotidienne + `count_chambres_disponibles` qui prend les holds en compte. Tests E2E sur le cas « deux clients, même créneau ». |
| 9 | Rétention des preview Vercel pour les démos prospects mai-juin (Vercel conserve les preview deployments ~7 jours sur le plan par défaut). | Moyen | Moyenne | Vérifier la politique de rétention du plan Vercel actuel. Si > 5 prospects sur des liens preview en mai-juin : soit upgrade du plan, soit redéploiement manuel avant chaque démo, soit ancrer la démo sur un commit `main` vert récent (rétention plus longue / déploiement de production stable). |

---

## Annexe — checklist de démarrage S2-α

- [ ] `npm i @stripe/stripe-js` (front) ; SDK Stripe Deno côté Edge ; `@getbrevo/brevo` côté Edge.
- [ ] `supabase functions new create-checkout-session` / `stripe-webhook`.
- [ ] `supabase secrets set STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... SUPABASE_SERVICE_ROLE_KEY=... BREVO_API_KEY=...`.
- [ ] Mettre à jour `.env.example` (vars `VITE_STRIPE_PUBLISHABLE_KEY`, IDs templates Brevo — sans valeurs).
- [ ] Migration `supabase/migrations/<date>-s2-booking-columns.sql` (colonnes `reservations` + RPC + `reservation_holds`).
- [ ] Brancher `AuthContext` dans `App.jsx`, remplacer le stub `AuthModal`.
- [ ] Carte de test Stripe sous la main : `4242 4242 4242 4242`.

---

*Fin du document. À reviser par Matthieu — les arbitrages de la section 6 conditionnent le démarrage de S2-α.*
