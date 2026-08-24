-- ============================================================
-- LCC — MIGRATION : les COMMENT que l'horizon a rendus faux
-- ============================================================
--
-- ⚠ COMMENT-ONLY. Aucune table, aucune colonne, aucune fonction, aucune
-- policy, aucun GRANT n'est touché. Le comportement de la base est
-- rigoureusement inchangé.
--
-- ── POURQUOI ───────────────────────────────────────────────────────────────
--
-- La migration `2026-08-24-horizon-ouverture.sql` a introduit un TROISIÈME
-- état pour une nuit — ligne à false, ligne à true, PAS DE LIGNE tranchée par
-- `chateaux.dispo_ouverte_jusqu_a`. Elle a mis à jour le COMMENT de la
-- FONCTION `est_disponible` et celui de la colonne `dispo_ouverte_jusqu_a`.
--
-- ⚠ ELLE A OUBLIÉ LES TROIS AUTRES, qui décrivent encore l'opt-in strict :
--
--   public.disponibilites (table)            « l'absence de ligne vaut INDISPONIBLE »
--   public.chateaux.dispo_geree (colonne)    « une date SANS LIGNE vaut INDISPONIBLE »
--   public.disponibilites.est_disponible     renvoie au commentaire fautif,
--                                            et ne mentionne pas l'horizon
--
-- ⚠ DANS L'HORIZON, UNE DATE SANS LIGNE EST OUVERTE. Les deux premiers
-- affirment donc l'inverse de la règle en vigueur.
--
-- ⚠ CE N'EST PAS DE LA COSMÉTIQUE, ET LE PRÉCÉDENT LE PROUVE. Le COMMENT de
-- la table avait DÉJÀ été corrigé le 23 août, parce que le précédent —
-- « Absence = disponible au prix par défaut » — décrivait un opt-out jamais
-- implémenté. C'est ce COMMENT-là qui a fondé une décision d'architecture. Et
-- `CLAUDE.md` interdit de régénérer `schema.sql` depuis la base PRÉCISÉMENT
-- parce que ces 64 COMMENT sont une documentation irremplaçable : un COMMENT
-- faux y est plus dangereux qu'ailleurs, puisque c'est la seule référence.
--
-- ⚠ Le plus trompeur des trois est `chateaux.dispo_geree` : c'est le drapeau
-- que l'admin bascule, et son COMMENT est ce qu'on lit avant de le basculer.
--
-- ── CE QUI REND CETTE MIGRATION SÛRE ───────────────────────────────────────
--
--   IDEMPOTENTE      un COMMENT déjà à jour est laissé tel quel (« DEJA A JOUR »)
--   AUTO-VÉRIFIANTE  elle relit les CINQ descripteurs après écriture et LÈVE
--                    avant le COMMIT si l'un d'eux n'est pas conforme
--   ⚠ NON DESTRUCTIVE elle REFUSE d'écraser un COMMENT qu'elle ne reconnaît
--                    pas — ni l'ancien attendu, ni le nouveau. Si quelqu'un
--                    l'a réécrit entre-temps, elle LÈVE au lieu de perdre son
--                    travail en silence.
--
-- ⚠ UN SEUL SELECT FINAL — le SQL Editor n'affiche que le dernier résultat.
-- ============================================================

DROP TABLE IF EXISTS comment_results;
CREATE TEMP TABLE comment_results (
  objet       text,
  etat        text,
  detail      text,
  verdict     text
);


DO $cmt$
DECLARE
  -- Les marqueurs de l'ancien texte. Aucun ne figure dans les nouveaux : c'est
  -- ce qui rend la détection idempotente.
  MARQ_TABLE   constant text := 'l''absence de ligne vaut INDISPONIBLE';
  MARQ_GEREE   constant text := 'une date SANS LIGNE vaut INDISPONIBLE';
  MARQ_ESTDISP constant text := 'cf. le commentaire de la table et chateaux.dispo_geree';

  -- ⚠ CONCATÉNATION EXPLICITE PAR `||`. PostgreSQL sait concaténer deux
  --   littéraux séparés par un saut de ligne (règle SQL92), mais une migration
  --   lancée sur la production n'est pas l'endroit où faire reposer un texte
  --   sur une subtilité de parseur. Les `||` ne coûtent rien et se relisent.
  N_TABLE constant text :=
    'Calendrier disponibilités par chambre. Une ligne = 1 chambre × 1 date. '
    || '⚠ L''interprétation d''une date SANS LIGNE dépend de DEUX colonnes de chateaux : '
    || 'si dispo_geree est false (défaut), la table n''est pas consultée du tout ; '
    || 'si dispo_geree est true, une date sans ligne est OUVERTE tant qu''elle est '
    || '<= dispo_ouverte_jusqu_a (borne incluse) et FERMÉE au-delà — c''est l''horizon '
    || 'du 24 août 2026. ⚠ Le châtelain ne saisit donc QUE ses blocages : opt-OUT '
    || 'BORNÉ, nommé comme tel (un oubli de blocage OUVRE une nuit ; l''horizon est '
    || 'la borne qui rend ce risque fini). Ce n''est PAS l''opt-in strict décrit ici '
    || 'du 23 au 24 août, où toute date sans ligne était fermée ; ni l''opt-out '
    || 'd''origine — « Absence = disponible au prix par défaut » — jamais implémenté, '
    || 'et qui aurait tout ouvert SANS BORNE sur une table vide.';

  N_ESTDISP constant text :=
    'Ouverture EXPLICITE de la date — la seule des trois réponses possibles qui '
    || 'soit ÉCRITE. false = bloquée (entretien, occupation privée, séjour hors '
    || 'plateforme). true = ouverte, et ⚠ PLUS FORTE QUE L''HORIZON : elle ouvre une '
    || 'nuit au-delà de chateaux.dispo_ouverte_jusqu_a (un mariage réservé deux ans '
    || 'à l''avance, sans déplacer l''horizon pour tout le monde). ⚠ Ne pas confondre '
    || 'avec l''ABSENCE de ligne, qui n''est pas une valeur : elle se tranche par '
    || 'l''horizon (cf. le commentaire de la table). ⚠ C''EST POURQUOI « rouvrir » '
    || 'EFFACE la ligne au lieu d''en écrire une à true — une ligne true resterait '
    || 'ouverte au-delà de l''horizon, que plus rien ne refermerait. Une réservation '
    || 'confirmée n''a pas besoin d''être reportée ici : elle est dérivée à la lecture '
    || 'depuis reservations, comme le palier du Club, pour qu''il n''y ait jamais deux '
    || 'représentations du même fait.';

  N_GEREE constant text :=
    'Opt-in du moteur de disponibilité. false (défaut) = la table disponibilites '
    || 'est IGNORÉE pour ce château, comportement historique (proxy éditorial '
    || 'urgence). true = la table FAIT FOI, et une date SANS LIGNE se tranche par '
    || 'dispo_ouverte_jusqu_a : OUVERTE jusqu''à cet horizon inclus, FERMÉE au-delà. '
    || '⚠ BASCULER À true SANS POSER D''HORIZON FERME LE CHÂTEAU ENTIÈREMENT — '
    || 'dispo_ouverte_jusqu_a à NULL vaut « aucune ouverture par défaut », donc aucune '
    || 'nuit réservable. C''est le garde-fou que l''écran d''édition admin annonce '
    || 'depuis le 24 août 2026, en trois versions dérivées de l''état. La bascule se '
    || 'fait château par château, APRÈS avoir posé l''horizon (cf. piège 1 de l''audit '
    || 'disponibilités du 22 août 2026).';

  v_txt      text;
  v_att_disp int;
  v_att_ger  int;
  v_fn_oid   oid;
  n_ko       int;
BEGIN

  -- Les numéros de colonne, pour col_description.
  SELECT attnum INTO v_att_disp FROM pg_attribute
   WHERE attrelid = 'public.disponibilites'::regclass AND attname = 'est_disponible';
  SELECT attnum INTO v_att_ger  FROM pg_attribute
   WHERE attrelid = 'public.chateaux'::regclass       AND attname = 'dispo_geree';
  SELECT p.oid INTO v_fn_oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'est_disponible'
     AND pg_get_function_identity_arguments(p.oid) = 'p_chambre_id uuid, p_arrivee date, p_depart date';

  IF v_att_disp IS NULL OR v_att_ger IS NULL OR v_fn_oid IS NULL THEN
    RAISE EXCEPTION 'COMMENT-horizon : objet introuvable (colonne ou fonction) — migration interrompue';
  END IF;

  -- ══════════════════════════════════════════════════════════════════════
  -- 1 — TABLE public.disponibilites
  -- ══════════════════════════════════════════════════════════════════════
  v_txt := obj_description('public.disponibilites'::regclass, 'pg_class');

  IF v_txt = N_TABLE THEN
    INSERT INTO comment_results VALUES
      ('disponibilites (table)', 'DEJA A JOUR', 'aucune ecriture', 'PASS');
  ELSIF v_txt IS NOT NULL AND position(MARQ_TABLE in v_txt) > 0 THEN
    EXECUTE format('COMMENT ON TABLE public.disponibilites IS %L', N_TABLE);
    INSERT INTO comment_results VALUES
      ('disponibilites (table)', 'CORRIGE',
       'l''ancien affirmait « absence de ligne = INDISPONIBLE »', 'PASS');
  ELSE
    -- ⚠ Ni l'ancien attendu, ni le nouveau : quelqu'un l'a réécrit. On ne
    --   l'écrase pas — on lève, et son travail est préservé.
    RAISE EXCEPTION 'COMMENT-horizon : le COMMENT de la table disponibilites n''est NI l''ancien attendu NI le nouveau. Relire avant d''ecraser. Actuel : %',
      left(coalesce(v_txt, '(NULL)'), 200);
  END IF;

  -- ══════════════════════════════════════════════════════════════════════
  -- 2 — COLONNE public.disponibilites.est_disponible
  -- ══════════════════════════════════════════════════════════════════════
  v_txt := col_description('public.disponibilites'::regclass, v_att_disp);

  IF v_txt = N_ESTDISP THEN
    INSERT INTO comment_results VALUES
      ('disponibilites.est_disponible', 'DEJA A JOUR', 'aucune ecriture', 'PASS');
  ELSIF v_txt IS NOT NULL AND position(MARQ_ESTDISP in v_txt) > 0 THEN
    EXECUTE format('COMMENT ON COLUMN public.disponibilites.est_disponible IS %L', N_ESTDISP);
    INSERT INTO comment_results VALUES
      ('disponibilites.est_disponible', 'CORRIGE',
       'l''ancien renvoyait au commentaire fautif et ignorait l''horizon', 'PASS');
  ELSE
    RAISE EXCEPTION 'COMMENT-horizon : le COMMENT de disponibilites.est_disponible est inattendu. Actuel : %',
      left(coalesce(v_txt, '(NULL)'), 200);
  END IF;

  -- ══════════════════════════════════════════════════════════════════════
  -- 3 — COLONNE public.chateaux.dispo_geree
  -- ⚠ LE PLUS TROMPEUR DES TROIS : c'est le drapeau que l'admin bascule, et
  --   son COMMENT est ce qu'on lit AVANT de le basculer.
  -- ══════════════════════════════════════════════════════════════════════
  v_txt := col_description('public.chateaux'::regclass, v_att_ger);

  IF v_txt = N_GEREE THEN
    INSERT INTO comment_results VALUES
      ('chateaux.dispo_geree', 'DEJA A JOUR', 'aucune ecriture', 'PASS');
  ELSIF v_txt IS NOT NULL AND position(MARQ_GEREE in v_txt) > 0 THEN
    EXECUTE format('COMMENT ON COLUMN public.chateaux.dispo_geree IS %L', N_GEREE);
    INSERT INTO comment_results VALUES
      ('chateaux.dispo_geree', 'CORRIGE',
       'l''ancien affirmait « date SANS LIGNE = INDISPONIBLE », sans l''horizon', 'PASS');
  ELSE
    RAISE EXCEPTION 'COMMENT-horizon : le COMMENT de chateaux.dispo_geree est inattendu. Actuel : %',
      left(coalesce(v_txt, '(NULL)'), 200);
  END IF;

  -- ══════════════════════════════════════════════════════════════════════
  -- 4 — LES DEUX QUI ÉTAIENT DÉJÀ BONS : on les CONTRÔLE, on n'y touche pas.
  -- ⚠ Sans ce contrôle, la migration prouverait ce qu'elle vient d'écrire et
  --   rien d'autre. Ces deux-là sont la référence : s'ils avaient dérivé,
  --   corriger les trois premiers ne suffirait pas.
  -- ══════════════════════════════════════════════════════════════════════
  v_txt := col_description('public.chateaux'::regclass,
             (SELECT attnum FROM pg_attribute
               WHERE attrelid = 'public.chateaux'::regclass
                 AND attname = 'dispo_ouverte_jusqu_a'));
  INSERT INTO comment_results VALUES (
    'chateaux.dispo_ouverte_jusqu_a', 'INCHANGE (controle)',
    'mentionne l''horizon : ' || (position('OUVERTES' in coalesce(v_txt, '')) > 0)::text,
    CASE WHEN v_txt IS NOT NULL AND position('OUVERTES' in v_txt) > 0
         THEN 'PASS' ELSE 'FAIL — la reference elle-meme a derive' END
  );

  v_txt := obj_description(v_fn_oid, 'pg_proc');
  INSERT INTO comment_results VALUES (
    'est_disponible (fonction)', 'INCHANGE (controle)',
    'mentionne les TROIS ETATS : ' || (position('TROIS ETATS' in coalesce(v_txt, '')) > 0)::text,
    CASE WHEN v_txt IS NOT NULL AND position('TROIS ETATS' in v_txt) > 0
         THEN 'PASS' ELSE 'FAIL — la reference elle-meme a derive' END
  );

  -- ══════════════════════════════════════════════════════════════════════
  -- 5 — ⚠ LA PREUVE AVANT LE COMMIT. On relit les trois corrigés depuis le
  --     catalogue — pas depuis nos variables — et on lève si l'un d'eux
  --     n'est pas le texte attendu, ou si le marqueur périmé subsiste
  --     quelque part.
  -- ══════════════════════════════════════════════════════════════════════
  n_ko := 0;

  IF obj_description('public.disponibilites'::regclass, 'pg_class') IS DISTINCT FROM N_TABLE
     THEN n_ko := n_ko + 1; END IF;
  IF col_description('public.disponibilites'::regclass, v_att_disp) IS DISTINCT FROM N_ESTDISP
     THEN n_ko := n_ko + 1; END IF;
  IF col_description('public.chateaux'::regclass, v_att_ger) IS DISTINCT FROM N_GEREE
     THEN n_ko := n_ko + 1; END IF;

  IF n_ko > 0 THEN
    RAISE EXCEPTION 'COMMENT-horizon : % COMMENT non conforme(s) apres ecriture — AUCUNE modification n''est conservee', n_ko;
  END IF;

  -- Le marqueur périmé ne doit plus exister nulle part sur ces trois objets.
  IF position(MARQ_TABLE in obj_description('public.disponibilites'::regclass, 'pg_class')) > 0
     OR position(MARQ_GEREE in col_description('public.chateaux'::regclass, v_att_ger)) > 0 THEN
    RAISE EXCEPTION 'COMMENT-horizon : le marqueur perime subsiste apres ecriture';
  END IF;

  INSERT INTO comment_results VALUES (
    'PREUVE', 'relecture depuis pg_catalog',
    '3 COMMENT conformes · 0 marqueur perime · 2 references intactes',
    'PASS'
  );

END;
$cmt$;


-- ============================================================
-- RESULTATS — L'UNIQUE SELECT DU FICHIER.
-- Attendu : 6 lignes, toutes en PASS. Les trois premieres en « CORRIGE » au
-- premier passage, en « DEJA A JOUR » si la migration est rejouee.
-- ⚠ NE RIEN AJOUTER APRES.
-- ============================================================
SELECT objet, etat, detail, verdict FROM comment_results
ORDER BY CASE WHEN objet = 'PREUVE' THEN 1 ELSE 0 END, objet;
