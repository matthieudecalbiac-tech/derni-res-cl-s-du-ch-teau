/**
 * Referentiel des NATURES de lien château × personnage/événement (liste fermee
 * de 4). SOURCE UNIQUE partagee entre l'admin (select du sous-formulaire
 * "Histoire des lieux") et le futur front. value = slug persiste en base (miroir
 * du CHECK `chateau_personnages_nature_check` + personnageToRow) ; label =
 * libelle lisible affiche a l'utilisateur — jamais le slug a l'écran.
 *
 * Cf. migration 2026-07-16-personnages.sql (CHECK nature).
 */
export const NATURES = [
  { value: "fait_histoire", label: "A fait l'histoire du lieu" },
  { value: "a_habite", label: "A habité les lieux" },
  { value: "evenement", label: "Événement" },
  { value: "histoire_famille", label: "Histoire de famille" },
];

const LIBELLE_PAR_SLUG = new Map(NATURES.map((n) => [n.value, n.label]));

/**
 * Libelle lisible d'un slug de nature. Fallback : le slug brut si inconnu
 * (jamais d'affichage vide). Ex : "a_habite" -> "A habité les lieux".
 *
 * @param {string} slug
 * @returns {string}
 */
export function libelleNature(slug) {
  return LIBELLE_PAR_SLUG.get(slug) ?? slug ?? "";
}
