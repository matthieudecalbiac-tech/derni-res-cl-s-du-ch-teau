-- ============================================================
-- LCC — Anti-survente : deux séjours confirmés ne peuvent plus se chevaucher
-- ============================================================
--
-- QUOI — une contrainte d'exclusion PARTIELLE sur `reservations` : pour une
-- même chambre, deux lignes en `confirmed` ou `completed` ne peuvent plus
-- couvrir des dates qui se recouvrent.
--
-- POURQUOI — audit du moteur de disponibilité, 22 août 2026. RIEN n'empêchait
-- de vendre deux fois la même nuit :
--
--   · L'EDGE FUNCTION NE REGARDE PAS LES DATES. Ses trois refus `ERR_INDISPO`
--     couvrent le château (publié + `sur_place`, :176), l'appartenance de la
--     chambre (:194) et l'activité du module A (:248). Aucun n'est un contrôle
--     de créneau : elle insère `date_arrivee` / `date_depart` sans jamais
--     demander si la période est libre.
--   · LA BASE NON PLUS. Les contraintes de `reservations` portent sur l'ordre
--     des dates, le prix, la longueur du message, la cohérence de la commission,
--     du payout et de l'annulation. Aucune sur le chevauchement.
--
-- Aujourd'hui le châtelain arbitre à la main, et cela tient parce qu'il n'y a ni
-- paiement ni volume. Cela ne tiendra plus dès l'un ou l'autre.
--
-- ⚠ MESURE PRÉALABLE : 0 chevauchement existant en base (22 août). La contrainte
-- s'installe donc sans rien rejeter — aucun nettoyage n'était nécessaire.
--
-- ── POURQUOI `pending` N'OCCUPE PAS — décision produit, pas contrainte technique
--
-- Seuls `confirmed` et `completed` occupent. Plusieurs demandes `pending`
-- peuvent donc viser les mêmes dates, et c'est LA CONFIRMATION QUI TRANCHE : la
-- seconde sera rejetée par cette contrainte.
--
-- L'alternative — faire occuper `pending` — protégerait le visiteur plus tôt,
-- mais changerait le modèle : le sous-audit B a établi que le produit est un
-- FLUX DE DEMANDE ARBITRÉ, pas une réservation instantanée. Elle retirerait au
-- châtelain le choix entre deux candidats.
--
-- ⚠ ET ELLE GÈLERAIT L'INVENTAIRE. `repondre_demande` refuse de retraiter une
-- demande (`status <> 'pending'` -> exception), et AUCUNE EXPIRATION AUTOMATIQUE
-- DES `pending` N'EXISTE : une demande jamais répondue bloquerait la chambre
-- pour toujours, sans que rien ne vienne la libérer.
--
-- ── POURQUOI `'[)'` — arrivée incluse, départ EXCLU
--
-- Ce n'est pas une préférence. Sans cette borne, un départ le 10 et une arrivée
-- le 10 seraient en conflit alors que la chambre est LIBRE ce soir-là : on
-- refuserait une réservation parfaitement valide. La contrainte existante
-- `reservations_dates_valides` (`date_depart > date_arrivee`) garantit qu'aucune
-- plage n'est vide, donc jamais ignorée par l'opérateur `&&`.
--
-- ── CE QUE CETTE MIGRATION NE FAIT PAS
--
-- ⚠ C'est la COUCHE 1 sur trois, et elle est volontairement seule. Une violation
-- remonte ici en `23P01` (`exclusion_violation`) — une erreur SQL BRUTE, que le
-- visiteur ne doit jamais voir. Deux couches applicatives suivront, dans des
-- chantiers distincts :
--
--   2. `demande-reservation` : un contrôle lisible avant l'INSERT (409, message
--      propre) — ⚠ il ne remplacera PAS cette contrainte : entre sa lecture et
--      son écriture il reste une fenêtre de course que seule la base ferme.
--   3. `repondre_demande` : capter `23P01` et rendre au châtelain « ces dates
--      viennent d'être confirmées ailleurs » plutôt qu'une erreur Postgres.
--
-- Aucune Edge Function n'est touchée ici.
--
-- IMPACT — deux réservations `confirmed`/`completed` ne peuvent plus se
-- chevaucher sur une même chambre. Les `pending` sont inchangés : le parcours de
-- demande du site continue de fonctionner à l'identique.
--
-- ⚠ `ADD CONSTRAINT ... EXCLUDE` prend un ACCESS EXCLUSIVE lock et scanne la
-- table. Instantané sur 9 lignes ; ce ne le sera plus un jour.
--
-- IDEMPOTENTE — `CREATE EXTENSION IF NOT EXISTS` + DROP-then-ADD, l'idiome du
-- dépôt (cf. `2026-07-17-reservation-garde-fous.sql` : « pas d'ADD CONSTRAINT
-- IF NOT EXISTS en PG »).
-- ============================================================

BEGIN;

-- `btree_gist` est requis pour mêler un opérateur d'égalité (`chambre_id WITH =`)
-- à un opérateur de recouvrement dans un même index GiST. Mesuré le 22 août :
-- l'extension est DISPONIBLE mais n'était pas installée.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_pas_de_chevauchement;

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_pas_de_chevauchement
  EXCLUDE USING gist (
    chambre_id WITH =,
    daterange(date_arrivee, date_depart, '[)') WITH &&
  )
  WHERE (status IN ('confirmed', 'completed'));

COMMENT ON CONSTRAINT reservations_pas_de_chevauchement ON public.reservations IS
  'Anti-survente : deux séjours CONFIRMÉS ou COMPLÉTÉS ne peuvent pas se chevaucher sur une même chambre. Partielle — pending exclu, l''arbitrage du châtelain est préservé et la confirmation tranche. Borne [) : départ J = arrivée J n''est PAS un conflit.';

COMMIT;


-- ============================================================
-- VÉRIFICATION (lecture seule) — à jouer après COMMIT.
-- ============================================================
-- La contrainte est-elle en place, et sur la bonne clause ?
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.reservations'::regclass
  AND conname = 'reservations_pas_de_chevauchement';
