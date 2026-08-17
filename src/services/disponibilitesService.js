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
import { getChateaux } from "./chateauxService.js";
import { getSlugsAvecOffreDernieresCles } from "./offresService.js";

/**
 * Fenetres, en jours, derivees du champ editorial `urgence`.
 * Un chateau sans `urgence` reconnue retombe sur la fenetre la plus large.
 *
 * C'est le PROXY. Au sprint Supabase, cette table disparait avec le corps des
 * fonctions ci-dessous.
 */
const FENETRES_URGENCE = { "J-7": 7, "J-10": 10, "J-15": 15 };
const FENETRE_DEFAUT = 15;

/** Horizon au-dela duquel on ne sait rien — donc rien n'est ouvert. */
const HORIZON_JOURS = 30;

/** @param {{urgence?: string}} chateau */
function fenetreDe(chateau) {
  return FENETRES_URGENCE[chateau?.urgence] ?? FENETRE_DEFAUT;
}

/**
 * Minuit local du jour de `d`. Sert a compter en JOURS PLEINS.
 *
 * ⚠ POURQUOI PAS `joursAvant` DE utils/dates.js. Ce helper compare a
 * `new Date()` — l'heure courante — avec un `Math.round`. Or les cases du
 * calendrier sont creees a minuit (`genererGrilleMois`). Mesure du 2026-08-17 :
 *
 *     il est 01h  ->  joursAvant(demain) = 1   selectionnable
 *     il est 14h  ->  joursAvant(demain) = 0   EXCLU
 *
 * Le dernier jour ouvert glissait donc d'un cran selon l'heure de la journee, et
 * la meme page affichait deux verites differentes le matin et l'apres-midi. Une
 * regle de disponibilite ne peut pas dependre de l'heure a laquelle on la lit :
 * on compte ici de minuit a minuit.
 */
function minuit(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Nombre de jours pleins entre aujourd'hui et `d`. Negatif dans le passe. */
function joursPleinsAvant(d) {
  return Math.round((minuit(d) - minuit(new Date())) / 86400000);
}

/** Cle de jour, format interne. Volontairement PRIVEE : voir predicatDateOuverte. */
function cleJour(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  const jours = joursPleinsAvant(dateArrivee);
  return liste.filter((c) => jours <= fenetreDe(c));
}

/**
 * LA FONCTION SŒUR — « quelles dates ont une offre ? »
 *
 * `chateauxDisponibles` repond « quels chateaux pour cette date ». Celle-ci
 * repond la question INVERSE, celle dont le calendrier a besoin pour ne plus
 * ouvrir uniformement les trente prochains jours.
 *
 * ┌───────────────────────────────────────────────────────────────────────────┐
 * │  DEUXIEME ET DERNIER POINT DE BASCULE, soeur de chateauxDisponibles.      │
 * │                                                                           │
 * │  CORPS AUJOURD'HUI — proxy, en deux facteurs :                            │
 * │    (1) offre REELLE : le chateau a une offre Module B visible en base      │
 * │        (`getSlugsAvecOffreDernieresCles`, requete Supabase) ;              │
 * │    (2) fenetre PROXY : la date tombe dans la fenetre derivee de son champ  │
 * │        editorial `urgence` (J-7 / J-10 / J-15).                            │
 * │  Une date est ouverte s'il existe AU MOINS UN chateau qui satisfait les    │
 * │  deux. C'est une union sur le catalogue, pas une intersection de dates.    │
 * │                                                                           │
 * │  CORPS DEMAIN — une lecture de la table `disponibilites`. Le facteur (2)   │
 * │  disparait, le facteur (1) devient implicite. La SIGNATURE ne change pas,  │
 * │  et c'est pour cela qu'elle est deja `async` : elle l'est aujourd'hui sans │
 * │  en avoir strictement besoin, afin que la bascule ne touche que le corps.  │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * COUT ASSUME : cette fonction refait la requete des slugs que l'overlay
 * effectue de son cote pour filtrer sa grille — `getSlugsAvecOffreDernieresCles`
 * n'a pas de cache, contrairement a `getChateaux` (Map, TTL 5 min). Une petite
 * requete de plus a l'ouverture, donc, et c'est un choix : passer les donnees en
 * argument aurait fige une signature qui ne survivrait pas a la bascule. Le
 * doublon disparait avec le facteur (1), le jour du sprint dispo.
 *
 * @param {{horizonJours?: number}} [options]
 * @returns {Promise<Set<string>>} cles internes des jours ouverts — a ne jamais
 *   lire directement : construire le predicat avec `predicatDateOuverte`.
 */
export async function datesAvecOffre({ horizonJours = HORIZON_JOURS } = {}) {
  const [chateaux, slugsAvecOffre] = await Promise.all([
    getChateaux(),
    getSlugsAvecOffreDernieresCles(),
  ]);

  // Facteur (1) : on ne garde que les chateaux dont l'offre existe VRAIMENT.
  const avecOffre = (chateaux ?? []).filter((c) => slugsAvecOffre.has(c.slug));

  // Facteur (2) : pour chaque jour de l'horizon, un seul chateau suffit.
  const ouvertes = new Set();
  const aujourdhui = new Date();
  for (let j = 1; j <= horizonJours; j++) {
    if (!avecOffre.some((c) => j <= fenetreDe(c))) continue;
    const d = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate() + j);
    ouvertes.add(cleJour(d));
  }
  return ouvertes;
}

/**
 * Fabrique le predicat que consomme le calendrier, depuis le Set rendu par
 * `datesAvecOffre`.
 *
 * POURQUOI UNE FABRIQUE, et pas un Set lu directement dans le composant : le
 * format de cle est un detail d'implementation de ce module. Si le composant
 * ecrivait `set.has(uneCleQu'ilFabrique)`, il porterait une part de la regle —
 * et le jour de la bascule, la cle changerait de forme sans que personne ne
 * pense a lui. Ici, le composant ne connait que « ouvert ou non ».
 *
 * @param {Set<string>|null} datesOuvertes  le Set, ou null tant qu'il charge
 * @returns {(d: Date) => boolean}
 */
export function predicatDateOuverte(datesOuvertes) {
  return (d) => Boolean(d && datesOuvertes && datesOuvertes.has(cleJour(d)));
}
