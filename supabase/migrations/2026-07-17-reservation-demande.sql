-- ============================================================
-- reservations.voyageurs + reservations.message — tunnel de demande (sur_place)
--
-- Le tunnel de demande (mode sur_place) porte un nombre de voyageurs et un
-- message libre du visiteur. Aucune colonne n'existait pour ça sur reservations.
--
-- voyageurs : integer NOT NULL DEFAULT 2 (défaut aligné sur l'UI VitrineChateau).
--   CHECK (voyageurs > 0 AND voyageurs <= 50) : la borne HAUTE protège la fonction
--   serveur à venir — un champ numérique libre est une porte d'entrée. 50 est
--   arbitraire mais large : une réservation cible UNE chambre, dont capacite est
--   déjà bornée BETWEEN 1 AND 20 ; l'UI plafonne même à 8. 50 = marge, jamais
--   atteint.
-- message : text NULLABLE — le visiteur n'est pas obligé d'écrire.
--
-- Idempotent (ADD COLUMN IF NOT EXISTS). Enveloppé dans une transaction : un
-- ALTER en échec ne laisse pas la table à moitié modifiée.
-- ============================================================

BEGIN;

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS voyageurs integer NOT NULL DEFAULT 2
    CHECK (voyageurs > 0 AND voyageurs <= 50);

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS message text;

COMMENT ON COLUMN public.reservations.voyageurs IS
  'Nombre de voyageurs de la demande. NOT NULL DEFAULT 2 (aligné sur l''UI VitrineChateau). CHECK 1..50 : borne haute pour protéger la fonction serveur à venir (champ numérique libre). Une résa = une chambre (capacite ≤ 20), l''UI plafonne à 8 ; 50 = marge jamais atteinte.';
COMMENT ON COLUMN public.reservations.message IS
  'Message libre du visiteur à la demande (mode sur_place). Nullable : facultatif.';

COMMIT;

-- ============================================================
-- VÉRIFICATION (lecture seule) — les 2 colonnes présentes.
-- ============================================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'reservations'
  AND column_name IN ('voyageurs', 'message')
ORDER BY column_name;
