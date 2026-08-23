-- ============================================================
-- LCC — TEST : jours_disponibles_chambre / _chateau (moteur 2.3)
-- ============================================================
--
-- À lancer APRÈS `migrations/2026-08-23-jours-disponibles.sql`.
--
-- ⚠⚠ CE TEST ÉCRIT DANS `reservations` ET `disponibilites`, bascule
-- temporairement `chateaux.dispo_geree`, puis NETTOIE par `DELETE` ciblé et
-- restaure le drapeau. Pas de SAVEPOINT (le SQL Editor a déjà sa transaction).
-- ⚠ Idempotent : rejouable sans risque.
--
-- ⚠ UN SEUL SELECT FINAL — le SQL Editor n'affiche que le DERNIER résultat.
-- La propreté est calculée dans le bloc DO. Ne rien ajouter après.
--
-- Cible découverte dynamiquement : premier château à AU MOINS DEUX chambres,
-- brouillons d'abord. Dates : CURRENT_DATE + 700 et au-delà — hors des fenêtres
-- des tests 2.1 (+490) et 2.2 (+600). Borne de nettoyage : +690.
--
-- ── CE QU'IL PROUVE ────────────────────────────────────────────────────────
--
--   01-03  réservation      les nuits occupées sortent du calendrier,
--                           et la NUIT DU DÉPART est rendue (borne '[)')
--   04     mode géré        seules les nuits explicitement ouvertes ressortent
--   05-06  niveau château   une chambre libre suffit / toutes prises ferme
--   07     ⚠ COHÉRENCE 2.2  est_disponible(A,D) <=> les D-A nuits [A, D-1]
--                           sont toutes dans le calendrier
--   08     ⚠⚠ LE PIÈGE      deux nuits ouvertes au niveau château, et pourtant
--                           AUCUNE chambre ne couvre le séjour
--   09-11  bornes           fenêtre > 366 lève · fenêtre inversée = vide
--                           · nuits passées exclues
--
-- ⚠ LE TEST 07 EST LE PENDANT DU TEST DE PARITÉ DE 2.2. Là-bas on confrontait la
-- fonction à la CONTRAINTE ; ici on confronte les deux FONCTIONS entre elles. Le
-- décalage d'un jour (`D` au lieu de `D - 1`) est l'erreur la plus probable de
-- toute cette étape : on ne dort pas le soir du départ, et une comparaison faite
-- « à l'œil » ne le rattrape pas.
--
-- ⚠⚠ LE TEST 08 NE CHERCHE PAS UN DÉFAUT — IL FIXE UN COMPORTEMENT. Le
-- calendrier château rend les nuits où au moins une chambre est libre, chambre
-- qui peut changer d'une nuit à l'autre. Il ne promet donc pas un séjour. Ce test
-- écrit ce fait pour qu'on ne le « corrige » pas un jour par erreur.
-- ============================================================

DROP TABLE IF EXISTS jours_results;
CREATE TEMP TABLE jours_results (
  test_num    text,
  description text,
  result      text,
  verdict     text
);
GRANT INSERT, SELECT ON jours_results TO authenticated, anon;


DO $jours$
DECLARE
  cible_id     uuid;
  cible_slug   text;
  cible_statut text;
  orig_geree   boolean;

  chambres uuid[];
  ch1      uuid;
  ch2      uuid;

  client   uuid;
  module_a uuid;

  base  date := (CURRENT_DATE + 700);
  borne date := (CURRENT_DATE + 690);

  v_jours date[];
  n       int;
  n_att   int;
  e_obt   boolean;
  ch_dispo boolean;
  t       record;
  tous_coherents boolean := true;
  detail  text := '';

  n_resid int;
  n_dispo int;
  v_geree_fin boolean;
BEGIN

  -- ══════════════════════════════════════════════════════════════════════
  -- SETUP
  -- ══════════════════════════════════════════════════════════════════════
  SELECT c.id, c.slug, c.statut::text, c.dispo_geree
    INTO cible_id, cible_slug, cible_statut, orig_geree
    FROM public.chateaux c
    JOIN public.chambres ch ON ch.chateau_id = c.id
   GROUP BY c.id, c.slug, c.statut, c.dispo_geree
  HAVING count(*) >= 2
   ORDER BY (c.statut = 'publie'), c.slug
   LIMIT 1;

  SELECT array_agg(id ORDER BY id) INTO chambres
    FROM public.chambres WHERE chateau_id = cible_id;
  ch1 := chambres[1];
  ch2 := chambres[2];

  SELECT id INTO client   FROM public.users   WHERE role = 'client' LIMIT 1;
  SELECT id INTO module_a FROM public.modules WHERE code = 'A'      LIMIT 1;

  INSERT INTO jours_results VALUES (
    'SETUP', 'cible + 2 chambres + client + module A',
    coalesce(cible_slug, '(aucun chateau a 2 chambres)')
      || ' [' || coalesce(cible_statut, '?') || ']'
      || ' · ' || coalesce(array_length(chambres, 1), 0) || ' chambre(s)'
      || ' · dispo_geree d origine=' || coalesce(orig_geree::text, '(null)')
      || ' · base=' || base,
    CASE WHEN cible_id IS NOT NULL AND ch2 IS NOT NULL
              AND client IS NOT NULL AND module_a IS NOT NULL
         THEN 'PASS' ELSE 'FAIL — pre-requis absents, tests invalides' END
  );

  UPDATE public.chateaux SET dispo_geree = false WHERE id = cible_id;

  -- ══════════════════════════════════════════════════════════════════════
  -- 01-03 — RESERVATION : ch1 confirmee sur [base+10, base+13)
  -- Nuits occupees : base+10, base+11, base+12. La nuit base+13 est LIBRE.
  -- ══════════════════════════════════════════════════════════════════════
  INSERT INTO public.reservations
    (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status)
  VALUES (client, ch1, module_a, base + 10, base + 13, 10000, 'confirmed');

  SELECT array_agg(jour ORDER BY jour) INTO v_jours
    FROM public.jours_disponibles_chambre(ch1, base, base + 20) AS t(jour);
  n := coalesce(array_length(v_jours, 1), 0);

  INSERT INTO jours_results VALUES (
    '01', 'fenetre de 21 nuits, 3 occupees -> 18 rendues',
    n || ' nuit(s) rendue(s) sur 21',
    CASE WHEN n = 18 THEN 'PASS' ELSE 'FAIL — attendu 18' END
  );

  INSERT INTO jours_results VALUES (
    '02', 'les 3 nuits occupees sont ABSENTES',
    'base+10 ' || ((base + 10) = ANY(v_jours))::text
      || ' · base+11 ' || ((base + 11) = ANY(v_jours))::text
      || ' · base+12 ' || ((base + 12) = ANY(v_jours))::text,
    CASE WHEN NOT ((base + 10) = ANY(v_jours))
          AND NOT ((base + 11) = ANY(v_jours))
          AND NOT ((base + 12) = ANY(v_jours))
         THEN 'PASS' ELSE 'FAIL — une nuit vendue est affichee comme libre' END
  );

  INSERT INTO jours_results VALUES (
    '03', 'la NUIT DU DEPART est rendue (borne [) )',
    'base+13 present=' || ((base + 13) = ANY(v_jours))::text,
    CASE WHEN (base + 13) = ANY(v_jours) THEN 'PASS'
         ELSE 'FAIL — la borne [) est perdue : on ferme une nuit libre a chaque depart' END
  );

  -- ══════════════════════════════════════════════════════════════════════
  -- 07 — COHERENCE avec est_disponible (fait ici, la reservation est en place)
  -- est_disponible(A, D) <=> jours_disponibles_chambre(A, D-1) compte D-A nuits.
  -- ══════════════════════════════════════════════════════════════════════
  FOR t IN
    SELECT * FROM (VALUES
      ('plage libre',                 base + 1,  base + 4),
      ('plage chevauchant la resa',   base + 9,  base + 12),
      ('plage adjacente (depuis le depart)', base + 13, base + 15)
    ) AS v(descr, a, d)
  LOOP
    e_obt := public.est_disponible(ch1, t.a, t.d);
    SELECT count(*) INTO n
      FROM public.jours_disponibles_chambre(ch1, t.a, t.d - 1) AS x(jour);
    n_att := t.d - t.a;

    IF e_obt <> (n = n_att) THEN
      tous_coherents := false;
    END IF;
    detail := detail || t.descr || ': est_disponible=' || e_obt
                     || ' nuits=' || n || '/' || n_att || ' · ';
  END LOOP;

  INSERT INTO jours_results VALUES (
    '07', 'COHERENCE 2.2 <-> 2.3 sur 3 plages', detail,
    CASE WHEN tous_coherents THEN 'PASS'
         ELSE 'FAIL — ⚠ les deux fonctions ne disent pas la meme chose. Suspect n 1 : le decalage D vs D-1 (on ne dort pas le soir du depart).' END
  );

  -- ══════════════════════════════════════════════════════════════════════
  -- 04 — MODE GERE : [base+30, base+35], six nuits candidates.
  --   base+30 true · base+31 true · base+32 FALSE · base+33 true
  --   base+34 et base+35 : AUCUNE LIGNE
  -- Attendu : {30, 31, 33}
  -- ══════════════════════════════════════════════════════════════════════
  UPDATE public.chateaux SET dispo_geree = true WHERE id = cible_id;

  INSERT INTO public.disponibilites (chambre_id, date, est_disponible) VALUES
    (ch1, base + 30, true),
    (ch1, base + 31, true),
    (ch1, base + 32, false),
    (ch1, base + 33, true);

  SELECT array_agg(jour ORDER BY jour) INTO v_jours
    FROM public.jours_disponibles_chambre(ch1, base + 30, base + 35) AS t(jour);

  INSERT INTO jours_results VALUES (
    '04', 'mode gere : seules les nuits ouvertes ressortent',
    coalesce(array_to_string(v_jours, ', '), '(vide)')
      || '  [attendu ' || (base + 30) || ', ' || (base + 31) || ', ' || (base + 33) || ']',
    CASE WHEN v_jours = ARRAY[base + 30, base + 31, base + 33]::date[] THEN 'PASS'
         WHEN (base + 32) = ANY(coalesce(v_jours, ARRAY[]::date[]))
           THEN 'FAIL — une nuit est_disponible=false ressort'
         WHEN (base + 34) = ANY(coalesce(v_jours, ARRAY[]::date[]))
           THEN 'FAIL — une nuit SANS LIGNE ressort : c est l opt-OUT, pas la decision du 23 aout'
         ELSE 'FAIL — ensemble inattendu' END
  );

  UPDATE public.chateaux SET dispo_geree = false WHERE id = cible_id;

  -- ══════════════════════════════════════════════════════════════════════
  -- 05-06 — NIVEAU CHATEAU
  -- ══════════════════════════════════════════════════════════════════════

  -- 05 — ch1 prise sur [base+40, base+42), ch2 (et les autres) libres.
  INSERT INTO public.reservations
    (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status)
  VALUES (client, ch1, module_a, base + 40, base + 42, 10000, 'confirmed');

  SELECT array_agg(jour ORDER BY jour) INTO v_jours
    FROM public.jours_disponibles_chateau(cible_id, base + 40, base + 41) AS t(jour);

  INSERT INTO jours_results VALUES (
    '05', 'une chambre prise, une autre libre -> les 2 nuits ressortent',
    coalesce(array_to_string(v_jours, ', '), '(vide)'),
    CASE WHEN v_jours = ARRAY[base + 40, base + 41]::date[] THEN 'PASS'
         ELSE 'FAIL — une seule chambre occupee ferme la nuit du chateau entier' END
  );

  -- 06 — TOUTES les chambres prises la nuit base+50.
  INSERT INTO public.reservations
    (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status)
  SELECT client, ch.id, module_a, base + 50, base + 51, 10000, 'confirmed'
    FROM public.chambres ch WHERE ch.chateau_id = cible_id;

  SELECT array_agg(jour ORDER BY jour) INTO v_jours
    FROM public.jours_disponibles_chateau(cible_id, base + 50, base + 50) AS t(jour);

  INSERT INTO jours_results VALUES (
    '06', 'toutes les chambres prises -> la nuit ne ressort pas',
    coalesce(array_to_string(v_jours, ', '), '(vide)'),
    CASE WHEN v_jours IS NULL THEN 'PASS'
         ELSE 'FAIL — nuit affichee libre alors qu aucune chambre ne l est' END
  );

  -- ══════════════════════════════════════════════════════════════════════
  -- 08 — ⚠⚠ LE PIEGE DU CALENDRIER CHATEAU. Comportement VOULU, fixe par ce test.
  --   nuit base+60 : ch1 libre, ch2 prise (+ toutes les autres prises)
  --   nuit base+61 : ch1 prise, ch2 libre (+ toutes les autres prises)
  --   -> les DEUX nuits ressortent du calendrier
  --   -> et pourtant chateau_disponible(base+60, base+62) = FAUX
  -- ══════════════════════════════════════════════════════════════════════
  INSERT INTO public.reservations
    (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status)
  VALUES (client, ch2, module_a, base + 60, base + 61, 10000, 'confirmed'),   -- ch2 prise nuit 60
         (client, ch1, module_a, base + 61, base + 62, 10000, 'confirmed');   -- ch1 prise nuit 61

  -- Les eventuelles AUTRES chambres sont prises les deux nuits, pour que le
  -- scenario tienne quel que soit le nombre de chambres du chateau.
  INSERT INTO public.reservations
    (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status)
  SELECT client, ch.id, module_a, base + 60, base + 62, 10000, 'confirmed'
    FROM public.chambres ch
   WHERE ch.chateau_id = cible_id AND ch.id NOT IN (ch1, ch2);

  SELECT array_agg(jour ORDER BY jour) INTO v_jours
    FROM public.jours_disponibles_chateau(cible_id, base + 60, base + 61) AS t(jour);
  ch_dispo := public.chateau_disponible(cible_id, base + 60, base + 62);

  INSERT INTO jours_results VALUES (
    '08', 'PIEGE VOULU : 2 nuits ouvertes, aucun sejour possible',
    'calendrier=' || coalesce(array_to_string(v_jours, ', '), '(vide)')
      || ' · chateau_disponible(60,62)=' || ch_dispo::text,
    CASE WHEN v_jours = ARRAY[base + 60, base + 61]::date[] AND NOT ch_dispo THEN 'PASS'
         WHEN ch_dispo
           THEN 'FAIL — ⚠ chateau_disponible ouvre un sejour qu aucune chambre ne couvre : ce serait une SURVENTE'
         ELSE 'FAIL — le calendrier devrait rendre les 2 nuits (au moins une chambre libre chaque soir)' END
  );

  -- ══════════════════════════════════════════════════════════════════════
  -- 09-11 — BORNES
  -- ══════════════════════════════════════════════════════════════════════

  -- 09 — au-dela de 366 jours : LEVE (un ensemble vide se lirait « rien de libre »)
  BEGIN
    PERFORM count(*) FROM public.jours_disponibles_chambre(ch1, base, base + 400) AS t(jour);
    INSERT INTO jours_results VALUES (
      '09', 'fenetre de 400 jours -> doit lever 22023', 'aucune erreur',
      'FAIL — la garde d horizon ne se declenche pas'
    );
  EXCEPTION
    WHEN sqlstate '22023' THEN
      INSERT INTO jours_results VALUES (
        '09', 'fenetre de 400 jours -> 22023', '22023 leve', 'PASS'
      );
    WHEN OTHERS THEN
      INSERT INTO jours_results VALUES (
        '09', 'fenetre de 400 jours', SQLSTATE || ' ' || SQLERRM, 'FAIL — mauvais code d erreur'
      );
  END;

  -- 10 — fenetre INVERSEE : ensemble vide, SANS erreur (un intervalle vide n'a
  --      legitimement aucune nuit — rien d'ambigu a signaler).
  BEGIN
    SELECT count(*) INTO n
      FROM public.jours_disponibles_chambre(ch1, base + 10, base + 5) AS t(jour);
    INSERT INTO jours_results VALUES (
      '10', 'fenetre inversee -> ensemble vide, sans erreur', n || ' nuit(s)',
      CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL — des nuits sortent d un intervalle vide' END
    );
  EXCEPTION
    WHEN OTHERS THEN
      INSERT INTO jours_results VALUES (
        '10', 'fenetre inversee', SQLSTATE || ' ' || SQLERRM,
        'FAIL — leve alors qu un intervalle vide n a rien d ambigu'
      );
  END;

  -- 11 — les nuits PASSEES sont exclues (borne heritee d'est_disponible).
  SELECT count(*) INTO n
    FROM public.jours_disponibles_chambre(ch1, CURRENT_DATE - 5, CURRENT_DATE + 1) AS t(jour)
   WHERE jour < CURRENT_DATE;

  INSERT INTO jours_results VALUES (
    '11', 'aucune nuit passee dans le resultat', n || ' nuit(s) passee(s)',
    CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL — le calendrier propose des dates revolues' END
  );

  -- ══════════════════════════════════════════════════════════════════════
  -- NETTOYAGE — disponibilites, puis reservations, puis le drapeau.
  -- Ces fonctions n'ecrivent rien et ne declenchent aucun email : il n'y a que
  -- ce que le test a lui-meme insere.
  -- ══════════════════════════════════════════════════════════════════════
  DELETE FROM public.disponibilites
   WHERE chambre_id IN (SELECT id FROM public.chambres WHERE chateau_id = cible_id)
     AND date >= borne;

  DELETE FROM public.reservations
   WHERE chambre_id IN (SELECT id FROM public.chambres WHERE chateau_id = cible_id)
     AND user_id = client
     AND date_arrivee >= borne;

  UPDATE public.chateaux SET dispo_geree = orig_geree WHERE id = cible_id;

  SELECT count(*) INTO n_resid
    FROM public.reservations WHERE date_arrivee >= borne;
  SELECT count(*) INTO n_dispo
    FROM public.disponibilites WHERE date >= borne;
  SELECT dispo_geree INTO v_geree_fin FROM public.chateaux WHERE id = cible_id;

  INSERT INTO jours_results VALUES (
    'PROPRETE', 'residus + drapeau de la cible restaure',
    n_resid || ' reservation(s) · ' || n_dispo || ' ligne(s) disponibilites · '
      || 'cible dispo_geree=' || v_geree_fin::text
      || ' (origine=' || coalesce(orig_geree::text, 'false') || ')',
    CASE WHEN n_resid = 0 AND n_dispo = 0 AND v_geree_fin IS NOT DISTINCT FROM orig_geree
         THEN 'PASS'
         ELSE 'FAIL — ⚠ residu : supprimer les lignes au-dela de ' || borne
              || ' et remettre dispo_geree a ' || coalesce(orig_geree::text, 'false')
              || ' sur ' || coalesce(cible_slug, '?') END
  );

END;
$jours$;


-- ============================================================
-- RESULTATS — L'UNIQUE SELECT DU FICHIER.
-- Attendu : SETUP + les onze tests + PROPRETE, tous en PASS.
-- ⚠ NE RIEN AJOUTER APRES.
-- ============================================================
SELECT test_num, description, result, verdict
FROM jours_results
ORDER BY
  CASE test_num WHEN 'SETUP' THEN 0 WHEN 'PROPRETE' THEN 9 ELSE 1 END,
  test_num;
