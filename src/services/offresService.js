// Service offres mock — Sprint S2-α.1.5.
// TODO α.2/α.3 : remplacer par `await supabase.from("offres").select(...).eq("chateau_id", ...).eq("module_code", ...)`
//   La table offres existe déjà en S1-γ + α.1 (cf. supabase/schema.sql, seed offre-bri-001 en migration 2026-05-09).
//   Le mapping `chateauId number ↔ chateau_id uuid` sera fait via `_mapping.js` (Phase 4.3).

import { mockOffres } from "../data/mockOffres";

const LATENCE_MOCK_MS = 200;

function attendre(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {number} chateauId
 * @param {"dernieresCles" | "club"} module
 * @returns {Promise<Array>}
 */
export async function getOffresPourChateau(chateauId, module) {
  await attendre(LATENCE_MOCK_MS);
  return mockOffres.filter((o) => o.chateauId === chateauId && o.module === module);
}

/**
 * @param {string} offreId
 * @returns {Promise<Object | null>}
 */
export async function getOffreParId(offreId) {
  await attendre(LATENCE_MOCK_MS);
  return mockOffres.find((o) => o.id === offreId) || null;
}

/**
 * @param {number} chateauId
 * @param {"dernieresCles" | "club"} module
 * @returns {Promise<number>}
 */
export async function compterOffresPourChateau(chateauId, module) {
  const offres = await getOffresPourChateau(chateauId, module);
  return offres.length;
}
