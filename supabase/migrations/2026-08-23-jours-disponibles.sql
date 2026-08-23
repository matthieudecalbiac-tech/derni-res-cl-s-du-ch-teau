-- ============================================================
-- LCC — moteur de disponibilité 2.3 : jours_disponibles_*
-- ============================================================
--
-- À jouer APRÈS `2026-08-23-est-disponible.sql`.
--
-- QUOI — la forme PLAGE, pour alimenter un calendrier visuel.
--
--   jours_disponibles_chambre(chambre, du, au) -> setof date
--   jours_disponibles_chateau(chateau, du, au) -> setof date
--
-- ── ⚠ LA RÈGLE N'EST PAS RÉÉCRITE : ELLE EST APPELÉE ────────────────────────
--
-- Chaque nuit N est testée par `est_disponible(chambre, N, N+1)` — un séjour
-- d'une nuit. Le prédicat anti-survente, la borne `'[)'`, l'opt-in du
-- calendrier, l'exclusion de `pending` : **rien de tout cela n'est recopié ici**.
--
-- ⚠ C'ÉTAIT LA SEULE FORME ACCEPTABLE. Réécrire le prédicat de
-- `reservations_pas_de_chevauchement` une TROISIÈME fois (la contrainte,
-- `est_disponible`, puis ici) aurait garanti la divergence à terme — et une
-- divergence entre le calendrier et le contrôle de réservation se voit au pire
-- moment : le visiteur clique sur une date verte et reçoit un refus.
--
-- COÛT MESURÉ, ET ASSUMÉ : un mois affiché = **30 appels** à `est_disponible`,
-- chacun faisant une résolution chambre→château, un `EXISTS` indexé sur
-- `reservations`, et (en mode géré) un `count` indexé sur `disponibilites`. Soit
-- ~90 accès index par mois de calendrier — négligeable pour Postgres, et sans
-- commune mesure avec le coût d'une divergence. ⚠ Si un jour cela pesait
-- vraiment, la réponse serait un cache côté appelant, PAS une seconde copie de
-- la règle.
--
-- ── ⚠ NUITS INCLUSIVES ICI, SÉJOUR SEMI-OUVERT LÀ-BAS ───────────────────────
--
-- Ces deux fonctions ne manipulent pas le même objet qu'`est_disponible`, et la
-- confusion coûterait une nuit :
--
--   est_disponible(ch, A, D)          un SÉJOUR — arrivée A, départ D, D EXCLU
--                                     ses nuits sont A .. D-1
--   jours_disponibles_chambre(ch,     un ENSEMBLE DE NUITS — du et au INCLUS
--                             du, au)
--
-- **Équivalence exacte** : `est_disponible(ch, A, D)` est vrai SSI toutes les
-- nuits de `jours_disponibles_chambre(ch, A, D - 1)` sont présentes, c'est-à-dire
-- si cet ensemble compte `D - A` nuits. ⚠ Le `D - 1` n'est pas un ajustement
-- cosmétique : on ne dort pas le soir du départ. Un test le vérifie.
--
-- ── ⚠⚠ AU NIVEAU CHÂTEAU, LE CALENDRIER PROMET MOINS QU'IL N'EN A L'AIR ─────
--
-- `jours_disponibles_chateau` rend les nuits où **au moins une chambre** est
-- libre — chambre qui peut CHANGER d'une nuit à l'autre. Il ne s'ensuit donc PAS
-- qu'un séjour couvrant ces nuits soit réservable :
--
--     nuit 1   chambre A libre, chambre B prise
--     nuit 2   chambre A prise, chambre B libre
--     -> les DEUX nuits sortent du calendrier
--     -> et pourtant chateau_disponible(chateau, nuit1, nuit3) = FAUX
--        aucune chambre ne couvre le séjour entier
--
-- ⚠ **LE CALENDRIER EST UNE INDICATION, LA VÉRIFICATION DE SÉJOUR EST L'AUTORITÉ.**
-- Un écran qui afficherait ces nuits en vert et laisserait sélectionner la plage
-- doit REVALIDER par `chateau_disponible` avant de proposer une réservation. Ce
-- n'est pas un défaut à corriger : c'est ce que « au moins une chambre ce
-- soir-là » veut dire, et l'alternative — ne montrer que les nuits couvertes par
-- une même chambre sur tout un mois — n'aurait aucun sens pour un calendrier.
-- Un test rend ce cas explicite plutôt que de le laisser se découvrir.
--
-- ── LA GARDE D'HORIZON — et pourquoi elle LÈVE, contrairement à 2.2 ─────────
--
-- `est_disponible` rend `false` sur une plage aberrante : « non disponible » est
-- une réponse honnête à une question absurde, et l'appelant est un écran.
--
-- ⚠ ICI C'EST L'INVERSE, et l'asymétrie est voulue. Un ensemble VIDE se lit
-- « rien n'est libre » — une réponse FAUSSE, indiscernable d'un mois complet.
-- Une fenêtre de dix ans n'est pas une saisie de visiteur, c'est un défaut
-- d'appelant : elle doit se voir. D'où `22023` au-delà de 366 jours.
--
-- Une fenêtre INVERSÉE (`au < du`) rend en revanche l'ensemble vide sans lever :
-- un intervalle vide n'a légitimement aucune nuit, `generate_series` le dit
-- lui-même, et il n'y a là aucune ambiguïté à signaler.
--
-- ── DROITS ─────────────────────────────────────────────────────────────────
--
-- Mêmes conventions que 2.2 : `SECURITY DEFINER` (le front ne voit pas
-- `reservations` sous RLS), `STABLE`, `search_path` figé, `EXECUTE` retiré à
-- `PUBLIC` puis accordé à `anon` et `authenticated`. Ne rendent que des DATES —
-- aucune réservation, aucun identifiant d'utilisateur, rien à fuiter.
--
-- IMPACT — AUCUN. Aucun appelant : le wrapper JS est l'étape 2.4.
--
-- IDEMPOTENTE — CREATE OR REPLACE.
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- LES NUITS LIBRES D'UNE CHAMBRE
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.jours_disponibles_chambre(
  p_chambre_id uuid,
  p_du         date,
  p_au         date
)
RETURNS SETOF date
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- 366 : un an bissextile. Un calendrier n'affiche jamais davantage ; au-dela,
  -- c'est un appelant qui se trompe, pas un visiteur.
  v_max_jours constant integer := 366;
BEGIN
  IF p_chambre_id IS NULL OR p_du IS NULL OR p_au IS NULL THEN
    RETURN;   -- ensemble vide
  END IF;

  -- ⚠ ON LEVE, on ne rend pas un ensemble vide : « vide » se lirait « rien n'est
  --   libre », ce qui serait FAUX et indiscernable d'un mois complet.
  IF p_au - p_du > v_max_jours THEN
    RAISE EXCEPTION
      'jours_disponibles_chambre: fenetre de % jours demandee, maximum %',
      p_au - p_du, v_max_jours
      USING ERRCODE = '22023';
  END IF;

  -- ⚠ UN APPEL PAR NUIT A est_disponible. La regle n'existe qu'a un seul
  --   endroit ; ici on ne fait que la promener sur un intervalle. Les bornes
  --   d'est_disponible s'appliquent donc aussi : une nuit passee est exclue
  --   d'elle-meme, une chambre inexistante rend l'ensemble vide.
  RETURN QUERY
  SELECT g.nuit::date
    FROM generate_series(p_du, p_au, interval '1 day') AS g(nuit)
   WHERE public.est_disponible(p_chambre_id, g.nuit::date, g.nuit::date + 1)
   ORDER BY g.nuit;
END;
$$;

COMMENT ON FUNCTION public.jours_disponibles_chambre(uuid, date, date) IS
  'Les NUITS libres d''une chambre dans [du, au] — les DEUX bornes INCLUSES (ce sont des nuits, pas un sejour). Chaque nuit N est testee par est_disponible(chambre, N, N+1) : la regle n''est PAS recopiee, elle est APPELEE — reecrire le predicat anti-survente une troisieme fois aurait garanti la divergence entre le calendrier et le controle de reservation. Cout : 30 appels pour un mois affiche, negligeable. Equivalence avec 2.2 : est_disponible(ch, A, D) est vrai SSI jours_disponibles_chambre(ch, A, D-1) compte D-A nuits (on ne dort pas le soir du depart). Leve 22023 au-dela de 366 jours — un ensemble vide se lirait « rien n''est libre », ce qui serait faux ; une fenetre inversee rend en revanche l''ensemble vide sans lever. SECURITY DEFINER : reservations est sous RLS.';


-- ────────────────────────────────────────────────────────────────────────────
-- LES NUITS OÙ LE CHÂTEAU A AU MOINS UNE CHAMBRE LIBRE
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.jours_disponibles_chateau(
  p_chateau_id uuid,
  p_du         date,
  p_au         date
)
RETURNS SETOF date
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_jours constant integer := 366;
BEGIN
  IF p_chateau_id IS NULL OR p_du IS NULL OR p_au IS NULL THEN
    RETURN;
  END IF;

  IF p_au - p_du > v_max_jours THEN
    RAISE EXCEPTION
      'jours_disponibles_chateau: fenetre de % jours demandee, maximum %',
      p_au - p_du, v_max_jours
      USING ERRCODE = '22023';
  END IF;

  -- ⚠ chateau_disponible par nuit : meme raisonnement qu'au-dessus, et meme
  --   source unique. La CHAMBRE qui rend la nuit libre peut CHANGER d'une nuit
  --   a l'autre — cf. l'avertissement de l'en-tete : ce calendrier indique, il
  --   ne promet pas un sejour.
  RETURN QUERY
  SELECT g.nuit::date
    FROM generate_series(p_du, p_au, interval '1 day') AS g(nuit)
   WHERE public.chateau_disponible(p_chateau_id, g.nuit::date, g.nuit::date + 1)
   ORDER BY g.nuit;
END;
$$;

COMMENT ON FUNCTION public.jours_disponibles_chateau(uuid, date, date) IS
  'Les NUITS ou le chateau a AU MOINS UNE chambre libre, dans [du, au] bornes incluses. Chaque nuit est testee par chateau_disponible(chateau, N, N+1) — la regle n''est pas recopiee. ⚠⚠ LA CHAMBRE QUI REND LA NUIT LIBRE PEUT CHANGER D''UNE NUIT A L''AUTRE : il ne s''ensuit PAS qu''un sejour couvrant ces nuits soit reservable (chambre A libre la nuit 1, chambre B la nuit 2 -> les deux nuits sortent, et pourtant aucune chambre ne couvre le sejour). LE CALENDRIER INDIQUE, chateau_disponible AUTORISE : un ecran doit revalider la plage choisie avant de proposer une reservation. Leve 22023 au-dela de 366 jours. SECURITY DEFINER.';


-- ── DROITS — mêmes conventions que 2.2 ──────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.jours_disponibles_chambre(uuid, date, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.jours_disponibles_chateau(uuid, date, date) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.jours_disponibles_chambre(uuid, date, date) TO anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.jours_disponibles_chateau(uuid, date, date) TO anon, authenticated;

COMMIT;


-- ============================================================
-- VÉRIFICATION (lecture seule) — un seul SELECT.
-- Attendu : 2 lignes, security_definer + stable = true, search_path fige,
-- execute accorde a anon ET authenticated, PAS a public.
-- ============================================================
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid)                 AS arguments,
  pg_get_function_result(p.oid)                             AS retour,
  p.prosecdef                                               AS security_definer,
  p.provolatile = 's'                                       AS stable,
  p.proconfig                                               AS search_path,
  has_function_privilege('anon',          p.oid, 'EXECUTE') AS execute_anon,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS execute_authenticated,
  has_function_privilege('public',        p.oid, 'EXECUTE') AS execute_public_doit_etre_false
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('jours_disponibles_chambre', 'jours_disponibles_chateau')
ORDER BY p.proname;
