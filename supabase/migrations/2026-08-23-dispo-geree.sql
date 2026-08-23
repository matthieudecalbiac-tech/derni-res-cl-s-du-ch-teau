-- ============================================================
-- LCC — moteur de disponibilité 2.1 : le drapeau `chateaux.dispo_geree`
-- ============================================================
--
-- QUOI — une colonne booléenne par château, à `false` par défaut, et la
-- correction de deux COMMENT qui deviendraient faux avec elle.
--
-- ⚠ CETTE MIGRATION NE CHANGE RIEN AU COMPORTEMENT VISIBLE. La colonne est
-- DORMANTE : aucune fonction ne la lit encore (`estDisponible` est l'étape 2.2)
-- et aucun château n'est basculé. Elle est la fondation, posée seule pour être
-- appliquée sans risque.
--
-- ── POURQUOI UN DRAPEAU, ET PAS UNE SÉMANTIQUE UNIQUE ───────────────────────
--
-- La table `disponibilites` est VIDE. La question « que signifie une date sans
-- ligne ? » n'a pas de bonne réponse globale :
--
--   « absence = disponible »    ce que dit le schéma aujourd'hui. Brancher le
--                               moteur là-dessus rendrait TOUT ouvert sur tout
--                               l'horizon — le piège 1 de l'audit A.
--   « absence = indisponible »  sûr, mais appliqué à tous il FERMERAIT le site
--                               le jour de la bascule : personne n'a saisi une
--                               seule ligne.
--
-- Le drapeau tranche par château, et rend la bascule PROGRESSIVE et RÉVERSIBLE :
--
--   dispo_geree = false  (défaut)  la table n'est PAS consultée. Comportement
--                                  historique conservé (proxy `urgence`).
--   dispo_geree = true             la table FAIT FOI, et l'absence de ligne vaut
--                                  INDISPONIBLE (opt-in).
--
-- ⚠ POURQUOI L'OPT-IN À L'INTÉRIEUR DU MODE GÉRÉ, alors que le commentaire de
-- schéma disait l'inverse. Les deux erreurs ne coûtent pas la même chose : un
-- oubli en opt-in FERME une date — on perd une réservation, c'est rattrapable ;
-- un oubli en opt-out OUVRE une date — on promet une nuit qu'on ne peut pas
-- tenir, et c'est le châtelain qui l'apprend au voyageur. La contrainte
-- anti-survente protège la BASE contre la double vente ; elle ne protège pas la
-- PROMESSE faite à l'écran.
--
-- ⚠ ET C'EST CE DRAPEAU QUI DÉSAMORCE LE PIÈGE DE L'AUDIT A. La règle
-- « remplir la table AVANT toute bascule » cesse d'être une consigne dont il
-- faut se souvenir : basculer devient une opération de DONNÉE (un booléen, par
-- château, après remplissage), et non plus un changement de code global. Si l'on
-- se trompe, on repasse à `false`.
--
-- ── LES DEUX COMMENT CORRIGÉS — ET POURQUOI À LA MAIN ───────────────────────
--
-- `disponibilites` portait : « Absence = disponible au prix par défaut ».
-- Cette phrase devient FAUSSE en mode géré. Elle est reformulée pour décrire les
-- DEUX modes, et un COMMENT est ajouté sur `est_disponible`, qui n'en avait pas.
--
-- ⚠ CORRECTION À LA MAIN, JAMAIS PAR RÉGÉNÉRATION. Un `db dump` serait vrai par
-- construction mais détruirait les 64 COMMENT rédigés à la main de `schema.sql`
-- — c'est là qu'est écrit ce qui a fondé plusieurs audits de ce projet.
--
-- IMPACT — aucun, aujourd'hui. Les 13 châteaux (7 publiés + 6 brouillons)
-- prennent `false` par le DEFAULT et gardent leur comportement.
--
-- IDEMPOTENTE — `ADD COLUMN IF NOT EXISTS`, `COMMENT ON` réécrit sans condition.
-- ============================================================

BEGIN;

-- ── 1. La colonne ───────────────────────────────────────────────────────────
ALTER TABLE public.chateaux
  ADD COLUMN IF NOT EXISTS dispo_geree boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.chateaux.dispo_geree IS
  'Opt-in du moteur de disponibilité. false (défaut) = la table disponibilites est IGNORÉE pour ce château, comportement historique (proxy éditorial urgence). true = la table FAIT FOI, et une date SANS LIGNE vaut INDISPONIBLE. ⚠ Basculer à true un château dont le calendrier n''est pas rempli le FERME entièrement : la bascule se fait APRÈS saisie, château par château (cf. piège 1 de l''audit disponibilités du 22 août 2026).';

-- ── 2. Les deux COMMENT que le drapeau rend faux ────────────────────────────
COMMENT ON TABLE public.disponibilites IS
  'Calendrier disponibilités par chambre. Une ligne = 1 chambre × 1 date. ⚠ L''interprétation d''une date SANS LIGNE dépend de chateaux.dispo_geree : à false (défaut) la table n''est pas consultée du tout ; à true elle fait foi et l''absence de ligne vaut INDISPONIBLE (opt-in — le châtelain ouvre ce qu''il saisit). La formulation antérieure — « Absence = disponible au prix par défaut » — décrivait un opt-out qui n''a jamais été implémenté et qui aurait tout ouvert sur une table vide.';

COMMENT ON COLUMN public.disponibilites.est_disponible IS
  'Ouverture EXPLICITE de la date. false = bloquée (entretien, occupation privée, séjour hors plateforme). ⚠ Ne pas confondre avec l''absence de ligne, qui est une NON-RÉPONSE : cf. le commentaire de la table et chateaux.dispo_geree. Une réservation confirmée n''a pas besoin d''être reportée ici — elle est dérivée à la lecture depuis reservations, comme le palier du Club, pour qu''il n''y ait jamais deux représentations du même fait.';

COMMIT;


-- ============================================================
-- VÉRIFICATION (lecture seule) — à jouer après COMMIT.
-- ① la colonne existe, avec le bon type / NOT NULL / DEFAULT
-- ② aucun château n'est basculé (13 lignes, toutes à false)
-- ③ les trois COMMENT sont posés
-- ============================================================
SELECT 'colonne' AS controle, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'chateaux' AND column_name = 'dispo_geree';

SELECT 'bascules' AS controle,
       count(*)                                      AS chateaux_total,
       count(*) FILTER (WHERE dispo_geree)           AS geres_doit_etre_0,
       count(*) FILTER (WHERE NOT dispo_geree)       AS non_geres
FROM public.chateaux;

SELECT 'comments' AS controle,
       col_description('public.chateaux'::regclass,
         (SELECT attnum FROM pg_attribute
           WHERE attrelid = 'public.chateaux'::regclass AND attname = 'dispo_geree')) IS NOT NULL
         AS chateaux_dispo_geree,
       obj_description('public.disponibilites'::regclass) LIKE '%dispo_geree%'
         AS table_disponibilites_corrigee,
       col_description('public.disponibilites'::regclass,
         (SELECT attnum FROM pg_attribute
           WHERE attrelid = 'public.disponibilites'::regclass AND attname = 'est_disponible')) IS NOT NULL
         AS colonne_est_disponible;
