# Supabase — Les Clés du Château

Scripts SQL pour bootstrap et migration de la base Supabase. À appliquer dans l'ordre.

## Ordre d'exécution

| Ordre | Fichier | Rôle | Statut |
|---|---|---|---|
| 1 | `schema.sql` | Tables, enums, indexes, triggers, contraintes | ✅ S1-α (commit `98daa73`) |
| 2 | `policies.sql` | Row Level Security par rôle (client/chatelain/admin) | ⏳ S1-β |
| 3 | `seed.sql` | Données initiales (8 châteaux, 4 modules, 23 chambres) | ⏳ S1-γ |

Chaque script est **idempotent** : `CREATE IF NOT EXISTS`, `DO $$ ... EXCEPTION WHEN duplicate_object`, `DROP TRIGGER IF EXISTS` avant `CREATE TRIGGER`. Ré-exécution sans risque.

## Bootstrap d'un nouveau projet Supabase

### Option A — SQL Editor (recommandé en dev)

1. Créer un projet sur [supabase.com](https://supabase.com) (région `eu-west-3` Paris).
2. Ouvrir **SQL Editor** dans le dashboard.
3. Coller et exécuter `schema.sql`, puis `policies.sql`, puis `seed.sql` dans cet ordre.

### Option B — psql (CI/CD ou prod)

```bash
export SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

psql "$SUPABASE_DB_URL" -f supabase/schema.sql
psql "$SUPABASE_DB_URL" -f supabase/policies.sql
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

Le mot de passe DB se trouve dans **Project Settings → Database → Connection string**.

## Variables d'environnement (`.env`, jamais commit)

Créer un `.env` à la racine du repo (déjà dans `.gitignore`) :

```bash
VITE_SUPABASE_URL=https://[PROJECT].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

- `VITE_SUPABASE_URL` : URL du projet (publique, présente dans le bundle).
- `VITE_SUPABASE_ANON_KEY` : clé publique anon (non sensible — RLS protège les données).
- **Ne jamais commit** la `service_role` key (bypass RLS) — usage serveur uniquement.

Vérification : `git check-ignore .env` doit retourner `.env`.

## Conventions du schéma

Voir [`schema.sql`](./schema.sql) entête. Résumé :
- snake_case partout, IDs `uuid` via `gen_random_uuid()`.
- Money en cents (int) — jamais float.
- `created_at` / `updated_at` sur 13/14 tables (auto via `trigger_set_timestamp`).
- 5 enums Postgres : `user_role`, `reservation_status`, `payout_status`, `alentour_type`, `amenity_type`.
- Architecture multi-modules A/B/C/D (Permanent / Dernières Clés / Club / Événementiel).

## Rollback

En cas de besoin, ré-exécuter `schema.sql` ne casse rien (idempotent).
Pour repartir de zéro sur un projet de dev : `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` puis re-bootstrap.
**À ne JAMAIS exécuter en prod.**
