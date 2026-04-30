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
