import { useState, useEffect } from "react";
import { getCompteurs as getCompteursService } from "../services/chateauxService";

/**
 * Hook compteurs dynamiques basés sur la data `chateaux.js`.
 *
 * Préparé pour Phase 2.2.bis qui remplacera les chiffres
 * hardcodés actuels (`Hero`, `BandeauOffres`, `VitrinePermanente`,
 * `HeureAuxDemeures`, `APropos`, `PartenairesChateaux`).
 *
 * @param {Object} [options]
 * @param {boolean} [options.excludeMocks=false] - Si true, ne compte
 *   que les vrais châteaux (pas les `isDemoMock=true`).
 * @returns {{
 *   total: number,
 *   parRegion: Object<string, number>,
 *   regionsCouvertes: number,
 *   urgences: number,
 *   urgentesJ7: number,
 *   chambresRestantes: number,
 *   chambresUrgentes: number
 * }}
 */
export function useCompteurs({ excludeMocks = false } = {}) {
  const [compteurs, setCompteurs] = useState({
    total: 0,
    parRegion: {},
    regionsCouvertes: 0,
    urgences: 0,
    urgentesJ7: 0,
    chambresRestantes: 0,
    chambresUrgentes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getCompteursService({ excludeMocks })
      .then((data) => {
        if (!cancelled) {
          setCompteurs(data);
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

  return { compteurs, loading, error };
}
