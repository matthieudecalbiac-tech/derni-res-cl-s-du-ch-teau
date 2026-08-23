-- ============================================================
-- LCC — moteur 2.5 (préalable) : EXECUTE des fonctions de disponibilité
--                                 accordé à `service_role`
-- ============================================================
--
-- QUOI — quatre `GRANT EXECUTE`, rien d'autre. Aucun corps de fonction n'est
-- touché, aucune table, aucune policy.
--
-- ── LA MESURE QUI A DÉCLENCHÉ CETTE MIGRATION (23 août 2026) ────────────────
--
--     est_disponible              execute_service_role = FALSE
--     chateau_disponible          execute_service_role = FALSE
--     jours_disponibles_chambre   execute_service_role = FALSE
--     jours_disponibles_chateau   execute_service_role = FALSE
--
-- ⚠ ET LE DÉFAUT QUE CELA AURAIT PRODUIT EST PIRE QU'UNE PANNE. L'étape 2.5
-- ajoute un contrôle des dates dans `demande-reservation`, qui tourne en
-- `service_role`. Sa règle de repli est « ouvrir sur échec » : une erreur de
-- lecture ne doit pas couper le tunnel de demande. Sans ce GRANT, l'appel aurait
-- donc échoué en 42501 à CHAQUE demande, journalisé, et n'aurait JAMAIS rien
-- bloqué. Un correctif inerte, déployé, et invisible.
--
-- ── POURQUOI CE N'EST PAS UNE DÉCISION DE PRIVILÈGE ─────────────────────────
--
-- ⚠ CE GRANT N'OUVRE AUCUN POUVOIR NOUVEAU. `service_role` lit déjà
-- `reservations`, `chambres`, `chateaux` et `disponibilites` EN DIRECT, en
-- contournant la RLS — c'est sa définition. Ces quatre fonctions ne rendent
-- qu'un booléen ou des dates, calculés à partir de tables qu'il peut déjà
-- interroger sans elles. Le refuser ne protégeait rien ; l'accorder n'ouvre
-- rien. C'est de la plomberie, pas de la sécurité.
--
-- ⚠ LE `REVOKE ... FROM PUBLIC` DE 2.2 ET 2.3 VISAIT L'ACCÈS NON IDENTIFIÉ,
-- PAS LE BACKEND. Il retirait le droit implicite que Postgres accorde à tous
-- sur une fonction fraîchement créée, pour le réaccorder nommément à `anon` et
-- `authenticated`. `service_role` n'a pas été écarté par décision — il a été
-- oublié par effet de bord. Ne pas relire cette migration comme un
-- assouplissement d'un choix antérieur : elle répare une omission.
--
-- ── POURQUOI LES QUATRE, ET PAS SEULEMENT `est_disponible` ──────────────────
--
-- Seule `est_disponible` est appelée par l'étape 2.5. N'accorder qu'elle
-- recréerait EXACTEMENT le piège qu'on vient de payer : dans six mois,
-- quelqu'un appellera `jours_disponibles_chambre` depuis une Edge Function —
-- pour proposer des dates alternatives dans un email, pour un écran d'admin —
-- recevra un 42501, et devra redécouvrir toute cette histoire.
--
-- Le jeu de droits doit décrire QUI PEUT exécuter, pas qui exécute aujourd'hui.
-- Et comme le GRANT n'accorde aucun pouvoir réel (ci-dessus), l'argument du
-- moindre privilège n'a ici aucune prise : il n'y a pas de privilège à
-- économiser.
--
-- IMPACT — aucun comportement ne change. Rien n'appelle encore ces fonctions
-- côté serveur : le contrôle de `demande-reservation` est déployé SÉPARÉMENT,
-- et APRÈS. ⚠ L'ordre n'est pas négociable — dans l'autre sens, la fonction
-- déployée échouerait à chaque appel sans rien bloquer, en silence.
--
-- IDEMPOTENTE — `GRANT` l'est par nature.
-- Pas de rétro-port dans schema.sql : convention du dépôt, les RPC métier
-- vivent dans leurs migrations.
-- ============================================================

BEGIN;

GRANT EXECUTE ON FUNCTION public.est_disponible(uuid, date, date)            TO service_role;
GRANT EXECUTE ON FUNCTION public.chateau_disponible(uuid, date, date)        TO service_role;
GRANT EXECUTE ON FUNCTION public.jours_disponibles_chambre(uuid, date, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.jours_disponibles_chateau(uuid, date, date) TO service_role;

COMMIT;


-- ============================================================
-- VÉRIFICATION (lecture seule) — L'UNIQUE SELECT DU FICHIER.
-- Attendu : 4 lignes ; service_role, anon et authenticated a `true` ;
-- public a `false` (le REVOKE de 2.2/2.3 tient toujours).
-- ⚠ NE RIEN AJOUTER APRES : le SQL Editor n'affiche que le dernier resultat.
-- ============================================================
SELECT
  p.proname,
  has_function_privilege('service_role',  p.oid, 'EXECUTE') AS execute_service_role,
  has_function_privilege('anon',          p.oid, 'EXECUTE') AS execute_anon,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS execute_authenticated,
  has_function_privilege('public',        p.oid, 'EXECUTE') AS execute_public_doit_etre_false
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('est_disponible', 'chateau_disponible',
                    'jours_disponibles_chambre', 'jours_disponibles_chateau')
ORDER BY p.proname;
