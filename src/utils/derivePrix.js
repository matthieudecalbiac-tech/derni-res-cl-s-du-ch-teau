// src/utils/derivePrix.js
//
// Helper centralisé pour dériver le prix nuit d'affichage d'un château
// depuis la première chambre. Conçu Chantier 2.1 (Phase A3) pour
// remplacer les multiples dérivations dispersées dans les composants
// (CarteExplorer, ChateauModal, UneDeLaSemaine, ClubMembres,
// VitrineClub) avant la suppression du champ `prix` top-level
// du schéma Chateau.

/**
 * Prix nuit d'affichage (EUR) d'un château.
 * Convention : premier prix de la première chambre.
 *
 * @param {import("../types/Chateau.js").Chateau} chateau
 * @returns {number} Prix EUR/nuit, ou 0 si aucune chambre n'est définie
 */
export function derivePrix(chateau) {
  return chateau?.chambres?.[0]?.prix ?? 0;
}

// Prix "a partir de" affiche : cascade complete.
// prix reduit (prixBarre x (1 - reduction/100)) -> prixBarre seul -> 1re chambre
// (via derivePrix) -> null. Le null permet le rendu conditionnel cote composant.
// Construite au-dessus de derivePrix pour le dernier maillon (1re chambre).
export function prixAffiche(c) {
  if (c?.prixBarre && c?.reduction) {
    return Math.round(c.prixBarre * (1 - c.reduction / 100));
  }
  return c?.prixBarre || derivePrix(c) || null;
}
