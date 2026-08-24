// ═══════════════════════════════════════════════════════════════════════════
// LCC — Calendrier de saisie : LA LOGIQUE PURE (étape 3.3a)
// ═══════════════════════════════════════════════════════════════════════════
//
// Trois fonctions, aucun React, aucun accès réseau. C'est ici que vit tout ce
// qui peut se tromper dans l'écran de saisie : l'aplatissement des états, l'ordre
// des bornes d'une sélection, et le choix de la RPC.
//
// ⚠ POURQUOI DEHORS PLUTÔT QUE DANS LE COMPOSANT. Le dépôt n'a AUCUN test de
// composant : `vitest.config.js` tourne en `environment: "node"`, et ni `jsdom`
// ni `@testing-library` ne sont installés. Enfouir cette logique dans le JSX
// l'aurait rendue INVÉRIFIABLE sans introduire deux dépendances et une pratique
// nouvelles. Ici elle se teste avec ce qui existe déjà.
//
// ⚠ TOUT TRAVAILLE SUR DES CHAÎNES "YYYY-MM-DD", JAMAIS SUR DES `Date`. C'est
// le format que rend `calendrier_edition_chambre`, celui qu'attendent les RPC
// d'écriture — et surtout celui qui ferme la question du fuseau, qui a déjà
// coûté un bug à ce dépôt (cf. `versJour()` dans disponibilitesService, et le
// commentaire de `minuit()`). Deux jours ISO se comparent et s'ordonnent
// LEXICOGRAPHIQUEMENT, sans conversion, donc sans heure et sans fuseau.
// Le composant convertira ses `Date` de grille UNE FOIS, au bord.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Les six états rendus par `calendrier_edition_chambre` (étape 3.1), aplatis en
 * QUATRE apparences.
 *
 * ⚠ UNE TABLE, PAS UNE CASCADE DE `if`. Les six clés sont une union FERMÉE,
 * décidée en 3.1 : une table rend le test exhaustif trivial, et surtout elle
 * permet à `aplatirEtat` de SIGNALER un état inconnu au lieu de le laisser
 * tomber dans un `else` silencieux. Si la RPC gagnait un septième état, on veut
 * l'apprendre — pas le peindre en gris par défaut.
 *
 * ⚠ `ouverte_explicite` ET `ouverte_horizon` DONNENT LA MÊME APPARENCE, et
 * c'est une décision produit : le châtelain se moque de savoir POURQUOI une nuit
 * est ouverte, il voit « réservable ». La distinction reste entière EN BASE —
 * c'est elle qui fait qu'une ligne `true` survit à un raccourcissement de
 * l'horizon — mais elle n'a rien à dire à l'écran.
 *
 * ⚠ `non_renseignee` devient `hors_horizon`, et le mot compte : en mode géré,
 * une nuit sans ligne au-delà de l'horizon EST fermée. « Hors horizon » dit la
 * cause au châtelain ; « non renseignée » lui parlerait de la base.
 *
 * ⚠ `hors_gestion` aussi — mais c'est un pis-aller d'affichage. Un château qui
 * n'est pas en gestion doit être signalé PAR L'ÉCRAN ENTIER, pas case par case
 * (cf. la prop `editable` du composant). Cette entrée n'est là que pour qu'aucun
 * état ne reste sans apparence.
 */
const APPARENCES = {
  vendue: "vendu",
  bloquee: "bloque",
  ouverte_explicite: "disponible",
  ouverte_horizon: "disponible",
  non_renseignee: "hors_horizon",
  hors_gestion: "hors_horizon",
};

/** Les quatre apparences, exportées pour que le composant et les tests s'y adossent. */
export const APPARENCE_INCONNUE = "hors_horizon";

/**
 * @param {string} etatBrut - un des six états de `calendrier_edition_chambre`.
 * @returns {"disponible"|"bloque"|"vendu"|"hors_horizon"}
 *
 * ⚠ Un état INCONNU rend `hors_horizon` — le plus fermé des quatre — et le
 * signale en console. Le repli est délibérément PRUDENT : devant un état qu'on
 * ne comprend pas, on n'ouvre pas une date. Mieux vaut refuser une réservation
 * qu'en promettre une qu'on ne peut pas tenir.
 */
export function aplatirEtat(etatBrut) {
  const apparence = APPARENCES[etatBrut];
  if (apparence) return apparence;
  console.warn(
    `[calendrierSaisie] etat inconnu « ${etatBrut} » — replie sur ${APPARENCE_INCONNUE}. ` +
      "calendrier_edition_chambre a-t-elle gagne un etat ?",
  );
  return APPARENCE_INCONNUE;
}

/** Une apparence est-elle cliquable par le châtelain ? */
export function estModifiable(apparence) {
  // ⚠ `vendu` est exclu et ne le sera jamais : le châtelain ne peut pas
  //   dé-vendre une nuit depuis un calendrier. `hors_horizon` l'est aussi —
  //   c'est l'horizon du château qu'il faut déplacer, pas la nuit.
  return apparence === "disponible" || apparence === "bloque";
}

/**
 * Ordonne les deux bornes d'une sélection.
 *
 * ⚠ LES DEUX SENS DOIVENT MARCHER. Un glissement peut partir du 18 vers le 12 —
 * personne ne sélectionne toujours vers l'avenir. Sans ce tri, la RPC recevrait
 * une fenêtre inversée et LÈVERAIT (22023, cf. 3.1) : le châtelain verrait une
 * erreur pour un geste parfaitement légitime.
 *
 * ⚠ BORNES INCLUSES, comme les RPC de 3.1 : `plageDepuis(j, j)` rend `{du: j,
 * au: j}` — c'est le TAP UNITAIRE, une seule nuit, pas une plage vide.
 *
 * @param {string} a - jour "YYYY-MM-DD" (l'ancre du geste)
 * @param {string} b - jour "YYYY-MM-DD" (le jour survolé)
 * @returns {{du: string, au: string}|null} null si une borne manque.
 */
export function plageDepuis(a, b) {
  if (!a || !b) return null;
  // Comparaison LEXICOGRAPHIQUE sur des chaînes ISO : "2026-09-12" < "2026-09-18"
  // est vrai sans conversion, donc sans fuseau. C'est tout l'intérêt du format.
  return a <= b ? { du: a, au: b } : { du: b, au: a };
}

/**
 * Le nombre de NUITS d'une plage — bornes INCLUSES.
 *
 * ⚠ LE « + 1 » N'EST PAS UN AJUSTEMENT, C'EST LA DÉFINITION. Du 12 au 18, ce
 * sont SEPT nuits, pas six : les deux bornes comptent, comme dans les RPC de
 * 3.1. L'oublier afficherait « 6 nuits » sous une sélection qui en écrit sept —
 * le châtelain croirait s'être trompé de geste.
 *
 * ⚠ Date.UTC sur les composantes découpées, jamais `new Date("YYYY-MM-DD")` :
 * la seconde forme est interprétée en UTC par la spec, et retomberait sur le
 * jour précédent une fois relue en local. On ne fait ici qu'une soustraction de
 * jours — l'UTC des deux côtés s'annule.
 *
 * @param {{du: string, au: string}|null} plage
 * @returns {number} 0 si la plage est absente.
 */
export function nombreDeNuits(plage) {
  if (!plage || !plage.du || !plage.au) return 0;
  const [ad, md, jd] = plage.du.split("-").map(Number);
  const [aa, ma, ja] = plage.au.split("-").map(Number);
  const ms = Date.UTC(aa, ma - 1, ja) - Date.UTC(ad, md - 1, jd);
  return Math.round(ms / 86400000) + 1;
}

/**
 * La plage d'un glissement, ARRÊTÉE avant la première nuit non modifiable.
 *
 * ⚠ CETTE FONCTION EXISTE PARCE QUE `plageDepuis` SEULE PRODUIRAIT DES PLAGES
 * FAUSSES. Interdire de POSER le doigt sur une nuit vendue ne suffit pas : un
 * glissement du 20 vers le 10 par-dessus un séjour vendu du 14 au 16 donnerait
 * `{du: 10, au: 20}` — une plage qui CONTIENT les nuits vendues. « Bloquer »
 * écrirait alors un blocage sur une nuit déjà vendue (la RPC l'accepte : elle ne
 * regarde pas les réservations), et la table porterait un mensonge.
 *
 * ⚠ ET C'EST AUSSI CE QUI REND « OUVRIR = EFFACER » SÛR. La frontière de
 * l'horizon ne peut pas être franchie par un glissement, puisque les nuits
 * hors horizon ne sont pas modifiables : une sélection reste toujours ENTIÈRE
 * du même côté. Sans ce garde-fou, la sémantique de `actionPourSelection`
 * s'écroulerait — effacer une ligne au-delà de l'horizon laisse la nuit fermée.
 *
 * On parcourt de l'ancre VERS le survol et on s'arrête à la dernière nuit
 * modifiable rencontrée. Le châtelain voit donc sa sélection buter contre
 * l'obstacle plutôt que l'enjamber.
 *
 * @param {string[]} jours - les jours du mois, ORDONNÉS, en "YYYY-MM-DD".
 * @param {string} ancre - le jour où le geste a commencé.
 * @param {string} survol - le jour sous le pointeur.
 * @param {(jour: string) => boolean} estJourModifiable
 * @returns {{du: string, au: string}|null} null si l'ancre ou le survol sont
 *   hors de la grille, ou si l'ancre n'est pas modifiable. ⚠ null veut dire
 *   « ne change rien » : l'appelant GARDE la sélection précédente. C'est le cas
 *   d'un doigt qui sort de la grille en cours de glissement — fréquent, et qui
 *   ne doit surtout pas effacer la sélection en cours.
 */
export function plageLimitee(jours, ancre, survol, estJourModifiable) {
  if (!Array.isArray(jours) || !ancre || !survol) return null;
  const iAncre = jours.indexOf(ancre);
  const iSurvol = jours.indexOf(survol);
  if (iAncre < 0 || iSurvol < 0) return null;
  if (!estJourModifiable(ancre)) return null;

  const pas = iSurvol >= iAncre ? 1 : -1;
  let dernier = ancre;
  for (let i = iAncre + pas; pas > 0 ? i <= iSurvol : i >= iSurvol; i += pas) {
    if (!estJourModifiable(jours[i])) break;
    dernier = jours[i];
  }
  return plageDepuis(ancre, dernier);
}

/**
 * Traduit l'intention du châtelain en un appel de RPC.
 *
 * ⚠ « OUVRIR » EFFACE, IL N'ÉCRIT PAS. C'est LA décision de conception de 3.3, et
 * elle mérite d'être comprise avant d'être modifiée :
 *
 *     Bloquer  ->  poser_disponibilites(..., false)   on ECRIT l'exception
 *     Ouvrir   ->  retirer_disponibilites(...)        on EFFACE l'exception
 *
 * `disponibilites` ne contient donc QUE des blocages — le modèle « Airbnb », et
 * le seul qui ne fasse pas gonfler la table à l'usage.
 *
 * ⚠ POURQUOI PAS `poser(..., true)` POUR OUVRIR. Une ligne `true` est IMMUNE à
 * l'horizon (propriété construite et testée en 3.1). Un châtelain qui
 * RACCOURCIRAIT ensuite son horizon garderait ces nuits ouvertes sans comprendre
 * pourquoi — une divergence SILENCIEUSE entre ce qu'il croit avoir fermé et ce
 * qui reste réservable.
 *
 * ⚠ CE QUI REND CE CHOIX POSSIBLE : les nuits hors horizon ne sont pas
 * sélectionnables à l'écran. Une sélection ne peut donc JAMAIS chevaucher la
 * frontière, et « ouvrir au-delà de l'horizon » n'existe pas ici. Si un jour on
 * rendait ces cases cliquables, CETTE FONCTION SERAIT LA PREMIÈRE À REVOIR :
 * effacer une ligne au-delà de l'horizon laisse la nuit FERMÉE.
 *
 * ⚠ EFFET DE BORD CONNU : `retirer_disponibilites` efface aussi
 * `prix_special_cents`. Sans conséquence aujourd'hui — aucune interface n'écrit
 * de prix — mais le jour où les tarifs seront éditables, « Ouvrir » devra
 * devenir conditionnel : `poser(..., true, prix)` sur une nuit qui en porte un.
 *
 * @param {"bloquer"|"ouvrir"} action
 * @param {{du: string, au: string}|null} plage
 * @returns {{rpc: "poser"|"retirer", du: string, au: string, estDisponible?: boolean}|null}
 *   null si l'action est inconnue ou la plage absente — l'appelant ne fait alors
 *   RIEN. On ne lève pas : l'appelant est un écran.
 */
export function actionPourSelection(action, plage) {
  if (!plage || !plage.du || !plage.au) return null;
  if (action === "bloquer") {
    return { rpc: "poser", du: plage.du, au: plage.au, estDisponible: false };
  }
  if (action === "ouvrir") {
    // ⚠ Pas de `estDisponible` : retirer_disponibilites n'en prend pas. Le champ
    //   serait une fausse piste pour le prochain lecteur.
    return { rpc: "retirer", du: plage.du, au: plage.au };
  }
  return null;
}
