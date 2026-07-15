/**
 * Referentiel des categories editoriales de service (liste fermee de 6).
 * SOURCE UNIQUE partagee entre l'admin (select du formulaire amenities) et le
 * front (filtre "Espace detente", recap de PageResultats). value = slug persiste
 * en base (miroir du CHECK `chateau_amenities_categorie_check` + amenityToRow) ;
 * label = libelle lisible affiche a l'utilisateur.
 *
 * Cf. migration 2026-07-15-amenity-categorie.
 */
export const CATEGORIES = [
  { value: "bien_etre", label: "Bien-être & détente" },
  { value: "gastronomie", label: "Gastronomie" },
  { value: "sport", label: "Sport & plein air" },
  { value: "nature", label: "Nature" },
  { value: "culture", label: "Culture & patrimoine" },
  { value: "famille", label: "Famille" },
];

const LIBELLE_PAR_SLUG = new Map(CATEGORIES.map((c) => [c.value, c.label]));

/**
 * Libelle lisible d'un slug de categorie. Fallback : le slug brut si inconnu
 * (jamais d'affichage vide). Ex : "bien_etre" -> "Bien-être & détente".
 *
 * @param {string} slug
 * @returns {string}
 */
export function libelleCategorie(slug) {
  return LIBELLE_PAR_SLUG.get(slug) ?? slug ?? "";
}
