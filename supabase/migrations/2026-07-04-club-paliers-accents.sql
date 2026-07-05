-- Accentuation des donnees du referentiel paliers (noms + avantages jsonb).
-- Applique via Dashboard SQL Editor (copier-coller direct pour preserver l'UTF-8).
-- Idempotent : UPDATE cible par id.

UPDATE public.paliers SET
  nom = 'Hôte',
  avantages = '["Accès aux offres réservées au Club", "Newsletter des nouveautés"]'::jsonb
WHERE id = 'hote';

UPDATE public.paliers SET
  nom = 'Habitué',
  avantages = '["10% dès la 3e réservation", "Avantages Hôte"]'::jsonb
WHERE id = 'habitue';

UPDATE public.paliers SET
  nom = 'Familier',
  avantages = '["20% dès le 6e séjour", "Surclassement selon disponibilité", "Newsletter en avant-première", "Avantages précédents"]'::jsonb
WHERE id = 'familier';

UPDATE public.paliers SET
  nom = 'Compagnon',
  avantages = '["50% dès le 10e séjour", "Une nuit offerte au choix dans l''année", "Newsletter en avant-première", "Avantages précédents"]'::jsonb
WHERE id = 'compagnon';
