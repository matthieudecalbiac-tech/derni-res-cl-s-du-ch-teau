-- ============================================================
-- Statut de publication des chateaux.
--
-- Jusqu'ici, tout chateau insere etait immediatement public : la policy de
-- lecture etait USING (true). Cela convenait a une saisie par SQL, a froid.
-- La saisie depuis l'interface d'administration se fera a plusieurs mains et
-- sur plusieurs seances : une fiche doit pouvoir etre preparee sans etre vue.
--
-- Trois etats. On prepare (brouillon), on diffuse (publie), on retire sans
-- detruire (archive) : les reservations passees d'un chateau archive restent
-- coherentes, seule sa fiche quitte le catalogue.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chateau_statut') THEN
    CREATE TYPE public.chateau_statut AS ENUM ('brouillon', 'publie', 'archive');
  END IF;
END$$;

-- La colonne nait avec 'publie' : les huit chateaux existants restent visibles.
-- Sans cette precaution, le site se viderait a l'instant de la migration.
ALTER TABLE public.chateaux
  ADD COLUMN IF NOT EXISTS statut public.chateau_statut NOT NULL DEFAULT 'publie';

-- Une fois l'existant sauve, les futurs chateaux naissent en brouillon.
ALTER TABLE public.chateaux
  ALTER COLUMN statut SET DEFAULT 'brouillon';

-- Le catalogue public se filtre par statut ; les brouillons restent visibles
-- de leur chatelain et de l'administration.
DROP POLICY IF EXISTS chateaux_select_public ON public.chateaux;
CREATE POLICY chateaux_select_public ON public.chateaux
  FOR SELECT
  USING (
    statut = 'publie'
    OR is_chatelain_of(id)
    OR is_admin()
  );

-- Le catalogue public interroge cette colonne a chaque requete.
CREATE INDEX IF NOT EXISTS chateaux_statut_idx ON public.chateaux (statut);
