-- ============================================================
-- admin_set_commission — poser le taux de commission depuis l'admin
--
-- LE PROBLEME. Le taux vit dans chateau_modules.commission_pct_negociee et n'a
-- jamais eu d'interface : il se pose en SQL manuel. Consequence mesuree le
-- 2026-08-01 sur les 5 chateaux publies : Saint-Paterne et Le Boulay-Morin ont
-- leur module A ACTIF avec un taux NULL. La demande de reservation aboutit, et
-- commission_lcc_cents vaut 0. Silencieux — une ligne dans les logs de l'Edge
-- Function, rien a l'ecran. Les deux chateaux concernes sont exactement ceux
-- CREES DEPUIS L'ADMIN apres le seed.
--
-- DEUX PANNES DISTINCTES, a ne pas confondre :
--   ligne ABSENTE  -> demande-reservation sort en 409 (« indisponible »).
--                     Bruyant, immediatement visible.
--   ligne NULL     -> la reservation passe, commission 0. Muet. C'est le piege.
-- Cette RPC traite les deux : elle CREE la ligne si elle manque, et pose le taux
-- dans le meme mouvement.
--
-- POURQUOI UNE RPC DEDIEE et non une extension d'admin_upsert_chateau :
--   1. admin_upsert_chateau est deja a 7 parametres et ~250 lignes, et a du etre
--      redefinie TROIS fois pour cause d'oubli dans son UPDATE SET explicite
--      (mode_paiement, les 7 img_*, les 6 accroche_*). Y greffer une table fille
--      de plus ajoute une quatrieme occasion de se tromper sans rien mutualiser :
--      l'ecran commission est separe et n'a pas le meme public.
--   2. L'ecriture directe en PostgREST fonctionnerait deja (policies
--      chateau_modules_insert_admin / _update_admin + GRANT a authenticated),
--      mais la RLS ne controle que QUI ecrit, jamais QUOI. Elle ne saurait pas
--      refuser un module desactive au referentiel, ni faire l'INSERT-ou-UPDATE
--      en une seule operation atomique.
--
-- LIBERTE TOTALE SUR LE TAUX (decision Matthieu). Aucune validation contre
-- modules.commission_min_pct / commission_max_pct : le taux affiche est celui
-- qui a ete NEGOCIE, la fourchette du referentiel n'est qu'une indication
-- commerciale. Le seul garde-fou est le CHECK chateau_modules_commission_valide
-- (NULL, ou 0 <= pct <= 100), qu'on laisse faire son travail — une violation
-- remonte en 23514 et c'est le service JS qui la traduit en francais.
--
-- p_pct NULL RESTE PERMIS : desassigner un taux est une action legitime (module
-- active dont la negociation est en cours). C'est l'ecran qui doit le SIGNALER,
-- pas la base qui doit l'interdire — un refus ici empecherait de corriger une
-- ligne posee par erreur.
--
-- Idempotent : CREATE OR REPLACE. Pas de DROP — la fonction n'existe pas encore,
-- et sa signature naitra figee.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_set_commission(
  p_chateau_id uuid,
  p_module_id  uuid,
  p_pct        numeric DEFAULT NULL,
  p_est_actif  boolean DEFAULT true
)
RETURNS TABLE (
  chateau_id              uuid,
  module_id               uuid,
  commission_pct_negociee numeric,
  est_actif               boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module_code   text;
  v_module_actif  boolean;
BEGIN
  -- ── Garde admin : PREMIERE instruction, avant toute lecture ou ecriture ──
  -- SECURITY DEFINER contourne la RLS : cette garde n'est pas un doublon des
  -- policies chateau_modules_*_admin, c'est le SEUL controle qui s'applique.
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_set_commission: acces refuse (role admin requis)'
      USING ERRCODE = '42501';
  END IF;

  -- ── Le chateau doit exister ──
  -- Sans ce controle, un uuid fantaisiste ferait echouer l'INSERT sur la FK avec
  -- un 23503 illisible. Ici le message nomme ce qui manque.
  IF NOT EXISTS (SELECT 1 FROM public.chateaux c WHERE c.id = p_chateau_id) THEN
    RAISE EXCEPTION 'admin_set_commission: chateau % introuvable', p_chateau_id
      USING ERRCODE = 'P0002';
  END IF;

  -- ── Le module doit exister ET etre actif AU REFERENTIEL ──
  -- modules.est_actif = false signifie « ce module n'est pas ouvert a la
  -- commercialisation » : c'est le cas du module D (Evenementiel), reporte en
  -- Phase 7. L'activer sur un chateau creerait une ligne que rien ne lit et que
  -- personne n'irait chercher — un etat incoherent, pose sans bruit.
  SELECT m.code, m.est_actif
    INTO v_module_code, v_module_actif
    FROM public.modules m
   WHERE m.id = p_module_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'admin_set_commission: module % introuvable', p_module_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_module_actif IS NOT TRUE THEN
    RAISE EXCEPTION 'admin_set_commission: le module % est desactive au referentiel (modules.est_actif = false)', v_module_code
      USING ERRCODE = '22023';
  END IF;

  -- ── INSERT-ou-UPDATE, en une seule instruction ──
  -- ON CONFLICT s'appuie sur la contrainte chateau_modules_unique
  -- (chateau_id, module_id), qui existe depuis le schema initial. Une seule
  -- instruction, donc aucune fenetre entre « la ligne existe-t-elle ? » et
  -- « je l'ecris » : deux admins simultanes ne peuvent pas creer un doublon.
  --
  -- COALESCE sur p_est_actif seulement : un NULL passe par erreur activerait
  -- par defaut, ce qui est le comportement de la colonne (DEFAULT true). p_pct,
  -- lui, garde son NULL — c'est une valeur, pas un oubli.
  --
  -- RETURNING qualifie par le nom de table : les quatre parametres OUT portent
  -- les memes noms que les colonnes, et un identifiant nu serait ambigu.
  RETURN QUERY
  INSERT INTO public.chateau_modules AS cm
    (chateau_id, module_id, commission_pct_negociee, est_actif)
  VALUES
    (p_chateau_id, p_module_id, p_pct, COALESCE(p_est_actif, true))
  ON CONFLICT (chateau_id, module_id) DO UPDATE
     SET commission_pct_negociee = EXCLUDED.commission_pct_negociee,
         est_actif               = EXCLUDED.est_actif
  RETURNING cm.chateau_id, cm.module_id, cm.commission_pct_negociee, cm.est_actif;
END;
$$;

COMMENT ON FUNCTION public.admin_set_commission(uuid, uuid, numeric, boolean) IS
  'Pose le taux de commission negocie et l''activation d''un couple (chateau x module). INSERT-ou-UPDATE atomique via ON CONFLICT sur chateau_modules_unique : cree la ligne si elle manque. Refuse un module desactive au referentiel (module D). AUCUNE validation contre modules.commission_min_pct/max_pct — liberte totale sur le taux negocie, seul le CHECK 0-100 s''applique. p_pct NULL est permis (desassignation). Garde is_admin(). SECURITY DEFINER + search_path fige.';

-- EXECUTE retire a PUBLIC AVANT d'etre accorde : sans le REVOKE, toute nouvelle
-- fonction est executable par PUBLIC (defaut Postgres), et le GRANT qui suit
-- serait cosmetique. La garde is_admin() interne resterait le rempart, mais on
-- ne laisse pas anon appeler une fonction admin pour se faire refuser dedans.
REVOKE EXECUTE ON FUNCTION public.admin_set_commission(uuid, uuid, numeric, boolean) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_set_commission(uuid, uuid, numeric, boolean) TO authenticated;

COMMIT;

-- ============================================================
-- VERIFICATIONS (lecture seule ; le Dashboard n'affiche que le DERNIER resultat).
--
-- ⚠ Rappel de la coquille du 31 juillet : une fonction qui consomme p.oid doit
--    venir APRES pg_proc p dans le FROM. Aucun controle ci-dessous n'en a
--    besoin (p.oid n'apparait que dans des listes SELECT, ou p est deja liee).
-- ============================================================

-- (A) La fonction existe, avec la bonne signature et le bon regime.
--     Attendu : 1 ligne, security_definer = true, proconfig = {search_path=public}
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef                               AS security_definer,
       p.proconfig                               AS config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'admin_set_commission';

-- (B) Les droits d'execution. Attendu : `authenticated` seul.
--     PUBLIC n'apparait pas — un privilege revoque n'est pas liste.
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' AND routine_name = 'admin_set_commission'
ORDER BY grantee;

-- (C) L'ETAT AVANT. Une ligne par (chateau publie x module), pour voir d'un coup
--     la difference entre « ligne absente » et « ligne active a taux NULL ».
--     Attendu aujourd'hui : 20 lignes (5 chateaux publies x 4 modules), dont
--     11 « ligne absente », 2 « ⚠ ACTIF SANS TAUX », 7 avec un taux.
--     (Les 15 lignes chateau_modules existantes couvrent AUSSI les 6 chateaux
--     en brouillon, que ce controle ne montre pas.)
SELECT c.slug,
       m.code,
       CASE
         WHEN cm.chateau_id IS NULL                     THEN 'ligne absente'
         WHEN cm.est_actif AND cm.commission_pct_negociee IS NULL
                                                        THEN '⚠ ACTIF SANS TAUX (commission 0)'
         WHEN NOT cm.est_actif                          THEN 'inactif'
         ELSE cm.commission_pct_negociee || ' %'
       END AS etat
FROM public.chateaux c
CROSS JOIN public.modules m
LEFT JOIN public.chateau_modules cm
       ON cm.chateau_id = c.id AND cm.module_id = m.id
WHERE c.statut = 'publie'
ORDER BY c.slug, m.code;

-- (D) LA FUITE, isolee. Attendu AVANT correction : 2 lignes
--     (chateau-de-saint-paterne / A, chateau-du-boulay-morin / A).
--     Cette requete est celle a rejouer APRES avoir saisi les taux : elle doit
--     alors renvoyer 0 ligne.
SELECT c.slug, c.statut, m.code, m.nom
FROM public.chateau_modules cm
JOIN public.chateaux c ON c.id = cm.chateau_id
JOIN public.modules  m ON m.id = cm.module_id
WHERE cm.est_actif
  AND cm.commission_pct_negociee IS NULL
ORDER BY c.slug, m.code;
