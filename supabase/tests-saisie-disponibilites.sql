-- ============================================================
-- LCC — TEST : poser_ / retirer_disponibilites + calendrier_edition_chambre
-- ============================================================
--
-- À lancer APRÈS `migrations/2026-08-24-rpc-saisie-disponibilites.sql`
-- (elle-même après `2026-08-24-horizon-ouverture.sql`).
--
-- ⚠⚠ CE TEST ÉCRIT dans `disponibilites` et `reservations`, bascule
-- temporairement `dispo_geree` et `dispo_ouverte_jusqu_a`, puis NETTOIE par
-- `DELETE` ciblé et restaure les deux. Pas de SAVEPOINT (le SQL Editor a déjà
-- sa transaction). ⚠ Idempotent : rejouable sans risque.
--
-- ⚠ UN SEUL SELECT FINAL. La propreté est calculée dans le bloc DO.
--
-- Cible : premier château à ≥ 2 chambres, brouillons d'abord. Dates en
-- CURRENT_DATE + 900 — hors des fenêtres de 2.1 (+490), 2.2/3.1 (+600, +700)
-- et du décor 2.5 (+800). Borne de nettoyage : +890.
--
-- ── CE QU'IL PROUVE ────────────────────────────────────────────────────────
--
--   01-03  poser        7 nuits écrites pour « du 12 au 18 » (BORNES INCLUSES)
--                       · bloquer ferme · rouvrir rouvre
--   04     idempotence  reposer sur la même plage met à jour, ne duplique pas
--   05     prix         un prix posé SURVIT à un blocage ultérieur sans prix
--   06     retirer      la nuit revient à « non renseignée » et retombe
--                       sous l'horizon
--   07-08  bornes       fenêtre inversée LÈVE · > 366 jours LÈVE
--   09     garde        un tiers (ni châtelain ni admin) est refusé en 42501
--   10     édition      ⚠ LA FRONTIÈRE DE L'HORIZON : nuit égale (borne `<=`)
--                       · ligne explicite plus forte que l'horizon · nuit
--                       au-delà sans ligne
--   11     occupation   les nuits vendues, et PAS celle du départ
--   12     ⚠ COHÉRENCE  édition ↔ est_disponible, des DEUX côtés de l'horizon
--
-- ⚠ LE 05 GARDE UNE PERTE DE DONNÉE SILENCIEUSE. `poser_disponibilites`
-- préserve le prix spécial quand on ne le passe pas (COALESCE). Sans cela,
-- bloquer une date effacerait un tarif saisi — sur une colonne que personne ne
-- regarde, donc sans que rien ne le signale.
--
-- ⚠ LE 12 EST LE PLUS IMPORTANT, et c'est le même geste que la parité #142 :
-- on ne relit pas les deux fonctions, on les CONFRONTE. `est_disponible` et
-- `calendrier_edition_chambre` calculent l'occupation avec le MÊME prédicat,
-- copié deux fois, et lisent l'horizon avec le MÊME opérateur `<=`. S'ils
-- divergeaient, l'écran de saisie et le moteur ne diraient pas la même chose de
-- la même nuit — et le châtelain croirait avoir ouvert ce qui reste fermé.
--
-- ⚠ SA FENÊTRE PART DE base+48, PAS DE base+50 : l'horizon vaut base+50, et
-- partir de lui ne couvrait que « = » et « > ». Aucune nuit strictement DANS
-- l'horizon n'était confrontée. Trou relevé à la relecture, pas par un rouge —
-- il ne se serait jamais vu tout seul.
-- ============================================================

DROP TABLE IF EXISTS saisie_results;
CREATE TEMP TABLE saisie_results (
  test_num    text,
  description text,
  result      text,
  verdict     text
);


DO $saisie$
DECLARE
  cible_id     uuid;
  cible_slug   text;
  cible_statut text;
  orig_geree   boolean;
  orig_horizon date;

  chambres uuid[];
  ch1      uuid;
  ch2      uuid;
  client   uuid;
  module_a uuid;
  admin_id uuid;

  base    date := (CURRENT_DATE + 900);
  horizon date := (CURRENT_DATE + 950);
  borne   date := (CURRENT_DATE + 890);

  n        int;
  n2       int;
  v_prix   int;
  v_etat   text;
  ok       boolean;
  divergences int;
  v_geree_fin   boolean;
  v_horizon_fin date;
  n_resid  int;
  n_dispo  int;
BEGIN

  -- ══════════════════════════════════════════════════════════════════════
  -- SETUP
  -- ══════════════════════════════════════════════════════════════════════
  SELECT c.id, c.slug, c.statut::text, c.dispo_geree, c.dispo_ouverte_jusqu_a
    INTO cible_id, cible_slug, cible_statut, orig_geree, orig_horizon
    FROM public.chateaux c
    JOIN public.chambres ch ON ch.chateau_id = c.id
   GROUP BY c.id, c.slug, c.statut, c.dispo_geree, c.dispo_ouverte_jusqu_a
  HAVING count(*) >= 2
   ORDER BY (c.statut = 'publie'), c.slug
   LIMIT 1;

  SELECT array_agg(id ORDER BY id) INTO chambres
    FROM public.chambres WHERE chateau_id = cible_id;
  ch1 := chambres[1];
  ch2 := chambres[2];

  SELECT id INTO client   FROM public.users   WHERE role = 'client' LIMIT 1;
  SELECT id INTO admin_id FROM public.users   WHERE role = 'admin'  LIMIT 1;
  SELECT id INTO module_a FROM public.modules WHERE code = 'A'      LIMIT 1;

  -- Purge d'une execution precedente (idempotence).
  DELETE FROM public.disponibilites
   WHERE chambre_id IN (SELECT id FROM public.chambres WHERE chateau_id = cible_id)
     AND date >= borne;
  DELETE FROM public.reservations WHERE date_arrivee >= borne;

  -- Mode gere + horizon, pour tout le test.
  UPDATE public.chateaux
     SET dispo_geree = true, dispo_ouverte_jusqu_a = horizon
   WHERE id = cible_id;

  -- ⚠ On se pose en ADMIN : la garde des trois RPC est
  --   `is_chatelain_of(chateau) OR is_admin()`. L'admin couvre les deux
  --   chateaux publies et brouillons, quelle que soit la cible tiree.
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', admin_id, 'role', 'authenticated')::text,
                     true);

  INSERT INTO saisie_results VALUES (
    'SETUP', 'cible + 2 chambres + identite admin + mode gere avec horizon',
    coalesce(cible_slug, '(aucune cible)') || ' [' || coalesce(cible_statut, '?') || ']'
      || ' · horizon=' || horizon
      || ' · admin=' || coalesce(admin_id::text, '(aucun)'),
    CASE WHEN cible_id IS NOT NULL AND ch2 IS NOT NULL
              AND admin_id IS NOT NULL AND client IS NOT NULL AND module_a IS NOT NULL
              AND public.is_admin()
         THEN 'PASS' ELSE 'FAIL — pre-requis absents, tests invalides' END
  );

  -- ══════════════════════════════════════════════════════════════════════
  -- 01-03 — POSER : bornes inclusives, bloquer, rouvrir
  -- ══════════════════════════════════════════════════════════════════════

  -- 01 — « du base+12 au base+18 » doit ecrire SEPT nuits, pas six.
  n := public.poser_disponibilites(ch1, base + 12, base + 18, false);
  INSERT INTO saisie_results VALUES (
    '01', 'poser du +12 au +18 -> 7 nuits (BORNES INCLUSES)',
    n || ' nuit(s) ecrite(s)',
    CASE WHEN n = 7 THEN 'PASS'
         WHEN n = 6 THEN 'FAIL — borne de fin EXCLUE : la DERNIERE nuit d une periode bloquee resterait ouverte'
         ELSE 'FAIL — compte inattendu' END
  );

  -- 02 — la plage est effectivement fermee, bord compris.
  INSERT INTO saisie_results VALUES (
    '02', 'les nuits posees a false sont fermees (bords compris)',
    'debut ' || public.est_disponible(ch1, base + 12, base + 13)::text
      || ' · milieu ' || public.est_disponible(ch1, base + 15, base + 16)::text
      || ' · fin ' || public.est_disponible(ch1, base + 18, base + 19)::text,
    CASE WHEN NOT public.est_disponible(ch1, base + 12, base + 13)
          AND NOT public.est_disponible(ch1, base + 15, base + 16)
          AND NOT public.est_disponible(ch1, base + 18, base + 19)
         THEN 'PASS' ELSE 'FAIL — une nuit bloquee reste ouverte' END
  );

  -- 03 — rouvrir explicitement une partie.
  n := public.poser_disponibilites(ch1, base + 15, base + 16, true);
  INSERT INTO saisie_results VALUES (
    '03', 'rouvrir 2 nuits au milieu du blocage',
    n || ' nuit(s) · +15 ouverte=' || public.est_disponible(ch1, base + 15, base + 16)::text
      || ' · +14 toujours fermee=' || (NOT public.est_disponible(ch1, base + 14, base + 15))::text,
    CASE WHEN n = 2
          AND public.est_disponible(ch1, base + 15, base + 16)
          AND NOT public.est_disponible(ch1, base + 14, base + 15)
         THEN 'PASS' ELSE 'FAIL — la reouverture n a pas pris, ou a deborde' END
  );

  -- ══════════════════════════════════════════════════════════════════════
  -- 04 — IDEMPOTENCE : reposer met a jour, ne duplique pas
  -- ══════════════════════════════════════════════════════════════════════
  PERFORM public.poser_disponibilites(ch1, base + 12, base + 18, false);
  SELECT count(*) INTO n
    FROM public.disponibilites
   WHERE chambre_id = ch1 AND date BETWEEN base + 12 AND base + 18;
  INSERT INTO saisie_results VALUES (
    '04', 'reposer la meme plage : mise a jour, pas de doublon',
    n || ' ligne(s) en base pour 7 nuits',
    CASE WHEN n = 7 THEN 'PASS'
         ELSE 'FAIL — ON CONFLICT ne joue pas : lignes dupliquees ou perdues' END
  );

  -- ══════════════════════════════════════════════════════════════════════
  -- 05 — ⚠ LE PRIX SPECIAL SURVIT A UN BLOCAGE SANS PRIX
  -- ══════════════════════════════════════════════════════════════════════
  PERFORM public.poser_disponibilites(ch2, base + 30, base + 31, true, 45000);
  PERFORM public.poser_disponibilites(ch2, base + 30, base + 31, false);   -- sans prix
  SELECT prix_special_cents INTO v_prix
    FROM public.disponibilites WHERE chambre_id = ch2 AND date = base + 30;
  INSERT INTO saisie_results VALUES (
    '05', 'un prix special SURVIT a un blocage ulterieur sans prix',
    'prix apres blocage=' || coalesce(v_prix::text, 'NULL') || ' (pose a 45000)',
    CASE WHEN v_prix = 45000 THEN 'PASS'
         ELSE 'FAIL — ⚠ PERTE SILENCIEUSE : bloquer une date efface le tarif saisi' END
  );

  -- ══════════════════════════════════════════════════════════════════════
  -- 06 — RETIRER : retour a « non renseignee », donc sous l'horizon
  -- ══════════════════════════════════════════════════════════════════════
  n := public.retirer_disponibilites(ch1, base + 12, base + 18);
  SELECT count(*) INTO n2
    FROM public.disponibilites
   WHERE chambre_id = ch1 AND date BETWEEN base + 12 AND base + 18;
  INSERT INTO saisie_results VALUES (
    '06', 'retirer -> non renseignee -> retombe sous l horizon (ouverte)',
    n || ' ligne(s) supprimee(s) · ' || n2 || ' restante(s) · +15 ouverte='
      || public.est_disponible(ch1, base + 15, base + 16)::text,
    CASE WHEN n = 7 AND n2 = 0 AND public.est_disponible(ch1, base + 15, base + 16)
         THEN 'PASS'
         ELSE 'FAIL — suppression incomplete, ou la nuit ne retombe pas sous l horizon' END
  );

  -- ══════════════════════════════════════════════════════════════════════
  -- 07-08 — BORNES : la fonction LEVE, elle ne rend pas 0 en silence
  -- ⚠ Choix inverse d'est_disponible (qui rend false) : la, c'etait un ECRAN
  --   qui interroge ; ici c'est une ECRITURE, et « 0 nuit ecrite » se lirait
  --   « c'est fait » alors que rien ne l'est.
  -- ══════════════════════════════════════════════════════════════════════
  BEGIN
    PERFORM public.poser_disponibilites(ch1, base + 20, base + 10, false);
    INSERT INTO saisie_results VALUES (
      '07', 'fenetre inversee -> doit lever', 'aucune erreur',
      'FAIL — accepte une fenetre inversee'
    );
  EXCEPTION
    WHEN sqlstate '22023' THEN
      INSERT INTO saisie_results VALUES ('07', 'fenetre inversee -> 22023', '22023', 'PASS');
    WHEN OTHERS THEN
      INSERT INTO saisie_results VALUES ('07', 'fenetre inversee', SQLSTATE || ' ' || SQLERRM, 'FAIL — mauvais code');
  END;

  BEGIN
    PERFORM public.poser_disponibilites(ch1, base, base + 400, false);
    INSERT INTO saisie_results VALUES (
      '08', 'fenetre de 400 jours -> doit lever', 'aucune erreur',
      'FAIL — la garde d horizon ne se declenche pas'
    );
  EXCEPTION
    WHEN sqlstate '22023' THEN
      INSERT INTO saisie_results VALUES ('08', 'fenetre de 400 jours -> 22023', '22023', 'PASS');
    WHEN OTHERS THEN
      INSERT INTO saisie_results VALUES ('08', 'fenetre de 400 jours', SQLSTATE || ' ' || SQLERRM, 'FAIL — mauvais code');
  END;

  -- ══════════════════════════════════════════════════════════════════════
  -- 09 — LA GARDE : un tiers est refuse
  -- On endosse l'identite d'un CLIENT (ni chatelain de ce chateau, ni admin).
  -- ══════════════════════════════════════════════════════════════════════
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', client, 'role', 'authenticated')::text,
                     true);
  BEGIN
    PERFORM public.poser_disponibilites(ch1, base + 40, base + 41, false);
    INSERT INTO saisie_results VALUES (
      '09', 'un tiers pose des disponibilites', 'ACCEPTE',
      'FAIL — ⚠ n importe quel compte connecte peut fermer le calendrier d autrui'
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      INSERT INTO saisie_results VALUES ('09', 'un tiers est refuse -> 42501', '42501', 'PASS');
    WHEN OTHERS THEN
      INSERT INTO saisie_results VALUES ('09', 'un tiers', SQLSTATE || ' ' || SQLERRM, 'INVESTIGUER');
  END;
  -- Retour a l'admin pour la suite.
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', admin_id, 'role', 'authenticated')::text,
                     true);

  -- ══════════════════════════════════════════════════════════════════════
  -- 10-12 — LA LECTURE D'EDITION
  -- Decor sur ch1, fenetre [base+50, base+60] :
  --   +51 bloquee (ligne false) · +52 ouverte explicite (ligne true)
  --   +55..+56 VENDUES (reservation confirmed)
  --   le reste sans ligne, DANS l'horizon -> ouverte_horizon
  -- ══════════════════════════════════════════════════════════════════════
  PERFORM public.poser_disponibilites(ch1, base + 51, base + 51, false);
  PERFORM public.poser_disponibilites(ch1, base + 52, base + 52, true);
  INSERT INTO public.reservations
    (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status)
  VALUES (client, ch1, module_a, base + 55, base + 57, 10000, 'confirmed');

  -- 10 — les etats attendus, nuit par nuit.
  --
  -- ⚠ LA FENETRE CHEVAUCHE DELIBEREMENT L'HORIZON, et ce n'est pas un hasard de
  --   decor : l'horizon vaut base + 50 (CURRENT_DATE + 950), la fenetre va de
  --   base + 50 a base + 53. Trois cas d'un coup :
  --
  --     base+50   nuit EGALE a l'horizon, sans ligne   -> ouverte_horizon
  --                 (la borne est INCLUSIVE, <= et non <)
  --     base+51   ligne false, AU-DELA de l'horizon    -> bloquee
  --     base+52   ligne true,  AU-DELA de l'horizon    -> ouverte_explicite
  --                 (une ligne explicite est PLUS FORTE que l'horizon)
  --     base+53   sans ligne,  AU-DELA de l'horizon    -> non_renseignee
  --
  -- ⚠ CE TEST A DEJA SERVI. Sa premiere version attendait `ouverte_horizon` en
  --   position 4 — sur une nuit que le decor placait TROIS JOURS apres
  --   l'horizon. La fonction avait raison, l'assertion avait tort. On garde la
  --   fenetre telle quelle : elle fait de ce test le GARDIEN DE LA FRONTIERE.
  SELECT string_agg(e.etat, ' | ' ORDER BY e.nuit) INTO v_etat
    FROM public.calendrier_edition_chambre(ch1, base + 50, base + 53) AS e;
  INSERT INTO saisie_results VALUES (
    '10', 'frontiere : nuit = horizon | bloquee | ligne true au-dela | hors horizon',
    coalesce(v_etat, '(vide)'),
    CASE WHEN v_etat = 'ouverte_horizon | bloquee | ouverte_explicite | non_renseignee'
         THEN 'PASS'
         WHEN v_etat LIKE 'non_renseignee%'
           THEN 'FAIL — la borne de l horizon est EXCLUSIVE : la nuit egale a l horizon est fermee'
         WHEN v_etat LIKE '%ouverte_horizon'
           THEN 'FAIL — l horizon ne borne rien : une nuit au-dela ressort ouverte'
         WHEN v_etat LIKE '%non_renseignee | non_renseignee'
           THEN 'FAIL — une ligne explicite ne survit pas a l horizon'
         ELSE 'FAIL — les etats ne sont pas ceux attendus' END
  );

  -- 11 — l'occupation domine, et elle est signalee comme telle.
  SELECT count(*) INTO n
    FROM public.calendrier_edition_chambre(ch1, base + 55, base + 56) AS e
   WHERE e.etat = 'vendue' AND e.vendue;
  SELECT count(*) INTO n2
    FROM public.calendrier_edition_chambre(ch1, base + 57, base + 57) AS e
   WHERE e.etat = 'vendue';
  INSERT INTO saisie_results VALUES (
    '11', 'les 2 nuits vendues sont marquees, la nuit du DEPART ne l est pas',
    n || ' nuit(s) vendue(s) sur +55..+56 · ' || n2 || ' sur +57 (jour du depart)',
    CASE WHEN n = 2 AND n2 = 0 THEN 'PASS'
         WHEN n2 > 0 THEN 'FAIL — la borne [) est perdue : le jour du depart est vu occupe'
         ELSE 'FAIL — l occupation n est pas remontee' END
  );

  -- 12 — ⚠ COHERENCE avec est_disponible, nuit par nuit, sur toute la fenetre.
  --      On CONFRONTE les deux fonctions plutot que de relire leurs predicats.
  --
  -- ⚠ LA FENETRE COMMENCE A base+48, ET C'EST DELIBERE. L'horizon vaut base+50 :
  --   partir de base+50 ne couvrait que les cas « = » et « > » de la frontiere,
  --   JAMAIS le cas « < » — aucune nuit strictement DANS l'horizon n'etait
  --   confrontee entre les deux fonctions. Le trou avait ete releve a la
  --   relecture du 24 aout, pas par un rouge : il ne se serait jamais vu.
  --
  --     base+48, base+49   AVANT l'horizon   cas « < »
  --     base+50            SUR l'horizon     cas « = »
  --     base+51 .. base+60 APRES l'horizon   cas « > »
  --
  --   Les trois positions par rapport a la frontiere sont desormais couvertes.
  SELECT count(*) INTO divergences
    FROM public.calendrier_edition_chambre(ch1, base + 48, base + 60) AS e
   WHERE (e.etat IN ('ouverte_explicite', 'ouverte_horizon'))
      <> public.est_disponible(ch1, e.nuit, e.nuit + 1);
  INSERT INTO saisie_results VALUES (
    '12', 'COHERENCE edition <-> est_disponible sur 13 nuits, des DEUX cotes de l horizon',
    divergences || ' divergence(s)',
    CASE WHEN divergences = 0 THEN 'PASS'
         ELSE 'FAIL — ⚠ l ecran de saisie et le moteur ne disent pas la meme chose de la meme nuit' END
  );

  -- ══════════════════════════════════════════════════════════════════════
  -- NETTOYAGE — disponibilites, puis reservations, puis les deux colonnes.
  -- Ces RPC n'ecrivent aucun email : rien d'autre a purger.
  -- ══════════════════════════════════════════════════════════════════════
  DELETE FROM public.disponibilites
   WHERE chambre_id IN (SELECT id FROM public.chambres WHERE chateau_id = cible_id)
     AND date >= borne;

  DELETE FROM public.reservations
   WHERE chambre_id IN (SELECT id FROM public.chambres WHERE chateau_id = cible_id)
     AND date_arrivee >= borne;

  UPDATE public.chateaux
     SET dispo_geree = orig_geree, dispo_ouverte_jusqu_a = orig_horizon
   WHERE id = cible_id;

  SELECT count(*) INTO n_resid  FROM public.reservations   WHERE date_arrivee >= borne;
  SELECT count(*) INTO n_dispo  FROM public.disponibilites WHERE date >= borne;
  SELECT dispo_geree, dispo_ouverte_jusqu_a INTO v_geree_fin, v_horizon_fin
    FROM public.chateaux WHERE id = cible_id;

  INSERT INTO saisie_results VALUES (
    'PROPRETE', 'residus + drapeau et horizon de la cible restaures',
    n_resid || ' reservation(s) · ' || n_dispo || ' ligne(s) disponibilites · '
      || 'dispo_geree=' || v_geree_fin::text
      || ' (origine=' || coalesce(orig_geree::text, 'false') || ')'
      || ' · horizon=' || coalesce(v_horizon_fin::text, 'NULL')
      || ' (origine=' || coalesce(orig_horizon::text, 'NULL') || ')',
    CASE WHEN n_resid = 0 AND n_dispo = 0
          AND v_geree_fin IS NOT DISTINCT FROM orig_geree
          AND v_horizon_fin IS NOT DISTINCT FROM orig_horizon
         THEN 'PASS'
         ELSE 'FAIL — ⚠ residu : purger au-dela de ' || borne
              || ' et restaurer dispo_geree / dispo_ouverte_jusqu_a sur '
              || coalesce(cible_slug, '?') END
  );

END;
$saisie$;


-- ============================================================
-- RESULTATS — L'UNIQUE SELECT DU FICHIER.
-- Attendu : SETUP + les douze tests + PROPRETE, tous en PASS.
-- ⚠ NE RIEN AJOUTER APRES.
-- ============================================================
SELECT test_num, description, result, verdict
FROM saisie_results
ORDER BY
  CASE test_num WHEN 'SETUP' THEN 0 WHEN 'PROPRETE' THEN 9 ELSE 1 END,
  test_num;
