-- ============================================================
-- chateaux.mode_paiement — mode de paiement du CHÂTEAU (pas du voyageur)
--
-- Le mode appartient au CHÂTEAU : un châtelain accepte les cartes ou non. Même
-- geste que mode_dispo. 'en_ligne' est DÉCLARÉ mais NON IMPLÉMENTÉ : Stripe n'est
-- pas branché, l'immatriculation Atout France n'est pas faite.
--
-- text + CHECK (pas enum PG) : une taxonomie qui bougera (acompte ? mixte ?) se
-- modifie par DROP/ADD CONSTRAINT transactionnel ; un ALTER TYPE (enum) non
-- (recréation du type + réécriture de la colonne). Même raison que categorie et
-- nature.
--
-- Idempotent (ADD COLUMN IF NOT EXISTS). Enveloppé dans une transaction : un
-- ALTER en échec ne laisse pas la table à moitié modifiée.
-- ============================================================

BEGIN;

ALTER TABLE public.chateaux
  ADD COLUMN IF NOT EXISTS mode_paiement text
    NOT NULL DEFAULT 'sur_place'
    CHECK (mode_paiement IN ('sur_place', 'en_ligne'));

COMMENT ON COLUMN public.chateaux.mode_paiement IS
  'Mode de paiement du CHÂTEAU (pas du voyageur) : un châtelain accepte les cartes ou non. Valeurs : sur_place | en_ligne. en_ligne DÉCLARÉ mais NON IMPLÉMENTÉ (Stripe non branché, immatriculation Atout France non faite). text + CHECK (pas enum) : taxonomie éditoriale volatile, modifiable par DROP/ADD CONSTRAINT.';

COMMIT;

-- ============================================================
-- VÉRIFICATION (lecture seule) — colonne présente, text, NOT NULL, défaut sur_place.
-- ============================================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'chateaux' AND column_name = 'mode_paiement';
