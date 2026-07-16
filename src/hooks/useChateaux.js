import { useState, useEffect } from "react";
import {
  getChateaux as getChateauxService,
  getChateauBySlug,
  getChateauById as getChateauByIdService,
  getPersonnageBySlug,
  getCataloguePersonnages,
} from "../services/chateauxService";

/**
 * Hook principal pour accéder à la liste des châteaux.
 *
 * @param {Object} [options]
 * @param {boolean} [options.excludeMocks=false] - Si true, exclut les châteaux
 *   de démonstration (isDemoMock) — restent Briottières + Blanc Buisson en
 *   Sprint S1, plus en S2+. Voir `_isMock()` dans chateauxService.js
 *   pour la définition centralisée. Default : false (compat).
 * @returns {Array} Liste des châteaux
 */
export function useChateaux({ excludeMocks = false } = {}) {
  const [chateaux, setChateaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getChateauxService({ excludeMocks })
      .then((data) => {
        if (!cancelled) {
          setChateaux(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [excludeMocks]);

  return { chateaux, loading, error };
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
  const [chateau, setChateau] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getChateauBySlug(slug)
      .then((data) => {
        if (!cancelled) {
          setChateau(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { chateau, loading, error };
}

/**
 * Récupère un personnage par son slug + les châteaux (publiés) rattachés,
 * pour la fiche /personnage/:slug. Miroir de useChateau (sens inverse).
 *
 * @param {string} slug
 * @returns {{ personnage: Object|null, loading: boolean, error: Error|null }}
 */
export function usePersonnage(slug) {
  const [personnage, setPersonnage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getPersonnageBySlug(slug)
      .then((data) => {
        if (!cancelled) {
          setPersonnage(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { personnage, loading, error };
}

/**
 * Récupère le catalogue /histoire : tous les personnages groupés par nature.
 * Miroir de usePersonnage (pluriel). Sans argument (lecture globale).
 *
 * @returns {{ groupes: Array, loading: boolean, error: Error|null }}
 */
export function useCataloguePersonnages() {
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getCataloguePersonnages()
      .then((data) => {
        if (!cancelled) {
          setGroupes(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { groupes, loading, error };
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
  const [chateau, setChateau] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getChateauByIdService(id)
      .then((data) => {
        if (!cancelled) {
          setChateau(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { chateau, loading, error };
}
