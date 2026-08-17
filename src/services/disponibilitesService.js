/**
 * Service · Disponibilites Dernieres Cles
 *
 * ┌───────────────────────────────────────────────────────────────────────────┐
 * │  CONTRAT DE DECOUPLAGE — a lire avant toute modification                  │
 * │                                                                           │
 * │  Ce module est le SEUL endroit du depot qui repond a la question « ce      │
 * │  sejour est-il disponible a cette date ? ». Personne d'autre n'a le droit  │
 * │  de le deduire.                                                           │
 * │                                                                           │
 * │  Aujourd'hui, le CORPS de ces fonctions est un PROXY : il lit le champ    │
 * │  editorial `urgence` (J-7 / J-10 / J-15) et en derive une fenetre.        │
 * │  Demain, au sprint disponibilites Supabase, il interrogera la table       │
 * │  `disponibilites`. La bascule consistera a remplacer le CORPS de ces      │
 * │  fonctions — RIEN D'AUTRE. Ni les signatures, ni les appelants.           │
 * │                                                                           │
 * │  ⚠ INTERDIT : reconstruire une regle de disponibilite dans un composant,  │
 * │  un useMemo ou un JSX de calendrier. Le jour de la bascule, une telle     │
 * │  dérivation resterait sur l'ancien proxy en silence, et l'ecran           │
 * │  afficherait deux verites contradictoires.                                │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * Extrait de `DernieresCles.jsx` a l'etape 2 de la refonte Prop 3, sans
 * changement de comportement. La fonction y etait de portee module, donc
 * inaccessible au futur composant calendrier — c'est la raison de l'extraction.
 */
import { joursAvant } from "../utils/dates.js";

/**
 * Fenetres, en jours, derivees du champ editorial `urgence`.
 * Un chateau sans `urgence` reconnue retombe sur la fenetre la plus large.
 *
 * C'est le PROXY. Au sprint Supabase, cette table disparait avec le corps des
 * fonctions ci-dessous.
 */
const FENETRES_URGENCE = { "J-7": 7, "J-10": 10, "J-15": 15 };
const FENETRE_DEFAUT = 15;

/** @param {{urgence?: string}} chateau */
function fenetreDe(chateau) {
  return FENETRES_URGENCE[chateau?.urgence] ?? FENETRE_DEFAUT;
}

/**
 * Les chateaux de `liste` disponibles pour une date d'arrivee donnee.
 *
 * Sans date, la liste est rendue telle quelle : aucune date choisie ne veut pas
 * dire aucune disponibilite, mais « pas encore de question posee ».
 *
 * @param {Array<object>} liste       chateaux deja filtres en amont (offre reelle)
 * @param {Date|null} dateArrivee
 * @returns {Array<object>}           sous-ensemble de `liste`, jamais un ajout
 */
export function chateauxDisponibles(liste, dateArrivee) {
  if (!dateArrivee) return liste;
  const jours = joursAvant(dateArrivee);
  return liste.filter((c) => jours <= fenetreDe(c));
}
