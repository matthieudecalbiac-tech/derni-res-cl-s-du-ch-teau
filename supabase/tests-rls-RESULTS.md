# Résultats tests RLS — Sprint S1-δ Phase 5

**Date d'exécution** : 10 mai 2026
**Exécuté par** : Matthieu via Supabase Dashboard SQL Editor
**Script source** : `supabase/tests-rls.sql` (356 lignes, 3 fixes appliqués)
**Project ref** : `ynoieryxfqiqjscqieum` (lcc-prod, eu-west-1)

## Synthèse

**Score global : 23/23 PASS** ✅

Defense-in-depth validée : GRANT Postgres + RLS bloquent anon sur tables privées. Vues publiques bypass RLS pour exposer données filtrées (commission cachée). Aucun trou de sécurité détecté.

## Résultats détaillés

| # | Test | Résultat | Verdict |
|---|---|---|---|
| SETUP | role check | anon | PASS |
| 1 | anon SELECT chateaux | 8 rows (attendu 8) | PASS |
| 2 | anon SELECT chambres | 23 rows (attendu 23) | PASS |
| 3 | anon SELECT modules | 4 rows (attendu 4) | PASS |
| 4 | anon SELECT offres | 1 rows (attendu 1, Briottières Module B) | PASS |
| 5 | anon SELECT reservations | ERREUR 42501 (GRANT bloque) | PASS |
| 6 | anon SELECT users | ERREUR 42501 (GRANT bloque) | PASS |
| 7 | anon INSERT chateaux | ERREUR 42501 | PASS |
| 8 | anon INSERT reservations | ERREUR 42501 | PASS |
| 9 | anon SELECT chateau_modules | ERREUR 42501 (GRANT bloque) | PASS |
| 10 | anon SELECT chateau_modules_public (vue) | 12 rows (attendu 12) | PASS |
| 11.a-chambres | [PUBLIC] chambres | 23 rows | PASS |
| 11.a-chateau_alentours | [PUBLIC] chateau_alentours | 36 rows | PASS |
| 11.a-chateau_amenities | [PUBLIC] chateau_amenities | 48 rows | PASS |
| 11.a-chateau_timeline | [PUBLIC] chateau_timeline | 48 rows | PASS |
| 11.a-chateaux | [PUBLIC] chateaux | 8 rows | PASS |
| 11.a-modules | [PUBLIC] modules | 4 rows | PASS |
| 11.b-audit_log | [PRIVÉ] audit_log | ERR 42501 | PASS |
| 11.b-chateau_modules | [PRIVÉ] chateau_modules | ERR 42501 | PASS |
| 11.b-chateau_owners | [PRIVÉ] chateau_owners | ERR 42501 | PASS |
| 11.b-disponibilites | [PRIVÉ] disponibilites | 0 rows | PASS |
| 11.b-reservations | [PRIVÉ] reservations | ERR 42501 | PASS |
| 11.b-users | [PRIVÉ] users | ERR 42501 | PASS |

## Bugs détectés

Aucun bug RLS détecté. Le seul FAIL initial (Test #4) était causé par l'absence de seed dans la table `offres` (hors policy RLS), corrigé via migration `2026-05-09-seed-offre-briottieres.sql`.

## Notes complémentaires

- **Découverte Phase 5** : pattern defense-in-depth Postgres GRANT + Supabase RLS. Anon obtient erreur 42501 (insufficient_privilege) avant même l'évaluation de la policy RLS pour les tables sans GRANT explicite. C'est le comportement attendu et sécurisant.

- **Tests authenticated** client/chatelain/admin reportés Sprint S2 quand Auth Phase 3 sera implémentée (login/signup + seed users de test).

- **Script idempotent** : `tests-rls.sql` peut être rejoué après chaque modification RLS (BEGIN/EXCEPTION wrapping + DROP TABLE IF EXISTS sur table temp).
