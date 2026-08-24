-- ============================================================
-- LCC — moteur, etape 3.1 : ECRIRE les disponibilites
-- ============================================================
--
-- À jouer APRÈS `2026-08-24-horizon-ouverture.sql`.
--
-- QUOI — trois fonctions :
--   poser_disponibilites(chambre, du, au, est_disponible, prix?)  -> integer
--   retirer_disponibilites(chambre, du, au)                       -> integer
--   calendrier_edition_chambre(chambre, du, au)                   -> table
--
-- Les deux premieres ECRIVENT, la troisieme est la lecture dont l'ecran de
-- saisie a besoin — et qui n'existait pas : `jours_disponibles_chambre` rend le
-- resultat COMPOSE (« libre ou non »), or le chatelain doit voir POURQUOI une
-- nuit est fermee. « J'ai bloque » et « c'est vendu » ne se corrigent pas de la
-- meme facon : la seconde, il ne peut PAS la rouvrir.
--
-- ── ⚠ POURQUOI DES RPC, ALORS QUE L'ECRITURE DIRECTE EST DEJA OUVERTE ───────
--
-- Mesure du 23 aout : la policy `disponibilites_write_chatelain_admin` existe,
-- et `GRANT INSERT, UPDATE, DELETE ... TO authenticated` aussi. Un
-- `.from("disponibilites").upsert(...)` depuis le front FONCTIONNERAIT.
-- Ce n'est donc pas un choix de securite — elle est deja tenue. Trois raisons :
--
-- ⚠ L'ATOMICITE. « Je bloque du 12 au 18 » = sept lignes. Un upsert client qui
--   echoue a mi-chemin laisse une periode A MOITIE bloquee — et personne ne le
--   voit, puisque l'ecran affiche ce qu'il croit avoir ecrit.
--
-- ⚠ LA REGLE NE DOIT PAS VIVRE DANS LE COMPOSANT. Le contrat de
--   disponibilitesService l'interdit en toutes lettres. Faire calculer la liste
--   des jours par le client, c'est exactement cela — et c'est la porte par
--   laquelle la semantique divergerait d'est_disponible.
--
-- ⚠ UN ALLER-RETOUR AU LIEU DE N. Bloquer un mois depuis un telephone en trente
--   requetes est une mauvaise idee sur un reseau mobile.
--
-- ── ⚠ BORNES INCLUSIVES — LES DEUX ────────────────────────────────────────
--
-- Ces fonctions manipulent des NUITS, pas un sejour. « Du 12 au 18 » veut dire
-- SEPT nuits, 12 et 18 comprises. C'est la convention de jours_disponibles_*,
-- PAS celle d'est_disponible (qui prend un sejour, depart exclu).
-- ⚠ Se tromper ici laisserait la DERNIERE NUIT d'une periode bloquee ouverte —
-- et le defaut ne se verrait qu'a la reservation. Un test le garde.
--
-- ── DROITS ─────────────────────────────────────────────────────────────────
--
-- SECURITY DEFINER + garde interne `is_chatelain_of(chateau) OR is_admin()`,
-- exactement le predicat de la policy : la RPC ne l'assouplit pas, elle le
-- reprend. GRANT a `authenticated` SEUL.
-- ⚠ PAS `anon`, contrairement aux fonctions de lecture de 2.2/2.3 : celles-la ne
-- rendaient qu'un booleen ou des dates. Ici on ecrit, et
-- `calendrier_edition_chambre` expose l'OCCUPATION — donc le fait qu'une nuit
-- soit vendue, ce qu'un visiteur n'a pas a savoir.
--
-- IMPACT — aucun ecran ne les appelle encore. L'interface de saisie est l'etape
-- 3.3 ; le service JS, l'etape 3.2.
--
-- IDEMPOTENTE — CREATE OR REPLACE.
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- POSER — ouvrir ou bloquer une plage de nuits
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.poser_disponibilites(
  p_chambre_id         uuid,
  p_du                 date,
  p_au                 date,
  p_est_disponible     boolean,
  p_prix_special_cents integer DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chateau_id uuid;
  v_max constant integer := 366;
  v_n integer;
BEGIN
  IF p_chambre_id IS NULL OR p_du IS NULL OR p_au IS NULL OR p_est_disponible IS NULL THEN
    RAISE EXCEPTION 'poser_disponibilites: parametres incomplets' USING ERRCODE = '22023';
  END IF;

  -- ⚠ ON LEVE sur une fenetre invalide, contrairement a est_disponible qui rend
  --   false. La difference tient a l'appelant : la, c'etait un ECRAN qui pose une
  --   question ; ici, c'est une ECRITURE. Un « 0 nuit ecrite » silencieux se
  --   lirait « c'est fait » alors que rien ne l'est.
  IF p_au < p_du THEN
    RAISE EXCEPTION 'poser_disponibilites: fenetre inversee (% -> %)', p_du, p_au
      USING ERRCODE = '22023';
  END IF;
  IF p_au - p_du > v_max THEN
    RAISE EXCEPTION 'poser_disponibilites: fenetre de % jours, maximum %', p_au - p_du, v_max
      USING ERRCODE = '22023';
  END IF;

  SELECT ch.chateau_id INTO v_chateau_id
    FROM public.chambres ch WHERE ch.id = p_chambre_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'poser_disponibilites: chambre % introuvable', p_chambre_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Meme predicat que la policy disponibilites_write_chatelain_admin : la RPC
  -- reprend la garde, elle ne l'assouplit pas.
  IF NOT (public.is_chatelain_of(v_chateau_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'poser_disponibilites: acces refuse (ni chatelain de ce chateau, ni admin)'
      USING ERRCODE = '42501';
  END IF;

  -- ⚠ BORNES INCLUSIVES : generate_series(p_du, p_au) — « du 12 au 18 » = 7 nuits.
  -- updated_at n'est PAS pose ici : le trigger set_timestamp_disponibilites s'en
  -- charge (l'ecrire a la main ferait deux sources pour la meme colonne).
  INSERT INTO public.disponibilites (chambre_id, date, est_disponible, prix_special_cents)
  SELECT p_chambre_id, g.nuit::date, p_est_disponible, p_prix_special_cents
    FROM generate_series(p_du, p_au, interval '1 day') AS g(nuit)
  ON CONFLICT (chambre_id, date) DO UPDATE
    SET est_disponible = EXCLUDED.est_disponible,
        -- ⚠ COALESCE, PAS EXCLUDED SEC. p_prix_special_cents vaut NULL par
        --   defaut, et l'immense majorite des appels ne parlent QUE de
        --   disponibilite. Ecraser avec EXCLUDED effacerait un prix special
        --   existant a chaque fois qu'on bloque une date — une perte de donnee
        --   silencieuse, sur une colonne que personne ne regarde.
        --   ⚠ LIMITE ASSUMEE : on ne peut donc pas EFFACER un prix par cette
        --   fonction. Passer par retirer_disponibilites puis reposer.
        prix_special_cents = COALESCE(EXCLUDED.prix_special_cents,
                                      public.disponibilites.prix_special_cents);

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

COMMENT ON FUNCTION public.poser_disponibilites(uuid, date, date, boolean, integer) IS
  'Ecrit une plage de NUITS dans disponibilites — ⚠ BORNES INCLUSIVES, « du 12 au 18 » = 7 nuits (convention de jours_disponibles_*, PAS celle d''est_disponible qui prend un sejour depart exclu). est_disponible = false pour bloquer, true pour ouvrir explicitement (plus fort que l''horizon du chateau). Un seul aller-retour, une seule transaction : sept nuits ou aucune — un upsert client partiel laisserait une periode a moitie bloquee sans que l''ecran le sache. ON CONFLICT DO UPDATE ; ⚠ le prix special est PRESERVE s''il n''est pas passe (COALESCE), sinon bloquer une date effacerait un tarif existant en silence — pour l''effacer, retirer_disponibilites puis reposer. Leve 22023 sur fenetre inversee ou > 366 jours (une ecriture ne doit pas repondre « 0 nuit » en silence), P0002 si la chambre n''existe pas, 42501 hors chatelain/admin — meme predicat que la policy. SECURITY DEFINER, GRANT a authenticated seul.';


-- ────────────────────────────────────────────────────────────────────────────
-- RETIRER — revenir a « non renseigne »
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.retirer_disponibilites(
  p_chambre_id uuid,
  p_du         date,
  p_au         date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chateau_id uuid;
  v_max constant integer := 366;
  v_n integer;
BEGIN
  IF p_chambre_id IS NULL OR p_du IS NULL OR p_au IS NULL THEN
    RAISE EXCEPTION 'retirer_disponibilites: parametres incomplets' USING ERRCODE = '22023';
  END IF;
  IF p_au < p_du THEN
    RAISE EXCEPTION 'retirer_disponibilites: fenetre inversee (% -> %)', p_du, p_au
      USING ERRCODE = '22023';
  END IF;
  IF p_au - p_du > v_max THEN
    RAISE EXCEPTION 'retirer_disponibilites: fenetre de % jours, maximum %', p_au - p_du, v_max
      USING ERRCODE = '22023';
  END IF;

  SELECT ch.chateau_id INTO v_chateau_id
    FROM public.chambres ch WHERE ch.id = p_chambre_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'retirer_disponibilites: chambre % introuvable', p_chambre_id
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT (public.is_chatelain_of(v_chateau_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'retirer_disponibilites: acces refuse (ni chatelain de ce chateau, ni admin)'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.disponibilites d
   WHERE d.chambre_id = p_chambre_id
     AND d.date BETWEEN p_du AND p_au;   -- ⚠ BETWEEN = bornes incluses, comme poser_

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

COMMENT ON FUNCTION public.retirer_disponibilites(uuid, date, date) IS
  'Efface les lignes disponibilites d''une plage de NUITS — bornes INCLUSES, comme poser_disponibilites. La nuit revient a « non renseignee » : en mode gere elle retombe alors sous l''horizon du chateau (ouverte si <= dispo_ouverte_jusqu_a, fermee au-dela), hors mode gere elle n''a aucun effet. Sert aussi a effacer un prix special, que poser_disponibilites preserve volontairement. ⚠ Supprime TOUTES les lignes de la plage, y compris celles portant un reservation_id — cette colonne n''est ecrite par rien aujourd''hui (la disponibilite se derive a la lecture) ; le jour ou un mecanisme l''ecrirait, il faudrait revoir ce DELETE. Memes gardes et memes codes d''erreur que poser_disponibilites.';


-- ────────────────────────────────────────────────────────────────────────────
-- LIRE POUR EDITER — l'etat BRUT, nuit par nuit
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.calendrier_edition_chambre(
  p_chambre_id uuid,
  p_du         date,
  p_au         date
)
RETURNS TABLE (
  nuit                date,
  etat                text,
  ligne_existe        boolean,
  ligne_ouverte       boolean,
  dans_horizon        boolean,
  vendue              boolean,
  prix_special_cents  integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chateau_id uuid;
  v_geree      boolean;
  v_horizon    date;
  v_max constant integer := 366;
BEGIN
  IF p_chambre_id IS NULL OR p_du IS NULL OR p_au IS NULL THEN
    RETURN;
  END IF;
  IF p_au - p_du > v_max THEN
    RAISE EXCEPTION 'calendrier_edition_chambre: fenetre de % jours, maximum %', p_au - p_du, v_max
      USING ERRCODE = '22023';
  END IF;

  SELECT ch.chateau_id, c.dispo_geree, c.dispo_ouverte_jusqu_a
    INTO v_chateau_id, v_geree, v_horizon
    FROM public.chambres ch
    JOIN public.chateaux c ON c.id = ch.chateau_id
   WHERE ch.id = p_chambre_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'calendrier_edition_chambre: chambre % introuvable', p_chambre_id
      USING ERRCODE = 'P0002';
  END IF;

  -- ⚠ GARDE OBLIGATOIRE, contrairement aux fonctions de 2.2/2.3. Celles-la ne
  --   rendaient qu'un booleen — rien a fuiter, d'ou le GRANT a anon. Celle-ci
  --   dit qu'une nuit est VENDUE : c'est une information d'exploitation, elle
  --   n'appartient qu'au chatelain du chateau et a l'admin.
  IF NOT (public.is_chatelain_of(v_chateau_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'calendrier_edition_chambre: acces refuse (ni chatelain de ce chateau, ni admin)'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    g.nuit::date,
    -- ⚠ L'ORDRE DE PRIORITE EST CELUI DU MOTEUR, et il compte pour l'ecran :
    --   « vendue » domine tout, parce que c'est le seul etat que le chatelain
    --   NE PEUT PAS corriger depuis ce calendrier.
    CASE
      WHEN r.id IS NOT NULL                       THEN 'vendue'
      WHEN d.est_disponible IS FALSE              THEN 'bloquee'
      WHEN d.est_disponible IS TRUE               THEN 'ouverte_explicite'
      WHEN NOT v_geree                            THEN 'hors_gestion'
      WHEN v_horizon IS NOT NULL
       AND g.nuit::date <= v_horizon              THEN 'ouverte_horizon'
      ELSE                                             'non_renseignee'
    END,
    (d.chambre_id IS NOT NULL),
    d.est_disponible,
    (v_horizon IS NOT NULL AND g.nuit::date <= v_horizon),
    (r.id IS NOT NULL),
    d.prix_special_cents
  FROM generate_series(p_du, p_au, interval '1 day') AS g(nuit)
  LEFT JOIN public.disponibilites d
    ON d.chambre_id = p_chambre_id
   AND d.date = g.nuit::date
  -- ⚠ MEME PREDICAT QUE LA PARITE #142, une nuit valant le sejour [N, N+1).
  --   S'il divergeait, l'ecran de saisie et le moteur ne diraient pas la meme
  --   chose de la meme nuit. Un test les confronte.
  LEFT JOIN LATERAL (
    SELECT res.id
      FROM public.reservations res
     WHERE res.chambre_id = p_chambre_id
       AND res.status IN ('confirmed', 'completed')
       AND daterange(res.date_arrivee, res.date_depart, '[)')
        && daterange(g.nuit::date, g.nuit::date + 1, '[)')
     LIMIT 1
  ) r ON true
  ORDER BY g.nuit;
END;
$$;

COMMENT ON FUNCTION public.calendrier_edition_chambre(uuid, date, date) IS
  'La vue d''EDITION du calendrier d''une chambre : une ligne par nuit de [du, au] (bornes incluses), avec l''etat BRUT et non compose. ⚠ C''est ce qui la distingue de jours_disponibles_chambre, qui ne dit que « libre ou non » : ici le chatelain voit POURQUOI une nuit est fermee, et « j''ai bloque » ne se corrige pas comme « c''est vendu » — la seconde, il ne peut pas la rouvrir. etat ∈ vendue | bloquee | ouverte_explicite | hors_gestion | ouverte_horizon | non_renseignee, par ordre de priorite decroissante (vendue domine, car c''est le seul etat non corrigeable depuis ce calendrier). Le predicat d''occupation est celui de la parite #142, applique a la nuit [N, N+1). ⚠ GARDE OBLIGATOIRE is_chatelain_of OR is_admin et GRANT a authenticated SEUL : contrairement aux fonctions de 2.2/2.3 qui ne rendent qu''un booleen, celle-ci expose l''occupation — une information d''exploitation, pas publique.';


-- ── DROITS ──────────────────────────────────────────────────────────────────
-- ⚠ `authenticated` SEUL, jamais `anon` : deux de ces fonctions ecrivent, la
--   troisieme expose l'occupation. Le GRANT a anon des fonctions de lecture de
--   2.2/2.3 se justifiait par leur retour — un booleen ou des dates, rien a
--   fuiter. Ce n'est pas le cas ici.
REVOKE EXECUTE ON FUNCTION public.poser_disponibilites(uuid, date, date, boolean, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.retirer_disponibilites(uuid, date, date)                  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calendrier_edition_chambre(uuid, date, date)              FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.poser_disponibilites(uuid, date, date, boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.retirer_disponibilites(uuid, date, date)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.calendrier_edition_chambre(uuid, date, date)              TO authenticated;

COMMIT;


-- ============================================================
-- VERIFICATION (lecture seule) — L'UNIQUE SELECT DU FICHIER.
-- Attendu : 3 lignes, security_definer = true, search_path fige,
-- execute_authenticated = true, execute_anon = false, execute_public = false.
-- ⚠ NE RIEN AJOUTER APRES.
-- ============================================================
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid)                 AS arguments,
  p.prosecdef                                               AS security_definer,
  p.proconfig                                               AS search_path,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS execute_authenticated,
  has_function_privilege('anon',          p.oid, 'EXECUTE') AS execute_anon_doit_etre_false,
  has_function_privilege('public',        p.oid, 'EXECUTE') AS execute_public_doit_etre_false
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('poser_disponibilites', 'retirer_disponibilites', 'calendrier_edition_chambre')
ORDER BY p.proname;
