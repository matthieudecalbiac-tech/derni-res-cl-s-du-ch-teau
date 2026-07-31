-- ============================================================
-- FIX admin_set_commission — 42702 « column reference is ambiguous »
--
-- LE BUG. La premiere version (2026-08-02-rpc-admin-set-commission.sql) declare
--   RETURNS TABLE (chateau_id uuid, module_id uuid, commission_pct_negociee numeric, est_actif boolean)
-- Ces quatre noms sont des PARAMETRES OUT plpgsql, et ce sont AUSSI les noms des
-- colonnes de chateau_modules. Dans l'INSERT, la liste de colonnes
--   INSERT INTO public.chateau_modules (chateau_id, module_id, ...)
-- et la cible du ON CONFLICT (chateau_id, module_id) sont des identifiants NUS :
-- plpgsql ne sait pas s'il doit lire la variable ou la colonne, et refuse.
--
--   ERREUR : 42702  column reference "chateau_id" is ambiguous
--            It could refer to either a PL/pgSQL variable or a table column.
--
-- La fonction se CREE sans broncher — le corps plpgsql n'est analyse qu'a la
-- premiere execution. Elle echoue donc uniquement a l'appel, en HTTP 400.
-- Trouve en testant l'ecran de bout en bout : le badge d'alerte ne s'affichait
-- pas parce que l'ECRITURE ne passait pas. Aucune donnee n'a bougé.
--
-- ⚠ J'avais qualifie le RETURNING par l'alias (cm.chateau_id, ...) en pensant que
--   cela suffisait. C'est vrai pour le RETURNING ; ca ne l'est pas pour la liste
--   de colonnes de l'INSERT ni pour la cible du ON CONFLICT, qui n'acceptent PAS
--   de qualification — un nom de colonne y est nu par construction.
--
-- LE CORRECTIF. On supprime l'ambiguite a la source plutot que de demander a
-- l'analyseur de trancher (#variable_conflict use_column ferait taire l'erreur,
-- mais laisserait un piege pour le prochain qui edite ce corps) : la fonction ne
-- declare plus AUCUN parametre OUT. Elle retourne le rowtype complet.
--
--   RETURNS public.chateau_modules
--
-- Plus aucune variable ne porte un nom de colonne, donc plus aucune ambiguite
-- possible — y compris pour les colonnes qu'on ajouterait demain a la table. Le
-- retour est au passage plus riche (id, created_at, updated_at en prime) et
-- PostgREST le rend comme un objet JSON unique. Le service JS normalisait deja
-- les deux formes (`Array.isArray(data) ? data[0] : data`).
--
-- POURQUOI UN DROP ICI, alors que la migration precedente s'en passait :
-- changer le type de retour d'une fonction est interdit a CREATE OR REPLACE
-- (« cannot change return type of existing function »). Le DROP+CREATE est
-- enveloppe dans une transaction — un CREATE en echec ROLLBACK le DROP, et la
-- fonction ne disparait jamais. Meme precaution que 2026-07-17.
-- Les privileges disparaissent avec la fonction : le REVOKE/GRANT est rejoue.
-- ============================================================

BEGIN;

DROP FUNCTION IF EXISTS public.admin_set_commission(uuid, uuid, numeric, boolean);

CREATE FUNCTION public.admin_set_commission(
  p_chateau_id uuid,
  p_module_id  uuid,
  p_pct        numeric DEFAULT NULL,
  p_est_actif  boolean DEFAULT true
)
RETURNS public.chateau_modules
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module_code   text;
  v_module_actif  boolean;
  v_ligne         public.chateau_modules;
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
  -- Les identifiants nus (liste de colonnes, cible du ON CONFLICT) sont
  -- desormais sans equivoque : aucune variable de cette fonction ne porte un nom
  -- de colonne. v_ligne est prefixee, p_* aussi.
  INSERT INTO public.chateau_modules
    (chateau_id, module_id, commission_pct_negociee, est_actif)
  VALUES
    (p_chateau_id, p_module_id, p_pct, COALESCE(p_est_actif, true))
  ON CONFLICT (chateau_id, module_id) DO UPDATE
     SET commission_pct_negociee = EXCLUDED.commission_pct_negociee,
         est_actif               = EXCLUDED.est_actif
  RETURNING * INTO v_ligne;

  RETURN v_ligne;
END;
$$;

COMMENT ON FUNCTION public.admin_set_commission(uuid, uuid, numeric, boolean) IS
  'Pose le taux de commission negocie et l''activation d''un couple (chateau x module). INSERT-ou-UPDATE atomique via ON CONFLICT sur chateau_modules_unique : cree la ligne si elle manque. Refuse un module desactive au referentiel (module D). AUCUNE validation contre modules.commission_min_pct/max_pct — liberte totale sur le taux negocie, seul le CHECK 0-100 s''applique. p_pct NULL est permis (desassignation). Retourne le rowtype chateau_modules (et non un RETURNS TABLE : les parametres OUT portaient les noms des colonnes, ce qui rendait l''INSERT ambigu — 42702). Garde is_admin(). SECURITY DEFINER + search_path fige.';

-- Les privileges sont detruits avec la fonction : on les repose.
REVOKE EXECUTE ON FUNCTION public.admin_set_commission(uuid, uuid, numeric, boolean) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_set_commission(uuid, uuid, numeric, boolean) TO authenticated;

COMMIT;

-- ============================================================
-- VERIFICATIONS (lecture seule ; le Dashboard n'affiche que le DERNIER resultat).
-- ============================================================

-- (A) Le type de retour a bien change. Attendu : returns = 'chateau_modules',
--     security_definer = true, config = {search_path=public}
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       pg_get_function_result(p.oid)             AS returns,
       p.prosecdef                               AS security_definer,
       p.proconfig                               AS config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'admin_set_commission';

-- (B) Les droits, reposes apres le DROP. Attendu : `authenticated` seul.
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' AND routine_name = 'admin_set_commission'
ORDER BY grantee;

-- (C) LA FUITE. Attendu : 0 ligne — la correction SQL du 2 aout tient, et le
--     va-et-vient de test sur Vaux-le-Vicomte (brouillon) a bien ete restaure.
SELECT c.slug, c.statut, m.code
FROM public.chateau_modules cm
JOIN public.chateaux c ON c.id = cm.chateau_id
JOIN public.modules  m ON m.id = cm.module_id
WHERE cm.est_actif
  AND cm.commission_pct_negociee IS NULL
ORDER BY c.slug, m.code;
