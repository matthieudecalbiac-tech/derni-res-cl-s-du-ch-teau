import { useMemo } from "react";
import { chateaux as chateauxData } from "../data/chateaux";

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
  return useMemo(() => {
    const source = excludeMocks
      ? chateauxData.filter((c) => !c.isDemoMock)
      : chateauxData;

    const total = source.length;

    const parRegion = source.reduce((acc, c) => {
      acc[c.region] = (acc[c.region] || 0) + 1;
      return acc;
    }, {});

    const regionsCouvertes = Object.keys(parRegion).length;

    const urgences = source.filter((c) => c.urgence).length;

    const urgentesJ7 = source.filter(
      (c) => c.urgence === "J-7"
    ).length;

    const chambresRestantes = source.reduce(
      (acc, c) => acc + (c.chambresRestantes || 0),
      0
    );

    const chambresUrgentes = source.reduce(
      (acc, c) => acc + (c.urgence ? c.chambresRestantes || 0 : 0),
      0
    );

    return {
      total,
      parRegion,
      regionsCouvertes,
      urgences,
      urgentesJ7,
      chambresRestantes,
      chambresUrgentes,
    };
  }, [excludeMocks]);
}
