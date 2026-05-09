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
