-- ============================================================
-- LCC — TEST : est_disponible / chateau_disponible (moteur 2.2)
-- ============================================================
--
-- À lancer APRÈS `migrations/2026-08-23-est-disponible.sql`.
--
-- ⚠⚠ CE TEST ÉCRIT DANS `reservations` ET `disponibilites`, bascule
-- temporairement `chateaux.dispo_geree`, puis NETTOIE par `DELETE` ciblé et
-- restaure le drapeau. Pas de SAVEPOINT : le SQL Editor enveloppe déjà ses
-- instructions dans sa propre transaction, un ROLLBACK emporterait la table
-- TEMP des résultats. ⚠ Idempotent : rejouable sans risque.
--
-- ⚠ UN SEUL SELECT FINAL — le SQL Editor n'affiche que le DERNIER résultat.
-- Le contrôle de propreté est calculé DANS le bloc DO et versé dans la même
-- table. Ne rien ajouter après le SELECT des verdicts.
--
-- ⚠ LA CIBLE EST CHOISIE DYNAMIQUEMENT : le premier château possédant AU MOINS
-- DEUX chambres, les brouillons d'abord. Deux chambres sont indispensables aux
-- tests de niveau château (une libre pendant que l'autre est prise). Le SETUP
-- dit lequel a été retenu et s'il est publié — à lire avant les verdicts.
--
-- Dates : CURRENT_DATE + 600 et au-delà, hors de toute réservation réelle et
-- hors de la fenêtre du test 2.1 (+490). La borne de nettoyage est +590.
--
-- ── CE QU'IL PROUVE ────────────────────────────────────────────────────────
--
--   01-02  bornes            plage inversée, plage passée
--   03-08  réservations      parité de comportement avec la contrainte #142
--   09-12  drapeau           hors gestion / toutes nuits ouvertes / une nuit
--                            fermée / une nuit SANS LIGNE
--   13-14  niveau château    une chambre libre suffit / toutes prises ferme
--   15-16  ⚠ PARITÉ RÉELLE   l'INSERT passe quand la fonction dit oui,
--                            l'INSERT est rejeté quand elle dit non
--
-- ⚠⚠ LES TESTS 15-16 SONT LES PLUS IMPORTANTS, et ils ne relisent rien : ils
-- CONFRONTENT la fonction à la contrainte en tentant une vraie écriture. Un
-- prédicat recopié « à l'œil » peut diverger d'un statut ou d'une borne sans que
-- personne ne le voie — jusqu'au jour où un visiteur reçoit un 23P01 après avoir
-- cru réserver. Ici, si les deux divergent, un des deux tests rougit.
--
-- ⚠ Les tests 03-08 tournent avec `dispo_geree = false` : on isole la source
-- « réservation ». Les 09-12 isolent la source « calendrier ». Un test qui
-- mélangerait les deux ne dirait pas laquelle a fermé la date.
-- ============================================================

DROP TABLE IF EXISTS dispo_results;
CREATE TEMP TABLE dispo_results (
  test_num    text,
  description text,
  result      text,
  verdict     text
);
GRANT INSERT, SELECT ON dispo_results TO authenticated, anon;


DO $dispo$
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

  base  date := (CURRENT_DATE + 600);
  borne date := (CURRENT_DATE + 590);

  t       record;
  obtenu  boolean;
  passe   boolean;
  n_resid int;
  n_dispo int;
  n_geres int;
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
   ORDER BY (c.statut = 'publie'), c.slug   -- brouillons d'abord
   LIMIT 1;

  SELECT array_agg(id ORDER BY id) INTO chambres
    FROM public.chambres WHERE chateau_id = cible_id;
  ch1 := chambres[1];
  ch2 := chambres[2];

  SELECT id INTO client   FROM public.users   WHERE role = 'client' LIMIT 1;
  SELECT id INTO module_a FROM public.modules WHERE code = 'A'      LIMIT 1;

  INSERT INTO dispo_results VALUES (
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

  -- On part en mode NON GERE pour isoler la source « reservation ».
  UPDATE public.chateaux SET dispo_geree = false WHERE id = cible_id;

  -- ══════════════════════════════════════════════════════════════════════
  -- 01-02 — BORNES (aucune ecriture necessaire)
  -- ══════════════════════════════════════════════════════════════════════
  FOR t IN
    SELECT * FROM (VALUES
      ('01', 'plage inversee ou vide (depart = arrivee)', ch1, base + 80, base + 80, false),
      ('02', 'plage dans le passe',                       ch1, CURRENT_DATE - 5, CURRENT_DATE - 1, false)
    ) AS v(num, descr, chambre, a, d, attendu)
  LOOP
    obtenu := public.est_disponible(t.chambre, t.a, t.d);
    INSERT INTO dispo_results VALUES (
      t.num, t.descr, 'attendu=' || t.attendu || ' · obtenu=' || obtenu,
      CASE WHEN obtenu = t.attendu THEN 'PASS' ELSE 'FAIL' END
    );
  END LOOP;

  -- ══════════════════════════════════════════════════════════════════════
  -- 03-08 — RESERVATIONS (parite de comportement avec la contrainte #142)
  -- ══════════════════════════════════════════════════════════════════════
  -- L'occupation de reference : ch1 CONFIRMEE sur [base, base+5).
  INSERT INTO public.reservations
    (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status)
  VALUES (client, ch1, module_a, base, base + 5, 10000, 'confirmed');

  -- Une PENDING sur ch2 : elle ne doit PAS occuper.
  INSERT INTO public.reservations
    (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status)
  VALUES (client, ch2, module_a, base + 20, base + 22, 10000, 'pending');

  -- Une CANCELLED sur ch2 : elle ne doit pas occuper non plus.
  -- ⚠ cancelled_at est OBLIGATOIRE (CHECK reservations_cancelled_coherent) —
  --   c'est le defaut repare le 22 aout dans repondre_demande.
  INSERT INTO public.reservations
    (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status, cancelled_at)
  VALUES (client, ch2, module_a, base + 30, base + 32, 10000, 'cancelled', now());

  FOR t IN
    SELECT * FROM (VALUES
      ('03', 'chevauchement avec une confirmed',      ch1, base + 1,  base + 3,  false),
      ('04', 'plage disjointe',                       ch1, base + 10, base + 12, true),
      ('05', 'arrivee le jour du depart (borne [) )', ch1, base + 5,  base + 7,  true),
      ('06', 'memes dates, chambre differente',       ch2, base + 1,  base + 3,  true),
      ('07', 'chevauchement avec une pending',        ch2, base + 20, base + 22, true),
      ('08', 'chevauchement avec une cancelled',      ch2, base + 30, base + 32, true)
    ) AS v(num, descr, chambre, a, d, attendu)
  LOOP
    obtenu := public.est_disponible(t.chambre, t.a, t.d);
    INSERT INTO dispo_results VALUES (
      t.num, t.descr, 'attendu=' || t.attendu || ' · obtenu=' || obtenu,
      CASE WHEN obtenu = t.attendu THEN 'PASS'
           WHEN t.num = '05' THEN 'FAIL — la borne [) est perdue : un depart et une arrivee le meme jour sont vus en conflit'
           WHEN t.num = '07' THEN 'FAIL — pending OCCUPE : l arbitrage du chatelain serait supprime'
           ELSE 'FAIL' END
    );
  END LOOP;

  -- ══════════════════════════════════════════════════════════════════════
  -- 09-12 — LE DRAPEAU (fenetre libre de toute reservation : [base+40, base+43))
  -- Trois nuits : base+40, base+41, base+42.
  -- ══════════════════════════════════════════════════════════════════════

  -- 09 — hors gestion, la source calendrier est IGNOREE (aucune ligne saisie).
  obtenu := public.est_disponible(ch1, base + 40, base + 43);
  INSERT INTO dispo_results VALUES (
    '09', 'dispo_geree=false, aucune ligne -> source ignoree',
    'attendu=true · obtenu=' || obtenu,
    CASE WHEN obtenu THEN 'PASS'
         ELSE 'FAIL — la table est consultee hors gestion : les 13 chateaux seraient fermes' END
  );

  UPDATE public.chateaux SET dispo_geree = true WHERE id = cible_id;

  -- 10 — en gestion, les trois nuits ouvertes explicitement.
  INSERT INTO public.disponibilites (chambre_id, date, est_disponible)
  SELECT ch1, g.nuit::date, true
    FROM generate_series(base + 40, base + 42, interval '1 day') AS g(nuit);

  obtenu := public.est_disponible(ch1, base + 40, base + 43);
  INSERT INTO dispo_results VALUES (
    '10', 'dispo_geree=true, 3 nuits est_disponible=true',
    'attendu=true · obtenu=' || obtenu,
    CASE WHEN obtenu THEN 'PASS' ELSE 'FAIL — une plage entierement ouverte est refusee' END
  );

  -- 11 — une seule nuit fermee suffit a fermer la plage.
  UPDATE public.disponibilites SET est_disponible = false
   WHERE chambre_id = ch1 AND date = base + 41;

  obtenu := public.est_disponible(ch1, base + 40, base + 43);
  INSERT INTO dispo_results VALUES (
    '11', 'dispo_geree=true, une nuit est_disponible=false',
    'attendu=false · obtenu=' || obtenu,
    CASE WHEN NOT obtenu THEN 'PASS' ELSE 'FAIL — une nuit bloquee ne ferme pas le sejour' END
  );

  -- 12 — une nuit SANS LIGNE ferme aussi : c'est l'opt-in.
  UPDATE public.disponibilites SET est_disponible = true
   WHERE chambre_id = ch1 AND date = base + 41;
  DELETE FROM public.disponibilites
   WHERE chambre_id = ch1 AND date = base + 42;

  obtenu := public.est_disponible(ch1, base + 40, base + 43);
  INSERT INTO dispo_results VALUES (
    '12', 'dispo_geree=true, une nuit SANS LIGNE (opt-in)',
    'attendu=false · obtenu=' || obtenu,
    CASE WHEN NOT obtenu THEN 'PASS'
         ELSE 'FAIL — l absence de ligne vaut DISPONIBLE : c est l opt-OUT, pas la decision du 23 aout' END
  );

  -- Retour en mode NON GERE pour les tests suivants.
  UPDATE public.chateaux SET dispo_geree = false WHERE id = cible_id;

  -- ══════════════════════════════════════════════════════════════════════
  -- 13-14 — NIVEAU CHATEAU
  -- ══════════════════════════════════════════════════════════════════════

  -- 13 — ch1 prise sur [base+50, base+52), ch2 libre -> le chateau reste ouvert.
  INSERT INTO public.reservations
    (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status)
  VALUES (client, ch1, module_a, base + 50, base + 52, 10000, 'confirmed');

  obtenu := public.chateau_disponible(cible_id, base + 50, base + 52);
  INSERT INTO dispo_results VALUES (
    '13', 'une chambre prise, une autre libre -> chateau disponible',
    'attendu=true · obtenu=' || obtenu,
    CASE WHEN obtenu THEN 'PASS'
         ELSE 'FAIL — une seule chambre occupee ferme tout le chateau' END
  );

  -- 14 — TOUTES les chambres prises sur [base+60, base+62) -> chateau ferme.
  INSERT INTO public.reservations
    (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status)
  SELECT client, ch.id, module_a, base + 60, base + 62, 10000, 'confirmed'
    FROM public.chambres ch WHERE ch.chateau_id = cible_id;

  obtenu := public.chateau_disponible(cible_id, base + 60, base + 62);
  INSERT INTO dispo_results VALUES (
    '14', 'toutes les chambres prises -> chateau indisponible',
    'attendu=false · obtenu=' || obtenu,
    CASE WHEN NOT obtenu THEN 'PASS'
         ELSE 'FAIL — le chateau reste ouvert alors qu aucune chambre ne l est' END
  );

  -- ══════════════════════════════════════════════════════════════════════
  -- 15-16 — ⚠⚠ PARITE REELLE AVEC LA CONTRAINTE #142
  -- Meme fenetre [base+70, base+72), deux temps : la fonction dit oui et
  -- l'INSERT doit passer ; puis elle dit non et l'INSERT doit etre rejete.
  -- On ne relit pas les deux predicats, on les CONFRONTE.
  -- ══════════════════════════════════════════════════════════════════════

  -- 15 — la fonction dit DISPONIBLE : l'ecriture reelle doit PASSER.
  obtenu := public.est_disponible(ch1, base + 70, base + 72);
  BEGIN
    INSERT INTO public.reservations
      (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status)
    VALUES (client, ch1, module_a, base + 70, base + 72, 10000, 'confirmed');
    passe := true;
  EXCEPTION
    WHEN exclusion_violation THEN
      passe := false;
  END;

  INSERT INTO dispo_results VALUES (
    '15', 'PARITE — fonction dit DISPONIBLE, l INSERT reel doit passer',
    'est_disponible=' || obtenu || ' · insert_accepte=' || passe,
    CASE WHEN obtenu AND passe THEN 'PASS'
         WHEN obtenu AND NOT passe
           THEN 'FAIL — ⚠ DIVERGENCE : la fonction ouvre une date que la contrainte refuse. Le visiteur recevrait un 23P01 apres avoir cru reserver.'
         ELSE 'FAIL — la fonction ferme une fenetre pourtant libre' END
  );

  -- 16 — la meme fenetre est desormais occupee : la fonction doit dire NON,
  --      et l'ecriture reelle doit etre REJETEE. Les deux, ou aucun des deux.
  obtenu := public.est_disponible(ch1, base + 70, base + 72);
  BEGIN
    INSERT INTO public.reservations
      (user_id, chambre_id, module_id, date_arrivee, date_depart, prix_total_cents, status)
    VALUES (client, ch1, module_a, base + 70, base + 72, 10000, 'confirmed');
    passe := true;
  EXCEPTION
    WHEN exclusion_violation THEN
      passe := false;
  END;

  INSERT INTO dispo_results VALUES (
    '16', 'PARITE — fonction dit INDISPONIBLE, l INSERT reel doit etre rejete',
    'est_disponible=' || obtenu || ' · insert_accepte=' || passe,
    CASE WHEN NOT obtenu AND NOT passe THEN 'PASS'
         WHEN NOT obtenu AND passe
           THEN 'FAIL — ⚠ DIVERGENCE : la fonction ferme une date que la contrainte accepte. On refuserait des sejours vendables.'
         ELSE 'FAIL — ⚠ SURVENTE : la fonction ouvre une date deja confirmee' END
  );

  -- ══════════════════════════════════════════════════════════════════════
  -- NETTOYAGE — disponibilites d'abord, puis reservations, puis le drapeau.
  -- ⚠ Rien n'a ete cree hors de ces trois endroits : ces fonctions ne
  --   declenchent aucun email (contrairement a repondre_demande), il n'y a donc
  --   pas d'outbox a purger.
  -- ══════════════════════════════════════════════════════════════════════
  DELETE FROM public.disponibilites
   WHERE chambre_id IN (SELECT id FROM public.chambres WHERE chateau_id = cible_id)
     AND date >= borne;

  DELETE FROM public.reservations
   WHERE chambre_id IN (SELECT id FROM public.chambres WHERE chateau_id = cible_id)
     AND user_id = client
     AND date_arrivee >= borne;

  UPDATE public.chateaux SET dispo_geree = orig_geree WHERE id = cible_id;

  -- ── PROPRETE — calculee ICI, pas dans un SELECT final (le SQL Editor
  --    n'affiche que le dernier resultat, et il doit montrer les verdicts).
  SELECT count(*) INTO n_resid
    FROM public.reservations WHERE date_arrivee >= borne;
  SELECT count(*) INTO n_dispo
    FROM public.disponibilites WHERE date >= borne;
  SELECT count(*) FILTER (WHERE dispo_geree) INTO n_geres
    FROM public.chateaux;
  -- ⚠ Le critere porte sur la CIBLE (drapeau rendu a sa valeur d'origine), pas
  --   sur un compte global a zero : le jour ou un chateau sera legitimement en
  --   gestion, un tel critere rougirait a tort.
  SELECT dispo_geree INTO obtenu FROM public.chateaux WHERE id = cible_id;

  INSERT INTO dispo_results VALUES (
    'PROPRETE', 'residus + drapeau de la cible restaure',
    n_resid || ' reservation(s) · ' || n_dispo || ' ligne(s) disponibilites · '
      || 'cible dispo_geree=' || obtenu::text || ' (origine=' || coalesce(orig_geree::text, 'false') || ')'
      || ' · ' || n_geres || ' chateau(x) gere(s) au total',
    CASE WHEN n_resid = 0 AND n_dispo = 0 AND obtenu IS NOT DISTINCT FROM orig_geree THEN 'PASS'
         ELSE 'FAIL — ⚠ residu : supprimer les lignes au-dela de ' || borne
              || ' et remettre dispo_geree a ' || coalesce(orig_geree::text, 'false')
              || ' sur ' || coalesce(cible_slug, '?') END
  );

END;
$dispo$;


-- ============================================================
-- RESULTATS — L'UNIQUE SELECT DU FICHIER.
-- Attendu : SETUP + les seize tests + PROPRETE, tous en PASS.
-- ⚠ NE RIEN AJOUTER APRES : le SQL Editor n'affiche que le dernier resultat.
-- ============================================================
SELECT test_num, description, result, verdict
FROM dispo_results
ORDER BY
  CASE test_num WHEN 'SETUP' THEN 0 WHEN 'PROPRETE' THEN 9 ELSE 1 END,
  test_num;
