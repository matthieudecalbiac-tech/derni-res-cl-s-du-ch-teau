-- ============================================================
-- LCC — moteur 2.5 : preuve du GRANT + mise en scène du cas (b)
-- ============================================================
--
-- À lancer APRÈS `migrations/2026-08-23-grant-dispo-service-role.sql`
-- et AVANT le déploiement de `demande-reservation`.
--
-- ⚠⚠ CE SCRIPT LAISSE UNE RÉSERVATION EN BASE, VOLONTAIREMENT. C'est le décor
-- du test manuel : sans une nuit réellement vendue, il n'y a rien à refuser.
-- Le nettoyage est un SECOND script, en bas de ce fichier, à jouer APRÈS le
-- test depuis le site.
--
-- ⚠ IDEMPOTENT : il commence par purger ce qu'une exécution précédente aurait
-- laissé (dates au-delà de CURRENT_DATE + 800). Le rejouer est sans risque.
--
-- ⚠ UN SEUL SELECT FINAL — le SQL Editor n'affiche que le dernier résultat.
-- Le verdict du test ① ET les paramètres du test manuel sortent par la même
-- table.
--
-- ── CE QU'IL FAIT ──────────────────────────────────────────────────────────
--
--   ①  prouve que `service_role` peut RÉELLEMENT appeler `est_disponible`
--      (pas seulement qu'il en a le droit sur le papier)
--   ②  pose une réservation `confirmed` sur une chambre d'un château servi,
--      à dates lointaines, et rend les paramètres du test manuel
--
-- ⚠ LE ① EST LE VERROU DU DÉPLOIEMENT. Sans lui, le contrôle de 2.5 échouerait
-- à chaque appel et — règle d'ouverture — ne bloquerait jamais rien, en
-- silence. Un correctif inerte, déployé, et invisible. `has_function_privilege`
-- dit le droit ; seul un appel dit le fait.
--
-- ── LA CIBLE ───────────────────────────────────────────────────────────────
--
-- Choisie dynamiquement, avec EXACTEMENT les mêmes gardes que l'Edge Function :
-- château `publie` ET `sur_place`, module A actif, au moins une chambre. Le
-- test manuel ne peut donc pas échouer pour une autre raison que celle qu'on
-- veut voir.
--
-- ⚠ C'EST UN CHÂTEAU PUBLIÉ, donc visible des visiteurs. La réservation posée
-- ne s'affiche nulle part (aucun écran ne montre les réservations d'autrui),
-- mais elle OCCUPE réellement des nuits — d'où les dates à +800 jours, hors de
-- tout séjour plausible, et hors des fenêtres des tests 2.1 (+490), 2.2 (+600)
-- et 2.3 (+700).
-- ============================================================

DROP TABLE IF EXISTS cas_b_results;
CREATE TEMP TABLE cas_b_results (
  etape       text,
  description text,
  result      text,
  verdict     text
);


DO $cas_b$
DECLARE
  cible_id     uuid;
  cible_slug   text;
  cible_nom    text;
  chambre_id   uuid;
  chambre_nom  text;
  capacite     int;
  min_nuits    int;
  max_nuits    int;

  client       uuid;
  module_a     uuid;

  base   date := (CURRENT_DATE + 800);
  fin    date := (CURRENT_DATE + 805);
  borne  date := (CURRENT_DATE + 795);

  appel_ok   boolean;
  n_purge    int;
  n_restant  int;
BEGIN

  -- ══════════════════════════════════════════════════════════════════════
  -- PURGE d'une execution precedente (idempotence)
  -- ══════════════════════════════════════════════════════════════════════
  DELETE FROM public.reservations WHERE date_arrivee >= borne;
  GET DIAGNOSTICS n_purge = ROW_COUNT;

  -- ══════════════════════════════════════════════════════════════════════
  -- CIBLE — memes gardes que demande-reservation (§3 et §5)
  -- ══════════════════════════════════════════════════════════════════════
  SELECT c.id, c.slug, c.nom, ch.id, ch.nom, ch.capacite,
         ch.min_stay_nights, ch.max_stay_nights
    INTO cible_id, cible_slug, cible_nom, chambre_id, chambre_nom, capacite,
         min_nuits, max_nuits
    FROM public.chateaux c
    JOIN public.chambres ch        ON ch.chateau_id = c.id
    JOIN public.chateau_modules cm ON cm.chateau_id = c.id AND cm.est_actif
    JOIN public.modules m          ON m.id = cm.module_id AND m.code = 'A'
   WHERE c.statut = 'publie'
     AND c.mode_paiement = 'sur_place'
   ORDER BY c.slug, ch.nom
   LIMIT 1;

  SELECT id INTO client   FROM public.users   WHERE role = 'client' LIMIT 1;
  SELECT id INTO module_a FROM public.modules WHERE code = 'A'      LIMIT 1;

  INSERT INTO cas_b_results VALUES (
    'SETUP', 'chateau servi (publie + sur_place + module A actif) + chambre',
    coalesce(cible_slug, '(aucun chateau servi avec chambre)')
      || ' · chambre=' || coalesce(chambre_nom, '?')
      || ' · purge prealable=' || n_purge || ' ligne(s)',
    CASE WHEN cible_id IS NOT NULL AND chambre_id IS NOT NULL
              AND client IS NOT NULL AND module_a IS NOT NULL
         THEN 'PASS' ELSE 'FAIL — pre-requis absents' END
  );

  -- ══════════════════════════════════════════════════════════════════════
  -- ① LE GRANT A-T-IL PRIS ? Un APPEL, pas une lecture de droit.
  -- ══════════════════════════════════════════════════════════════════════
  BEGIN
    SET LOCAL ROLE service_role;
    appel_ok := public.est_disponible(chambre_id, base, base + 2);
    RESET ROLE;

    INSERT INTO cas_b_results VALUES (
      '1', 'appel de est_disponible SOUS service_role',
      'retour=' || coalesce(appel_ok::text, '(null)'),
      CASE WHEN appel_ok IS NOT NULL THEN 'PASS'
           ELSE 'FAIL — retour nul, resultat inexploitable' END
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      RESET ROLE;
      INSERT INTO cas_b_results VALUES (
        '1', 'appel de est_disponible SOUS service_role', '42501 permission denied',
        'FAIL — ⚠ LE GRANT N A PAS PRIS. NE PAS DEPLOYER : le controle echouerait a chaque demande et, regle d ouverture, ne bloquerait rien EN SILENCE.'
      );
    WHEN OTHERS THEN
      RESET ROLE;
      INSERT INTO cas_b_results VALUES (
        '1', 'appel de est_disponible SOUS service_role', SQLSTATE || ' ' || SQLERRM,
        'FAIL — INVESTIGUER avant de deployer'
      );
  END;

  -- ══════════════════════════════════════════════════════════════════════
  -- ② LE DECOR — une reservation CONFIRMEE qui occupe [base, fin)
  -- ══════════════════════════════════════════════════════════════════════
  INSERT INTO public.reservations
    (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status)
  VALUES (client, chambre_id, module_a, base, fin, 10000, 'confirmed');

  -- Verification par la fonction elle-meme : la fenetre est bien fermee
  -- desormais, et la nuit du depart bien restee ouverte (borne '[)').
  INSERT INTO cas_b_results VALUES (
    '2', 'la fenetre est desormais fermee (et le jour du depart reste ouvert)',
    'est_disponible(' || base || ', ' || (base + 2) || ')='
      || public.est_disponible(chambre_id, base, base + 2)::text
      || ' · est_disponible(' || fin || ', ' || (fin + 2) || ')='
      || public.est_disponible(chambre_id, fin, fin + 2)::text,
    CASE WHEN public.est_disponible(chambre_id, base, base + 2) = false
          AND public.est_disponible(chambre_id, fin, fin + 2) = true
         THEN 'PASS' ELSE 'FAIL — le decor n est pas celui attendu' END
  );

  -- ══════════════════════════════════════════════════════════════════════
  -- LES PARAMETRES DU TEST MANUEL
  -- ══════════════════════════════════════════════════════════════════════
  INSERT INTO cas_b_results VALUES (
    'CAS (a)', 'DOIT PASSER — dates libres, juste apres la fenetre occupee',
    'chateau=/chateau/' || cible_slug || ' · chambre=' || chambre_nom
      || ' · arrivee=' || fin || ' · depart=' || (fin + greatest(min_nuits, 1))
      || ' · voyageurs<=' || capacite,
    'a verifier depuis le site'
  );

  INSERT INTO cas_b_results VALUES (
    'CAS (b)', 'DOIT ETRE REFUSE — dates occupees',
    'chateau=/chateau/' || cible_slug || ' · chambre=' || chambre_nom
      || ' · arrivee=' || base || ' · depart=' || (base + greatest(min_nuits, 1))
      || ' · voyageurs<=' || capacite,
    'a verifier depuis le site'
  );

  INSERT INTO cas_b_results VALUES (
    'CONTRAINTES', 'a respecter pour que le refus vienne bien des DATES',
    'min_stay=' || min_nuits || ' · max_stay=' || coalesce(max_nuits::text, 'aucun')
      || ' · capacite=' || capacite
      || ' · ⚠ plafond 2 demandes pending par email, 3 demandes / 15 min / IP',
    'lire avant de tester'
  );

  SELECT count(*) INTO n_restant
    FROM public.reservations WHERE date_arrivee >= borne;

  INSERT INTO cas_b_results VALUES (
    'A NETTOYER', '⚠ APRES le test site, jouer le bloc de nettoyage en bas du fichier',
    n_restant || ' reservation(s) posee(s) au-dela de ' || borne
      || ' sur la chambre « ' || chambre_nom || ' » de ' || cible_nom,
    CASE WHEN n_restant = 1 THEN 'decor en place'
         ELSE 'FAIL — nombre inattendu, verifier avant de tester' END
  );

END;
$cas_b$;


-- ============================================================
-- RESULTATS — L'UNIQUE SELECT DU FICHIER.
-- Attendu : SETUP et ① et ② en PASS, puis les parametres du test manuel.
-- ⚠ SI LE ① ECHOUE, NE PAS DEPLOYER.
-- ⚠ NE RIEN AJOUTER APRES.
-- ============================================================
SELECT etape, description, result, verdict
FROM cas_b_results
ORDER BY
  CASE etape
    WHEN 'SETUP'       THEN 0
    WHEN '1'           THEN 1
    WHEN '2'           THEN 2
    WHEN 'CAS (a)'     THEN 3
    WHEN 'CAS (b)'     THEN 4
    WHEN 'CONTRAINTES' THEN 5
    ELSE 9
  END;


-- ============================================================
-- ⚠⚠ NETTOYAGE — À JOUER SÉPARÉMENT, APRÈS LE TEST DEPUIS LE SITE.
-- Ce bloc n'est PAS exécuté par le script ci-dessus : copiez-le seul.
--
-- Il retire le décor ET les demandes que le test manuel aura créées (le cas (a)
-- en produit une, avec son compte et ses lignes email_log).
-- ⚠ email_log AVANT reservations : la FK est en ON DELETE SET NULL, l'ordre
--    inverse laisserait des orphelines invisibles au filtre — et une outbox
--    oubliée PARTIRAIT au prochain drain (toutes les 2 minutes).
-- ============================================================
--
-- DELETE FROM public.email_log
--  WHERE reservation_id IN (
--    SELECT id FROM public.reservations WHERE date_arrivee >= (CURRENT_DATE + 795)
--  );
--
-- DELETE FROM public.reservations
--  WHERE date_arrivee >= (CURRENT_DATE + 795);
--
-- -- Contrôle : les deux comptes doivent rendre 0.
-- SELECT
--   (SELECT count(*) FROM public.reservations
--     WHERE date_arrivee >= (CURRENT_DATE + 795))                    AS reservations_restantes,
--   (SELECT count(*) FROM public.email_log e
--      LEFT JOIN public.reservations r ON r.id = e.reservation_id
--     WHERE r.id IS NULL AND e.created_at > NOW() - interval '2 hours') AS email_log_orphelines;
