// ═══════════════════════════════════════════════════════════════════════════
// validerPublication.js — règles éditoriales de publication d'un château
// ═══════════════════════════════════════════════════════════════════════════
// Fonction PURE et testable. Prend un château au format React (tel que renvoyé
// par getChateauAdminById) et retourne deux listes de messages français :
//
//   { bloquants: string[], avertissements: string[] }
//
//   - bloquants      : empêchent la publication (contenu incomplet). Tant que
//                      cette liste n'est pas vide, on ne publie pas.
//   - avertissements : signalés mais non bloquants (conformité éditoriale LCC).
//
// bloquants.length === 0  ⇒  le château est publiable.
// ═══════════════════════════════════════════════════════════════════════════

const NB_IMAGES_MIN = 3;

// Placeholders de contenu non fini (insensible à la casse).
const PLACEHOLDERS = ["lorem", "todo", "a completer", "à compléter", "xxx"];

function estVide(v) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

function contientPlaceholder(txt) {
  const bas = txt.toLowerCase();
  return PLACEHOLDERS.some((p) => bas.includes(p));
}

/**
 * @param {Object} chateau - Château au format React (getChateauAdminById).
 * @returns {{ bloquants: string[], avertissements: string[] }}
 */
export function validerPublication(chateau) {
  const bloquants = [];
  const avertissements = [];

  if (!chateau || typeof chateau !== "object") {
    return { bloquants: ["Château introuvable ou invalide."], avertissements: [] };
  }

  // ── BLOQUANTS : complétude du contenu ──
  const requis = [
    ["nom", "Le nom"],
    ["slug", "Le slug"],
    ["region", "La région"],
    ["accroche", "L'accroche"],
    ["histoire", "L'histoire"],
    ["description", "La description"],
  ];
  for (const [champ, libelle] of requis) {
    if (estVide(chateau[champ])) {
      bloquants.push(`${libelle} est obligatoire pour publier.`);
    }
  }

  const nbImages = Array.isArray(chateau.images) ? chateau.images.length : 0;
  if (nbImages < NB_IMAGES_MIN) {
    bloquants.push(`Il faut au moins ${NB_IMAGES_MIN} images (actuellement ${nbImages}).`);
  }

  const nbChambres = Array.isArray(chateau.chambres) ? chateau.chambres.length : 0;
  if (nbChambres < 1) {
    bloquants.push("Il faut au moins une chambre.");
  }

  const lat = chateau.coordonnees?.lat;
  const lng = chateau.coordonnees?.lng;
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    bloquants.push("Les coordonnées GPS sont manquantes.");
  }

  if (estVide(chateau.proprietaires?.nom)) {
    bloquants.push("Le nom du propriétaire est manquant.");
  }

  // Cohérence région/département : NON codée pour l'instant — pas de table de
  // correspondance fiable. À ajouter avec une vraie table (region -> [depts]).

  // ── AVERTISSEMENTS : conformité éditoriale LCC (non bloquants) ──
  const champsTexte = [
    ["accroche", "l'accroche"],
    ["histoire", "l'histoire"],
    ["description", "la description"],
    ["regionNarrative", "le narratif de région"],
  ];
  for (const [champ, libelle] of champsTexte) {
    const val = chateau[champ];
    if (typeof val !== "string") continue;
    if (val.includes("%")) {
      avertissements.push(
        `Un pourcentage apparaît dans ${libelle} — vérifier la règle Fondation ` +
        `(une partie de nos recettes, jamais un %).`
      );
    }
    if (contientPlaceholder(val)) {
      avertissements.push(`Texte à compléter détecté dans ${libelle}.`);
    }
  }

  return { bloquants, avertissements };
}
