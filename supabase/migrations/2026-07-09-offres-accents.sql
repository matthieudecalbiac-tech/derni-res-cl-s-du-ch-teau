-- Correction de l'encodage de l'offre "Dernieres Cles" des Briottieres :
-- ses accents avaient ete inseres en UTF-8 lu comme Latin-1 (Ã¨, â€"...).
-- Applique via Dashboard SQL Editor (copier-coller direct preserve l'UTF-8).

UPDATE public.offres SET
  titre = 'Les Dernières Clés du moment — Chambre Verte',
  description = 'Une nuit dans la chambre la plus demandée du château, à un tarif privilégié. Cinquante hectares de parc à l''anglaise, dîner aux chandelles à la table d''hôtes, lumière du matin sur le bocage angevin.'
WHERE id = '7e7b6a5c-9876-5432-8abc-def012345abc';
