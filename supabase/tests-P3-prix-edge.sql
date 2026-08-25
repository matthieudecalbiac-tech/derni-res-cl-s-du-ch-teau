-- ============================================================
-- LCC — P3 : le prix facturé vient de prix_sejour (demande-reservation § 4)
-- ============================================================
--
-- À lancer APRÈS le commit de P3 et AVANT le déploiement de l'Edge Function
-- (`./node_modules/.bin/supabase functions deploy demande-reservation`).
--
-- ⚠⚠ CE QUE CE SCRIPT NE PROUVE PAS — À LIRE AVANT D'EN CONCLURE QUOI QUE CE
-- SOIT. Il n'exécute PAS le code Deno de l'Edge Function : il prouve la
-- fonction SQL et il PRÉPARE le décor du test manuel, qui est le seul moment
-- où le code de la fonction tourne pour de vrai. C'est exactement le niveau de
-- preuve de 2.5, qui est en production depuis. Le TROU 3 du sous-audit C
-- (aucun test sur supabase/functions/, déploiement manuel) reste ouvert — P3
-- ne l'aggrave pas et ne le comble pas.
--
-- ⚠ UN SEUL SELECT FINAL — le SQL Editor n'affiche que le dernier résultat.
-- Tout, verdicts et paramètres du test manuel, sort par la même table.
--
-- ⚠ IDEMPOTENT : il purge d'abord ce qu'une exécution précédente aurait laissé
-- (les lignes `disponibilites` au-delà de CURRENT_DATE + 890). Le rejouer est
-- sans risque.
--
-- ⚠⚠ CE SCRIPT LAISSE UN PRIX SPÉCIAL EN BASE, VOLONTAIREMENT. C'est le décor
-- du test manuel : sans une nuit à un tarif particulier, l'ancienne formule et
-- la nouvelle donnent le même montant, et le test ne verrait rien. Le nettoyage
-- est un SECOND script, en bas de ce fichier, à jouer APRÈS le test.
--
-- ── CE QU'IL FAIT ──────────────────────────────────────────────────────────
--
--   ①  prouve que `service_role` peut RÉELLEMENT appeler `prix_sejour`
--      (un APPEL, pas une lecture de droit)
--   ②  NEUTRALITÉ : sur TOUT le parc, prix_sejour == ancienne formule
--   ③  prouve que la plage > 366 nuits LÈVE bien 22023 (le chemin de refus)
--   ④  pose un prix_special_cents sur une chambre servie, à dates lointaines,
--      et rend les paramètres du test manuel
--
-- ⚠ ① EST LE VERROU DU DÉPLOIEMENT. Le GRANT à service_role a été posé par la
-- migration P1 et prouvé là-bas ; on le re-prouve ici parce qu'un GRANT peut
-- avoir été perdu depuis (réémission de fonction, restauration). Sans lui,
-- l'appel du § 4 échouerait en 42501 — et, la règle étant le REFUS, PLUS AUCUNE
-- demande ne passerait. Bruyant, contrairement à l'inertie silencieuse qu'aurait
-- produite le même oubli en 2.5 — mais tout aussi évitable.
--
-- ⚠ ② EST LE GARDE-FOU DU DÉCOUPAGE P1→P6. Tant qu'aucun prix_special_cents
-- n'existe, brancher la facturation ne change AUCUN montant. Ce test doit être
-- VERT aujourd'hui, et il deviendra le témoin qui rougit légitimement le jour
-- où un châtelain saisira son premier tarif (P5) — ce jour-là, le lire comme
-- une régression serait un contresens. ⚠ Il est lancé AVANT ④, sans quoi le
-- décor le ferait rougir lui-même.
--
-- ── LA CIBLE ───────────────────────────────────────────────────────────────
--
-- Choisie dynamiquement, avec EXACTEMENT les mêmes gardes que l'Edge Function
-- (§ 3 et § 5) : château `publie` ET `sur_place`, module A actif, une chambre.
-- Le test manuel ne peut donc pas échouer pour une autre raison que celle
-- qu'on veut voir.
--
-- ⚠ LA LIGNE SETUP NOMME LA CIBLE RETENUE ET SON ÉTAT. La lire d'abord : la
-- cible est dynamique, et un rouge s'interprète à partir d'elle. Elle rend
-- aussi `dispo_geree` — si la cible était un château géré, le § 3 bis de
-- l'Edge Function refuserait sur les dates AVANT d'atteindre le § 4, et le
-- test manuel échouerait pour une raison qui n'a rien à voir avec le prix.
--
-- ⚠ LES DATES SONT À +900 JOURS, hors des fenêtres des tests 2.1 (+490),
-- 2.2 (+600), 2.3 (+700) et 2.5 (+795/800), et hors de tout séjour plausible.
-- ============================================================

DROP TABLE IF EXISTS p3_results;
CREATE TEMP TABLE p3_results (
  etape       text,
  description text,
  result      text,
  verdict     text
);


DO $p3$
DECLARE
  cible_id     uuid;
  cible_slug   text;
  cible_nom    text;
  cible_geree  boolean;
  chambre_id   uuid;
  chambre_nom  text;
  base_cents   integer;
  menage_cents integer;
  min_nuits    int;
  max_nuits    int;

  -- Décor : fenêtre lointaine, longueur ajustée aux règles de la chambre.
  d0        date := (CURRENT_DATE + 900);
  n_nuits   int;
  d_fin     date;
  borne     date := (CURRENT_DATE + 890);

  SPECIAL   constant integer := 77700;   -- 777,00 € — valeur reconnaissable

  appel_ok   integer;
  n_purge    int;
  n_pose     int;

  -- ② neutralité
  r          record;
  n_total    int := 0;
  n_egaux    int := 0;
  n_ecarts   int := 0;
  n_erreurs  int := 0;
  premier_ecart text := NULL;
  calc       integer;
  attendu    integer;

  -- ④
  total_neuf integer;
  total_vieux integer;
BEGIN

  -- ══════════════════════════════════════════════════════════════════════
  -- PURGE d'une execution precedente (idempotence)
  -- ══════════════════════════════════════════════════════════════════════
  DELETE FROM public.disponibilites WHERE date >= borne;
  GET DIAGNOSTICS n_purge = ROW_COUNT;

  -- ══════════════════════════════════════════════════════════════════════
  -- CIBLE — memes gardes que demande-reservation (§ 3 et § 5)
  -- ══════════════════════════════════════════════════════════════════════
  SELECT c.id, c.slug, c.nom, c.dispo_geree,
         ch.id, ch.nom, ch.prix_cents, COALESCE(ch.cleaning_fee_cents, 0),
         ch.min_stay_nights, ch.max_stay_nights
    INTO cible_id, cible_slug, cible_nom, cible_geree,
         chambre_id, chambre_nom, base_cents, menage_cents,
         min_nuits, max_nuits
    FROM public.chateaux c
    JOIN public.chambres ch        ON ch.chateau_id = c.id
    JOIN public.chateau_modules cm ON cm.chateau_id = c.id AND cm.est_actif
    JOIN public.modules m          ON m.id = cm.module_id AND m.code = 'A'
   WHERE c.statut = 'publie'
     AND c.mode_paiement = 'sur_place'
   ORDER BY c.slug, ch.nom
   LIMIT 1;

  -- Longueur du sejour : au moins 3 nuits, au moins min_stay, jamais au-dela
  -- de max_stay. ⚠ Calculee, pas supposee — une chambre a min_stay = 4 ferait
  -- refuser la demande en § 3, et l'on croirait a un defaut de prix.
  n_nuits := GREATEST(3, COALESCE(min_nuits, 1));
  IF max_nuits IS NOT NULL THEN n_nuits := LEAST(n_nuits, max_nuits); END IF;
  d_fin := d0 + n_nuits;

  INSERT INTO p3_results VALUES (
    'SETUP', 'chateau servi (publie + sur_place + module A actif) + chambre',
    coalesce(cible_slug, '(aucun chateau servi avec chambre)')
      || ' · chambre=' || coalesce(chambre_nom, '?')
      || ' · base=' || coalesce(base_cents, 0)
      || ' · menage=' || coalesce(menage_cents, 0)
      || ' · min/max nuits=' || coalesce(min_nuits::text, '-') || '/' || coalesce(max_nuits::text, '-')
      || ' · dispo_geree=' || coalesce(cible_geree::text, '?')
      || ' · purge prealable=' || n_purge || ' ligne(s)',
    CASE WHEN cible_id IS NULL OR chambre_id IS NULL THEN 'FAIL — pre-requis absents'
         WHEN cible_geree THEN 'FAIL — cible GEREE : le § 3 bis refusera avant le § 4'
         ELSE 'PASS' END
  );

  IF cible_id IS NULL OR chambre_id IS NULL THEN
    RETURN;
  END IF;

  -- ══════════════════════════════════════════════════════════════════════
  -- ① LE GRANT A-T-IL PRIS ? Un APPEL, pas une lecture de droit.
  -- ══════════════════════════════════════════════════════════════════════
  -- ⚠ has_function_privilege dit le DROIT ; seul un appel dit le FAIT.
  BEGIN
    SET LOCAL ROLE service_role;
    appel_ok := public.prix_sejour(chambre_id, d0, d0 + 1);
    RESET ROLE;

    INSERT INTO p3_results VALUES (
      '1', 'appel de prix_sejour SOUS service_role (1 nuit)',
      'retour=' || coalesce(appel_ok::text, '(null)') || ' cents',
      CASE WHEN appel_ok IS NOT NULL AND appel_ok > 0 THEN 'PASS'
           ELSE 'FAIL — retour nul ou <= 0' END
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      RESET ROLE;
      INSERT INTO p3_results VALUES (
        '1', 'appel de prix_sejour SOUS service_role (1 nuit)',
        'SQLSTATE 42501 — EXECUTE refuse',
        'FAIL — NE PAS DEPLOYER : toute demande serait refusee'
      );
  END;

  -- ══════════════════════════════════════════════════════════════════════
  -- ② NEUTRALITE — sur TOUT le parc, avant de poser le decor
  -- ══════════════════════════════════════════════════════════════════════
  -- ancienne formule (demande-reservation:289, avant P3) :
  --     nbNuits * prix_cents + COALESCE(cleaning_fee_cents, 0)
  -- ⚠ Elle est RECOPIEE ICI a la main, delibererement : le test CONFRONTE deux
  --   formules ecrites independamment, il ne relit pas la fonction. C'est le
  --   geste de la parite #142, applique a l'argent.
  FOR r IN
    SELECT id, nom, prix_cents, COALESCE(cleaning_fee_cents, 0) AS menage
      FROM public.chambres
     ORDER BY nom
  LOOP
    n_total := n_total + 1;
    BEGIN
      calc    := public.prix_sejour(r.id, d0, d0 + 3);
      attendu := 3 * r.prix_cents + r.menage;
      IF calc = attendu THEN
        n_egaux := n_egaux + 1;
      ELSE
        n_ecarts := n_ecarts + 1;
        IF premier_ecart IS NULL THEN
          premier_ecart := r.nom || ' : ancienne ' || attendu || ' != prix_sejour ' || calc;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      n_erreurs := n_erreurs + 1;
      IF premier_ecart IS NULL THEN
        premier_ecart := r.nom || ' : ' || SQLSTATE || ' ' || SQLERRM;
      END IF;
    END;
  END LOOP;

  INSERT INTO p3_results VALUES (
    '2', 'NEUTRALITE — prix_sejour == ancienne formule, sur 3 nuits, TOUT le parc',
    n_egaux || '/' || n_total || ' identiques · ecarts=' || n_ecarts
      || ' · erreurs=' || n_erreurs
      || coalesce(' · ' || premier_ecart, ''),
    CASE WHEN n_total > 0 AND n_ecarts = 0 AND n_erreurs = 0 THEN 'PASS'
         ELSE 'FAIL — la bascule P3 CHANGERAIT des montants' END
  );

  -- ══════════════════════════════════════════════════════════════════════
  -- ③ LE CHEMIN DE REFUS — une plage > 366 nuits LEVE bien 22023
  -- ══════════════════════════════════════════════════════════════════════
  -- ⚠ C'est ce que le test manuel « demande de plus de 366 nuits » declenchera.
  --   AUCUNE chambre du parc ne porte de max_stay_nights : la plage franchit
  --   donc toutes les gardes du § 2 de l'Edge Function et arrive au § 4.
  BEGIN
    calc := public.prix_sejour(chambre_id, d0, d0 + 400);
    INSERT INTO p3_results VALUES (
      '3', 'plage de 400 nuits — doit LEVER 22023',
      'AUCUNE exception, retour=' || calc,
      'FAIL — le chemin de refus du § 4 ne serait pas atteint'
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO p3_results VALUES (
      '3', 'plage de 400 nuits — doit LEVER 22023',
      'leve : ' || SQLSTATE || ' — ' || SQLERRM,
      CASE WHEN SQLSTATE = '22023' THEN 'PASS'
           ELSE 'FAIL — leve, mais pas en 22023 (le § 4 rendrait 500 au lieu de 400)' END
    );
  END;

  -- ══════════════════════════════════════════════════════════════════════
  -- ④ LE DECOR — un prix special sur les nuits du sejour de test
  -- ══════════════════════════════════════════════════════════════════════
  -- ⚠ est_disponible = true EXPLICITEMENT. Une ligne a false fermerait les
  --   dates, et le § 3 bis de l'Edge Function refuserait AVANT le § 4 : on
  --   testerait la disponibilite en croyant tester le prix.
  INSERT INTO public.disponibilites (chambre_id, date, est_disponible, prix_special_cents, note_interne)
  SELECT chambre_id, g.nuit::date, true, SPECIAL, 'decor test P3 — prix facture'
    FROM generate_series(d0, d_fin - 1, interval '1 day') AS g(nuit)
  ON CONFLICT (chambre_id, date) DO UPDATE
     SET est_disponible = true, prix_special_cents = SPECIAL;
  GET DIAGNOSTICS n_pose = ROW_COUNT;

  total_neuf  := public.prix_sejour(chambre_id, d0, d_fin);
  total_vieux := n_nuits * base_cents + menage_cents;

  INSERT INTO p3_results VALUES (
    '4', 'DECOR pose — les deux formules doivent DIVERGER',
    n_pose || ' nuit(s) a ' || SPECIAL || ' cents'
      || ' · prix_sejour=' || total_neuf
      || ' · ancienne formule=' || total_vieux,
    CASE WHEN total_neuf = n_nuits * SPECIAL + menage_cents AND total_neuf <> total_vieux
         THEN 'PASS'
         ELSE 'FAIL — le prix special n''est pas pris en compte' END
  );

  -- ══════════════════════════════════════════════════════════════════════
  -- LES PARAMETRES DU TEST MANUEL
  -- ══════════════════════════════════════════════════════════════════════
  INSERT INTO p3_results VALUES (
    'MANUEL a', 'demande NORMALE depuis le formulaire — le montant doit etre celui-ci',
    '/chateau/' || cible_slug || ' · chambre « ' || chambre_nom || ' »'
      || ' · du ' || d0 || ' au ' || d_fin
      || ' · ATTENDU ' || to_char(total_neuf / 100.0, 'FM999G999D00') || ' EUR'
      || '   (l''ancienne formule aurait donne ' || to_char(total_vieux / 100.0, 'FM999G999D00') || ' EUR)',
    'a verifier a l''ecran, puis en base :'
      || ' SELECT prix_total_cents FROM reservations ORDER BY created_at DESC LIMIT 1;  -- doit valoir '
      || total_neuf
  );

  INSERT INTO p3_results VALUES (
    'MANUEL b', 'demande de PLUS DE 366 NUITS — doit etre REFUSEE (400), rien en base',
    '/chateau/' || cible_slug || ' · meme chambre'
      || ' · du ' || d0 || ' au ' || (d0 + 400)
      || ' · ATTENDU : « Les dates de sejour sont invalides. »',
    'aucune ligne ne doit apparaitre dans reservations ; le log de la fonction doit dire « demande REFUSEE (plage invalide) »'
  );

END $p3$;


-- ⚠ LE SEUL SELECT DU FICHIER.
SELECT * FROM p3_results ORDER BY etape;


-- ============================================================
-- NETTOYAGE — À JOUER APRÈS LE TEST MANUEL (décommenter)
-- ============================================================
--
-- ⚠ DEUX BLOCS, comme pour 2.5. Le premier retire les demandes créées depuis
-- le site et LAISSE le décor (on peut rejouer le test manuel) ; le second
-- retire tout, décor compris.
--
-- ── BLOC 1 — entre deux essais : les demandes seulement ──────────────────
--
-- DELETE FROM public.email_log
--  WHERE reservation_id IN (
--    SELECT id FROM public.reservations
--     WHERE date_arrivee >= (CURRENT_DATE + 890) AND status = 'pending'
--  );
--
-- DELETE FROM public.reservations
--  WHERE date_arrivee >= (CURRENT_DATE + 890) AND status = 'pending';
--
-- -- Contrôle : aucune demande résiduelle, le décor intact.
-- SELECT
--   (SELECT count(*) FROM public.reservations
--     WHERE date_arrivee >= (CURRENT_DATE + 890))                       AS demandes_doit_etre_0,
--   (SELECT count(*) FROM public.disponibilites
--     WHERE date >= (CURRENT_DATE + 890) AND prix_special_cents IS NOT NULL) AS decor_doit_rester;
--
--
-- ── BLOC 2 — TOTAL : décor compris ───────────────────────────────────────
-- ⚠ À NE PAS OUBLIER. Un prix spécial laissé en base ferait rougir le test ②
-- de ce même fichier au prochain passage — et, pire, il ferait payer 777,00 €
-- la nuit à un visiteur qui demanderait ces dates.
--
-- DELETE FROM public.email_log
--  WHERE reservation_id IN (
--    SELECT id FROM public.reservations WHERE date_arrivee >= (CURRENT_DATE + 890)
--  );
--
-- DELETE FROM public.reservations WHERE date_arrivee >= (CURRENT_DATE + 890);
-- DELETE FROM public.disponibilites WHERE date >= (CURRENT_DATE + 890);
--
-- -- Contrôle : les trois comptes doivent rendre 0.
-- SELECT
--   (SELECT count(*) FROM public.reservations
--     WHERE date_arrivee >= (CURRENT_DATE + 890))                        AS reservations_restantes,
--   (SELECT count(*) FROM public.disponibilites
--     WHERE date >= (CURRENT_DATE + 890))                                AS decor_restant,
--   (SELECT count(*) FROM public.email_log e
--      LEFT JOIN public.reservations r ON r.id = e.reservation_id
--     WHERE r.id IS NULL AND e.created_at > NOW() - interval '2 hours')  AS email_log_orphelines;
