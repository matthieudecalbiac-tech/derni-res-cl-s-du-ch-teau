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
import { supabase } from "../lib/supabase.js";
import { logErreurSupabase } from "../utils/logSupabase.js";
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

/**
 * Cle de jour, "YYYY-MM-DD" construit sur les composantes LOCALES.
 * Volontairement PRIVEE : voir predicatDateOuverte.
 *
 * ⚠ DEUX ROLES DEPUIS L'ETAPE 2.4, et le second est un garde-fou :
 *   1. cle interne du Set rendu par datesAvecOffre ;
 *   2. FORMAT DE TRANSPORT vers Postgres pour les quatre fonctions du moteur.
 * Cf. versJour() plus bas — on n'envoie JAMAIS un objet Date a une RPC.
 */
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


// ═══════════════════════════════════════════════════════════════════════════
// ⚠ SECONDE MOITIE DU MODULE — LE MOTEUR, BRANCHE SUR LA BASE (etape 2.4)
// ═══════════════════════════════════════════════════════════════════════════
//
// Tout ce qui precede repond a la disponibilite par le PROXY editorial
// `urgence` : une fiction, mesuree le 22 aout comme ne discriminant rien (les
// sept demeures servies aboutissaient a la meme fenetre de quinze jours).
//
// Ce qui suit interroge les VRAIES donnees — reservations confirmees et
// calendrier saisi — par quatre fonctions SQL posees aux etapes 2.2 et 2.3.
//
// ⚠ LES DEUX MOITIES COEXISTENT VOLONTAIREMENT. Les trois fonctions
// historiques ne sont PAS modifiees : ce sont elles que l'ecran consomme
// aujourd'hui, et leur remplacement est l'ETAPE 4, apres que les chateaux
// auront bascule en `dispo_geree`. Poser le moteur a cote, teste, avant de
// debrancher le proxy — pas l'inverse.
//
// ⚠ AUCUN COMPOSANT N'APPELLE ENCORE CE QUI SUIT. C'est voulu : le branchement
// des ecrans est un chantier a lui, avec sa mesure.
//
// POURQUOI DES RPC ET PAS UNE LECTURE DIRECTE : `reservations` est sous RLS, un
// visiteur anonyme n'en lit RIEN. La meme regle ecrite ici en JS verrait zero
// reservation et repondrait « libre » sur une chambre vendue — systematiquement,
// sans erreur, sans trace. Les fonctions SQL sont SECURITY DEFINER et ne rendent
// qu'un booleen ou des dates : rien a fuiter.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normalise une date d'appelant en la chaine "YYYY-MM-DD" attendue par Postgres.
 *
 * ⚠ ON N'ENVOIE JAMAIS UN OBJET Date A UNE RPC, et ce n'est pas une preference
 * de style. PostgREST le serialiserait en ISO **UTC** ; le cast `::date` cote
 * Postgres peut alors rendre LE JOUR PRECEDENT selon l'heure et le fuseau du
 * visiteur. Ce module a deja paye ce bug une fois — cf. le commentaire de
 * `minuit()` : « une regle de disponibilite ne peut pas dependre de l'heure a
 * laquelle on la lit ». `cleJour()` construit le jour sur les composantes
 * LOCALES, ce qui ferme la question.
 *
 * Accepte aussi une chaine deja au bon format (l'appelant peut venir d'un champ
 * `<input type="date">`, qui rend exactement cela).
 *
 * @param {Date|string|null|undefined} d
 * @returns {string|null} "YYYY-MM-DD", ou null si l'entree n'est pas une date.
 *   ⚠ null est transmis tel quel a la RPC : ses bornes le traitent (false, ou
 *   ensemble vide). On ne leve pas — l'appelant est un ECRAN.
 */
function versJour(d) {
  if (d instanceof Date && !Number.isNaN(d.getTime())) return cleJour(d);
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  return null;
}

/**
 * Appel d'une RPC du moteur rendant un booleen. Patron maison : `status`
 * transmis a logErreurSupabase (il tait les fetchs annules, status 0, pour ne
 * pas polluer le budget de l'agent QA), puis `throw error` BRUT.
 *
 * ⚠ Le `22023` de la garde d'horizon n'est PAS discrimine : une fenetre de plus
 * de 366 jours est un defaut d'appelant, pas un cas metier que l'UI rattrape.
 *
 * ⚠ POURQUOI DEUX HELPERS PRIVES plutot que le patron recopie quatre fois :
 * l'oubli du `status` ne casserait rien de visible — il ferait seulement
 * remonter en console.error des fetchs annules, donc du bruit dans l'agent QA,
 * des mois plus tard. Une seule ecriture du patron, un seul endroit ou l'oublier.
 */
async function appelerRpcBooleen(nomRpc, params, contexte) {
  return (await appelerRpcBrut(nomRpc, params, contexte)) === true;
}

/**
 * Le patron maison, ECRIT UNE SEULE FOIS : appel, journalisation avec `status`,
 * `throw error` brut, et le `data` rendu tel quel a l'appelant qui le normalise.
 *
 * ⚠ EXTRAIT A L'ETAPE 3.3d, quand les fonctions d'ECRITURE ont porte le nombre
 * de copies de ce patron a CINQ dans un seul fichier. C'est exactement ce que
 * l'etape 2.4 disait vouloir eviter en creant deux helpers : « une seule
 * ecriture du patron, un seul endroit ou l'oublier ». Trois copies de plus
 * auraient contredit cette raison meme.
 * Les deux helpers de 2.4 delèguent desormais ici — un changement de six
 * lignes, couvert par les seize tests de contrat existants.
 */
async function appelerRpcBrut(nomRpc, params, contexte) {
  const { data, error, status } = await supabase.rpc(nomRpc, params);
  if (error) {
    logErreurSupabase(contexte, error, status);
    throw error;
  }
  return data;
}

/**
 * Appel d'une RPC du moteur rendant un SETOF date. Meme patron.
 *
 * NORMALISATION : PostgREST rend un tableau de chaines pour une fonction
 * `RETURNS SETOF date`. On accepte aussi la forme « tableau d'objets » (celle
 * des fonctions RETURNS TABLE) pour ne pas dependre d'un detail de serialisation
 * qui a deja varie ailleurs dans ce projet — cf. la normalisation jumelle de
 * clubService.getPalierCourant.
 */
async function appelerRpcJours(nomRpc, params, contexte) {
  const data = await appelerRpcBrut(nomRpc, params, contexte);
  if (!Array.isArray(data)) return [];
  return data
    .map((ligne) => (typeof ligne === "string" ? ligne : ligne?.[nomRpc] ?? null))
    .filter(Boolean);
}

/**
 * Cette CHAMBRE est-elle libre du `arrivee` au `depart` ?
 *
 * ⚠ SEJOUR, PAS ENSEMBLE DE NUITS : `depart` est EXCLU. Les nuits concernees
 * sont `arrivee` .. `depart - 1` — on ne dort pas le soir du depart.
 *
 * @param {string} chambreId
 * @param {Date|string} arrivee
 * @param {Date|string} depart
 * @returns {Promise<boolean>}
 */
export async function estDisponible(chambreId, arrivee, depart) {
  return appelerRpcBooleen(
    "est_disponible",
    { p_chambre_id: chambreId, p_arrivee: versJour(arrivee), p_depart: versJour(depart) },
    "[disponibilitesService] estDisponible:",
  );
}

/**
 * Ce CHATEAU peut-il accueillir un sejour du `arrivee` au `depart` ?
 * Vrai si AU MOINS UNE de ses chambres est libre sur TOUTE la plage.
 *
 * ⚠⚠ C'EST LA FONCTION QUI AUTORISE. `joursDisponiblesChateau` PEINT un
 * calendrier ; celle-ci VALIDE une plage. Les deux ne disent pas la meme chose,
 * et confondre leurs roles produirait une survente :
 *
 *     nuit 1   chambre A libre, chambre B prise
 *     nuit 2   chambre A prise, chambre B libre
 *     -> le calendrier rend LES DEUX NUITS (une chambre libre chaque soir)
 *     -> et pourtant chateauDisponible(nuit1, nuit3) est FAUX
 *        aucune chambre ne couvre le sejour entier
 *
 * ⚠ UN ECRAN QUI LAISSE SELECTIONNER UNE PLAGE DANS LE CALENDRIER DOIT LA
 * REVALIDER ICI avant de proposer une reservation.
 *
 * @param {string} chateauId
 * @param {Date|string} arrivee
 * @param {Date|string} depart
 * @returns {Promise<boolean>}
 */
export async function chateauDisponible(chateauId, arrivee, depart) {
  return appelerRpcBooleen(
    "chateau_disponible",
    { p_chateau_id: chateauId, p_arrivee: versJour(arrivee), p_depart: versJour(depart) },
    "[disponibilitesService] chateauDisponible:",
  );
}

/**
 * Les NUITS libres d'une CHAMBRE dans [du, au].
 *
 * ⚠ LES DEUX BORNES SONT INCLUSES — ce sont des nuits, pas un sejour. Le lien
 * avec `estDisponible` porte donc un decalage d'un jour, et c'est l'erreur la
 * plus facile a commettre ici :
 *
 *     estDisponible(ch, A, D)  <=>  joursDisponiblesChambre(ch, A, D - 1)
 *                                   contient les D - A nuits
 *
 * @param {string} chambreId
 * @param {Date|string} du
 * @param {Date|string} au
 * @returns {Promise<string[]>} jours "YYYY-MM-DD", tries. ⚠ Des CHAINES, pas
 *   des Date : reconvertir rouvrirait la question de fuseau que versJour ferme.
 *   La RPC leve (22023) au-dela de 366 jours de fenetre.
 */
export async function joursDisponiblesChambre(chambreId, du, au) {
  return appelerRpcJours(
    "jours_disponibles_chambre",
    { p_chambre_id: chambreId, p_du: versJour(du), p_au: versJour(au) },
    "[disponibilitesService] joursDisponiblesChambre:",
  );
}

/**
 * Les NUITS ou le CHATEAU a AU MOINS UNE chambre libre, dans [du, au].
 *
 * ⚠⚠ CETTE FONCTION PEINT, ELLE N'AUTORISE PAS. La chambre qui rend une nuit
 * libre peut CHANGER d'une nuit a l'autre : il ne s'ensuit pas qu'un sejour
 * couvrant ces nuits soit reservable (cf. l'exemple des deux nuits dans
 * `chateauDisponible`). L'appelant DOIT revalider la plage choisie par
 * `chateauDisponible` avant de proposer une reservation.
 *
 * Ce n'est pas un defaut : c'est ce que « au moins une chambre ce soir-la »
 * veut dire. Ne montrer que les nuits couvertes par une MEME chambre sur tout
 * un mois n'aurait aucun sens pour un calendrier.
 *
 * @param {string} chateauId
 * @param {Date|string} du
 * @param {Date|string} au
 * @returns {Promise<string[]>} jours "YYYY-MM-DD", tries.
 */
export async function joursDisponiblesChateau(chateauId, du, au) {
  return appelerRpcJours(
    "jours_disponibles_chateau",
    { p_chateau_id: chateauId, p_du: versJour(du), p_au: versJour(au) },
    "[disponibilitesService] joursDisponiblesChateau:",
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// ÉCRIRE — la saisie des disponibilités (étape 3.3d)
// ═══════════════════════════════════════════════════════════════════════════
//
// Les trois RPC posées à l'étape 3.1 n'avaient AUCUN appelant JS : 3.2 avait
// câblé la lecture « mes châteaux », mais rien n'écrivait. Ces trois wrappers
// comblent le trou.
//
// ⚠ ILS VIVENT ICI, PAS DANS chatelainService, et ce n'est pas un détail de
// rangement : l'écran admin de l'étape 3.5 appellera EXACTEMENT les mêmes. La
// garde des RPC est `is_chatelain_of(chateau) OR is_admin()` — une seule
// fonction sert les deux acteurs. Les mettre chez le châtelain aurait forcé
// l'admin à traverser un module qui ne le concerne pas.
//
// ⚠ MÊME VERROU DE FUSEAU que la moitié moteur : tout passe par `versJour()`,
// jamais un objet Date. Cf. son commentaire — PostgREST sérialiserait en ISO
// UTC et le cast `::date` pourrait rendre LE JOUR PRÉCÉDENT.
//
// ⚠ AUCUNE ERREUR N'EST DISCRIMINÉE. Les RPC lèvent 22023 (fenêtre invalide),
// P0002 (chambre introuvable) et 42501 (ni châtelain ni admin) — mais aucune
// n'est un cas métier que l'UI rattrape : l'écran ne propose que les chambres
// du châtelain, et il borne lui-même ses fenêtres. Chacune serait un DÉFAUT, et
// un défaut doit remonter tel quel plutôt que d'être habillé en message.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Écrit une plage de NUITS — ⚠ BORNES INCLUSES, comme la RPC : « du 12 au 18 »
 * fait SEPT nuits.
 *
 * ⚠ CE N'EST PAS LA FONCTION D'« OUVRIR ». Le calendrier de saisie n'appelle
 * celle-ci QUE pour bloquer (`estDisponible = false`) : ouvrir, c'est effacer
 * l'exception, donc `retirerDisponibilites`. Poser une ligne `true` reste
 * possible — la RPC le permet, et c'est ainsi qu'on ouvrirait une date au-delà
 * de l'horizon — mais aucune interface ne le fait aujourd'hui, et le faire
 * réintroduirait des lignes IMMUNES à l'horizon (cf. actionPourSelection dans
 * utils/calendrierSaisie.js).
 *
 * ⚠ Le prix spécial est PRÉSERVÉ côté SQL s'il n'est pas passé (COALESCE) :
 * bloquer une date n'efface pas son tarif. Pour l'effacer, il faut
 * `retirerDisponibilites` puis reposer.
 *
 * @param {string} chambreId
 * @param {Date|string} du
 * @param {Date|string} au
 * @param {boolean} estDisponible
 * @param {number|null} [prixSpecialCents]
 * @returns {Promise<number>} nombre de nuits écrites.
 */
export async function poserDisponibilites(chambreId, du, au, estDisponible, prixSpecialCents = null) {
  const data = await appelerRpcBrut(
    "poser_disponibilites",
    {
      p_chambre_id: chambreId,
      p_du: versJour(du),
      p_au: versJour(au),
      p_est_disponible: estDisponible === true,
      p_prix_special_cents: prixSpecialCents,
    },
    "[disponibilitesService] poserDisponibilites:",
  );
  return typeof data === "number" ? data : 0;
}

/**
 * Efface les lignes d'une plage de NUITS — bornes incluses.
 *
 * ⚠ C'EST LA FONCTION D'« OUVRIR », et le verbe est trompeur : on n'ouvre pas en
 * écrivant, on ouvre en RETIRANT le blocage. La nuit revient à « non
 * renseignée » et retombe sous l'horizon du château. `disponibilites` ne
 * contient ainsi QUE des blocages — le modèle « Airbnb », et le seul qui ne
 * fasse pas gonfler la table à l'usage.
 *
 * ⚠ Cela n'ouvre RIEN au-delà de l'horizon : une nuit sans ligne y reste
 * fermée. Le calendrier de saisie ne laisse pas sélectionner ces nuits-là,
 * c'est ce qui rend la sémantique cohérente (cf. `plageLimitee`).
 *
 * ⚠ EFFACE AUSSI le prix spécial de ces nuits. Sans conséquence aujourd'hui —
 * aucune interface n'écrit de prix — mais à revoir le jour où les tarifs
 * deviendront éditables.
 *
 * @returns {Promise<number>} nombre de lignes supprimées.
 */
export async function retirerDisponibilites(chambreId, du, au) {
  const data = await appelerRpcBrut(
    "retirer_disponibilites",
    { p_chambre_id: chambreId, p_du: versJour(du), p_au: versJour(au) },
    "[disponibilitesService] retirerDisponibilites:",
  );
  return typeof data === "number" ? data : 0;
}

/**
 * L'état BRUT du calendrier d'une chambre, nuit par nuit, pour l'écran de
 * SAISIE. Bornes incluses, 366 jours maximum (la RPC lève au-delà).
 *
 * ⚠ À NE PAS CONFONDRE AVEC `joursDisponiblesChambre`. Celle-là rend le
 * résultat COMPOSÉ — « libre ou non » — et sert à peindre un calendrier
 * PUBLIC. Celle-ci dit POURQUOI une nuit est fermée, ce dont le châtelain a
 * besoin : « j'ai bloqué » ne se corrige pas comme « c'est vendu », et la
 * seconde, il ne peut pas la rouvrir.
 *
 * ⚠ Elle EXPOSE L'OCCUPATION. C'est pourquoi la RPC est réservée à
 * `authenticated` avec sa garde interne, là où les lectures publiques de 2.2 et
 * 2.3 sont ouvertes à `anon`.
 *
 * Les six états rendus (`vendue`, `bloquee`, `ouverte_explicite`,
 * `hors_gestion`, `ouverte_horizon`, `non_renseignee`) sont aplatis en quatre
 * apparences par `aplatirEtat` — dans utils/calendrierSaisie.js, pas ici : ce
 * service transporte, il n'interprète pas.
 *
 * @returns {Promise<Array<{nuit: string, etat: string, ligneExiste: boolean,
 *   ligneOuverte: boolean|null, dansHorizon: boolean, vendue: boolean,
 *   prixSpecialCents: number|null}>>}
 */
export async function calendrierEditionChambre(chambreId, du, au) {
  const data = await appelerRpcBrut(
    "calendrier_edition_chambre",
    { p_chambre_id: chambreId, p_du: versJour(du), p_au: versJour(au) },
    "[disponibilitesService] calendrierEditionChambre:",
  );
  if (!Array.isArray(data)) return [];
  return data.map((l) => ({
    nuit: l.nuit,
    etat: l.etat,
    ligneExiste: l.ligne_existe === true,
    // ⚠ `ligne_ouverte` est NULL quand aucune ligne n'existe — un troisième
    //   état, pas un booléen. Le forcer en false ferait passer « je n'ai rien
    //   dit » pour « j'ai fermé ».
    ligneOuverte: l.ligne_ouverte ?? null,
    dansHorizon: l.dans_horizon === true,
    vendue: l.vendue === true,
    prixSpecialCents: l.prix_special_cents ?? null,
  }));
}
