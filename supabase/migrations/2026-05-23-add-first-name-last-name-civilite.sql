-- ════════════════════════════════════════════════════════════════
-- Migration Sprint α.2.5 Phase B4.5
-- Ajout colonnes first_name, last_name, civilite à public.users
-- Date : 2026-05-23 (J4 Sprint Cercle des Châtelains)
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS civilite TEXT;

COMMENT ON COLUMN public.users.first_name IS 'Prénom du membre (obligatoire, complété via /completer-profil après confirmation email)';
COMMENT ON COLUMN public.users.last_name IS 'Nom de famille du membre (obligatoire, complété via /completer-profil)';
COMMENT ON COLUMN public.users.civilite IS 'Civilité optionnelle : M, Mme, Mx';

-- Note : full_name est conservée pour transition souple.
-- Phase post-MVP : décider entre suppression ou trigger de sync
-- (full_name = first_name || ' ' || last_name).