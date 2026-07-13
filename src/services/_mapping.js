// ═══════════════════════════════════════════════════════════════════════════
// _mapping.js — Helpers de transformation Supabase → React (S1-δ Phase 4.3)
// ═══════════════════════════════════════════════════════════════════════════
//
// CONTEXTE
//   Le schema Supabase utilise snake_case et tables pivots pour la
//   normalisation. Le code React historique attend camelCase et objets
//   imbriqués (proprietaires.nom, coordonnees.lat). Ce module est l'unique
//   pont entre ces deux mondes.
//
// PRINCIPE
//   Mappers atomiques composés (lisibilité + testabilité). Tous les mappers
//   tolèrent null/[] (zéro crash en runtime).
//
// CONVENTIONS DE NAMING
//   - rowSupabase   : ce que retourne `.select('*, jointures(*)')`
//   - chateauReact  : format attendu par les composants React
//   - "row"         : ligne Supabase (snake_case)
//   - "item"        : objet React mappé (camelCase)
//
// PHASE 4.3 — chambresRestantes hardcoded null. RPC count_chambres_disponibles
//   prévue en S2 (lecture disponibilites + reservations).
// ═══════════════════════════════════════════════════════════════════════════

/**
 * UUID du Module B (Les Dernières Clés) dans le seed S1-γ.
 * Détermine quelles offres alimentent prixBarre/reduction côté React.
 *
 * Source : deterministicUUID('module', 'B') = SHA-1('module:B')
 */
export const MODULE_B_ID = "636f3128-5185-5803-8ca4-13b8dff29592";

/**
 * UUID du Module C (Le Club des Châtelains) dans le seed S1-γ.
 * Source : deterministicUUID('module', 'C') = SHA-1('module:C')
 */
export const MODULE_C_ID = "7bcbca95-be39-558b-8d9e-f0628d962fda";


// ─────────────────────────────────────────────────────────────────────────────
// HELPERS PRIVÉS
// ─────────────────────────────────────────────────────────────────────────────

function centsToEuros(cents) {
  if (cents === null || cents === undefined) return null;
  return Math.round(cents) / 100;
}

function safeArray(maybeArr) {
  return Array.isArray(maybeArr) ? maybeArr : [];
}

function nullable(v) {
  return v === undefined ? null : v;
}


// ─────────────────────────────────────────────────────────────────────────────
// MAPPERS ATOMIQUES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mappe les colonnes racine de la table `chateaux` vers le format React.
 * Renames camelCase + unflatten coordonnees + unflatten proprietaires.
 *
 * @param {Object} row - Ligne Supabase de la table chateaux (sans jointures).
 * @returns {Object|null} Objet château au format React, ou null si row null.
 *
 * @example
 *   const out = mapChateauBase({ id: "u", slug: "x", est_la_une: true, prop_nom: "F" });
 *   // out.estLaUne === true
 *   // out.proprietaires.nom === "F"
 */
export function mapChateauBase(row) {
  if (!row) return null;

  return {
    id: row.id,
    nom: row.nom,
    slug: row.slug,
    region: nullable(row.region),
    departement: nullable(row.departement),
    ville: nullable(row.ville),
    accroche: nullable(row.accroche),
    siecle: nullable(row.siecle),
    style: nullable(row.style),
    // distance_paris_label (texte éditorial brut) est ce qu'attend le JSX historique
    distanceParis: nullable(row.distance_paris_label),
    distanceParisMinutes: nullable(row.distance_paris),
    urgence: nullable(row.urgence),
    histoire: nullable(row.histoire),
    description: nullable(row.description),
    regionNarrative: nullable(row.region_narrative),
    regionHistoire: nullable(row.region_histoire),
    chiffresCles: nullable(row.chiffres_cles),
    images: safeArray(row.images),
    videoBackground: nullable(row.video_background_youtube_id),
    estLaUne: row.est_la_une === true,
    isDemoMock: row.is_demo_mock === true,
    heroNightStars: row.hero_night_stars === true,
    couleurTheme: nullable(row.couleur_theme),
    accentTheme: nullable(row.accent_theme),
    coordonnees: {
      lat: nullable(row.coordonnees_lat),
      lng: nullable(row.coordonnees_lng),
    },
    proprietaires: {
      nom: nullable(row.prop_nom),
      depuis: nullable(row.prop_depuis),
      initiale: nullable(row.prop_initiale),
      nomAffiche: nullable(row.prop_nom_affiche),
      portrait: nullable(row.prop_portrait),
      citation: nullable(row.prop_citation),
      description: nullable(row.prop_description),
    },
  };
}


/**
 * Mappe une chambre Supabase vers le format React.
 * Conversion `prix_cents` → `prix` (euros, int).
 *
 * @param {Object} row - Ligne de la table `chambres`.
 * @returns {Object|null} Chambre au format React, ou null si row null.
 *
 * @example
 *   const out = mapChambre({ id: "c1", nom: "Suite", prix_cents: 32000 });
 *   // out.prix === 320
 */
export function mapChambre(row) {
  if (!row) return null;
  return {
    id: row.id,
    nom: row.nom,
    description: nullable(row.description),
    superficie: nullable(row.superficie),
    capacite: nullable(row.capacite),
    prix: centsToEuros(row.prix_cents),
    image: nullable(row.image),
    equipements: safeArray(row.equipements),
    ordre: nullable(row.ordre),
  };
}


/**
 * Mappe un événement de la timeline vers le format React.
 *
 * @param {Object} row - Ligne `chateau_timeline`.
 * @returns {Object|null} { annee, evenement } ou null.
 */
export function mapTimelineItem(row) {
  if (!row) return null;
  return {
    annee: nullable(row.annee),
    evenement: nullable(row.evenement),
  };
}


/**
 * Mappe un alentour vers le format React.
 *
 * @param {Object} row - Ligne `chateau_alentours`.
 * @returns {Object|null} { nom, distance, type, icone, description } ou null.
 */
export function mapAlentour(row) {
  if (!row) return null;
  return {
    nom: row.nom,
    distance: nullable(row.distance),
    type: nullable(row.type),
    icone: nullable(row.icone),
    description: nullable(row.description),
  };
}


/**
 * Aplatit la table pivot `chateau_amenities` en booleans simples sur l'objet
 * château. Phase 4 : usage purement présentiel (le composant affiche
 * `parking ? "Parking inclus" : "—"`).
 *
 * Logique : pour chaque amenity_code attendu (parking, wifi, animaux,
 * petitDejeuner), retourne true si une row matching existe avec inclus=true.
 *
 * Le matching se fait sur `nom` normalisé (case-insensitive, sans accents).
 *
 * @param {Array} rows - Tableau de rows `chateau_amenities`.
 * @returns {{parking: boolean, wifi: boolean, animaux: boolean, petitDejeuner: boolean}}
 *
 * @example
 *   flattenAmenities([{ nom: "Parking", inclus: true }])
 *   // { parking: true, wifi: false, animaux: false, petitDejeuner: false }
 */
export function flattenAmenities(rows) {
  const list = safeArray(rows);
  const has = (keyword) =>
    list.some((r) => {
      if (!r || r.inclus !== true) return false;
      const n = String(r.nom || "").toLowerCase();
      return n.includes(keyword);
    });

  return {
    parking: has("parking"),
    wifi: has("wi-fi") || has("wifi"),
    animaux: has("animaux") || has("animal"),
    petitDejeuner: has("petit-déjeuner") || has("petit déjeuner") || has("breakfast"),
  };
}


/**
 * Extrait le tarif Module B (Les Dernières Clés) depuis le tableau d'offres.
 * Si pas d'offre Module B visible, retourne tous les champs à null.
 *
 * Mapping :
 *   - prixBarre  = prix_base_cents / 100
 *   - prix       = prix_promo_cents / 100 si présent, sinon prix_base / 100
 *   - reduction  = reduction_pct (déjà en %)
 *
 * @param {Array} offres - Tableau de rows `offres`.
 * @returns {{prixBarre: number|null, prix: number|null, reduction: number|null}}
 *
 * @example
 *   applyOffreModuleB([{ module_id: MODULE_B_ID, visible: true,
 *                        prix_base_cents: 38000, prix_promo_cents: 28500,
 *                        reduction_pct: 25 }])
 *   // { prixBarre: 380, prix: 285, reduction: 25 }
 */
export function applyOffreModuleB(offres) {
  const list = safeArray(offres);
  const moduleB = list.find(
    (o) => o && o.module_id === MODULE_B_ID && o.visible === true
  );
  if (!moduleB) {
    return { prixBarre: null, prix: null, reduction: null };
  }
  const base = centsToEuros(moduleB.prix_base_cents);
  const promo = centsToEuros(moduleB.prix_promo_cents);
  return {
    prixBarre: base,
    prix: promo !== null ? promo : base,
    reduction: nullable(moduleB.reduction_pct),
  };
}


// Formate un prix en euros a la francaise : 237.8 -> "237,80", 290 -> "290".
// Les entiers restent sans decimales (un chateau a 290 EUR, pas 290,00 EUR).
// Exporte : reutilise pour formater un prix derive (ex. min d'offres) a l'affichage.
export function formaterPrix(euros) {
  if (euros === null || euros === undefined) return null;
  const entier = Number.isInteger(euros);
  return euros.toLocaleString("fr-FR", {
    minimumFractionDigits: entier ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

// Formate la plage de dates d'une offre : "24 au 26 mai 2026", ou null si absente.
function labelDates(debut, fin) {
  if (!debut && !fin) return null;
  const opts = { day: "numeric", month: "long", year: "numeric" };
  try {
    if (debut && fin) {
      const d = new Date(debut), f = new Date(fin);
      return `Du ${d.toLocaleDateString("fr-FR", opts)} au ${f.toLocaleDateString("fr-FR", opts)}`;
    }
    const seul = new Date(debut || fin);
    return seul.toLocaleDateString("fr-FR", opts);
  } catch {
    return null;
  }
}

/**
 * Mappe une row Supabase "offres" vers la shape attendue par les vitrines
 * (ContenuDernieresCles / ContenuClub). Reprend le patron de prix
 * d'applyOffreModuleB : prixOffre n'est JAMAIS null (fallback base).
 *
 * Le slug du château arrive par la jointure (row.chateaux?.slug) ou en argument.
 *
 * @param {Object} row - Ligne `offres` (éventuellement jointe à chateaux(slug)).
 * @param {"dernieresCles"|"club"} moduleNom - Nom de module côté front.
 * @param {string|null} chateauSlug - Slug fourni directement (prioritaire).
 * @returns {Object|null} Offre au format React, ou null si row null.
 */
export function mapOffre(row, moduleNom, chateauSlug = null) {
  if (!row) return null;
  const base = centsToEuros(row.prix_base_cents);
  const promo = centsToEuros(row.prix_promo_cents);
  return {
    id: row.id,
    chateauSlug: chateauSlug ?? row.chateaux?.slug ?? null,
    module: moduleNom,
    titre: row.titre,
    description: nullable(row.description),
    dates: {
      debut: nullable(row.date_debut),
      fin: nullable(row.date_fin),
      label: labelDates(row.date_debut, row.date_fin),
    },
    prixOriginal: base,
    // JAMAIS null : les deux renderers font {o.prixOffre} sans garde.
    prixOffre: promo !== null ? promo : base,
    // Champs formates FR pour l'affichage (les numeriques restent pour les calculs).
    prixOriginalAffiche: formaterPrix(base),
    prixOffreAffiche: formaterPrix(promo !== null ? promo : base),
    reduction: nullable(row.reduction_pct),
    // Pas de colonne en base : on n'invente pas de donnee.
    chambresRestantes: null,   // dependra du chantier disponibilites
    urgence: null,             // derive de chambresRestantes
    servicesInclus: [],        // "conditions" est du texte libre, pas une liste
    photo: null,               // les deux renderers utilisent un placeholder
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// MAPPER PUBLIC — wrapper composé
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mappe une row Supabase complète (avec jointures) vers le format React
 * historique attendu par les composants. C'est la seule fonction qu'un
 * appelant externe doit utiliser.
 *
 * Contrat de prix (2 niveaux distincts) :
 *   - prix       : tarif Module B vendu (null si pas d'offre B active)
 *   - prixBarre  : prix barré Module B (null si pas d'offre B active)
 *   - reduction  : % Module B (null si pas d'offre B active)
 *   - prixDepart : "À partir de" calculé depuis min(chambres.prix),
 *                  toujours peuplé tant qu'au moins 1 chambre existe
 *
 * Cette séparation évite la propagation de null dans les composants
 * React qui affichent "À partir de X€" (utilisent prixDepart) versus
 * ceux qui affichent une offre Module B (utilisent prix/prixBarre).
 *
 * Robustesse :
 *   - rowSupabase null/undefined → return null
 *   - jointures undefined → traitées comme []
 *   - chambresRestantes → toujours null (RPC en S2)
 *
 * Source query attendue :
 *   supabase
 *     .from('chateaux')
 *     .select('*, chambres(*), chateau_timeline(*), chateau_alentours(*),
 *              chateau_amenities(*), offres(*)')
 *
 * @param {Object} rowSupabase - Row chateaux + jointures.
 * @returns {Object|null} Objet château au format React, ou null.
 */
export function mapChateau(rowSupabase) {
  if (!rowSupabase) return null;

  const base = mapChateauBase(rowSupabase);
  const amenities = flattenAmenities(rowSupabase.chateau_amenities);
  const offreModuleB = applyOffreModuleB(rowSupabase.offres);

  // Chambres mappées + triées (utilisées 2x : prixDepart calc + return).
  const chambresMappees = safeArray(rowSupabase.chambres)
    .map(mapChambre)
    .filter(Boolean)
    .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));

  // prixDepart : "À partir de X€" calculé depuis min des prix chambres.
  // Distinct de chateau.prix qui est le tarif Module B (peut être null).
  const prixChambres = chambresMappees
    .map((c) => c.prix)
    .filter((p) => typeof p === "number" && p > 0);
  const prixDepart = prixChambres.length > 0 ? Math.min(...prixChambres) : null;

  return {
    ...base,
    ...amenities,
    ...offreModuleB,
    chambres: chambresMappees,
    timeline: safeArray(rowSupabase.chateau_timeline)
      .slice()
      .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
      .map(mapTimelineItem)
      .filter(Boolean),
    alentours: safeArray(rowSupabase.chateau_alentours)
      .slice()
      .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
      .map(mapAlentour)
      .filter(Boolean),
    chambresRestantes: null,
    prixDepart,
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// MAPPER INVERSE — form React → row Supabase (colonnes de `chateaux` SEULES)
// ─────────────────────────────────────────────────────────────────────────────
//
// PÉRIMÈTRE (brique 2b) : le base-row `chateaux` uniquement. Les tables filles
// (chambres, timeline, alentours, amenities, offres) ont chacune leur propre
// inverse en 2d. Ici, on ne produit QUE des colonnes de la table `chateaux`.
//
// EXCLUSIONS EXPLICITES :
//   - Dérivés (DERIVES_NON_ECRITS) : prix / prixBarre / reduction viennent de
//     la table `offres` ; prixDepart est calculé ; chambresRestantes est null.
//     Ce ne sont PAS des colonnes de `chateaux` → jamais écrits.
//   - Amenities (parking/wifi/animaux/petitDejeuner) : source de vérité = pivot
//     `chateau_amenities` (logique insert/delete), traitée en 2d. Non touchée.
//   - DB-managées : id, created_at, updated_at, statut, nb_avis, note_sur_5,
//     date_disponible → hors mapping (défauts base / gérées ailleurs).

/** Champ React (plat) → colonne `chateaux` (snake_case). Seule source de colonnes. */
const CHAMP_VERS_COLONNE = {
  nom: "nom",
  slug: "slug",
  region: "region",
  departement: "departement",
  ville: "ville",
  accroche: "accroche",
  siecle: "siecle",
  style: "style",
  urgence: "urgence",
  histoire: "histoire",
  description: "description",
  regionNarrative: "region_narrative",
  regionHistoire: "region_histoire",
  chiffresCles: "chiffres_cles",
  images: "images",
  videoBackground: "video_background_youtube_id",
  estLaUne: "est_la_une",
  isDemoMock: "is_demo_mock",
  heroNightStars: "hero_night_stars",
  couleurTheme: "couleur_theme",
  accentTheme: "accent_theme",
  // Re-séparation de la distance (mapChateauBase fusionne les deux colonnes).
  distanceParis: "distance_paris_label",
  distanceParisMinutes: "distance_paris",
};

/** Sous-champ `proprietaires.*` → colonne `prop_*`. */
const PROP_VERS_COLONNE = {
  nom: "prop_nom",
  depuis: "prop_depuis",
  initiale: "prop_initiale",
  nomAffiche: "prop_nom_affiche",
  portrait: "prop_portrait",
  citation: "prop_citation",
  description: "prop_description",
};

/**
 * Champs présents dans l'objet React (sortie de mapChateau) mais qui NE SONT
 * PAS des colonnes de `chateaux` — chateauToRow ne les écrit JAMAIS.
 * Exportée pour être vérifiée par les tests (garde anti-régression).
 */
export const DERIVES_NON_ECRITS = [
  "prix",         // → table offres (Module B)
  "prixBarre",    // → table offres (Module B)
  "reduction",    // → table offres (Module B)
  "prixDepart",   // calculé depuis min(chambres.prix)
  "chambresRestantes", // toujours null (RPC S2), pas de colonne
];

/**
 * Inverse de mapChateau pour les colonnes de la table `chateaux` seulement.
 * Transformation PURE (aucune écriture base).
 *
 * Comportement partiel : une colonne n'est produite que si sa clé est présente
 * dans le form (détection par présence). Permet un UPDATE partiel ultérieur —
 * un champ absent n'écrase pas la colonne existante.
 *
 * @param {Object} form - Objet château au format React (typiquement une sortie
 *   de mapChateau éditée, ou les valeurs d'un formulaire admin).
 * @param {Object} [options]
 * @param {boolean} [options.partial=false] - Si false (défaut, "form complet") :
 *   `nom` et `slug` sont requis (colonnes NOT NULL) → throw si absents/vides.
 *   Si true (UPDATE ciblé) : cette validation est relâchée.
 * @returns {Object} Row `chateaux` (snake_case) prête pour insert/update.
 * @throws {Error} form invalide, ou nom/slug manquants en mode non-partiel.
 */
export function chateauToRow(form, { partial = false } = {}) {
  if (!form || typeof form !== "object") {
    throw new Error("chateauToRow : form manquant ou invalide.");
  }

  const present = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

  // nom + slug : identité NOT NULL de la table. Exigés pour un form complet.
  if (!partial) {
    if (typeof form.nom !== "string" || form.nom.trim() === "") {
      throw new Error("chateauToRow : 'nom' est requis (colonne NOT NULL).");
    }
    if (typeof form.slug !== "string" || form.slug.trim() === "") {
      throw new Error("chateauToRow : 'slug' est requis (colonne NOT NULL).");
    }
  }

  const row = {};

  // Champs plats — émis seulement si présents (support UPDATE partiel).
  for (const [champ, colonne] of Object.entries(CHAMP_VERS_COLONNE)) {
    if (present(form, champ)) row[colonne] = form[champ];
  }

  // coordonnees.{lat,lng} → coordonnees_lat / coordonnees_lng
  if (present(form, "coordonnees") && form.coordonnees && typeof form.coordonnees === "object") {
    if (present(form.coordonnees, "lat")) row.coordonnees_lat = form.coordonnees.lat;
    if (present(form.coordonnees, "lng")) row.coordonnees_lng = form.coordonnees.lng;
  }

  // proprietaires.* → colonnes prop_*
  if (present(form, "proprietaires") && form.proprietaires && typeof form.proprietaires === "object") {
    for (const [sousChamp, colonne] of Object.entries(PROP_VERS_COLONNE)) {
      if (present(form.proprietaires, sousChamp)) row[colonne] = form.proprietaires[sousChamp];
    }
  }

  return row;
}
