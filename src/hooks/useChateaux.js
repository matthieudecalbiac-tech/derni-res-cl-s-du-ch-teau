import { useMemo } from "react";
import { chateaux as chateauxData } from "../data/chateaux";

/**
 * Hook principal pour accéder à la liste des châteaux.
 *
 * @param {Object} [options]
 * @param {boolean} [options.excludeMocks=false] - Si true, filtre les
 *   châteaux marqués `isDemoMock=true`. Default : false (compat).
 * @returns {Array} Liste des châteaux
 */
export function useChateaux({ excludeMocks = false } = {}) {
  return useMemo(() => {
    if (excludeMocks) {
      return chateauxData.filter((c) => !c.isDemoMock);
    }
    return chateauxData;
  }, [excludeMocks]);
}

/**
 * Récupère un château par son slug. Préparé pour Phase 3+
 * (URLs SEO type `/chateau/<slug>`) — pas encore consommé
 * actuellement (Phase 2.2 audit : 0 find par slug détecté).
 *
 * @param {string} slug
 * @returns {Object|undefined}
 */
export function useChateau(slug) {
  return useMemo(
    () => chateauxData.find((c) => c.slug === slug),
    [slug]
  );
}

/**
 * Récupère un château par son id.
 * Pattern d'usage le plus fréquent dans le code actuel
 * (`HeureAuxDemeures.jsx`, etc.).
 *
 * @param {number} id
 * @returns {Object|undefined}
 */
export function useChateauById(id) {
  return useMemo(
    () => chateauxData.find((c) => c.id === id),
    [id]
  );
}
