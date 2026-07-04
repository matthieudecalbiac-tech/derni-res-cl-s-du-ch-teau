-- ============================================================
-- Club des Chatelains : paliers de fidelite + comptage des sejours
-- Convention maison, applique via Dashboard SQL Editor.
-- Le palier n'est PAS stocke : il est DERIVE du nombre de sejours
-- confirmes (infalsifiable). Cette migration cree le referentiel des
-- paliers + la fonction de comptage + une fonction qui derive le palier.
-- ============================================================

-- 1. Referentiel des paliers (donnees de configuration, pas par-utilisateur)
CREATE TABLE IF NOT EXISTS public.paliers (
  id            text PRIMARY KEY,              -- 'hote' | 'habitue' | 'familier' | 'compagnon'
  nom           text NOT NULL,                 -- libelle affiche
  rang          int  NOT NULL,                 -- ordre 0..3 (pour comparer/progresser)
  seuil_sejours int  NOT NULL,                 -- nb de sejours confirmes requis pour ATTEINDRE ce palier
  reduction_pct numeric(5,2) NOT NULL DEFAULT 0, -- % applique aux sejours
  surclassement boolean NOT NULL DEFAULT false,  -- droit au surclassement selon dispo
  nuit_offerte  boolean NOT NULL DEFAULT false,  -- droit a une nuit offerte / an
  newsletter_avant_premiere boolean NOT NULL DEFAULT false,
  avantages     jsonb NOT NULL DEFAULT '[]',   -- liste d'avantages en texte, pour affichage
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 2. Peuplement des 4 paliers (idempotent : upsert)
INSERT INTO public.paliers (id, nom, rang, seuil_sejours, reduction_pct, surclassement, nuit_offerte, newsletter_avant_premiere, avantages)
VALUES
  ('hote', 'Hote', 0, 0, 0, false, false, false,
   '["Acces aux offres reservees au Club", "Newsletter des nouveautes"]'::jsonb),
  ('habitue', 'Habitue', 1, 2, 10, false, false, false,
   '["10% des la 3e reservation", "Avantages Hote"]'::jsonb),
  ('familier', 'Familier', 2, 5, 20, true, false, true,
   '["20% des le 6e sejour", "Surclassement selon disponibilite", "Newsletter en avant-premiere", "Avantages precedents"]'::jsonb),
  ('compagnon', 'Compagnon', 3, 9, 50, true, true, true,
   '["50% des le 10e sejour", "Une nuit offerte au choix dans l annee", "Newsletter en avant-premiere", "Avantages precedents"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  nom = EXCLUDED.nom, rang = EXCLUDED.rang, seuil_sejours = EXCLUDED.seuil_sejours,
  reduction_pct = EXCLUDED.reduction_pct, surclassement = EXCLUDED.surclassement,
  nuit_offerte = EXCLUDED.nuit_offerte, newsletter_avant_premiere = EXCLUDED.newsletter_avant_premiere,
  avantages = EXCLUDED.avantages;

-- 3. RLS : le referentiel des paliers est PUBLIC en lecture (tout le monde peut
--    voir la grille de fidelite), personne ne l'ecrit sauf admin (via service).
ALTER TABLE public.paliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS paliers_select_all ON public.paliers;
CREATE POLICY paliers_select_all ON public.paliers
  FOR SELECT USING (true);

-- (pas de policy INSERT/UPDATE/DELETE cote client : seul le service_role ou
--  une migration modifie la grille. Le client ne peut que lire.)

-- 4. Fonction : compte les sejours CONFIRMES d'un utilisateur.
--    Un "sejour confirme" = reservation en statut 'confirmed' ou 'completed'.
--    SECURITY DEFINER pour lire reservations sans exposer la table au client,
--    mais on filtre STRICTEMENT sur le user passe.
CREATE OR REPLACE FUNCTION public.count_sejours_confirmes(p_user_id uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.reservations
  WHERE user_id = p_user_id
    AND status IN ('confirmed', 'completed');
$$;

-- 5. Fonction : derive le palier courant d'un utilisateur depuis son compteur.
--    Renvoie la ligne paliers correspondant au plus haut seuil atteint.
CREATE OR REPLACE FUNCTION public.palier_du_membre(p_user_id uuid)
RETURNS public.paliers
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.*
  FROM public.paliers p
  WHERE p.seuil_sejours <= public.count_sejours_confirmes(p_user_id)
  ORDER BY p.rang DESC
  LIMIT 1;
$$;
