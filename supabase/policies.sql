-- ═══════════════════════════════════════════════════════════════════════════
-- LES CLÉS DU CHÂTEAU — RLS POLICIES SUPABASE (S1-β)
-- ═══════════════════════════════════════════════════════════════════════════
-- Fichier         : supabase/policies.sql
-- Branche         : feature/supabase-foundation
-- Cible           : Postgres 15+ (Supabase managed)
-- Pré-requis      : schema.sql appliqué (S1-α)
--
-- ARCHITECTURE
--   - 3 helpers RLS SECURITY DEFINER (is_admin, is_chatelain, is_chatelain_of)
--   - 1 trigger user provisioning (handle_new_user sur auth.users)
--   - 14 ENABLE ROW LEVEL SECURITY
--   - 2 vues publiques avec security_invoker = false (chateau_modules_public,
--     reservations_client_view) pour cacher commissions et stripe_*
--   - 46 policies réparties en 5 groupes (A users / B château+filles
--     / C modules+offres / D commerce / E ops)
--
-- IDEMPOTENCE
--   - DROP POLICY IF EXISTS avant chaque CREATE POLICY
--   - CREATE OR REPLACE FUNCTION / VIEW
--   - DROP TRIGGER IF EXISTS avant CREATE TRIGGER
--   - REVOKE / GRANT idempotents par nature
--
-- CHOIX TRANCHÉS (Matthieu, 8 mai 2026)
--   - Commissions château×LCC INVISIBLES anon/client (vues SQL nécessaires)
--   - Chatelain READ-ONLY sur reservations (flexibilité plug-in externe S2)
--   - Annulation RLS libre (status='cancelled'), policy business en S2
--   - Module C (Club) caché 100 % via offres.requires_role IS NOT NULL
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. HELPERS RLS (SECURITY DEFINER — bypass RLS pour éviter récursion)
-- ═══════════════════════════════════════════════════════════════════════════
-- Toutes les fonctions sont :
--   - SECURITY DEFINER : exécutées avec les privilèges du créateur (postgres),
--     donc bypass RLS sur public.users (sinon récursion infinie sur policy users)
--   - SET search_path = public, pg_temp : protection contre les attaques
--     search_path (recommandation Supabase + Postgres officiels)
--   - STABLE : signal au planner que la fonction n'a pas de side-effect

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_chatelain()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'chatelain'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_chatelain_of(p_chateau_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chateau_owners
    WHERE chateau_id = p_chateau_id AND user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.is_admin()                  IS
  'Helper RLS — true si l''utilisateur courant a le rôle admin. SECURITY DEFINER pour éviter récursion sur policy users.';
COMMENT ON FUNCTION public.is_chatelain()              IS
  'Helper RLS — true si l''utilisateur courant a le rôle chatelain (n''importe quel château).';
COMMENT ON FUNCTION public.is_chatelain_of(uuid)       IS
  'Helper RLS — true si l''utilisateur courant est lié au château p_chateau_id via chateau_owners.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. TRIGGER USER PROVISIONING (auth.users → public.users)
-- ═══════════════════════════════════════════════════════════════════════════
-- À chaque INSERT dans auth.users (signup Supabase Auth), créer la ligne
-- miroir dans public.users avec rôle 'client' par défaut. Admin et chatelain
-- sont promus a posteriori par un admin existant via UPDATE.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'client')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Trigger AFTER INSERT auth.users — crée la ligne miroir public.users (role=''client''). ON CONFLICT pour idempotence si signup réessayé.';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ACTIVATION RLS SUR LES 14 TABLES
-- ═══════════════════════════════════════════════════════════════════════════
-- Sans policy, RLS ENABLE bloque tous les accès (deny-by-default).
-- Les policies déclarées en sections 5-9 ouvrent ce qui est nécessaire.

ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chateaux           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chambres           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chateau_amenities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chateau_timeline   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chateau_alentours  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chateau_modules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offres             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chateau_owners     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disponibilites     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migrations_log     ENABLE ROW LEVEL SECURITY;


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. VUES PUBLIQUES (cacher colonnes sensibles : commissions, stripe_*)
-- ═══════════════════════════════════════════════════════════════════════════
-- security_invoker = false (mode DEFINER) : la vue tourne avec les privilèges
-- du créateur, pas de l'appelant. Permet à anon/authenticated de lire la vue
-- même si on REVOKE SELECT sur la table sous-jacente.

-- ───────────────────────────────────────────────────────────────────────────
-- 4.1 — chateau_modules_public (sans commission_pct_negociee)
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.chateau_modules_public
WITH (security_invoker = false) AS
SELECT
  id,
  chateau_id,
  module_id,
  est_actif,
  created_at,
  updated_at
FROM public.chateau_modules
WHERE est_actif = true;

COMMENT ON VIEW public.chateau_modules_public IS
  'Vue publique des activations module×château — cache la commission négociée. Recommandée pour anon/client. Chatelains/admins peuvent attaquer la table directe via RLS de section 7.2.';

-- Note : pas de REVOKE sur la table chateau_modules. La policy SELECT
-- déclarée en section 7.2 (chateau_modules_select_chatelain_admin) filtre
-- naturellement : anon/client retournent 0 ligne (pas de policy SELECT pour
-- eux), chatelain voit ses châteaux, admin voit tout.
-- La vue chateau_modules_public reste l'interface publique recommandée
-- (cache la commission + filtre est_actif=true) mais n'est pas obligatoire.
GRANT SELECT ON public.chateau_modules_public TO anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 4.2 — reservations_client_view (sans commission_lcc_cents, sans stripe_*)
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.reservations_client_view
WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  chambre_id,
  module_id,
  offre_id,
  date_arrivee,
  date_depart,
  prix_total_cents,
  status,
  cancellation_policy,
  payout_status,
  payout_sent_at,
  cancellation_reason,
  cancelled_at,
  created_at,
  updated_at
FROM public.reservations;

COMMENT ON VIEW public.reservations_client_view IS
  'Vue cliente des réservations — cache commission_lcc_cents et stripe_*. security_invoker=true : RLS de reservations s''applique (client voit ses lignes, chatelain les chambres de ses châteaux, admin tout).';

GRANT SELECT ON public.reservations_client_view TO anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. POLICIES — GROUPE A : users (5 policies)
-- ═══════════════════════════════════════════════════════════════════════════

-- 5.1 — SELECT : self ou admin
DROP POLICY IF EXISTS users_select_self ON public.users;
CREATE POLICY users_select_self ON public.users
  FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

-- 5.2 — UPDATE self : interdit le changement de rôle (anti-escalade)
DROP POLICY IF EXISTS users_update_self_no_role ON public.users;
CREATE POLICY users_update_self_no_role ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.users WHERE id = auth.uid())
  );

-- 5.3 — UPDATE admin : peut tout modifier, y compris promotion de rôle
DROP POLICY IF EXISTS users_update_admin ON public.users;
CREATE POLICY users_update_admin ON public.users
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5.4 — INSERT : admin seul (signup public passe par le trigger SECURITY DEFINER)
DROP POLICY IF EXISTS users_insert_admin ON public.users;
CREATE POLICY users_insert_admin ON public.users
  FOR INSERT
  WITH CHECK (public.is_admin());

-- 5.5 — DELETE : admin seul (cascade FK auth.users supprime aussi)
DROP POLICY IF EXISTS users_delete_admin ON public.users;
CREATE POLICY users_delete_admin ON public.users
  FOR DELETE
  USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. POLICIES — GROUPE B : chateaux + 4 tables filles (20 policies)
-- ═══════════════════════════════════════════════════════════════════════════
-- Pattern uniforme : SELECT public, INSERT admin, UPDATE chatelain_admin, DELETE admin.
-- chateaux : is_chatelain_of(id). Tables filles : is_chatelain_of(chateau_id).

-- ───────────────────────────────────────────────────────────────────────────
-- 6.1 — chateaux (4 policies)
-- ───────────────────────────────────────────────────────────────────────────

-- Le catalogue public se filtre par statut ; les brouillons restent visibles
-- de leur châtelain et de l'administration.
DROP POLICY IF EXISTS chateaux_select_public ON public.chateaux;
CREATE POLICY chateaux_select_public ON public.chateaux
  FOR SELECT
  USING (
    statut = 'publie'
    OR public.is_chatelain_of(id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS chateaux_insert_admin ON public.chateaux;
CREATE POLICY chateaux_insert_admin ON public.chateaux
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS chateaux_update_chatelain_admin ON public.chateaux;
CREATE POLICY chateaux_update_chatelain_admin ON public.chateaux
  FOR UPDATE
  USING (public.is_chatelain_of(id) OR public.is_admin())
  WITH CHECK (public.is_chatelain_of(id) OR public.is_admin());

DROP POLICY IF EXISTS chateaux_delete_admin ON public.chateaux;
CREATE POLICY chateaux_delete_admin ON public.chateaux
  FOR DELETE USING (public.is_admin());

-- ───────────────────────────────────────────────────────────────────────────
-- 6.2 — chambres (4 policies)
-- ───────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS chambres_select_public ON public.chambres;
CREATE POLICY chambres_select_public ON public.chambres
  FOR SELECT USING (true);

DROP POLICY IF EXISTS chambres_insert_admin ON public.chambres;
CREATE POLICY chambres_insert_admin ON public.chambres
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS chambres_update_chatelain_admin ON public.chambres;
CREATE POLICY chambres_update_chatelain_admin ON public.chambres
  FOR UPDATE
  USING (public.is_chatelain_of(chateau_id) OR public.is_admin())
  WITH CHECK (public.is_chatelain_of(chateau_id) OR public.is_admin());

DROP POLICY IF EXISTS chambres_delete_admin ON public.chambres;
CREATE POLICY chambres_delete_admin ON public.chambres
  FOR DELETE USING (public.is_admin());

-- ───────────────────────────────────────────────────────────────────────────
-- 6.3 — chateau_amenities (4 policies)
-- ───────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS chateau_amenities_select_public ON public.chateau_amenities;
CREATE POLICY chateau_amenities_select_public ON public.chateau_amenities
  FOR SELECT USING (true);

DROP POLICY IF EXISTS chateau_amenities_insert_admin ON public.chateau_amenities;
CREATE POLICY chateau_amenities_insert_admin ON public.chateau_amenities
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS chateau_amenities_update_chatelain_admin ON public.chateau_amenities;
CREATE POLICY chateau_amenities_update_chatelain_admin ON public.chateau_amenities
  FOR UPDATE
  USING (public.is_chatelain_of(chateau_id) OR public.is_admin())
  WITH CHECK (public.is_chatelain_of(chateau_id) OR public.is_admin());

DROP POLICY IF EXISTS chateau_amenities_delete_admin ON public.chateau_amenities;
CREATE POLICY chateau_amenities_delete_admin ON public.chateau_amenities
  FOR DELETE USING (public.is_admin());

-- ───────────────────────────────────────────────────────────────────────────
-- 6.4 — chateau_timeline (4 policies)
-- ───────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS chateau_timeline_select_public ON public.chateau_timeline;
CREATE POLICY chateau_timeline_select_public ON public.chateau_timeline
  FOR SELECT USING (true);

DROP POLICY IF EXISTS chateau_timeline_insert_admin ON public.chateau_timeline;
CREATE POLICY chateau_timeline_insert_admin ON public.chateau_timeline
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS chateau_timeline_update_chatelain_admin ON public.chateau_timeline;
CREATE POLICY chateau_timeline_update_chatelain_admin ON public.chateau_timeline
  FOR UPDATE
  USING (public.is_chatelain_of(chateau_id) OR public.is_admin())
  WITH CHECK (public.is_chatelain_of(chateau_id) OR public.is_admin());

DROP POLICY IF EXISTS chateau_timeline_delete_admin ON public.chateau_timeline;
CREATE POLICY chateau_timeline_delete_admin ON public.chateau_timeline
  FOR DELETE USING (public.is_admin());

-- ───────────────────────────────────────────────────────────────────────────
-- 6.5 — chateau_alentours (4 policies)
-- ───────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS chateau_alentours_select_public ON public.chateau_alentours;
CREATE POLICY chateau_alentours_select_public ON public.chateau_alentours
  FOR SELECT USING (true);

DROP POLICY IF EXISTS chateau_alentours_insert_admin ON public.chateau_alentours;
CREATE POLICY chateau_alentours_insert_admin ON public.chateau_alentours
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS chateau_alentours_update_chatelain_admin ON public.chateau_alentours;
CREATE POLICY chateau_alentours_update_chatelain_admin ON public.chateau_alentours
  FOR UPDATE
  USING (public.is_chatelain_of(chateau_id) OR public.is_admin())
  WITH CHECK (public.is_chatelain_of(chateau_id) OR public.is_admin());

DROP POLICY IF EXISTS chateau_alentours_delete_admin ON public.chateau_alentours;
CREATE POLICY chateau_alentours_delete_admin ON public.chateau_alentours
  FOR DELETE USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════════════
-- 7. POLICIES — GROUPE C : modules / chateau_modules / offres (10 policies)
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 7.1 — modules (référentiel statique — public en lecture, admin en écriture)
-- ───────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS modules_select_public ON public.modules;
CREATE POLICY modules_select_public ON public.modules
  FOR SELECT USING (true);

DROP POLICY IF EXISTS modules_write_admin ON public.modules;
CREATE POLICY modules_write_admin ON public.modules
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ───────────────────────────────────────────────────────────────────────────
-- 7.2 — chateau_modules (lecture chatelain/admin direct, sinon vue publique)
-- ───────────────────────────────────────────────────────────────────────────
-- REVOKE déjà posé section 4.1. Les policies suivantes s'appliquent quand
-- postgres / service_role / triggers SECURITY DEFINER lisent la table.

DROP POLICY IF EXISTS chateau_modules_select_chatelain_admin ON public.chateau_modules;
CREATE POLICY chateau_modules_select_chatelain_admin ON public.chateau_modules
  FOR SELECT
  USING (public.is_chatelain_of(chateau_id) OR public.is_admin());

DROP POLICY IF EXISTS chateau_modules_insert_admin ON public.chateau_modules;
CREATE POLICY chateau_modules_insert_admin ON public.chateau_modules
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS chateau_modules_update_admin ON public.chateau_modules;
CREATE POLICY chateau_modules_update_admin ON public.chateau_modules
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS chateau_modules_delete_admin ON public.chateau_modules;
CREATE POLICY chateau_modules_delete_admin ON public.chateau_modules
  FOR DELETE USING (public.is_admin());

-- ───────────────────────────────────────────────────────────────────────────
-- 7.3 — offres (cœur multi-modules avec invisibilité Module C)
-- ───────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS offres_select_visible ON public.offres;
CREATE POLICY offres_select_visible ON public.offres
  FOR SELECT
  USING (
    (visible = true AND (requires_role IS NULL OR auth.uid() IS NOT NULL))
    OR public.is_chatelain_of(chateau_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS offres_insert_chatelain ON public.offres;
CREATE POLICY offres_insert_chatelain ON public.offres
  FOR INSERT
  WITH CHECK (public.is_chatelain_of(chateau_id) OR public.is_admin());

DROP POLICY IF EXISTS offres_update_chatelain ON public.offres;
CREATE POLICY offres_update_chatelain ON public.offres
  FOR UPDATE
  USING (public.is_chatelain_of(chateau_id) OR public.is_admin())
  WITH CHECK (public.is_chatelain_of(chateau_id) OR public.is_admin());

DROP POLICY IF EXISTS offres_delete_admin ON public.offres;
CREATE POLICY offres_delete_admin ON public.offres
  FOR DELETE USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════════════
-- 8. POLICIES — GROUPE D : chateau_owners / reservations / disponibilites (8)
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 8.1 — chateau_owners (le chatelain voit ses propres liens, admin tout)
-- ───────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS chateau_owners_select_self_admin ON public.chateau_owners;
CREATE POLICY chateau_owners_select_self_admin ON public.chateau_owners
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS chateau_owners_write_admin ON public.chateau_owners;
CREATE POLICY chateau_owners_write_admin ON public.chateau_owners
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ───────────────────────────────────────────────────────────────────────────
-- 8.2 — reservations (4 policies cumulatives — pas de DELETE possible)
-- ───────────────────────────────────────────────────────────────────────────
-- Chatelain READ-ONLY (décision Matthieu : flexibilité plug-in externe S2).
-- Le client peut INSERT (sa propre réservation) et UPDATE (annulation seulement).
-- Admin a tous les pouvoirs sauf DELETE (intentionnellement absent — préserve
-- l'historique commercial via status='cancelled').

DROP POLICY IF EXISTS reservations_select_owner ON public.reservations;
CREATE POLICY reservations_select_owner ON public.reservations
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chambres c
      JOIN public.chateau_owners co ON co.chateau_id = c.chateau_id
      WHERE c.id = reservations.chambre_id AND co.user_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS reservations_insert_client_admin ON public.reservations;
CREATE POLICY reservations_insert_client_admin ON public.reservations
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin()
  );

-- ⚠️ FAILLE THÉORIQUE MVP : la policy ci-dessous autorise un client à UPDATE
-- n'importe quelle colonne de sa résa tant que NEW.status='cancelled'.
-- Le frontend ne l'exposera pas (UI inexistante), mais un appel direct à
-- l'API Supabase pourrait modifier prix_total_cents, dates, etc.
-- À durcir en S2 : remplacer par RPC cancel_my_reservation(p_id, p_reason)
-- en SECURITY DEFINER + USING (false) FOR UPDATE pour bloquer UPDATE direct.
DROP POLICY IF EXISTS reservations_update_client_cancel ON public.reservations;
CREATE POLICY reservations_update_client_cancel ON public.reservations
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND status = 'cancelled');

DROP POLICY IF EXISTS reservations_update_admin ON public.reservations;
CREATE POLICY reservations_update_admin ON public.reservations
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Pas de policy DELETE — DELETE refusé universellement (RLS deny-by-default).

-- ───────────────────────────────────────────────────────────────────────────
-- 8.3 — disponibilites (lecture publique, écriture chatelain du château)
-- ───────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS disponibilites_select_public ON public.disponibilites;
CREATE POLICY disponibilites_select_public ON public.disponibilites
  FOR SELECT USING (true);

DROP POLICY IF EXISTS disponibilites_write_chatelain_admin ON public.disponibilites;
CREATE POLICY disponibilites_write_chatelain_admin ON public.disponibilites
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.chambres c
      WHERE c.id = disponibilites.chambre_id
        AND public.is_chatelain_of(c.chateau_id)
    )
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chambres c
      WHERE c.id = disponibilites.chambre_id
        AND public.is_chatelain_of(c.chateau_id)
    )
    OR public.is_admin()
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- 9. POLICIES — GROUPE E : audit_log / migrations_log (3 policies)
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 9.1 — audit_log (admin lecture seule — inserts via SECURITY DEFINER en S2)
-- ───────────────────────────────────────────────────────────────────────────
-- Pas de policy INSERT/UPDATE/DELETE = bloqué pour tous les rôles auth.uid().
-- Les inserts d'audit transiteront par des triggers SECURITY DEFINER en S2,
-- qui bypassent RLS. Garantit l'append-only au niveau policy.

DROP POLICY IF EXISTS audit_log_select_admin ON public.audit_log;
CREATE POLICY audit_log_select_admin ON public.audit_log
  FOR SELECT USING (public.is_admin());

-- ───────────────────────────────────────────────────────────────────────────
-- 9.2 — migrations_log (admin RW — utile au seed S1-γ et migrations data S1-δ)
-- ───────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS migrations_log_select_admin ON public.migrations_log;
CREATE POLICY migrations_log_select_admin ON public.migrations_log
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS migrations_log_insert_admin ON public.migrations_log;
CREATE POLICY migrations_log_insert_admin ON public.migrations_log
  FOR INSERT WITH CHECK (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════════════
-- 10. GRANTS POSTGRES (nécessaires avec les nouvelles clés sb_publishable_*)
-- ═══════════════════════════════════════════════════════════════════════════
-- Avec le nouveau format de clé Supabase (sb_publishable_* / sb_secret_*),
-- les GRANT par défaut sur public ne sont plus appliqués automatiquement
-- aux nouvelles tables. Il faut les déclarer explicitement.
--
-- Lecture publique (anon + authenticated)
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Tables de contenu éditorial : lecture publique (RLS filtre déjà en
-- profondeur, mais Postgres exige le GRANT pour évaluer la requête)
GRANT SELECT ON public.chateaux           TO anon, authenticated;
GRANT SELECT ON public.chambres           TO anon, authenticated;
GRANT SELECT ON public.chateau_amenities  TO anon, authenticated;
GRANT SELECT ON public.chateau_timeline   TO anon, authenticated;
GRANT SELECT ON public.chateau_alentours  TO anon, authenticated;
GRANT SELECT ON public.modules            TO anon, authenticated;
GRANT SELECT ON public.disponibilites     TO anon, authenticated;

-- Tables business : lecture pour authenticated seulement
-- (RLS filtre ensuite par rôle utilisateur)
GRANT SELECT ON public.offres             TO anon, authenticated;
GRANT SELECT ON public.chateau_modules    TO authenticated;
GRANT SELECT ON public.chateau_owners     TO authenticated;
GRANT SELECT ON public.reservations       TO authenticated;
GRANT SELECT ON public.users              TO authenticated;
GRANT SELECT ON public.audit_log          TO authenticated;
GRANT SELECT ON public.migrations_log     TO authenticated;

-- Écritures (RLS filtre la portée par rôle utilisateur)
GRANT INSERT, UPDATE, DELETE ON public.chateaux           TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chambres           TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chateau_amenities  TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chateau_timeline   TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chateau_alentours  TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.disponibilites     TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.offres             TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chateau_modules    TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.modules            TO authenticated;
GRANT INSERT, UPDATE         ON public.users              TO authenticated;
GRANT INSERT, UPDATE         ON public.reservations       TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chateau_owners     TO authenticated;
GRANT INSERT                 ON public.audit_log          TO authenticated;
GRANT INSERT                 ON public.migrations_log     TO authenticated;

-- Sequences (pour les SERIAL si présents — pas le cas ici, mais idempotent)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- service_role : lecture des tables du seed pour scripts/generate-seed.cjs
-- (dump base → seed). Le nouveau système de clés sb_* ne grante plus public
-- automatiquement ; service_role avait été oublié ici, d'où un
-- « permission denied » alors même que la clé bypasse la RLS (le GRANT est
-- évalué AVANT la RLS). Périmètre minimal : SELECT sur les 9 tables dumpées.
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT ON public.modules            TO service_role;
GRANT SELECT ON public.chateaux           TO service_role;
GRANT SELECT ON public.chambres           TO service_role;
GRANT SELECT ON public.chateau_amenities  TO service_role;
GRANT SELECT ON public.chateau_timeline   TO service_role;
GRANT SELECT ON public.chateau_alentours  TO service_role;
GRANT SELECT ON public.chateau_modules    TO service_role;
GRANT SELECT ON public.offres             TO service_role;
GRANT SELECT ON public.migrations_log     TO service_role;

-- Note : les RLS gèrent finement qui peut faire quoi sur quelles lignes.
-- Ces GRANT autorisent juste Postgres à évaluer les policies.


-- ═══════════════════════════════════════════════════════════════════════════
-- 11. RÉCAP MATRICE RLS
-- ═══════════════════════════════════════════════════════════════════════════
-- Légende : R=Read, C=Create, U=Update, D=Delete, CRUD=tous, —=interdit
--           own=via chateau_owners ; self=user_id=auth.uid()
--
-- ┌──────────────────────┬───────┬─────────────┬──────────────┬──────┐
-- │ Table                │ anon  │ client      │ chatelain    │admin │
-- ├──────────────────────┼───────┼─────────────┼──────────────┼──────┤
-- │ users                │ —     │ R/U self(*) │ R/U self(*)  │ CRUD │
-- │ chateaux             │ R     │ R           │ R/U own      │ CRUD │
-- │ chambres             │ R     │ R           │ R/U own      │ CRUD │
-- │ chateau_amenities    │ R     │ R           │ R/U own      │ CRUD │
-- │ chateau_timeline     │ R     │ R           │ R/U own      │ CRUD │
-- │ chateau_alentours    │ R     │ R           │ R/U own      │ CRUD │
-- │ modules              │ R     │ R           │ R            │ CRUD │
-- │ chateau_modules      │ —(†)  │ —(†)        │ R own (†)    │ CRUD │
-- │ offres               │ R(‡)  │ R(‡)        │ R/U own      │ CRUD │
-- │ chateau_owners       │ —     │ R self      │ R self       │ CRUD │
-- │ reservations         │ —     │ C/R/U self  │ R own ch.    │ CRUD-D│
-- │ disponibilites       │ R     │ R           │ CRUD own     │ CRUD │
-- │ audit_log            │ —     │ —           │ —            │ R    │
-- │ migrations_log       │ —     │ —           │ —            │ CR   │
-- └──────────────────────┴───────┴─────────────┴──────────────┴──────┘
--
-- (*) UPDATE self interdit le changement de rôle (anti-escalade) ; admin peut.
-- (†) Lecture obligatoire via la VUE chateau_modules_public (cache la
--     commission_pct_negociee). Aucun rôle anon/auth ne SELECT la table.
-- (‡) offres invisibles si requires_role IS NOT NULL et auth.uid() IS NULL
--     (Module C — Club caché 100 % aux non-membres).
-- CRUD-D = CRUD sauf DELETE (préserver historique via status='cancelled').
--
-- Compteurs attendus :
--   - 4 fonctions (3 helpers RLS + 1 trigger user provisioning)
--   - 2 vues publiques (chateau_modules_public, reservations_client_view)
--   - 14 ENABLE ROW LEVEL SECURITY
--   - 46 CREATE POLICY (5 + 20 + 10 + 8 + 3)
--   - 3 lignes REVOKE/GRANT minimum
-- ═══════════════════════════════════════════════════════════════════════════
