-- La policy RLS paliers_select_all filtre les lignes, mais Postgres exige
-- d'abord un GRANT table. Sans lui : erreur 42501. Grille publique en lecture.
GRANT SELECT ON public.paliers TO anon, authenticated;
