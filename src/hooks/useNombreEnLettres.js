/**
 * Convertit un nombre en lettres françaises avec règles de
 * typographie françaises modernes (réforme 1990 : tirets partout).
 *
 * Exemples :
 *   1   → "un"
 *   8   → "huit"
 *   31  → "trente-et-un"
 *   71  → "soixante-et-onze"
 *   80  → "quatre-vingts"
 *   81  → "quatre-vingt-un"
 *   101 → "cent-un"
 *
 * Utilisé pour les surfaces éditoriales LCC qui privilégient
 * l'écriture en toutes lettres (« Le Blanc Buisson, l'une de
 * nos huit demeures... »).
 *
 * @param {number} n - Nombre à convertir (0-9999 supporté)
 * @returns {string}
 */
export function nombreEnLettres(n) {
  if (n === 0) return "zéro";

  const unites = [
    "", "un", "deux", "trois", "quatre", "cinq",
    "six", "sept", "huit", "neuf",
  ];
  const dizaines = [
    "", "dix", "vingt", "trente", "quarante", "cinquante",
    "soixante", "soixante", "quatre-vingt", "quatre-vingt",
  ];
  const speciaux = {
    11: "onze", 12: "douze", 13: "treize", 14: "quatorze",
    15: "quinze", 16: "seize",
  };

  // 0-16
  if (n < 10) return unites[n];
  if (n === 10) return "dix";
  if (speciaux[n]) return speciaux[n];

  // 17-19
  if (n < 20) return "dix-" + unites[n - 10];

  // 20-99
  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;

    // Cas spécial 70-79 et 90-99 (français français, pas suisse)
    if (d === 7 || d === 9) {
      const dizaineBase = dizaines[d];
      const reste = nombreEnLettres(10 + u);
      // 71 → soixante-et-onze, 91 → quatre-vingt-onze (pas de "et")
      if (u === 1 && d === 7) {
        return dizaineBase + "-et-" + reste;
      }
      return dizaineBase + "-" + reste;
    }

    // 80 = quatre-vingts (avec "s"), 81+ = quatre-vingt-x (sans s)
    if (d === 8 && u === 0) return "quatre-vingts";

    if (u === 0) return dizaines[d];
    if (u === 1 && d !== 8) return dizaines[d] + "-et-un";
    return dizaines[d] + "-" + unites[u];
  }

  // 100-999
  if (n < 1000) {
    const c = Math.floor(n / 100);
    const reste = n % 100;
    const cent = c === 1 ? "cent" : unites[c] + "-cent";
    if (reste === 0) return c > 1 ? cent + "s" : cent;
    return cent + "-" + nombreEnLettres(reste);
  }

  // 1000-9999
  const m = Math.floor(n / 1000);
  const reste = n % 1000;
  const mille = m === 1 ? "mille" : nombreEnLettres(m) + "-mille";
  if (reste === 0) return mille;
  return mille + "-" + nombreEnLettres(reste);
}

/**
 * Hook React thin wrapper pour usage dans composants.
 *
 * @param {number} n - Nombre à convertir
 * @returns {string}
 */
export function useNombreEnLettres(n) {
  return nombreEnLettres(n);
}
