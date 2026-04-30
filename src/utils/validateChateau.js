// src/utils/validateChateau.js
//
// Validation stricte du schéma Chateau (cf. src/types/Chateau.js).
// Conçu Chantier 2.1 (Phase A3) le 30 avril 2026.
//
// Deux exports :
//   - validateChateau(chateau)         : valide une seule entrée, throw si invalide
//   - validateChateauxArray(chateaux)  : valide tout le tableau + unicités globales (id, slug)
//
// Convention : collecte TOUTES les erreurs avant throw final, pour
// produire un rapport lisible plutôt qu'un fail-on-first opaque.
// Format des messages : « Château {nom} (id {id}) : {détail} ».

const URGENCES = ["J-7", "J-10", "J-15"];
const ALENTOUR_TYPES = [
  "patrimoine", "nature", "village", "gastronomie",
  "culture", "spirituel", "sport", "histoire",
];
const ALENTOUR_ICONES = ["⚜", "◆", "★", "✦"];
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const SLUG = /^[a-z0-9-]+$/;

const REQUIRED_TOP_LEVEL = [
  "id", "nom", "slug",
  "region", "departement", "ville", "distanceParis", "coordonnees",
  "style", "siecle",
  "urgence", "chambresRestantes", "prixBarre", "reduction",
  "images",
  "accroche", "histoire", "description",
  "regionNarrative", "regionHistoire", "chiffresCles", "timeline",
  "proprietaires", "chambres", "activites", "alentours",
  "parking", "wifi", "animaux",
  "couleurTheme", "accentTheme",
];

const REQUIRED_PROPRIETAIRES = [
  "nom", "depuis", "portrait", "citation",
  "description", "initiale", "nomAffiche",
];
const REQUIRED_CHAMBRE = [
  "nom", "description", "superficie", "capacite",
  "prix", "image", "equipements",
];
const REQUIRED_ACTIVITE = ["icone", "nom", "description"];
const REQUIRED_ALENTOUR = ["nom", "distance", "type", "icone", "description"];
const REQUIRED_CHIFFRECLE = ["val", "lab"];
const REQUIRED_TIMELINE = ["annee", "evenement"];

function isStringNonEmpty(v) { return typeof v === "string" && v.length > 0; }
function isNumber(v) { return typeof v === "number" && !Number.isNaN(v); }
function isBoolean(v) { return typeof v === "boolean"; }
function isArray(v) { return Array.isArray(v); }
function isObject(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }

/**
 * Valide un château unique. Throw avec rapport exhaustif si invalide.
 *
 * @param {import("../types/Chateau.js").Chateau} chateau
 * @throws {Error} si le château n'est pas conforme au schéma
 */
export function validateChateau(chateau) {
  const errors = collectErrors(chateau);
  if (errors.length > 0) {
    const label = `Château ${chateau?.nom ?? "?"} (id ${chateau?.id ?? "?"})`;
    throw new Error(
      `${label} : ${errors.length} erreur(s) :\n  - ${errors.join("\n  - ")}`
    );
  }
}

/**
 * Valide tout un tableau de châteaux + vérifie les unicités globales (id, slug).
 * Throw avec rapport exhaustif regroupant toutes les erreurs.
 *
 * @param {import("../types/Chateau.js").Chateau[]} chateaux
 * @throws {Error} si un château au moins est invalide ou si une unicité est violée
 */
export function validateChateauxArray(chateaux) {
  if (!isArray(chateaux)) {
    throw new Error(
      `validateChateauxArray : argument doit être un array (reçu ${typeof chateaux})`
    );
  }
  const allErrors = [];

  // Validation par château
  chateaux.forEach((c) => {
    const errs = collectErrors(c);
    const label = `Château ${c?.nom ?? "?"} (id ${c?.id ?? "?"})`;
    errs.forEach((e) => allErrors.push(`${label} : ${e}`));
  });

  // Unicités globales
  const idsSeen = new Map();
  const slugsSeen = new Map();
  chateaux.forEach((c, idx) => {
    if (c?.id !== undefined) {
      if (idsSeen.has(c.id)) {
        allErrors.push(
          `id ${c.id} dupliqué (rang ${idsSeen.get(c.id)} et rang ${idx})`
        );
      } else {
        idsSeen.set(c.id, idx);
      }
    }
    if (isStringNonEmpty(c?.slug)) {
      if (slugsSeen.has(c.slug)) {
        allErrors.push(
          `slug "${c.slug}" dupliqué (rang ${slugsSeen.get(c.slug)} et rang ${idx})`
        );
      } else {
        slugsSeen.set(c.slug, idx);
      }
    }
  });

  if (allErrors.length > 0) {
    throw new Error(
      `Validation chateaux.js échouée — ${allErrors.length} erreur(s) :\n  - ${allErrors.join("\n  - ")}`
    );
  }
}

// ─── Implémentation interne ────────────────────────────────────

function collectErrors(c) {
  const errors = [];
  if (!isObject(c)) {
    errors.push(`château doit être un objet (reçu ${typeof c})`);
    return errors;
  }

  // Présence des champs requis
  REQUIRED_TOP_LEVEL.forEach((k) => {
    if (c[k] === undefined || c[k] === null) {
      errors.push(`champ "${k}" manquant`);
    }
  });

  // Types simples
  if (c.id !== undefined && !(isNumber(c.id) && Number.isInteger(c.id) && c.id > 0)) {
    errors.push(`champ "id" doit être un entier > 0 (reçu ${JSON.stringify(c.id)})`);
  }

  const STRINGS_TOP = [
    "nom", "slug", "region", "departement", "ville", "distanceParis",
    "style", "siecle", "accroche", "histoire", "description",
    "regionNarrative", "regionHistoire",
  ];
  STRINGS_TOP.forEach((k) => {
    if (c[k] !== undefined && !isStringNonEmpty(c[k])) {
      errors.push(`champ "${k}" doit être une string non vide`);
    }
  });

  if (isStringNonEmpty(c.slug) && !SLUG.test(c.slug)) {
    errors.push(`champ "slug" doit être en kebab-case (reçu "${c.slug}")`);
  }

  if (c.chambresRestantes !== undefined &&
      !(isNumber(c.chambresRestantes) && Number.isInteger(c.chambresRestantes) && c.chambresRestantes > 0)) {
    errors.push(`champ "chambresRestantes" doit être un entier > 0`);
  }
  if (c.prixBarre !== undefined && !(isNumber(c.prixBarre) && c.prixBarre > 0)) {
    errors.push(`champ "prixBarre" doit être un nombre > 0`);
  }
  if (c.reduction !== undefined &&
      !(isNumber(c.reduction) && c.reduction >= 0 && c.reduction <= 100)) {
    errors.push(`champ "reduction" doit être un nombre dans [0, 100]`);
  }

  ["parking", "wifi", "animaux"].forEach((k) => {
    if (c[k] !== undefined && !isBoolean(c[k])) {
      errors.push(`champ "${k}" doit être un booléen`);
    }
  });

  if (c.estLaUne !== undefined && !isBoolean(c.estLaUne)) {
    errors.push(`champ "estLaUne" doit être un booléen (optionnel, défaut false)`);
  }
  if (c.videoBackground !== undefined && !isStringNonEmpty(c.videoBackground)) {
    errors.push(`champ "videoBackground" doit être une string non vide (optionnel)`);
  }

  ["couleurTheme", "accentTheme"].forEach((k) => {
    if (c[k] !== undefined && (!isStringNonEmpty(c[k]) || !HEX_COLOR.test(c[k]))) {
      errors.push(`champ "${k}" doit être une couleur hex 6 chars (reçu ${JSON.stringify(c[k])})`);
    }
  });

  // Enum urgence
  if (c.urgence !== undefined && !URGENCES.includes(c.urgence)) {
    errors.push(`champ "urgence"="${c.urgence}" invalide (autorisés : ${URGENCES.join(", ")})`);
  }

  // Coordonnées
  if (c.coordonnees !== undefined) {
    if (!isObject(c.coordonnees)) {
      errors.push(`champ "coordonnees" doit être un objet { lat, lng }`);
    } else {
      const { lat, lng } = c.coordonnees;
      if (!isNumber(lat) || lat < 41 || lat > 51) {
        errors.push(`coordonnees.lat hors France métropolitaine [41, 51] (reçu ${JSON.stringify(lat)})`);
      }
      if (!isNumber(lng) || lng < -5 || lng > 10) {
        errors.push(`coordonnees.lng hors France métropolitaine [-5, 10] (reçu ${JSON.stringify(lng)})`);
      }
    }
  }

  // Images
  if (c.images !== undefined) {
    if (!isArray(c.images) || c.images.length < 1) {
      errors.push(`champ "images" doit être un array de min 1 entrée`);
    } else {
      c.images.forEach((img, i) => {
        if (!isStringNonEmpty(img)) errors.push(`images[${i}] doit être une string non vide`);
      });
    }
  }

  // Propriétaires
  if (c.proprietaires !== undefined) {
    if (!isObject(c.proprietaires)) {
      errors.push(`champ "proprietaires" doit être un objet`);
    } else {
      REQUIRED_PROPRIETAIRES.forEach((k) => {
        if (!isStringNonEmpty(c.proprietaires[k])) {
          errors.push(`proprietaires.${k} manquant ou invalide (string non vide attendue)`);
        }
      });
    }
  }

  // Chambres
  if (c.chambres !== undefined) {
    if (!isArray(c.chambres) || c.chambres.length < 1) {
      errors.push(`champ "chambres" doit être un array de min 1 entrée`);
    } else {
      c.chambres.forEach((ch, i) => {
        if (!isObject(ch)) {
          errors.push(`chambres[${i}] doit être un objet`);
          return;
        }
        REQUIRED_CHAMBRE.forEach((k) => {
          if (ch[k] === undefined) errors.push(`chambres[${i}].${k} manquant`);
        });
        if (ch.capacite !== undefined &&
            !(isNumber(ch.capacite) && Number.isInteger(ch.capacite) && ch.capacite > 0)) {
          errors.push(`chambres[${i}].capacite doit être un entier > 0`);
        }
        if (ch.prix !== undefined && !(isNumber(ch.prix) && ch.prix > 0)) {
          errors.push(`chambres[${i}].prix doit être un nombre > 0`);
        }
        if (ch.equipements !== undefined && !isArray(ch.equipements)) {
          errors.push(`chambres[${i}].equipements doit être un array de strings`);
        }
      });
    }
  }

  // Activités (objets {icone, nom, description})
  if (c.activites !== undefined) {
    if (!isArray(c.activites) || c.activites.length < 4) {
      errors.push(`champ "activites" doit être un array de min 4 entrées`);
    } else {
      c.activites.forEach((a, i) => {
        if (!isObject(a)) {
          errors.push(`activites[${i}] doit être un objet { icone, nom, description } (reçu ${typeof a})`);
          return;
        }
        REQUIRED_ACTIVITE.forEach((k) => {
          if (!isStringNonEmpty(a[k])) errors.push(`activites[${i}].${k} manquant ou invalide`);
        });
      });
    }
  }

  // Alentours
  if (c.alentours !== undefined) {
    if (!isArray(c.alentours) || c.alentours.length < 4) {
      errors.push(`champ "alentours" doit être un array de min 4 entrées`);
    } else {
      c.alentours.forEach((a, i) => {
        if (!isObject(a)) {
          errors.push(`alentours[${i}] doit être un objet`);
          return;
        }
        REQUIRED_ALENTOUR.forEach((k) => {
          if (!isStringNonEmpty(a[k])) errors.push(`alentours[${i}].${k} manquant ou invalide`);
        });
        if (a.type !== undefined && !ALENTOUR_TYPES.includes(a.type)) {
          errors.push(`alentours[${i}].type="${a.type}" invalide (autorisés : ${ALENTOUR_TYPES.join(", ")})`);
        }
        if (a.icone !== undefined && !ALENTOUR_ICONES.includes(a.icone)) {
          errors.push(`alentours[${i}].icone="${a.icone}" invalide (autorisés : ${ALENTOUR_ICONES.join(", ")})`);
        }
      });
    }
  }

  // Chiffres clés (cardinalité = 4 exact)
  if (c.chiffresCles !== undefined) {
    if (!isArray(c.chiffresCles) || c.chiffresCles.length !== 4) {
      const got = isArray(c.chiffresCles) ? c.chiffresCles.length : "non-array";
      errors.push(`champ "chiffresCles" doit contenir exactement 4 entrées (reçu ${got})`);
    } else {
      c.chiffresCles.forEach((ck, i) => {
        if (!isObject(ck)) {
          errors.push(`chiffresCles[${i}] doit être un objet { val, lab }`);
          return;
        }
        REQUIRED_CHIFFRECLE.forEach((k) => {
          if (!isStringNonEmpty(ck[k])) errors.push(`chiffresCles[${i}].${k} manquant ou invalide`);
        });
      });
    }
  }

  // Timeline
  if (c.timeline !== undefined) {
    if (!isArray(c.timeline) || c.timeline.length < 4) {
      errors.push(`champ "timeline" doit être un array de min 4 entrées`);
    } else {
      c.timeline.forEach((t, i) => {
        if (!isObject(t)) {
          errors.push(`timeline[${i}] doit être un objet { annee, evenement }`);
          return;
        }
        REQUIRED_TIMELINE.forEach((k) => {
          if (!isStringNonEmpty(t[k])) errors.push(`timeline[${i}].${k} manquant ou invalide`);
        });
      });
    }
  }

  return errors;
}
