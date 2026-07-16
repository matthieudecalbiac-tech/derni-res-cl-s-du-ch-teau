/**
 * Slugifie une chaîne française — SOURCE UNIQUE.
 * Règles EXACTES de l'ancienne copie d'AdminChateauNouveau (celle qui a produit
 * les slugs en prod) : décompose les accents (é→e, ç→c…), retire les diacritiques
 * via \p{Diacritic}, minuscules, apostrophes (droite ET typographique) → séparateur,
 * tout caractère non [a-z0-9] → tiret (collapsé), pas de tiret en tête/fin.
 *
 * Consommée par : AdminChateauNouveau (slug château), chateauxService (nom de
 * fichier image), et le futur sélecteur de personnages. Le slug DOIT rester
 * calculé au même endroit partout — divergence = slugs incohérents.
 *
 * `String(str ?? "")` : garde de robustesse (null / undefined / non-string → "")
 * sans changer le résultat d'une chaîne valide.
 *
 * @param {string} str
 * @returns {string} slug kebab-case (peut être "" si l'entrée n'a aucun alphanumérique)
 */
export function slugify(str) {
  return String(str ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")    // retire les accents combinants
    .toLowerCase()
    .replace(/['’]/g, " ")             // apostrophes → séparateur
    .replace(/[^a-z0-9]+/g, "-")       // espaces, ponctuation, reste → tiret
    .replace(/^-+|-+$/g, "");          // pas de tiret en tête / fin
}
