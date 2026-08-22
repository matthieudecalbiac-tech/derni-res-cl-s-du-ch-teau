-- ═══════════════════════════════════════════════════════════════════════════
-- LCC — Garde d'accès sur les deux fonctions Club (sous-audits D + E)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- QUOI — `count_sejours_confirmes(uuid)` et `palier_du_membre(uuid)` reçoivent
-- une garde en tête de corps : l'appelant ne peut lire que SES données, sauf
-- s'il est admin. Le corps métier (le SELECT) est INCHANGÉ. En complément,
-- l'`EXECUTE` est retiré à PUBLIC et accordé à `authenticated` seul.
--
-- POURQUOI — les deux fonctions sont `SECURITY DEFINER` et étaient `GRANT
-- EXECUTE` à PUBLIC **sans aucune garde interne**. Un membre — ou un anonyme —
-- connaissant un `user_id` (uuid) pouvait donc lire le nombre de séjours et le
-- palier Club d'un AUTRE membre.
--
--   · Fuite mineure en nature : ni email, ni nom, ni donnée de paiement.
--   · Mais c'était LE SEUL ÉCART au standard du projet : toutes les autres
--     fonctions `SECURITY DEFINER` (admin_upsert_chateau, repondre_demande,
--     admin_set_commission…) portent une garde `auth.uid()` / `is_admin()` /
--     `is_chatelain*`.
--
-- ⚠ LE DÉCLENCHEUR EST DÉJÀ ATTEINT. La note d'audit initiale disait « risque
-- nul tant qu'il n'y a que des comptes de test ». Mesure du 22 août : 8 clients,
-- 1 membre_club, 1 chatelain, 1 admin — et un membre à 3 séjours confirmés,
-- palier « Habitué » franchi. Ce ne sont plus des comptes de test.
--
-- ── POURQUOI LA GARDE DANS LES DEUX, ET PAS SEULEMENT DANS palier_du_membre ──
--
-- `palier_du_membre` appelle `count_sejours_confirmes` en interne. Garder la
-- seule appelante laisserait `count_sejours_confirmes` DIRECTEMENT appelable :
-- le nombre de séjours d'autrui resterait lisible. Les deux, ou rien.
--
-- ⚠ ET L'APPEL IMBRIQUÉ NE SE BLOQUE PAS LUI-MÊME. `auth.uid()` est un réglage
-- de SESSION (`request.jwt.claims`), pas de rôle : il ne change pas quand une
-- fonction `SECURITY DEFINER` en appelle une autre. L'appel interne voit donc
-- le même `auth.uid()` et le même `p_user_id` que l'appel externe — si la garde
-- externe est passée, l'interne passe aussi, par construction.
--
-- ── POURQUOI UNE EXCEPTION, ET PAS UN NULL SILENCIEUX ──
--
-- Un `NULL` ne casserait aucun écran, mais masquerait une tentative d'accès.
-- Le projet lève déjà `42501` (`insufficient_privilege`) sur ses autres gardes,
-- et `chatelainService` sait le traduire sans fuiter l'interne. Un accès refusé
-- doit se voir.
--
-- ── CE QUE CETTE MIGRATION NE CHANGE PAS ──
--
-- ⚠ AUCUNE ADAPTATION FRONT N'EST NÉCESSAIRE, et c'est le meilleur indice que
-- la garde est la bonne forme. Audit des appelants du 22 août : le SEUL chemin
-- est `PageClub:97 → getEspaceClub(user.id) → clubService:31 et :44`, où `user`
-- vient de `useAuth()` donc de `session.user`. Le front ne passe JAMAIS un id
-- arbitraire. Les deux autres mentions du dépôt (`vue-messages-fils.sql:18`,
-- `vues-admin-reservations.sql:29`) sont des COMMENTAIRES citant ces fonctions
-- en exemple — elles ne les appellent pas.
--
-- IMPACT — chacun lit ses données, l'admin lit tout, l'anonyme est rejeté (il
-- recevait auparavant `0` / palier « Hôte » en silence). `clubService.js` n'est
-- pas touché.
--
-- IDEMPOTENTE — `CREATE OR REPLACE` + `REVOKE`/`GRANT` rejouables sans effet de
-- bord. Signature, type de retour, `SECURITY DEFINER` et `SET search_path`
-- conservés à l'identique : seule la garde est ajoutée.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- 1. count_sejours_confirmes — compte les séjours confirmés d'un utilisateur
-- ───────────────────────────────────────────────────────────────────────────
-- ⚠ PASSE DE `LANGUAGE sql` À `LANGUAGE plpgsql` : une garde impérative (IF …
-- RAISE) n'est pas exprimable en SQL pur. Le SELECT métier est identique, mot
-- pour mot ; seul l'emballage change. `STABLE`, `SECURITY DEFINER` et
-- `SET search_path` sont conservés.
CREATE OR REPLACE FUNCTION public.count_sejours_confirmes(p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  IF NOT (p_user_id = auth.uid() OR public.is_admin()) THEN
    RAISE EXCEPTION 'acces refuse' USING errcode = '42501';
  END IF;

  SELECT COUNT(*)::int
    INTO n
    FROM public.reservations
   WHERE user_id = p_user_id
     AND status IN ('confirmed', 'completed');

  RETURN n;
END;
$$;

COMMENT ON FUNCTION public.count_sejours_confirmes(uuid) IS
  'Nombre de séjours confirmés/complétés d''un membre. SECURITY DEFINER (lit reservations sans exposer la table). GARDE : p_user_id = auth.uid() OR is_admin(), sinon 42501. EXECUTE réservé à authenticated.';


-- ───────────────────────────────────────────────────────────────────────────
-- 2. palier_du_membre — dérive le palier depuis le compteur
-- ───────────────────────────────────────────────────────────────────────────
-- Même garde, même raison. Le corps métier est identique : le plus haut palier
-- dont le seuil est atteint.
CREATE OR REPLACE FUNCTION public.palier_du_membre(p_user_id uuid)
RETURNS public.paliers
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ligne public.paliers;
BEGIN
  IF NOT (p_user_id = auth.uid() OR public.is_admin()) THEN
    RAISE EXCEPTION 'acces refuse' USING errcode = '42501';
  END IF;

  SELECT p.*
    INTO ligne
    FROM public.paliers p
   WHERE p.seuil_sejours <= public.count_sejours_confirmes(p_user_id)
   ORDER BY p.rang DESC
   LIMIT 1;

  RETURN ligne;
END;
$$;

COMMENT ON FUNCTION public.palier_du_membre(uuid) IS
  'Palier Club courant d''un membre, dérivé du compteur de séjours (jamais stocké, donc infalsifiable). GARDE : p_user_id = auth.uid() OR is_admin(), sinon 42501. EXECUTE réservé à authenticated.';


-- ───────────────────────────────────────────────────────────────────────────
-- 3. Surface d'appel — retirer PUBLIC, n'accorder qu'à authenticated
-- ───────────────────────────────────────────────────────────────────────────
-- Défense en profondeur, comme ailleurs dans ce projet : le GRANT écarte
-- l'anonyme AVANT même que la garde ne s'évalue ; la garde protège ensuite
-- membre contre membre. Aucun des deux ne suffit seul —
--   · le GRANT seul laisserait tout membre authentifié lire le palier d'autrui ;
--   · la garde seule suffirait, mais laisserait la fonction appelable par anon
--     pour ne récolter qu'une exception.
--
-- ⚠ `service_role` n'est PAS mentionné : il contourne les GRANT par nature.
-- Aucune Edge Function n'appelle ces deux fonctions (vérifié le 22 août).
REVOKE EXECUTE ON FUNCTION public.count_sejours_confirmes(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.palier_du_membre(uuid)        FROM PUBLIC;

GRANT  EXECUTE ON FUNCTION public.count_sejours_confirmes(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.palier_du_membre(uuid)        TO authenticated;
