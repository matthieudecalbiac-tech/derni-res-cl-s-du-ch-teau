-- ============================================================
-- GRANTs service_role pour l'Edge Function demande-reservation
--
-- POURQUOI : service_role BYPASSE la RLS, mais PAS les GRANTs de table — le GRANT
-- est évalué AVANT la RLS. Sans lui, l'Edge Function (clé service_role) prend un
-- « permission denied » (42501) alors même qu'elle est censée tout court-circuiter.
-- C'est le piège déjà documenté pour amenity_equipements et traité pour
-- demande_rate_limit ; il restait ouvert sur users et reservations.
--
-- CONSTAT (vérifié en base) : service_role avait SELECT sur chambres/chateaux/
-- chateau_modules/modules et SELECT/INSERT/DELETE sur demande_rate_limit, mais
-- RIEN sur users ni reservations → la fonction plantait au lookup du compte.
--
-- MINIMUM STRICT (rien de plus — surface d'écriture la plus étroite possible) :
--   users        : SELECT (lookup par email) + UPDATE (full_name à la création).
--   reservations : SELECT (idempotence + plafond pending + RETURNING de l'insert)
--                  + INSERT (la demande).
-- PAS de DELETE. PAS d'UPDATE sur reservations : la fonction ne modifie JAMAIS
-- une demande existante (idempotence = elle RENVOIE l'existante, ne la touche pas).
--
-- Le provisioning du compte (createUser → trigger handle_new_user) ne passe PAS
-- par ces GRANTs : c'est l'Admin API GoTrue + un trigger SECURITY DEFINER.
--
-- Idempotent : GRANT est idempotent par nature (re-jouable sans effet de bord).
-- BEGIN/COMMIT : les deux GRANTs posés atomiquement.
-- ============================================================

BEGIN;

-- users : lookup du compte par email, puis full_name UNIQUEMENT à la création.
GRANT SELECT, UPDATE ON public.users TO service_role;

-- reservations : SELECT (idempotence, plafond pending, RETURNING id de l'insert),
-- INSERT (la demande pending). Ni DELETE ni UPDATE : jamais de modification.
GRANT SELECT, INSERT ON public.reservations TO service_role;

COMMIT;

-- ============================================================
-- VÉRIFICATION (lecture seule) — les privilèges service_role attendus.
-- Attendu : users → SELECT, UPDATE ; reservations → SELECT, INSERT.
-- ============================================================
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'service_role'
  AND table_schema = 'public'
  AND table_name IN ('users', 'reservations')
ORDER BY table_name, privilege_type;
