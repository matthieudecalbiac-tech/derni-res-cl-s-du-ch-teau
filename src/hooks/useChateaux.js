import { useState, useEffect, useCallback } from "react";
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

  // ── REESSAYER ────────────────────────────────────────────────────────────
  // Un compteur, et rien de plus : l incrementer change les deps de l effet,
  // qui rejoue son fetch. Aucune logique dupliquee, aucun etat de plus a tenir
  // en coherence.
  //
  // ⚠ `useCallback` a deps vides : l identite de `refetch` ne change JAMAIS. Un
  // consommateur peut donc le passer a un enfant memoise, ou le mettre dans un
  // tableau de deps, sans declencher de boucle.
  //
  // ⚠ STRICTMODE double les effets en dev. Le drapeau `cancelled` existant s en
  // charge deja : la fonction de nettoyage du premier passage le met a `true`,
  // donc ses `.then`/`.catch` ne posent plus aucun etat. Ajouter le compteur aux
  // deps ne change pas ce mecanisme — chaque passage a son propre drapeau.
  const [tentative, setTentative] = useState(0);
  const refetch = useCallback(() => setTentative((n) => n + 1), []);
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
  }, [excludeMocks, tentative]);

  return { chateaux, loading, error, refetch };
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

  // ── REESSAYER ────────────────────────────────────────────────────────────
  // Un compteur, et rien de plus : l incrementer change les deps de l effet,
  // qui rejoue son fetch. Aucune logique dupliquee, aucun etat de plus a tenir
  // en coherence.
  //
  // ⚠ `useCallback` a deps vides : l identite de `refetch` ne change JAMAIS. Un
  // consommateur peut donc le passer a un enfant memoise, ou le mettre dans un
  // tableau de deps, sans declencher de boucle.
  //
  // ⚠ STRICTMODE double les effets en dev. Le drapeau `cancelled` existant s en
  // charge deja : la fonction de nettoyage du premier passage le met a `true`,
  // donc ses `.then`/`.catch` ne posent plus aucun etat. Ajouter le compteur aux
  // deps ne change pas ce mecanisme — chaque passage a son propre drapeau.
  const [tentative, setTentative] = useState(0);
  const refetch = useCallback(() => setTentative((n) => n + 1), []);
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
  }, [slug, tentative]);

  return { chateau, loading, error, refetch };
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

  // ── REESSAYER ────────────────────────────────────────────────────────────
  // Un compteur, et rien de plus : l incrementer change les deps de l effet,
  // qui rejoue son fetch. Aucune logique dupliquee, aucun etat de plus a tenir
  // en coherence.
  //
  // ⚠ `useCallback` a deps vides : l identite de `refetch` ne change JAMAIS. Un
  // consommateur peut donc le passer a un enfant memoise, ou le mettre dans un
  // tableau de deps, sans declencher de boucle.
  //
  // ⚠ STRICTMODE double les effets en dev. Le drapeau `cancelled` existant s en
  // charge deja : la fonction de nettoyage du premier passage le met a `true`,
  // donc ses `.then`/`.catch` ne posent plus aucun etat. Ajouter le compteur aux
  // deps ne change pas ce mecanisme — chaque passage a son propre drapeau.
  const [tentative, setTentative] = useState(0);
  const refetch = useCallback(() => setTentative((n) => n + 1), []);
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
  }, [slug, tentative]);

  return { personnage, loading, error, refetch };
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

  // ── REESSAYER ────────────────────────────────────────────────────────────
  // Un compteur, et rien de plus : l incrementer change les deps de l effet,
  // qui rejoue son fetch. Aucune logique dupliquee, aucun etat de plus a tenir
  // en coherence.
  //
  // ⚠ `useCallback` a deps vides : l identite de `refetch` ne change JAMAIS. Un
  // consommateur peut donc le passer a un enfant memoise, ou le mettre dans un
  // tableau de deps, sans declencher de boucle.
  //
  // ⚠ STRICTMODE double les effets en dev. Le drapeau `cancelled` existant s en
  // charge deja : la fonction de nettoyage du premier passage le met a `true`,
  // donc ses `.then`/`.catch` ne posent plus aucun etat. Ajouter le compteur aux
  // deps ne change pas ce mecanisme — chaque passage a son propre drapeau.
  const [tentative, setTentative] = useState(0);
  const refetch = useCallback(() => setTentative((n) => n + 1), []);
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
  }, [tentative]);

  return { groupes, loading, error, refetch };
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

  // ── REESSAYER ────────────────────────────────────────────────────────────
  // Un compteur, et rien de plus : l incrementer change les deps de l effet,
  // qui rejoue son fetch. Aucune logique dupliquee, aucun etat de plus a tenir
  // en coherence.
  //
  // ⚠ `useCallback` a deps vides : l identite de `refetch` ne change JAMAIS. Un
  // consommateur peut donc le passer a un enfant memoise, ou le mettre dans un
  // tableau de deps, sans declencher de boucle.
  //
  // ⚠ STRICTMODE double les effets en dev. Le drapeau `cancelled` existant s en
  // charge deja : la fonction de nettoyage du premier passage le met a `true`,
  // donc ses `.then`/`.catch` ne posent plus aucun etat. Ajouter le compteur aux
  // deps ne change pas ce mecanisme — chaque passage a son propre drapeau.
  const [tentative, setTentative] = useState(0);
  const refetch = useCallback(() => setTentative((n) => n + 1), []);
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
  }, [id, tentative]);

  return { chateau, loading, error, refetch };
}
