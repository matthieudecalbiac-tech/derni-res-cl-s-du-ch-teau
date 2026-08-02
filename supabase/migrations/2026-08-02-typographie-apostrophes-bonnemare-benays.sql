-- ============================================================
-- TYPOGRAPHIE — apostrophe droite (U+0027) -> apostrophe courbe (U+2019)
-- Chateau de Bonnemare + Chateau Royal de Benays
--
-- POURQUOI. Les deux migrations d'insertion du 2 aout ont repris la prose de
-- leur fiche source telle quelle, apostrophes droites comprises. Or la base
-- ecrit en ’ : Blanc Buisson, Le Boulay-Morin, La Riviere et Saint-Paterne n'ont
-- pas UNE seule apostrophe droite. Seul Briottieres en porte 8, dette anterieure
-- assumee et tracee dans qa-baseline.json. Les deux nouveaux chateaux en ont
-- introduit 110, soit 51 champs signales par l'agent validation-donnees et une
-- CI rouge.
--
-- On corrige donc la SOURCE, pas le seuil. Les deux fichiers d'insertion ont ete
-- corriges dans le meme commit : rejouer un bootstrap complet produit desormais
-- directement du ’, et cette migration devient un no-op sur une base neuve.
--
-- PERIMETRE. Strictement les deux chateaux. Les 8 apostrophes de Briottieres ne
-- sont PAS touchees : dette distincte, anterieure, deja absorbee par la baseline
-- (max=11). Les elargir serait un changement editorial non demande.
--
-- ⚠ UNE COLONNE AU-DELA DES 51 SIGNALES : chateau_personnages.texte (6
--   occurrences, Bonnemare seul). L'agent ne controle pas ce champ aujourd'hui,
--   donc ces 6 n'apparaissent dans aucun avertissement. Elles sont pourtant de
--   la prose affichee en vitrine (onglet « Histoire des lieux »), ecrite dans la
--   meme passe et avec le meme defaut. Les laisser, c'est garder une incoherence
--   invisible qui ressortira le jour ou l'agent couvrira les personnages.
--   Retirer le bloc 6 si l'on veut s'en tenir au strict perimetre de la CI.
--
-- NON TOUCHEE : la table `personnages` elle-meme. Elle est PARTAGEE entre
-- chateaux, et aucun de ses `nom` ne porte d'apostrophe. Y toucher renommerait
-- des personnages sur les fiches d'autres chateaux.
--
-- ── IDEMPOTENCE ─────────────────────────────────────────────────────────────
-- replace() est idempotent par nature : il ne reste plus rien a remplacer au
-- second passage. La garde LIKE de chaque UPDATE fait mieux — elle ne selectionne
-- aucune ligne, donc aucune ecriture, donc aucun updated_at remue pour rien.
--
-- ── MESURE PREALABLE (base interrogee le 2 aout 2026) ───────────────────────
--   chateaux              22 + 22   Bonnemare / Benays
--   chambres              16 +  9
--   chateau_alentours      6 + 12
--   chateau_timeline       1 +  3
--   chateau_amenities      0 +  5
--   chateau_personnages    6 +  0
--   ─────────────────────────────
--   TOTAL                 51 + 59  = 110, exactement le compte des deux .sql.
-- ============================================================

BEGIN;

-- Les deux chateaux concernes, resolus une fois.
CREATE TEMP TABLE cibles ON COMMIT DROP AS
  SELECT id FROM public.chateaux
   WHERE slug IN ('chateau-de-bonnemare', 'chateau-royal-de-benays');

-- ── 1. chateaux — 13 colonnes de prose ──────────────────────────────────────
UPDATE public.chateaux SET
  accroche                       = replace(accroche,                       chr(39), '’'),
  style                          = replace(style,                          chr(39), '’'),
  histoire                       = replace(histoire,                       chr(39), '’'),
  description                    = replace(description,                    chr(39), '’'),
  region_narrative               = replace(region_narrative,               chr(39), '’'),
  region_histoire                = replace(region_histoire,                chr(39), '’'),
  prop_citation                  = replace(prop_citation,                  chr(39), '’'),
  prop_description               = replace(prop_description,               chr(39), '’'),
  accroche_journal_histoire      = replace(accroche_journal_histoire,      chr(39), '’'),
  accroche_journal_proprietaires = replace(accroche_journal_proprietaires, chr(39), '’'),
  accroche_barre_permanent       = replace(accroche_barre_permanent,       chr(39), '’'),
  accroche_barre_club            = replace(accroche_barre_club,            chr(39), '’'),
  titre_journal_histoire         = replace(titre_journal_histoire,         chr(39), '’')
WHERE id IN (SELECT id FROM cibles)
  -- Garde : au moins une des 13 colonnes porte une apostrophe droite.
  AND (coalesce(accroche,'') || coalesce(style,'') || coalesce(histoire,'')
    || coalesce(description,'') || coalesce(region_narrative,'')
    || coalesce(region_histoire,'') || coalesce(prop_citation,'')
    || coalesce(prop_description,'') || coalesce(accroche_journal_histoire,'')
    || coalesce(accroche_journal_proprietaires,'') || coalesce(accroche_barre_permanent,'')
    || coalesce(accroche_barre_club,'') || coalesce(titre_journal_histoire,'')
      ) LIKE '%' || chr(39) || '%';

-- ── 2. chambres ─────────────────────────────────────────────────────────────
UPDATE public.chambres SET description = replace(description, chr(39), '’')
 WHERE chateau_id IN (SELECT id FROM cibles)
   AND description LIKE '%' || chr(39) || '%';

-- ── 3. chateau_timeline ─────────────────────────────────────────────────────
UPDATE public.chateau_timeline SET evenement = replace(evenement, chr(39), '’')
 WHERE chateau_id IN (SELECT id FROM cibles)
   AND evenement LIKE '%' || chr(39) || '%';

-- ── 4. chateau_alentours ────────────────────────────────────────────────────
UPDATE public.chateau_alentours SET description = replace(description, chr(39), '’')
 WHERE chateau_id IN (SELECT id FROM cibles)
   AND description LIKE '%' || chr(39) || '%';

-- ── 5. chateau_amenities — nom ET description ───────────────────────────────
UPDATE public.chateau_amenities SET
  nom         = replace(nom,         chr(39), '’'),
  description = replace(description, chr(39), '’')
 WHERE chateau_id IN (SELECT id FROM cibles)
   AND (coalesce(nom,'') || coalesce(description,'')) LIKE '%' || chr(39) || '%';

-- ── 6. chateau_personnages — hors perimetre CI, cf. avertissement en tete ───
UPDATE public.chateau_personnages SET texte = replace(texte, chr(39), '’')
 WHERE chateau_id IN (SELECT id FROM cibles)
   AND texte LIKE '%' || chr(39) || '%';

COMMIT;

-- ============================================================
-- VERIFICATIONS (lecture seule ; le Dashboard n'affiche que le DERNIER resultat)
-- ============================================================

-- (A) Plus AUCUNE apostrophe droite sur les deux chateaux. Attendu : 6 lignes a 0.
WITH cibles AS (
  SELECT id, slug FROM public.chateaux
   WHERE slug IN ('chateau-de-bonnemare', 'chateau-royal-de-benays')
)
SELECT 'chateaux' AS table_, count(*) AS lignes_restantes FROM public.chateaux c
 WHERE c.id IN (SELECT id FROM cibles)
   AND (coalesce(c.accroche,'') || coalesce(c.style,'') || coalesce(c.histoire,'')
     || coalesce(c.description,'') || coalesce(c.region_narrative,'')
     || coalesce(c.region_histoire,'') || coalesce(c.prop_citation,'')
     || coalesce(c.prop_description,'') || coalesce(c.accroche_journal_histoire,'')
     || coalesce(c.accroche_journal_proprietaires,'') || coalesce(c.accroche_barre_permanent,'')
     || coalesce(c.accroche_barre_club,'') || coalesce(c.titre_journal_histoire,'')
       ) LIKE '%' || chr(39) || '%'
UNION ALL SELECT 'chambres', count(*) FROM public.chambres
 WHERE chateau_id IN (SELECT id FROM cibles) AND description LIKE '%' || chr(39) || '%'
UNION ALL SELECT 'chateau_timeline', count(*) FROM public.chateau_timeline
 WHERE chateau_id IN (SELECT id FROM cibles) AND evenement LIKE '%' || chr(39) || '%'
UNION ALL SELECT 'chateau_alentours', count(*) FROM public.chateau_alentours
 WHERE chateau_id IN (SELECT id FROM cibles) AND description LIKE '%' || chr(39) || '%'
UNION ALL SELECT 'chateau_amenities', count(*) FROM public.chateau_amenities
 WHERE chateau_id IN (SELECT id FROM cibles)
   AND (coalesce(nom,'') || coalesce(description,'')) LIKE '%' || chr(39) || '%'
UNION ALL SELECT 'chateau_personnages', count(*) FROM public.chateau_personnages
 WHERE chateau_id IN (SELECT id FROM cibles) AND texte LIKE '%' || chr(39) || '%';

-- (B) Preuve que le ’ est bien arrive. Attendu : deux extraits en ’.
SELECT slug, left(accroche, 72) AS accroche_debut
  FROM public.chateaux
 WHERE slug IN ('chateau-de-bonnemare', 'chateau-royal-de-benays')
 ORDER BY slug;

-- (C) Briottieres reste INTACT — la dette anterieure n'a pas ete touchee.
--     Attendu : true (il porte toujours ses apostrophes droites).
SELECT slug,
       (coalesce(histoire,'') || coalesce(description,'') || coalesce(region_narrative,''))
         LIKE '%' || chr(39) || '%' AS porte_encore_des_apostrophes_droites
  FROM public.chateaux WHERE slug = 'les-briottieres';
