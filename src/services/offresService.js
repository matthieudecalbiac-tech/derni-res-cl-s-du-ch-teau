// Service offres mock — Sprint S2-α.1.5.
// TODO α.2/α.3 : remplacer par `await supabase.from("offres").select(...).eq("chateau_id", ...).eq("module_code", ...)`
//   La table offres existe déjà en S1-γ + α.1 (cf. supabase/schema.sql, seed offre-bri-001 en migration 2026-05-09).
//   Le mapping `chateauId number ↔ chateau_id uuid` sera fait via `_mapping.js` (Phase 4.3).

import { mockOffres } from "../data/mockOffres";

// Latence mock passée de 200 à 0 (audit Fondation J2, P0-1) : la latence
// artificielle faisait clignoter « Chargement des offres… » à chaque bascule
// d'onglet de la vitrine premium. Conservée comme constante (à 0) pour
// pouvoir réactiver des tests de loading state si besoin.
const LATENCE_MOCK_MS = 0;

// Cache module-level (clé "slug|module" → Array d'offres). Évite de re-filtrer
// — et de relancer un cycle async — à chaque retour sur un onglet déjà visité.
// Invalidé au reload de page (mock en mémoire).
const _cacheOffres = new Map();

function attendre(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} chateauSlug - Slug humain (ex: "les-briottieres")
 * @param {"dernieresCles" | "club"} module
 * @returns {Promise<Array>}
 */
export async function getOffresPourChateau(chateauSlug, module) {
  const cle = `${chateauSlug}|${module}`;
  if (_cacheOffres.has(cle)) return _cacheOffres.get(cle);
  await attendre(LATENCE_MOCK_MS);
  const resultat = mockOffres.filter(
    (o) => o.chateauSlug === chateauSlug && o.module === module,
  );
  _cacheOffres.set(cle, resultat);
  return resultat;
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
 * @param {string} chateauSlug - Slug humain (ex: "les-briottieres")
 * @param {"dernieresCles" | "club"} module
 * @returns {Promise<number>}
 */
export async function compterOffresPourChateau(chateauSlug, module) {
  const offres = await getOffresPourChateau(chateauSlug, module);
  return offres.length;
}
