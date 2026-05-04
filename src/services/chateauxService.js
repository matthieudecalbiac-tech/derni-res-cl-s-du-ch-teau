/**
 * Service couche données châteaux
 *
 * Aujourd'hui : statique (lit src/data/chateaux.js)
 * Demain : Supabase (await supabase.from('chateaux').select(...))
 *
 * Toutes les fonctions sont async pour préparer le swap
 * sans toucher aux hooks ni composants consommateurs.
 *
 * Phase 2.3 (4 mai 2026)
 */

import { chateaux as chateauxData } from "../data/chateaux";

/**
 * Helper interne : simule une latence Supabase pour tester les loading states.
 * Activé via VITE_FAKE_LATENCY env var (en ms). Défaut : 0 (pas de latence).
 *
 * Usage : VITE_FAKE_LATENCY=300 npm run dev
 */
const FAKE_LATENCY_MS = (() => {
  const raw = import.meta.env.VITE_FAKE_LATENCY;
  if (!raw) return 0;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
})();

function applyFakeLatency() {
  if (FAKE_LATENCY_MS === 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY_MS));
}

/**
 * Liste tous les châteaux, optionnellement sans les mocks.
 */
export async function getChateaux({ excludeMocks = false } = {}) {
  await applyFakeLatency();
  return excludeMocks
    ? chateauxData.filter((c) => !c.isDemoMock)
    : chateauxData;
}

/**
 * Récupère un château par son slug.
 */
export async function getChateauBySlug(slug) {
  await applyFakeLatency();
  return chateauxData.find((c) => c.slug === slug) || null;
}

/**
 * Récupère un château par son id.
 */
export async function getChateauById(id) {
  await applyFakeLatency();
  return chateauxData.find((c) => c.id === id) || null;
}

/**
 * Compteurs agrégés depuis la liste des châteaux.
 */
export async function getCompteurs({ excludeMocks = false } = {}) {
  await applyFakeLatency();
  const liste = excludeMocks
    ? chateauxData.filter((c) => !c.isDemoMock)
    : chateauxData;

  const parRegion = liste.reduce((acc, c) => {
    acc[c.region] = (acc[c.region] || 0) + 1;
    return acc;
  }, {});

  return {
    total: liste.length,
    parRegion,
    regionsCouvertes: Object.keys(parRegion).length,
    urgences: liste.filter((c) => c.urgence).length,
    urgentesJ7: liste.filter((c) => c.urgence === "J-7").length,
    chambresRestantes: liste.reduce(
      (sum, c) => sum + (c.chambresRestantes || 0),
      0
    ),
    chambresUrgentes: liste
      .filter((c) => c.urgence)
      .reduce((sum, c) => sum + (c.chambresRestantes || 0), 0),
  };
}
