-- ============================================================
-- LCC — moteur de disponibilité 2.2 : est_disponible / chateau_disponible
-- ============================================================
--
-- À jouer APRÈS `2026-08-23-dispo-geree.sql` (le drapeau).
--
-- QUOI — deux fonctions, UNE SEULE règle.
--
--   est_disponible(chambre, arrivée, départ)   -> boolean   l'atome
--   chateau_disponible(chateau, arrivée, départ) -> boolean  au moins une chambre
--
-- ⚠ `chateau_disponible` N'A PAS DE LOGIQUE PROPRE : elle est un `EXISTS` sur
-- `est_disponible` appliqué aux chambres du château. Dupliquer la règle aurait
-- garanti la divergence — l'écran d'accueil raisonne en châteaux, la vitrine en
-- chambres, et les deux doivent dire la même chose.
--
-- ⚠ UN CHÂTEAU SANS AUCUNE CHAMBRE EST DONC INDISPONIBLE. C'est voulu : on ne
-- peut pas réserver ce qui n'existe pas. Ce n'est pas un cas d'erreur.
--
-- ── POURQUOI EN SQL, ET PAS EN JS ───────────────────────────────────────────
--
-- ⚠ CE N'EST PAS UN CHOIX DE STYLE, C'EST UNE INCAPACITÉ DU FRONT. `reservations`
-- est sous RLS : un visiteur anonyme n'en lit RIEN. Une `estDisponible` écrite en
-- JS et exécutée dans le navigateur verrait donc zéro réservation et répondrait
-- « libre » sur une chambre vendue — systématiquement, sans erreur, sans trace.
-- Seule une fonction SECURITY DEFINER voit ce qui bloque.
--
-- ⚠ ET C'EST POURQUOI ELLES NE RENDENT QU'UN BOOLÉEN. Aucun paramètre
-- d'utilisateur, aucune ligne de réservation, aucune date d'occupation : rien à
-- fuiter. C'est ce qui rend le `GRANT EXECUTE` à `anon` sans danger — un visiteur
-- sans compte doit pouvoir consulter un calendrier.
--
-- ── LA COMPOSITION, DANS L'ORDRE ────────────────────────────────────────────
--
--   0  bornes         départ > arrivée, arrivée >= aujourd'hui, chambre existante
--   1  réservation    confirmed/completed chevauchante  -> INDISPONIBLE
--   2  calendrier     SI dispo_geree : chaque nuit exige une ligne à true
--   3  offre          PAS ÉVALUÉE — cf. ci-dessous
--
-- ⚠ LA SOURCE 1 DOMINE. Aucune ligne de calendrier ne peut rouvrir une nuit déjà
-- vendue : c'est la seule source adossée à une contrainte de base, les autres
-- sont déclaratives.
--
-- ⚠⚠ SON PRÉDICAT EST COPIÉ MOT POUR MOT DE `reservations_pas_de_chevauchement`
-- (migration 2026-08-22-anti-survente) — mêmes statuts, même borne `'[)'` :
--
--     EXCLUDE USING gist (chambre_id WITH =,
--                         daterange(date_arrivee, date_depart, '[)') WITH &&)
--     WHERE (status IN ('confirmed', 'completed'))
--
-- S'ils divergeaient d'un statut ou d'une borne, l'écran promettrait ce que la
-- base refuse, et le visiteur recevrait un 23P01 après avoir cru réserver. Le
-- test de PARITÉ ne les relit pas : il les confronte, en tentant l'INSERT réel.
--
-- ⚠ `pending` N'OCCUPE PAS, cohérent avec la décision produit de l'anti-survente :
-- plusieurs demandes peuvent viser les mêmes dates, la confirmation tranche.
-- Fermer une date parce qu'un autre visiteur a demandé retirerait au châtelain
-- son arbitrage.
--
-- ⚠ LA BORNE `'[)'` : arrivée incluse, départ EXCLU. Un départ le 10 et une
-- arrivée le 10 ne sont pas en conflit — la chambre est libre ce soir-là.
--
-- ⚠ LA SOURCE 3 N'EST PAS ÉVALUÉE, et c'est une décision, pas un oubli. Hors
-- fenêtre d'offre ≠ indisponible : une chambre peut être parfaitement libre en
-- dehors d'une offre Dernières Clés, elle n'est simplement pas à ce tarif. Les
-- confondre fermerait le calendrier partout où il n'y a pas de promotion.
-- L'offre qualifie le PRIX ; elle entrera par un paramètre optionnel, ailleurs.
--
-- ⚠ `disponibilites.reservation_id` N'EST PAS LU. La colonne invite à marquer les
-- jours réservés dans le calendrier ; ce seraient deux représentations du même
-- fait, qui divergeraient à la première annulation manquée. La source 1 se dérive
-- À LA LECTURE, comme le palier du Club.
--
-- ── LE MODE GÉRÉ, ET SON OPT-IN ─────────────────────────────────────────────
--
-- `dispo_geree = false` (les 13 châteaux aujourd'hui) : la source 2 est
-- IGNORÉE. `est_disponible` ne dit alors rien de plus que « pas de réservation
-- qui bloque » — c'est volontairement pauvre, et c'est ce qui permet de brancher
-- ces fonctions sans rien changer à l'écran.
--
-- `dispo_geree = true` : CHAQUE nuit de `[arrivée, départ)` doit porter une ligne
-- `disponibilites` à `est_disponible = true`. Une nuit à `false` ferme ; une nuit
-- SANS LIGNE ferme aussi. ⚠ Un oubli de saisie ferme donc une date au lieu d'en
-- ouvrir une — c'est le sens de l'arbitrage du 23 août : perdre une réservation
-- est rattrapable, promettre une nuit occupée ne l'est pas.
--
-- ⚠ COLLISION DE NOMS À CONNAÎTRE : la FONCTION s'appelle `est_disponible`, et la
-- COLONNE de `disponibilites` aussi. Toutes les références à la colonne sont
-- qualifiées (`d.est_disponible`). Ne pas les déqualifier « pour alléger ».
--
-- IMPACT — AUCUN. Ces fonctions n'ont encore aucun appelant : le wrapper JS est
-- l'étape 2.4, et le contrôle dans `demande-reservation` l'étape 2.5. Elles sont
-- posées et testées avant d'être branchées.
--
-- IDEMPOTENTE — CREATE OR REPLACE. GRANT rejoués (idempotents).
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- L'ATOME — une chambre, une plage
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.est_disponible(
  p_chambre_id uuid,
  p_arrivee    date,
  p_depart     date
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chateau_id uuid;
  v_geree      boolean;
  v_nuits      integer;
  v_ouvertes   integer;
BEGIN
  -- ── 0. BORNES ──
  -- Une plage vide ou inversee n'est pas « disponible », elle est invalide : on
  -- rend false plutot que de lever, parce que l'appelant est un ECRAN.
  IF p_chambre_id IS NULL OR p_arrivee IS NULL OR p_depart IS NULL THEN
    RETURN false;
  END IF;
  IF p_depart <= p_arrivee THEN
    RETURN false;
  END IF;
  IF p_arrivee < CURRENT_DATE THEN
    RETURN false;
  END IF;

  -- La chambre doit exister ; on resout son chateau et son mode au passage.
  SELECT ch.chateau_id, c.dispo_geree
    INTO v_chateau_id, v_geree
    FROM public.chambres ch
    JOIN public.chateaux c ON c.id = ch.chateau_id
   WHERE ch.id = p_chambre_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- ── 1. RESERVATION ACTIVE ──
  -- ⚠ PREDICAT COPIE MOT POUR MOT DE reservations_pas_de_chevauchement.
  --   Memes statuts, meme borne '[)'. Toute divergence ferait promettre a
  --   l'ecran ce que la base refuse. Le test de PARITE le confronte.
  IF EXISTS (
    SELECT 1
      FROM public.reservations r
     WHERE r.chambre_id = p_chambre_id
       AND r.status IN ('confirmed', 'completed')
       AND daterange(r.date_arrivee, r.date_depart, '[)')
        && daterange(p_arrivee, p_depart, '[)')
  ) THEN
    RETURN false;
  END IF;

  -- ── 2. CALENDRIER — seulement si le chateau est en gestion ──
  -- Hors gestion, la table n'est PAS consultee : comportement historique.
  IF v_geree THEN
    -- Les NUITS d'un sejour [arrivee, depart) sont arrivee .. depart-1.
    -- Le depart n'est pas une nuit : on ne dort pas le soir du depart.
    v_nuits := p_depart - p_arrivee;

    -- On compte les nuits EXPLICITEMENT ouvertes. Le JOIN elimine d'un coup les
    -- deux facons d'etre fermee : ligne a false (le WHERE), et ABSENCE de ligne
    -- (le JOIN ne trouve rien). C'est l'opt-in, ecrit en une jointure.
    SELECT count(*)
      INTO v_ouvertes
      FROM generate_series(p_arrivee, p_depart - 1, interval '1 day') AS g(nuit)
      JOIN public.disponibilites d
        ON d.chambre_id = p_chambre_id
       AND d.date = g.nuit::date
     WHERE d.est_disponible;   -- ⚠ la COLONNE, pas la fonction homonyme

    IF v_ouvertes <> v_nuits THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.est_disponible(uuid, date, date) IS
  'Disponibilite d''une CHAMBRE sur [arrivee, depart) — depart exclu. Compose, dans l''ordre : bornes (depart > arrivee, arrivee >= aujourd''hui, chambre existante), reservation confirmed/completed chevauchante (predicat COPIE MOT POUR MOT de la contrainte reservations_pas_de_chevauchement — toute divergence ferait promettre a l''ecran ce que la base refuse), puis le calendrier disponibilites UNIQUEMENT si chateaux.dispo_geree : chaque nuit y exige une ligne a est_disponible = true, une nuit sans ligne FERME (opt-in). pending n''occupe pas (l''arbitrage du chatelain tranche). L''offre n''est PAS evaluee : hors fenetre d''offre ne veut pas dire indisponible, seulement pas a ce tarif. disponibilites.reservation_id n''est PAS lu (la source reservation se derive a la lecture). SECURITY DEFINER : reservations est sous RLS, un appel cote navigateur ne verrait RIEN de ce qui bloque. Ne rend qu''un booleen — rien a fuiter.';


-- ────────────────────────────────────────────────────────────────────────────
-- LE NIVEAU CHÂTEAU — au moins une chambre
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.chateau_disponible(
  p_chateau_id uuid,
  p_arrivee    date,
  p_depart     date
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- ⚠ AUCUNE LOGIQUE PROPRE : un EXISTS sur est_disponible. Une seule regle,
  --   donc aucune divergence possible entre le niveau chateau et le niveau
  --   chambre. Un chateau sans chambre est indisponible — on ne reserve pas ce
  --   qui n'existe pas.
  SELECT EXISTS (
    SELECT 1
      FROM public.chambres ch
     WHERE ch.chateau_id = p_chateau_id
       AND public.est_disponible(ch.id, p_arrivee, p_depart)
  );
$$;

COMMENT ON FUNCTION public.chateau_disponible(uuid, date, date) IS
  'Disponibilite d''un CHATEAU sur [arrivee, depart) : vrai si AU MOINS UNE de ses chambres l''est. EXISTS sur est_disponible — aucune logique propre, une seule regle pour les deux niveaux. Un chateau sans chambre rend false (on ne reserve pas ce qui n''existe pas). SECURITY DEFINER, ne rend qu''un booleen.';


-- ── DROITS ──────────────────────────────────────────────────────────────────
-- ⚠ `anon` COMPRIS, et c'est deliberе : un visiteur sans compte doit pouvoir
--   consulter un calendrier. Le risque habituel d'une SECURITY DEFINER ouverte
--   — qu'elle rende des donnees d'autrui — n'existe pas ici : aucune de ces deux
--   fonctions ne prend d'identifiant d'utilisateur ni ne rend autre chose qu'un
--   booleen.
REVOKE EXECUTE ON FUNCTION public.est_disponible(uuid, date, date)     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.chateau_disponible(uuid, date, date) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.est_disponible(uuid, date, date)     TO anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.chateau_disponible(uuid, date, date) TO anon, authenticated;

COMMIT;


-- ============================================================
-- VÉRIFICATION (lecture seule) — un seul SELECT, cf. la lecon du 23 aout :
-- le SQL Editor n'affiche que le dernier resultat.
-- Attendu : 2 lignes, security_definer = true, search_path fige, execute
-- accorde a anon ET authenticated, et PAS a public.
-- ============================================================
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid)              AS arguments,
  p.prosecdef                                            AS security_definer,
  p.provolatile = 's'                                    AS stable,
  p.proconfig                                            AS search_path,
  has_function_privilege('anon',          p.oid, 'EXECUTE') AS execute_anon,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS execute_authenticated,
  has_function_privilege('public',        p.oid, 'EXECUTE') AS execute_public_doit_etre_false
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('est_disponible', 'chateau_disponible')
ORDER BY p.proname;
