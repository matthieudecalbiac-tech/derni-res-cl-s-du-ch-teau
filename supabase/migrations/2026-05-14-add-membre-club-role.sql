-- ═══════════════════════════════════════════════════════════════════════════
-- Sprint S2-α.2 — Auth Supabase Magic Link
-- ═══════════════════════════════════════════════════════════════════════════
-- Migration : ajout du rôle 'membre_club' à l'enum public.user_role.
--
-- CONTEXTE
--   L'enum user_role défini en Sprint S1-β (schema.sql:54) contient 3 valeurs :
--     - 'client'    : utilisateur réservant (default trigger handle_new_user)
--     - 'chatelain' : propriétaire de château gérant son espace
--     - 'admin'     : back-office LCC
--
--   Sprint S2-α.2 introduit la notion de "Module C — Club Châtelain" :
--   offres confidentielles réservées aux membres. On distingue un 'client'
--   classique (peut réserver les Modules A/B) d'un 'membre_club' (accès
--   supplémentaire au Module C).
--
-- DÉCISION ARBITRALE MATTHIEU (14 mai 2026)
--   - Garder default trigger handle_new_user à 'client' (cohérent S1-β).
--     'visiteur' n'est PAS ajouté — un utilisateur non authentifié n'a pas
--     de ligne dans public.users, donc pas de rôle pertinent.
--   - Promotion 'client' → 'membre_club' faite manuellement par admin SQL
--     (UPDATE public.users SET role='membre_club' WHERE email='...') tant
--     que le paiement Module C n'est pas branché (différé Sprint α.3+).
--
-- ORDRE D'INSERTION DANS L'ENUM
--   ('client', 'membre_club', 'chatelain', 'admin')
--   'membre_club' inséré AFTER 'client' pour préserver la hiérarchie
--   sémantique (du moins privilégié au plus privilégié).
--
-- IDEMPOTENCE
--   Guard via pg_enum + enumtypid = 'public.user_role'::regtype.
--   Permet de rejouer la migration sans erreur.
--
-- APPLICATION
--   Copier-coller le bloc ci-dessous dans Supabase Dashboard
--   → Project lcc-prod → SQL Editor → Run.
--   Vérifier avec : SELECT unnest(enum_range(NULL::public.user_role));
--   Attendu : { client, membre_club, chatelain, admin }
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.user_role'::regtype
      AND enumlabel = 'membre_club'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'membre_club' AFTER 'client';
  END IF;
END
$$;

-- Vérification (à exécuter séparément après la migration) :
--   SELECT unnest(enum_range(NULL::public.user_role));
