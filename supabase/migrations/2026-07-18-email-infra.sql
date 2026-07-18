-- ============================================================
-- Infrastructure de notification email — chateau_contacts + email_log
--
-- Deux tables, deux rôles DISTINCTS (décision Matthieu) :
--
-- 1. chateau_contacts — le contact de NOTIFICATION d'un château, SANS compte
--    requis. On NE touche PAS à chateau_owners : owners est la table des COMPTES
--    châtelains (Stripe, rôle dans le domaine) ; y mettre des contacts sans
--    compte (user_id nullable) casserait sa sémantique et mélangerait deux
--    concepts. Table dédiée = séparation des rôles.
--
-- 2. email_log — trace et REPRISE de chaque envoi (statut, tentatives, dernière
--    erreur, id Brevo, payload rejouable). Jamais exposée au front.
--
-- PIÈGE GRANT (montré 2 fois : amenity_equipements, puis users/reservations) :
-- service_role BYPASSE la RLS mais PAS le GRANT (évalué AVANT la RLS). Sans GRANT
-- explicite, une Edge Function service_role prend un 42501. Les GRANTs sont donc
-- posés noir sur blanc ci-dessous.
--
-- BEGIN/COMMIT : tout posé atomiquement. Idempotent (CREATE ... IF NOT EXISTS,
-- DROP POLICY/TRIGGER IF EXISTS, GRANT idempotent par nature).
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────
-- 1. TABLE chateau_contacts
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chateau_contacts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chateau_id  uuid        NOT NULL REFERENCES public.chateaux(id) ON DELETE CASCADE,
  email       text        NOT NULL,
  nom         text,
  role        text        NOT NULL DEFAULT 'proprietaire',
  actif       boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW(),

  -- Plusieurs contacts par château OK (proprio + régisseur), mais pas le même
  -- email deux fois sur le même château.
  CONSTRAINT chateau_contacts_email_unique UNIQUE (chateau_id, email)
);

COMMENT ON TABLE public.chateau_contacts IS
  'Contacts de NOTIFICATION d''un château, SANS compte requis. Distinct de chateau_owners (comptes châtelains + Stripe) : deux rôles, deux tables. Rempli par l''admin ; source des destinataires « demande_chatelain ».';
COMMENT ON COLUMN public.chateau_contacts.role IS
  'Rôle du contact (libre) : proprietaire, regisseur, etc. Texte, pas d''enum (taxonomie souple).';
COMMENT ON COLUMN public.chateau_contacts.actif IS
  'Contact actif : false = ne plus notifier sans supprimer la ligne (historique préservé).';

DROP TRIGGER IF EXISTS set_timestamp_chateau_contacts ON public.chateau_contacts;
CREATE TRIGGER set_timestamp_chateau_contacts
  BEFORE UPDATE ON public.chateau_contacts
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- ─────────────────────────────────────────────────────────
-- 2. TABLE email_log
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_log (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  destinataire      text        NOT NULL,
  type              text        NOT NULL,       -- 'demande_client' | 'demande_chatelain' | 'demande_admin'
  reservation_id    uuid        REFERENCES public.reservations(id) ON DELETE SET NULL,
  statut            text        NOT NULL DEFAULT 'en_attente'
                    CHECK (statut IN ('en_attente', 'envoye', 'echoue')),
  tentatives        integer     NOT NULL DEFAULT 0,
  derniere_erreur   text,
  brevo_message_id  text,                       -- id retourné par Brevo (nullable)
  payload           jsonb,                      -- sujet + params : de quoi rejouer sans recalculer
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.email_log IS
  'Trace et REPRISE de chaque envoi email. Jamais exposée au front (RLS active, aucune policy). type ∈ demande_client/demande_chatelain/demande_admin. payload = sujet+params rejouables. reservation_id SET NULL si la demande disparaît (le log survit).';
COMMENT ON COLUMN public.email_log.tentatives IS
  'Nombre de tentatives d''envoi. Incrémenté à chaque essai — support d''un renvoi borné.';
COMMENT ON COLUMN public.email_log.payload IS
  'JSONB { sujet, params } : tout ce qu''il faut pour rejouer l''envoi sans recalculer.';

-- Index partiel : retrouver vite les envois à (re)faire (en_attente + echoue),
-- sans indexer la masse des 'envoye'.
CREATE INDEX IF NOT EXISTS idx_email_log_a_renvoyer
  ON public.email_log (statut) WHERE statut != 'envoye';

DROP TRIGGER IF EXISTS set_timestamp_email_log ON public.email_log;
CREATE TRIGGER set_timestamp_email_log
  BEFORE UPDATE ON public.email_log
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- ─────────────────────────────────────────────────────────
-- 3. RLS
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.chateau_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_log        ENABLE ROW LEVEL SECURITY;

-- chateau_contacts : lecture pour le châtelain de CE château OU l'admin. Les
-- écritures passent par service_role (GRANT §4) ; l'admin les gérera plus tard
-- via une policy d'écriture dédiée (hors périmètre ici).
DROP POLICY IF EXISTS chateau_contacts_select_chatelain_admin ON public.chateau_contacts;
CREATE POLICY chateau_contacts_select_chatelain_admin ON public.chateau_contacts
  FOR SELECT USING (public.is_chatelain_of(chateau_id) OR public.is_admin());

-- email_log : AUCUNE policy — RLS active = deny-all pour anon/authenticated.
-- service_role bypasse la RLS (via GRANT §4). Jamais exposé au front.

-- ─────────────────────────────────────────────────────────
-- 4. GRANTS (le piège : service_role a besoin du GRANT explicite)
-- ─────────────────────────────────────────────────────────
-- chateau_contacts : service_role CRUD complet ; authenticated SELECT (la RLS
-- filtre ensuite is_chatelain_of/is_admin) ; anon rien.
REVOKE ALL ON public.chateau_contacts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chateau_contacts TO service_role;
GRANT SELECT                         ON public.chateau_contacts TO authenticated;

-- email_log : service_role SELECT+INSERT+UPDATE UNIQUEMENT (pas de DELETE — un
-- log ne s'efface pas). anon/authenticated : rien (aucune policy + aucun GRANT).
REVOKE ALL ON public.email_log FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.email_log TO service_role;

COMMIT;

-- ============================================================
-- VÉRIFICATION (lecture seule) — à jouer après COMMIT.
-- ============================================================
-- 1. Les 2 tables et leur RLS active (rowsecurity = true).
SELECT relname, relrowsecurity
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN ('chateau_contacts', 'email_log')
ORDER BY relname;

-- 2. Les GRANTs attendus.
--    chateau_contacts : service_role SELECT/INSERT/UPDATE/DELETE ; authenticated SELECT.
--    email_log        : service_role SELECT/INSERT/UPDATE (pas de DELETE).
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('chateau_contacts', 'email_log')
  AND grantee IN ('service_role', 'authenticated', 'anon')
ORDER BY table_name, grantee, privilege_type;

-- 3. La policy de lecture sur chateau_contacts (email_log doit n'en avoir AUCUNE).
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('chateau_contacts', 'email_log')
ORDER BY tablename, policyname;
