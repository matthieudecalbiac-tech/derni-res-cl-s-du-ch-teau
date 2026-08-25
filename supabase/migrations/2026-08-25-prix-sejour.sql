-- ============================================================
-- LCC — P1 : prix_sejour, la SOURCE UNIQUE du prix d'un sejour
-- ============================================================
--
-- QUOI. Une fonction, et une seule, qui calcule ce qu'un sejour coute :
--
--     prix d'une nuit N  =  COALESCE(disponibilites.prix_special_cents,
--                                    chambres.prix_cents)
--     prix du sejour     =  SOMME des nuits [arrivee, depart)
--                           + chambres.cleaning_fee_cents UNE SEULE FOIS
--
-- ⚠⚠ POURQUOI UNE FONCTION SQL, ET POURQUOI UNE SEULE. C'est le MEME
-- raisonnement que la decision Q1 du moteur de disponibilite, avec un enjeu
-- plus lourd : ici la divergence porterait sur de l'ARGENT. Le front l'appelle
-- pour AFFICHER, l'Edge Function l'appelle pour FACTURER — litteralement la
-- meme fonction. Deux codes qui « calculent pareil » ne garantissent rien ; un
-- seul code, si. C'est ainsi, et seulement ainsi, que « afficher = facturer »
-- devient vrai PAR CONSTRUCTION et non par vigilance.
--
-- ⚠ ELLE NE VERIFIE PAS LA DISPONIBILITE, ET C'EST VOULU. Elle calcule un
-- prix, un point. `est_disponible` reste seule juge de l'ouverture. Meler les
-- deux dupliquerait la regle d'occupation — exactement ce que la decision Q3
-- interdit (« l'offre qualifie le prix, elle ne bloque pas »).
--
-- ⚠ ELLE LEVE SUR UNE PLAGE INVALIDE, contrairement a `est_disponible` qui rend
-- `false`. L'asymetrie est un ARBITRAGE, pas un oubli : `est_disponible` repond
-- a un ECRAN, ou « non disponible » est une reponse honnete. Ici on manipule un
-- MONTANT : un retour NULL pourrait etre lu comme « gratuit » ou « inconnu »
-- par un appelant distrait. Sur de l'argent, l'invalide doit casser
-- BRUYAMMENT.
--
-- ⚠ TOUT EN CENTS ENTIERS, aucun flottant nulle part — ni ici, ni dans les
-- appelants. Un arrondi de centime sur un montant facture est une erreur, pas
-- une approximation.
--
-- ⚠ BORNES [arrivee, depart) — DEPART EXCLU. On ne dort pas le soir du depart.
-- ⚠⚠ CE N'EST PAS LA CONVENTION DE `poser_disponibilites`, qui est INCLUSIVE
-- (« du 12 au 18 » = SEPT nuits). C'est le piege 3 de CLAUDE.md : deux
-- conventions coexistent, et les confondre ici ferait payer une nuit de trop.
--
-- ⚠ UNE NUIT SANS LIGNE `disponibilites` prend le prix de BASE. C'est le
-- COALESCE, et c'est coherent avec l'opt-out borne : l'absence de ligne dit que
-- la nuit n'a pas ete PARTICULARISEE, pas qu'elle n'a pas de prix.
--
-- ⚠ NO-OP TANT QU'AUCUN PRIX SPECIAL N'EXISTE. Aucune ligne ne portant
-- aujourd'hui de `prix_special_cents`, le COALESCE retombe partout sur le prix
-- de base et cette fonction rend EXACTEMENT ce que l'Edge Function calcule
-- deja (nbNuits x prix_cents + cleaning). C'est le garde-fou central du
-- chantier : on peut brancher facturation puis affichage sans changer un
-- centime, et n'ouvrir la saisie qu'une fois les deux alignes.
--
-- ⚠ IDEMPOTENTE. ⚠ UN SEUL SELECT FINAL.
-- ============================================================

DROP TABLE IF EXISTS prix_sejour_results;
CREATE TEMP TABLE prix_sejour_results (
  etape   text,
  detail  text,
  verdict text
);


-- ════════════════════════════════════════════════════════════════════════════
-- LA FONCTION
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.prix_sejour(
  p_chambre_id uuid,
  p_arrivee    date,
  p_depart     date
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prix_base integer;
  v_menage    integer;
  v_total     integer;
BEGIN
  -- ⚠ LES BORNES LEVENT — cf. l'en-tete. Un montant ne se rend pas « nul » :
  --   il se refuse.
  IF p_arrivee IS NULL OR p_depart IS NULL THEN
    RAISE EXCEPTION 'prix_sejour : dates manquantes' USING ERRCODE = '22023';
  END IF;
  IF p_depart <= p_arrivee THEN
    RAISE EXCEPTION 'prix_sejour : depart (%) doit suivre arrivee (%)', p_depart, p_arrivee
      USING ERRCODE = '22023';
  END IF;
  IF p_arrivee < CURRENT_DATE THEN
    RAISE EXCEPTION 'prix_sejour : arrivee (%) est dans le passe', p_arrivee
      USING ERRCODE = '22023';
  END IF;
  -- Garde d'horizon, meme esprit que jours_disponibles_* : un sejour de plus
  -- d'un an est une saisie, pas une demande.
  IF p_depart - p_arrivee > 366 THEN
    RAISE EXCEPTION 'prix_sejour : sejour de % nuits — au-dela de 366', p_depart - p_arrivee
      USING ERRCODE = '22023';
  END IF;

  SELECT ch.prix_cents, ch.cleaning_fee_cents
    INTO v_prix_base, v_menage
    FROM public.chambres ch
   WHERE ch.id = p_chambre_id;

  IF v_prix_base IS NULL THEN
    RAISE EXCEPTION 'prix_sejour : chambre % introuvable', p_chambre_id
      USING ERRCODE = '22023';
  END IF;

  -- ⚠ LE CŒUR. Une ligne par nuit de [arrivee, depart) — le `- 1` porte le
  --   DEPART EXCLU. LEFT JOIN : une nuit sans ligne garde le prix de base.
  SELECT COALESCE(SUM(COALESCE(d.prix_special_cents, v_prix_base)), 0)
    INTO v_total
    FROM generate_series(p_arrivee, p_depart - 1, interval '1 day') AS g(nuit)
    LEFT JOIN public.disponibilites d
      ON d.chambre_id = p_chambre_id AND d.date = g.nuit::date;

  -- ⚠ LE MENAGE UNE SEULE FOIS, hors de la somme des nuits. C'est ce que
  --   l'Edge Function fait deja ; le multiplier par le nombre de nuits serait
  --   l'erreur la plus facile a commettre ici.
  v_total := v_total + COALESCE(v_menage, 0);

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'prix_sejour : total calcule <= 0 (%)', v_total USING ERRCODE = '22023';
  END IF;

  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION public.prix_sejour(uuid, date, date) IS
  'SOURCE UNIQUE du prix d''un sejour, en CENTS. Somme, sur les nuits [arrivee, depart) — DEPART EXCLU —, de COALESCE(disponibilites.prix_special_cents, chambres.prix_cents), plus chambres.cleaning_fee_cents UNE SEULE FOIS. ⚠ Appelee par le FRONT pour afficher ET par demande-reservation pour facturer : c''est ce qui rend « afficher = facturer » vrai PAR CONSTRUCTION. Ne jamais reimplementer ce calcul ailleurs. ⚠ NE VERIFIE PAS la disponibilite — est_disponible reste seule juge de l''ouverture (decision Q3 : le prix qualifie, il ne bloque pas). ⚠ LEVE (22023) sur plage invalide, chambre inconnue ou total <= 0, contrairement a est_disponible qui rend false : sur un MONTANT, un NULL pourrait etre lu « gratuit » ou « inconnu » — l''invalide doit casser bruyamment. ⚠ La convention de bornes est celle d''est_disponible, PAS celle de poser_disponibilites qui est inclusive : les confondre ferait payer une nuit de trop. ⚠ Une nuit sans ligne prend le prix de base (le COALESCE) : l''absence de ligne dit que la nuit n''a pas ete particularisee, pas qu''elle n''a pas de prix.';


-- ════════════════════════════════════════════════════════════════════════════
-- LES DROITS
-- ⚠⚠ service_role EST DANS LA LISTE, ET C'EST L'OUBLI DE 2.5 QU'ON NE REFAIT
--    PAS. `demande-reservation` tourne en service_role : sans ce GRANT, l'appel
--    echouerait en 42501 A CHAQUE DEMANDE. En 2.5 le meme oubli aurait rendu le
--    controle des dates INERTE ET SILENCIEUX ; ici il ferait ECHOUER toute
--    demande, puisque le prix se refuse sur erreur. Bruyant, donc moins
--    dangereux — mais tout aussi evitable.
-- ⚠ anon a le droit d'appeler : la fonction ne rend qu'un ENTIER, et le prix
--   est de toute facon affiche publiquement. Rien a fuiter.
-- ════════════════════════════════════════════════════════════════════════════
REVOKE EXECUTE ON FUNCTION public.prix_sejour(uuid, date, date) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.prix_sejour(uuid, date, date) TO anon;
GRANT  EXECUTE ON FUNCTION public.prix_sejour(uuid, date, date) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.prix_sejour(uuid, date, date) TO service_role;


-- ════════════════════════════════════════════════════════════════════════════
-- LES GARDES — la migration se prouve, ou elle s'annule
-- ════════════════════════════════════════════════════════════════════════════
DO $garde$
DECLARE
  v_oid oid;
BEGIN
  SELECT p.oid INTO v_oid
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'prix_sejour';

  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'prix_sejour : la fonction n''a pas ete creee';
  END IF;

  INSERT INTO prix_sejour_results VALUES (
    'fonction',
    'SECURITY DEFINER=' || (SELECT prosecdef FROM pg_proc WHERE oid = v_oid)
      || ' · anon=' || has_function_privilege('anon', v_oid, 'EXECUTE')
      || ' · auth=' || has_function_privilege('authenticated', v_oid, 'EXECUTE')
      || ' · service=' || has_function_privilege('service_role', v_oid, 'EXECUTE'),
    CASE WHEN (SELECT prosecdef FROM pg_proc WHERE oid = v_oid)
              AND has_function_privilege('anon', v_oid, 'EXECUTE')
              AND has_function_privilege('authenticated', v_oid, 'EXECUTE')
              AND has_function_privilege('service_role', v_oid, 'EXECUTE')
         THEN 'PASS' ELSE 'FAIL — un droit manque (⚠ service_role : l''oubli de 2.5)' END
  );
END;
$garde$;


-- ════════════════════════════════════════════════════════════════════════════
-- LES TESTS — on CONFRONTE, on ne relit pas
-- ⚠ La somme de reference est recalculee A LA MAIN par generate_series dans le
--   test lui-meme. Si les deux formules divergent d'un centime, un verdict
--   rougit. Relire la fonction ne prouverait rien.
-- ⚠ Cible : la premiere chambre d'un chateau BROUILLON (rien de servi n'est
--   touche). Les prix speciaux poses sont NETTOYES a la fin.
-- ════════════════════════════════════════════════════════════════════════════
DO $tests$
DECLARE
  ch        uuid;
  slug      text;
  base      integer;
  menage    integer;
  d0        date := CURRENT_DATE + 700;   -- hors de toutes les fenetres de test
  borne     date := CURRENT_DATE + 690;
  attendu   integer;
  obtenu    integer;
  n_resid   int;
BEGIN
  SELECT c.slug, ch2.id, ch2.prix_cents, ch2.cleaning_fee_cents
    INTO slug, ch, base, menage
    FROM public.chateaux c
    JOIN public.chambres ch2 ON ch2.chateau_id = c.id
   WHERE c.statut <> 'publie'
   ORDER BY c.slug, ch2.id
   LIMIT 1;

  INSERT INTO prix_sejour_results VALUES (
    'SETUP',
    coalesce(slug, '(aucun brouillon a chambre)') || ' · base=' || coalesce(base::text, '?')
      || ' · menage=' || coalesce(menage::text, '?') || ' · d0=' || d0,
    CASE WHEN ch IS NOT NULL THEN 'PASS' ELSE 'FAIL — pas de cible, tests invalides' END
  );
  IF ch IS NULL THEN RETURN; END IF;

  -- ── 1. AUCUN prix special : le NO-OP doit valoir le calcul actuel ────────
  attendu := 3 * base + menage;
  obtenu  := public.prix_sejour(ch, d0, d0 + 3);
  INSERT INTO prix_sejour_results VALUES (
    '1 no-op', '3 nuits · attendu=' || attendu || ' · obtenu=' || obtenu,
    CASE WHEN obtenu = attendu THEN 'PASS'
         ELSE 'FAIL — ⚠ le calcul DIVERGE de nbNuits x base + menage : la bascule ne serait PAS neutre' END
  );

  -- ── 2. LE MENAGE UNE SEULE FOIS ──────────────────────────────────────────
  INSERT INTO prix_sejour_results VALUES (
    '2 menage', '5 nuits - 1 nuit = ' || (public.prix_sejour(ch, d0, d0 + 5) - public.prix_sejour(ch, d0, d0 + 1))
      || ' · attendu=' || (4 * base),
    CASE WHEN public.prix_sejour(ch, d0, d0 + 5) - public.prix_sejour(ch, d0, d0 + 1) = 4 * base
         THEN 'PASS' ELSE 'FAIL — ⚠ le menage est compte par NUIT' END
  );

  -- ── 3. BORNE : [N, N+1) = UNE nuit ───────────────────────────────────────
  INSERT INTO prix_sejour_results VALUES (
    '3 borne', '[N, N+1) = ' || public.prix_sejour(ch, d0, d0 + 1) || ' · attendu=' || (base + menage),
    CASE WHEN public.prix_sejour(ch, d0, d0 + 1) = base + menage THEN 'PASS'
         ELSE 'FAIL — ⚠ le depart n''est pas exclu : une nuit de trop est facturee' END
  );

  -- ── 4. PRIX MIXTES : deux nuits particularisees sur quatre ───────────────
  INSERT INTO public.disponibilites (chambre_id, date, est_disponible, prix_special_cents)
  VALUES (ch, d0 + 1, true, base + 5000), (ch, d0 + 2, true, base - 3000)
  ON CONFLICT (chambre_id, date) DO UPDATE
    SET prix_special_cents = EXCLUDED.prix_special_cents;

  -- ⚠ LA REFERENCE EST RECALCULEE A LA MAIN — c'est tout l'objet du test.
  SELECT SUM(COALESCE(d.prix_special_cents, base)) + menage INTO attendu
    FROM generate_series(d0, d0 + 3, interval '1 day') AS g(nuit)
    LEFT JOIN public.disponibilites d ON d.chambre_id = ch AND d.date = g.nuit::date;
  obtenu := public.prix_sejour(ch, d0, d0 + 4);

  INSERT INTO prix_sejour_results VALUES (
    '4 mixte', '4 nuits dont 2 speciales · somme a la main=' || attendu || ' · fonction=' || obtenu,
    CASE WHEN obtenu = attendu THEN 'PASS'
         ELSE 'FAIL — ⚠ DIVERGENCE AU CENTIME entre la fonction et la somme nuit a nuit' END
  );

  -- ── 5. UNE NUIT SANS LIGNE prend le prix de BASE ─────────────────────────
  --     d0+3 n'a pas de ligne : le total doit valoir 2 speciales + 2 base.
  INSERT INTO prix_sejour_results VALUES (
    '5 sans ligne', 'total=' || obtenu || ' · attendu=' || (base + (base + 5000) + (base - 3000) + base + menage),
    CASE WHEN obtenu = base + (base + 5000) + (base - 3000) + base + menage THEN 'PASS'
         ELSE 'FAIL — une nuit sans ligne ne retombe pas sur le prix de base' END
  );

  -- ── 6-8. LES BORNES LEVENT ───────────────────────────────────────────────
  BEGIN
    PERFORM public.prix_sejour(ch, d0, d0);
    INSERT INTO prix_sejour_results VALUES ('6 plage nulle', 'AUCUNE erreur levee', 'FAIL — depart = arrivee doit lever');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO prix_sejour_results VALUES ('6 plage nulle', 'leve : ' || SQLSTATE, 'PASS');
  END;

  BEGIN
    PERFORM public.prix_sejour(ch, CURRENT_DATE - 5, CURRENT_DATE - 1);
    INSERT INTO prix_sejour_results VALUES ('7 passe', 'AUCUNE erreur levee', 'FAIL — le passe doit lever');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO prix_sejour_results VALUES ('7 passe', 'leve : ' || SQLSTATE, 'PASS');
  END;

  BEGIN
    PERFORM public.prix_sejour('00000000-0000-0000-0000-000000000000'::uuid, d0, d0 + 2);
    INSERT INTO prix_sejour_results VALUES ('8 chambre inconnue', 'AUCUNE erreur levee', 'FAIL — doit lever');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO prix_sejour_results VALUES ('8 chambre inconnue', 'leve : ' || SQLSTATE, 'PASS');
  END;

  -- ── NETTOYAGE ────────────────────────────────────────────────────────────
  DELETE FROM public.disponibilites WHERE chambre_id = ch AND date >= borne;

  SELECT count(*) INTO n_resid
    FROM public.disponibilites WHERE chambre_id = ch AND date >= borne;
  INSERT INTO prix_sejour_results VALUES (
    'PROPRETE', n_resid || ' ligne(s) residuelle(s) au-dela de ' || borne,
    CASE WHEN n_resid = 0 THEN 'PASS' ELSE 'FAIL — supprimer les lignes de test' END
  );
END;
$tests$;


-- ════════════════════════════════════════════════════════════════════════════
-- RESULTATS — L'UNIQUE SELECT DU FICHIER. Attendu : tout en PASS.
-- ⚠ NE RIEN AJOUTER APRES.
-- ════════════════════════════════════════════════════════════════════════════
SELECT etape, detail, verdict FROM prix_sejour_results ORDER BY etape;
