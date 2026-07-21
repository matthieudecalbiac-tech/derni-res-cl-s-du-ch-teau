-- ============================================================
-- Vue reservations_chatelain_view — LECTURE des demandes par le châtelain.
-- À jouer dans Supabase Dashboard → SQL Editor.
--
-- Miroir de reservations_client_view (§4.2 policies.sql) pour le MÉCANISME :
-- security_invoker = true → la RLS de reservations s'applique avec les droits
-- de l'appelant. reservations_select_owner filtre alors par château (via
-- chambres → chateau_owners) : un châtelain ne voit QUE les demandes des
-- chambres de SES châteaux. Le cloisonnement inter-châteaux est assuré par la
-- RLS, PAS par la vue.
--
-- Décisions actées (Matthieu) :
--   - LCC intermédiaire : la vue N'EXPOSE PAS user_id ni aucun contact client
--     (nom/email jamais visibles du châtelain ; users_select_self intouchée).
--   - commission_lcc_cents EST exposée (non secrète pour le châtelain). Aucune
--     frontière base : on NE touche PAS aux GRANTs de reservations.
--   - stripe_*, payout_*, cancellation_* NON exposés (inutiles à l'écran).
--
-- JOINs sûrs sous security_invoker : chambres (chambres_select_public USING true)
-- + chateaux (chateaux_select_public : is_chatelain_of(id) OR publie) → aucune
-- ligne légitime du châtelain n'est droppée par la RLS des tables jointes.
--
-- Idempotent : CREATE OR REPLACE VIEW + GRANT idempotent.
-- ============================================================

CREATE OR REPLACE VIEW public.reservations_chatelain_view
WITH (security_invoker = true) AS
SELECT
  r.id,
  r.chambre_id,
  ch.nom               AS chambre_nom,
  c.nom                AS chateau_nom,
  c.slug               AS chateau_slug,
  r.date_arrivee,
  r.date_depart,
  r.voyageurs,
  r.message,
  r.prix_total_cents,
  r.commission_lcc_cents,
  r.status,
  r.created_at
FROM public.reservations r
JOIN public.chambres  ch ON ch.id = r.chambre_id
JOIN public.chateaux  c  ON c.id  = ch.chateau_id;

COMMENT ON VIEW public.reservations_chatelain_view IS
  'Vue châtelain des demandes de séjour. security_invoker=true : RLS reservations_select_owner filtre par château (chambres→chateau_owners). N''expose PAS user_id/contact client (LCC intermédiaire) ; expose commission_lcc_cents (non secrète pour le châtelain) ; cache stripe_*/payout_*. JOIN chambres(nom)+chateaux(nom,slug) pour repérage multi-château.';

GRANT SELECT ON public.reservations_chatelain_view TO authenticated;

-- ── Vérification (lecture seule) ──
-- ⚠ NE valide PAS le filtrage RLS en SQL Editor : postgres BYPASSE la RLS et
-- verrait toutes les lignes. Le vrai test de cloisonnement se fait AUTHENTIFIÉ
-- en tant que châtelain (via l'app). Ici on contrôle juste la forme de la vue :
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'reservations_chatelain_view'
ORDER BY ordinal_position;
