-- ============================================================
-- LCC — repondre_demande : capture P0003 + réparation du chemin « refuser »
-- ============================================================
--
-- QUOI — DEUX corrections, sur LA MÊME instruction : l'UPDATE de l'étape 5.
--
--   1. Il est enveloppé d'une capture d'`exclusion_violation`, relevée en
--      `P0003` (couche 3 de l'anti-survente).
--   2. Il pose désormais `cancelled_at` et `cancellation_reason` quand la
--      décision est un REFUS — sans quoi il violait une contrainte de la table
--      et le refus échouait. Cf. « LE DÉFAUT DE PRODUCTION » plus bas.
--
-- RIEN D'AUTRE NE CHANGE : les six autres étapes, le DECLARE, la signature,
-- SECURITY DEFINER, search_path, et l'écriture email_log de l'étape 7 sont
-- repris À L'IDENTIQUE de la version mesurée en base le 22 août
-- (`pg_get_functiondef`), et non reconstruits depuis une migration.
--
-- ⚠ CE POINT N'EST PAS COSMÉTIQUE. Deux migrations `repondre_demande`
-- coexistent dans le dépôt, dont une SANS l'étape email_log. Repartir de la
-- mauvaise aurait silencieusement supprimé l'outbox — le statut aurait changé,
-- et le voyageur n'aurait jamais reçu sa réponse.
--
-- ⚠ CETTE MIGRATION A DÉJÀ ÉTÉ APPLIQUÉE UNE FOIS, avec la seule correction 1.
-- La réappliquer est sans danger (CREATE OR REPLACE) et nécessaire : la 2 n'y
-- était pas.
--
-- ── 1. LA CAPTURE P0003 (anti-survente, couche 3) ───────────────────────────
--
-- POURQUOI — la contrainte `reservations_pas_de_chevauchement` (couche 1) peut
-- lever `23P01` sur cet UPDATE, si une autre demande a été confirmée entre-temps
-- sur les mêmes dates. Rien ne le captait : `chatelainService` ne discrimine que
-- `P0001`, donc l'erreur remontait BRUTE au châtelain — en exposant au passage
-- le nom d'une contrainte interne.
--
-- ⚠ ET LE MESSAGE QU'IL LISAIT ÉTAIT UN CONSEIL FAUX. Mesuré dans
-- `ChatelainDashboard:123-135` : sans branche dédiée, P0003 tombe dans le `else`
-- générique — « Votre réponse n'a pas pu être enregistrée. Réessayez dans un
-- instant. » — et la modale reste ouverte. Or le réessai échouera TOUJOURS : les
-- dates sont prises. D'où la branche jumelle ajoutée côté front.
--
-- ⚠ COUCHE 3 SUR TROIS, ET ELLE N'AJOUTE AUCUNE PROTECTION. La couche 1 protège
-- déjà contre la survente ; celle-ci remplace une erreur SQL illisible par un
-- message compréhensible. L'enjeu est l'expérience du châtelain, pas la sûreté.
--
-- La couche 2 (`demande-reservation`) a été ABANDONNÉE après audit : elle
-- n'aurait intercepté aucune erreur. La fonction n'insère que du `pending`, que
-- la contrainte ne surveille pas — le 23P01 ne peut pas y remonter.
--
-- ── POURQUOI P0003, ET PAS P0001 ────────────────────────────────────────────
--
-- Vérifié : le projet utilise 22023 (×5), 42501 (×18), P0001 (×8), P0002 (×20).
-- P0003 est libre. Un code DISTINCT de P0001 est indispensable — « vous avez
-- déjà répondu » et « quelqu'un d'autre a pris ces dates » envoient le châtelain
-- chercher à deux endroits différents.
--
-- Le message SQL reste court et neutre : il ne nomme aucune contrainte interne.
-- Le message lisible vit côté service (`chatelainService`), pas ici.
--
-- ── 2. LE DÉFAUT DE PRODUCTION — le refus n'a JAMAIS fonctionné ─────────────
--
-- ⚠⚠ DEPUIS LE 21 JUILLET 2026, LE BOUTON « REFUSER » DU TABLEAU DE BORD
-- CHÂTELAIN EST INOPÉRANT. La fonction posait `status = 'cancelled'` seul, or :
--
--   CONSTRAINT reservations_cancelled_coherent CHECK (
--     (status = 'cancelled' AND cancelled_at IS NOT NULL) OR (status <> 'cancelled'))
--
-- présente depuis le schéma initial (8 mai). Tout refus levait donc un `23514`,
-- que `chatelainService` ne discrimine pas : le châtelain lisait « Réessayez
-- dans un instant » et pouvait réessayer indéfiniment. AUCUN TRIGGER ne
-- compensait — le seul sur `reservations` est `set_timestamp_reservations`, qui
-- n'écrit qu'`updated_at`.
--
-- ⚠ CE DÉFAUT A ÉTÉ TROUVÉ PAR LE TEST DE LA COUCHE 3, pas par un incident.
-- Personne ne l'avait vu parce qu'aucun châtelain n'avait encore refusé une
-- demande. Le test 4 avait été écrit pour prouver que la capture P0003 ne
-- débordait pas sur le chemin « refuser » ; il a prouvé que ce chemin n'existait
-- pas.
--
-- ⚠ LA PREUVE, ET ELLE EST DÉCISIVE — mesurée en base le 22 août :
--
--     SELECT count(*) FROM email_log WHERE type = 'sejour_refuse';   ->  0
--     SELECT count(*) FROM email_log WHERE type = 'sejour_confirme'; ->  2
--
-- Le chemin « refuser » écrit une ligne d'outbox de type `sejour_refuse` à
-- l'étape 7, type qu'AUCUNE autre fonction ne produit. Zéro ligne = zéro refus
-- abouti en un mois. Le chemin « accepter », lui, a servi deux fois.
--
-- ⚠ UNE LIGNE `cancelled` EXISTE POURTANT EN BASE, ET ELLE A FAILLI ÉGARER LE
-- DIAGNOSTIC. Elle porte `cancelled_at` renseigné — mais c'est une TAUTOLOGIE :
-- le CHECK ci-dessus interdit qu'il en soit autrement, quel que soit l'écrivain.
-- Ses emails (`sejour_annule_admin`, `sejour_annule`) l'attribuent à
-- `admin_annuler_reservation`, pas à un refus de châtelain. **Ne jamais conclure
-- d'une colonne dont une contrainte garantit déjà la valeur.**
--
-- ── LA FORME RETENUE POUR LA RÉPARATION ─────────────────────────────────────
--
-- ⚠ UN SEUL UPDATE, LES DEUX COLONNES ENSEMBLE. Les écrire en deux instructions
-- ferait passer la ligne par un état `cancelled` sans horodatage — que la
-- contrainte refuse. Ce n'est pas une élégance, c'est la seule forme qui marche.
--
-- ⚠ `now()` NU, pas `COALESCE(cancelled_at, now())`. `admin_forcer_statut` prend
-- le COALESCE parce qu'elle peut re-forcer une ligne DÉJÀ annulée et ne doit pas
-- écraser la trace d'une vraie annulation. Ici la garde de l'étape 3 impose
-- `status = 'pending'` : il n'y a rien à préserver. Même forme que
-- `annuler_ma_reservation` et `admin_annuler_reservation`.
--
-- ⚠ `ELSE NULL` sur `cancelled_at`. Sur le chemin « accepter » la colonne est
-- déjà NULL, donc l'écriture est un non-événement — mais elle suit le précédent
-- d'`admin_forcer_statut`, qui remet les colonnes d'annulation à NULL dès que la
-- cible n'est pas `cancelled` : une réservation active ne doit pas porter de
-- date d'annulation, et le CHECK ne le tient que dans un sens.
--
-- ⚠ `cancellation_reason` = MARQUEUR, décision de Matthieu du 22 août. La
-- convention vient de la maison : `admin_forcer_statut` écrit
-- 'Statut force par un administrateur' quand aucun motif humain n'existe, pour
-- que « le support sache d'où vient cette ligne ». On lui donne son équivalent.
-- La traçabilité devient DURABLE, indépendante d'`email_log` — qui est une file
-- drainée, pas un registre.
--
-- ⚠ ET ELLE EST RÉDIGÉE POUR ÊTRE LUE PAR LE VOYAGEUR. `cancellation_reason`
-- est exposée par `reservations_client_view` (`policies.sql:206`), en
-- `GRANT SELECT … TO anon, authenticated` avec `security_invoker`. Aucun code du
-- front ne la consomme aujourd'hui, mais un client authentifié le pourrait.
-- D'où un libellé factuel et neutre. ⚠ Vaut pour toute écriture future dans
-- cette colonne.
--
-- ⚠ LA SIGNATURE NE BOUGE PAS. Pas de paramètre de motif : les trois autres RPC
-- en ont un, celle-ci non, et le lui ajouter est un chantier « motif de refus »
-- à part entière (consigné dans CLAUDE.md). Le jour venu, la forme est déjà
-- écrite par `admin_forcer_statut` : `COALESCE(p_motif, '<marqueur>')`.
--
-- ── TROIS PROPRIÉTÉS QUI SURVIVENT AUX DEUX CORRECTIONS ─────────────────────
--
-- ⚠ SEUL LE CHEMIN « accepter » PEUT LEVER 23P01. `cancelled` n'entre pas dans
-- le WHERE de la contrainte d'exclusion, et celle-ci n'indexe que `chambre_id`
-- et le `daterange` — ni l'une ni l'autre touchée par les colonnes ajoutées. La
-- capture et la réparation ne peuvent pas interférer.
--
-- ⚠ LE 23514 N'ÉTAIT PAS ATTRAPÉ PAR LA CAPTURE, et c'est prouvé : c'est un
-- `check_violation`, pas un `exclusion_violation`. Il a traversé le bloc intact
-- — sans quoi le test 4 aurait été avalé au lieu de rougir. Après réparation, le
-- chemin « refuser » ne lève plus rien du tout.
--
-- ⚠ PAS DE DEMI-ÉTAT. Si l'exception part, la fonction s'arrête : `RETURN NEXT`
-- n'est jamais atteint, l'étape 7 n'écrit RIEN dans email_log, et le statut reste
-- `pending` — la demande demeure traitable. Le bloc EXCEPTION crée une
-- sous-transaction implicite ; elle n'enveloppe que l'UPDATE, jamais la suite.
--
-- IMPACT — le châtelain peut refuser une demande, ce qu'il ne pouvait pas depuis
-- un mois ; et sur le chemin « accepter », une collision de dates lui donne un
-- message clair au lieu d'une erreur Postgres.
--
-- ⚠ L'ÉTAPE 7 DU CHEMIN « REFUSER » N'A JAMAIS TOURNÉ. La branche
-- `v_type := 'sejour_refuse'` sera exercée pour la première fois de l'histoire
-- du projet. C'est le test 4 qui la couvre.
--
-- IDEMPOTENTE — CREATE OR REPLACE.
-- ⚠ Le COMMENT et le GRANT ne sont PAS réémis : CREATE OR REPLACE les préserve,
-- et les répéter ferait vivre deux sources susceptibles de diverger.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.repondre_demande(p_reservation_id uuid, p_decision text)
 RETURNS TABLE(reservation_id uuid, nouveau_statut reservation_status)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_chateau_id   uuid;
  v_status       public.reservation_status;
  v_new_status   public.reservation_status;
  v_email        text;
  v_full_name    text;
  v_chateau_nom  text;
  v_date_arrivee date;
  v_date_depart  date;
  v_voyageurs    integer;
  v_type         text;
  v_sujet        text;
BEGIN
  -- 1. Résoudre le château depuis la réservation via la chambre. Existence ?
  SELECT ch.chateau_id INTO v_chateau_id
    FROM public.reservations r
    JOIN public.chambres ch ON ch.id = r.chambre_id
   WHERE r.id = p_reservation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'repondre_demande: demande % introuvable', p_reservation_id USING ERRCODE = 'P0002';
  END IF;
  -- 2. Garde d'appartenance.
  IF NOT public.is_chatelain_of(v_chateau_id) THEN
    RAISE EXCEPTION 'repondre_demande: acces refuse (pas le chatelain de ce chateau)' USING ERRCODE = '42501';
  END IF;
  -- 3. Verrou anti-course + garde d'état.
  SELECT status INTO v_status FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'repondre_demande: demande deja traitee (statut %)', v_status USING ERRCODE = 'P0001';
  END IF;
  -- 4. Valider la décision -> statut cible.
  IF p_decision = 'accepter' THEN
    v_new_status := 'confirmed';
  ELSIF p_decision = 'refuser' THEN
    v_new_status := 'cancelled';
  ELSE
    RAISE EXCEPTION 'repondre_demande: decision invalide % (attendu accepter|refuser)', p_decision USING ERRCODE = '22023';
  END IF;
  -- 5. Écrire le statut ET, sur un refus, les deux colonnes d'annulation.
  --
  -- ⚠ UN SEUL UPDATE. Les séparer ferait passer la ligne par un état
  --    'cancelled' sans horodatage, que reservations_cancelled_coherent refuse
  --    (23514) — c'est exactement le defaut repare ici, cf. en-tete.
  --
  -- ⚠ La contrainte anti-survente peut lever 23P01 sur ce meme UPDATE, mais
  --    seulement sur le chemin 'accepter' ('cancelled' n'entre pas dans son
  --    WHERE). On la traduit en P0003 : le message brut de Postgres nommerait la
  --    contrainte interne, et le front en ferait un « reessayez » trompeur.
  BEGIN
    UPDATE public.reservations
       SET status              = v_new_status,
           cancelled_at        = CASE WHEN v_new_status = 'cancelled' THEN now() ELSE NULL END,
           cancellation_reason = CASE WHEN v_new_status = 'cancelled'
                                      THEN 'Refusée par le châtelain' END
     WHERE id = p_reservation_id
    RETURNING id, status INTO reservation_id, nouveau_statut;
  EXCEPTION
    WHEN exclusion_violation THEN
      RAISE EXCEPTION 'repondre_demande: dates deja confirmees ailleurs'
        USING ERRCODE = 'P0003';
  END;
  -- 6. OUTBOX — résoudre destinataire client + données séjour.
  SELECT u.email, u.full_name, r.date_arrivee, r.date_depart, r.voyageurs, c.nom
    INTO v_email, v_full_name, v_date_arrivee, v_date_depart, v_voyageurs, v_chateau_nom
    FROM public.reservations r
    JOIN public.users u ON u.id = r.user_id
    JOIN public.chambres ch ON ch.id = r.chambre_id
    JOIN public.chateaux c ON c.id = ch.chateau_id
   WHERE r.id = p_reservation_id;
  IF v_new_status = 'confirmed' THEN
    v_type := 'sejour_confirme';
    v_sujet := 'Votre séjour est confirmé — ' || v_chateau_nom;
  ELSE
    v_type := 'sejour_refuse';
    v_sujet := 'Votre demande de séjour — ' || v_chateau_nom;
  END IF;
  -- 7. Ligne email_log 'en_attente'.
  INSERT INTO public.email_log (destinataire, type, reservation_id, statut, payload)
  VALUES (v_email, v_type, p_reservation_id, 'en_attente',
    jsonb_build_object('sujet', v_sujet, 'params', jsonb_build_object(
      'nomClient', COALESCE(v_full_name, ''), 'chateau', v_chateau_nom,
      'dateArrivee', to_char(v_date_arrivee, 'YYYY-MM-DD'),
      'dateDepart', to_char(v_date_depart, 'YYYY-MM-DD'), 'voyageurs', v_voyageurs)));
  RETURN NEXT;
END;
$function$;

COMMIT;


-- ============================================================
-- VÉRIFICATION (lecture seule) — à jouer après COMMIT.
-- Les QUATRE colonnes doivent rendre `true`.
-- ============================================================
SELECT
  position('P0003'        in pg_get_functiondef(p.oid)) > 0 AS capture_p0003_presente,
  position('cancelled_at' in pg_get_functiondef(p.oid)) > 0 AS reparation_refus_presente,
  position('email_log'    in pg_get_functiondef(p.oid)) > 0 AS etape_7_intacte,
  p.prosecdef                                                AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'repondre_demande';
