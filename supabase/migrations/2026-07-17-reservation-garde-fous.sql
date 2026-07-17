-- ============================================================
-- Garde-fous de la demande de réservation (mode sur_place) — brique 2-bis
--
-- Trois protections que l'Edge Function `demande-reservation` (brique 2)
-- exigera. Cette fonction écrit avec la clé service_role : elle BYPASSE la RLS,
-- elle est donc le SEUL rempart. Ces objets DB lui donnent les moyens de le tenir.
--
-- 1. RATE LIMIT — table `demande_rate_limit` (une ligne par tentative, par IP).
--    L'Edge Function est sans état (instance éphémère) : le compteur anti-abus
--    doit vivre en base. La fenêtre glissante est CALCULÉE dans la fonction
--    (3 tentatives / 15 min / IP) ; la table ne fait que STOCKER les horodatages.
--    RLS active + AUCUNE policy + GRANT à service_role SEUL :
--      → anon / authenticated : zéro accès (ni GRANT, ni policy).
--      → service_role : GRANT explicite. PIÈGE amenity_equipements
--        (policies.sql §10) — service_role bypasse la RLS mais PAS le GRANT,
--        évalué AVANT la RLS. Sans ce GRANT, l'Edge Function prend un 42501.
--    PURGE : opportuniste, faite PAR la fonction (DELETE des lignes de plus de
--    15 min à chaque invocation). Pas de pg_cron : la table s'auto-borne aux
--    tentatives des 15 dernières minutes — quelques lignes sur ce trafic.
--
-- 2. IDEMPOTENCE — index UNIQUE partiel sur reservations
--    (user_id, chambre_id, date_arrivee, date_depart) WHERE status = 'pending'.
--    Un double-clic (même visiteur, même chambre, mêmes dates, à quelques
--    secondes) ne peut créer qu'UNE demande pending. La fonction insère en
--    ON CONFLICT DO NOTHING et renvoie l'id existant. Le prédicat WHERE pending
--    laisse re-demander après annulation (le status change → hors index).
--
-- 3. LONGUEUR MESSAGE — CHECK (char_length(message) <= 2000) sur reservations.
--    Le message libre du visiteur est une porte d'entrée (champ texte public).
--    2000 caractères = plusieurs paragraphes, borné contre l'abus. La fonction
--    rejette en 400 au-delà ; ce CHECK est la ceinture+bretelles en base.
--
-- BEGIN/COMMIT : les 3 objets posés atomiquement.
-- Idempotent : CREATE TABLE/INDEX IF NOT EXISTS ; CHECK en DROP-then-ADD
-- (Postgres ne supporte pas ADD CONSTRAINT IF NOT EXISTS).
-- ============================================================

BEGIN;

-- ── 1. RATE LIMIT ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.demande_rate_limit (
  ip          text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.demande_rate_limit IS
  'Anti-abus de l''Edge Function demande-reservation : une ligne par tentative (IP + horodatage). Fenêtre glissante calculée dans la fonction (3/15min/IP). Purge OPPORTUNISTE par la fonction (DELETE des lignes > 15 min à chaque appel) — pas de pg_cron, la table s''auto-borne. Accès service_role SEUL (RLS active, aucune policy, GRANT ciblé).';

CREATE INDEX IF NOT EXISTS idx_demande_rate_limit_ip_created
  ON public.demande_rate_limit (ip, created_at);

ALTER TABLE public.demande_rate_limit ENABLE ROW LEVEL SECURITY;

-- Aucune policy : anon/authenticated n'ont ni GRANT ni policy → zéro accès.
-- service_role bypasse la RLS, mais PAS le GRANT (évalué AVANT). Sans ce GRANT
-- explicite, l'Edge Function (clé service_role) prend un 42501. Cf. le piège
-- amenity_equipements (policies.sql §10, service_role oublié → permission denied).
REVOKE ALL ON public.demande_rate_limit FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.demande_rate_limit TO service_role;

-- ── 2. IDEMPOTENCE ──────────────────────────────────────────
-- Une seule demande pending par (user, chambre, dates). Double-clic → ON
-- CONFLICT DO NOTHING dans la fonction, qui renvoie l'id existant.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_reservations_pending_demande
  ON public.reservations (user_id, chambre_id, date_arrivee, date_depart)
  WHERE status = 'pending';

-- ── 3. LONGUEUR MESSAGE ─────────────────────────────────────
-- Idempotent via DROP-then-ADD (pas d'ADD CONSTRAINT IF NOT EXISTS en PG).
ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_message_length;
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_message_length
    CHECK (message IS NULL OR char_length(message) <= 2000);

COMMIT;

-- ============================================================
-- VÉRIFICATION (lecture seule) — à jouer après COMMIT.
-- ============================================================
-- 1. La table rate-limit et ses GRANTs (attendu : service_role seul).
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'demande_rate_limit'
ORDER BY grantee, privilege_type;

-- 2. L'index unique partiel d'idempotence.
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND indexname = 'uniq_reservations_pending_demande';

-- 3. Le CHECK longueur message.
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conname = 'reservations_message_length';
