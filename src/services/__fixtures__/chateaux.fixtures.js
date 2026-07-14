// ═══════════════════════════════════════════════════════════════════════════
// FIXTURES Supabase — chateaux + jointures (S1-δ Phase 4.3)
// ═══════════════════════════════════════════════════════════════════════════
// Miment exactement ce que retourne :
//
//   supabase
//     .from('chateaux')
//     .select('*, chambres(*), chateau_timeline(*), chateau_alentours(*),
//              chateau_amenities(*), offres(*)')
//     .eq('slug', X)
//     .single();
//
// UUIDs alignés avec le seed S1-γ (deterministicUUID SHA-1 par slug).
// ═══════════════════════════════════════════════════════════════════════════

const UUID_BRIOTTIERES = "35015d71-5591-570c-8023-cc077d981cd4";
const UUID_VAUX        = "1835a34d-9680-5a79-8eb4-313e3932c782";
const UUID_MODULE_A    = "6c150030-e9c1-574f-8124-5e08eb2981d1";
const UUID_MODULE_B    = "636f3128-5185-5803-8ca4-13b8dff29592";
const UUID_MODULE_C    = "7bcbca95-be39-558b-8d9e-f0628d962fda";

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURE_BRIOTTIERES — château premium AVEC offre Module B active
// ─────────────────────────────────────────────────────────────────────────────

export const FIXTURE_BRIOTTIERES = {
  id: UUID_BRIOTTIERES,
  nom: "Château des Briottières",
  slug: "les-briottieres",
  region: "Pays de la Loire",
  departement: "Maine-et-Loire",
  ville: "Champigné",
  accroche: "Sept générations d'une même famille, cinquante hectares d'Anjou.",
  siecle: "XVIIIe siècle",
  style: "Demeure familiale · Art de vivre anjouvin",
  distance_paris: 135,
  distance_paris_label: "2h15 de Paris",
  urgence: "J-10",
  coordonnees_lat: 47.6833,
  coordonnees_lng: -0.5333,
  histoire: "Nées au coeur de l'Anjou à la fin du Moyen Âge...",
  description: "Au coeur de l'Anjou, dans un parc à l'anglaise de 50 hectares...",
  region_narrative: "L'Anjou est l'une des provinces les plus douces de France...",
  region_histoire: "Le Maine-et-Loire fut longtemps le cœur du royaume des Plantagenets...",
  chiffres_cles: { ans: 7, hectares: 50, generations: 7, etoiles: 4 },
  images: ["/bri-1.avif", "/bri-2.avif", "/bri-3.avif"],
  video_background_youtube_id: null,
  prop_nom: "Arnaud & Madeleine de Valbray",
  prop_depuis: "2010",
  prop_initiale: "A",
  prop_nom_affiche: "Arnaud & Madeleine de Valbray",
  prop_portrait: "/bri-arnaud.avif",
  prop_citation: "Dans la même famille depuis sept générations.",
  prop_description: "Arnaud de Valbray a grandi dans ces murs.",
  est_la_une: true,
  is_demo_mock: false,
  hero_night_stars: false,
  une_de_la_semaine: true,
  ordre_home: 1,
  note_sur_5: null,
  nb_avis: 0,
  date_disponible: null,
  couleur_theme: "#1a0e05",
  accent_theme: "#C09840",
  petit_dejeuner: false,
  parking: true,
  wifi: true,
  animaux: true,

  // ── Jointures ────────────────────────────────────────────────────────────
  chambres: [
    {
      id: "chambre-bri-1",
      chateau_id: UUID_BRIOTTIERES,
      nom: "Chambre Charles X",
      description: "Suite junior avec balcon donnant sur le lac.",
      superficie: "27 m²",
      capacite: 2,
      prix_cents: 32000,
      image: "https://example.com/chambre-charles-x.avif",
      equipements: ["Balcon vue lac", "Mobilier Empire", "Lit à baldaquin"],
      ordre: 0,
    },
    {
      id: "chambre-bri-2",
      chateau_id: UUID_BRIOTTIERES,
      nom: "Chambre Madame de Staël",
      description: "Suite avec cheminée d'époque.",
      superficie: "32 m²",
      capacite: 2,
      prix_cents: 38000,
      image: "https://example.com/chambre-stael.avif",
      equipements: ["Cheminée", "Vue parc", "Bureau Empire"],
      ordre: 1,
    },
    {
      id: "chambre-bri-3",
      chateau_id: UUID_BRIOTTIERES,
      nom: "Suite des Valbray",
      description: "Suite parentale avec dressing.",
      superficie: "45 m²",
      capacite: 4,
      prix_cents: 52000,
      image: "https://example.com/suite-valbray.avif",
      equipements: ["Dressing", "Salle de bain marbre", "Vue jardins"],
      ordre: 2,
    },
  ],

  chateau_timeline: [
    { id: "tl-bri-1", chateau_id: UUID_BRIOTTIERES, annee: "1485", evenement: "Jean de La Saussaie acquiert les Briottières", ordre: 0 },
    { id: "tl-bri-2", chateau_id: UUID_BRIOTTIERES, annee: "1528", evenement: "Édification de la chapelle Saint-Bonaventure", ordre: 1 },
    { id: "tl-bri-3", chateau_id: UUID_BRIOTTIERES, annee: "1750", evenement: "Reconstruction du corps principal", ordre: 2 },
    { id: "tl-bri-4", chateau_id: UUID_BRIOTTIERES, annee: "1979", evenement: "François et Hedwige de Valbray relèvent la maison", ordre: 3 },
    { id: "tl-bri-5", chateau_id: UUID_BRIOTTIERES, annee: "2010", evenement: "Arnaud et Madeleine prennent la suite", ordre: 4 },
  ],

  chateau_alentours: [
    { id: "al-bri-1", chateau_id: UUID_BRIOTTIERES, nom: "Château du Plessis-Bourré", distance: "20 min", type: "patrimoine", icone: "⚜", description: "Joyau intact de 1480.", ordre: 0 },
    { id: "al-bri-2", chateau_id: UUID_BRIOTTIERES, nom: "Angers — Tapisserie de l'Apocalypse", distance: "30 min", type: "patrimoine", icone: "◆", description: "Plus grande tapisserie médiévale du monde.", ordre: 1 },
    { id: "al-bri-3", chateau_id: UUID_BRIOTTIERES, nom: "Vignobles de Savennières", distance: "35 min", type: "gastronomie", icone: "🍇", description: "Grand cru blanc d'Anjou.", ordre: 2 },
  ],

  chateau_amenities: [
    { id: "am-bri-1", chateau_id: UUID_BRIOTTIERES, type: "service", nom: "Parking", description: "Cour intérieure", icone: "🚗", image: null, inclus: true, prix_supplement_cents: null, duree_minutes: null, ordre: 0 },
    { id: "am-bri-2", chateau_id: UUID_BRIOTTIERES, type: "service", nom: "Wi-Fi", description: "Haut débit", icone: "📶", image: null, inclus: true, prix_supplement_cents: null, duree_minutes: null, ordre: 1 },
    { id: "am-bri-3", chateau_id: UUID_BRIOTTIERES, type: "service", nom: "Animaux acceptés", description: "Sur demande", icone: "🐕", image: null, inclus: true, prix_supplement_cents: null, duree_minutes: null, ordre: 2 },
    { id: "am-bri-4", chateau_id: UUID_BRIOTTIERES, type: "activite", nom: "Dîner aux chandelles", description: "Table d'hôtes familiale", icone: "◆", image: "/bri-diner.avif", inclus: false, prix_supplement_cents: 8500, duree_minutes: 120, ordre: 3 },
  ],

  offres: [
    {
      id: "offre-bri-b-1",
      chateau_id: UUID_BRIOTTIERES,
      module_id: UUID_MODULE_B,
      chambre_id: null,
      titre: "Dernières clés Briottières",
      description: "Offre last-minute J-10",
      prix_base_cents: 38000,
      prix_promo_cents: 28500,
      reduction_pct: 25,
      date_debut: "2026-05-15",
      date_fin: "2026-05-30",
      capacite_max: null,
      conditions: null,
      visible: true,
      requires_role: null,
      evenement_meta: null,
      ordre: 0,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURE_VAUX — château mock SANS offre Module B
// ─────────────────────────────────────────────────────────────────────────────

export const FIXTURE_VAUX = {
  id: UUID_VAUX,
  nom: "Château de Vaux-le-Vicomte",
  slug: "vaux-le-vicomte",
  region: "Île-de-France",
  departement: "Seine-et-Marne",
  ville: "Maincy",
  accroche: "Le château qui inspira Versailles.",
  siecle: "XVIIe",
  style: "Baroque classique",
  distance_paris: 45,
  distance_paris_label: "55 km · 45 min",
  urgence: "J-7",
  coordonnees_lat: 48.5681,
  coordonnees_lng: 2.7157,
  histoire: "Demeure légendaire de Nicolas Fouquet...",
  description: "Demeure légendaire de Nicolas Fouquet, Vaux-le-Vicomte incarne le faste du Grand Siècle.",
  region_narrative: "L'Île-de-France réunit les grandes résidences royales...",
  region_histoire: "La Seine-et-Marne fut historiquement le pays de Brie...",
  chiffres_cles: null,
  images: ["https://images.unsplash.com/photo-1562602833-0f4ab2fc46e3?w=1200&q=80"],
  video_background_youtube_id: null,
  prop_nom: "Famille de Vogüé",
  prop_depuis: "1875",
  prop_initiale: "F",
  prop_nom_affiche: "de Vogüé",
  prop_portrait: "https://images.unsplash.com/photo-portrait.jpg",
  prop_citation: "Vaux-le-Vicomte n'est pas un musée, c'est une maison vivante.",
  prop_description: "La famille de Vogüé veille sur Vaux-le-Vicomte depuis cinq générations.",
  est_la_une: false,
  is_demo_mock: true,
  note_sur_5: null,
  nb_avis: 0,
  date_disponible: null,
  couleur_theme: "#1a2d5a",
  accent_theme: "#c8973e",
  petit_dejeuner: false,
  parking: true,
  wifi: true,
  animaux: false,

  chambres: [
    {
      id: "chambre-vaux-1",
      chateau_id: UUID_VAUX,
      nom: "Chambre Fouquet",
      description: "Suite d'apparat dans l'aile nord.",
      superficie: "45 m²",
      capacite: 2,
      prix_cents: 38000,
      image: "https://example.com/chambre-fouquet.avif",
      equipements: ["Lit baldaquin", "Vue jardins"],
      ordre: 0,
    },
  ],

  chateau_timeline: [
    { id: "tl-vaux-1", chateau_id: UUID_VAUX, annee: "1658", evenement: "Début de la construction sous Louis Le Vau", ordre: 0 },
  ],

  chateau_alentours: [
    { id: "al-vaux-1", chateau_id: UUID_VAUX, nom: "Forêt de Fontainebleau", distance: "20 km", type: "nature", icone: "✦", description: "Massif forestier de 25 000 hectares.", ordre: 0 },
  ],

  chateau_amenities: [
    { id: "am-vaux-1", chateau_id: UUID_VAUX, type: "service", nom: "Parking", description: null, icone: "🚗", inclus: true, prix_supplement_cents: null, duree_minutes: null, ordre: 0 },
    { id: "am-vaux-2", chateau_id: UUID_VAUX, type: "service", nom: "Wi-Fi", description: null, icone: "📶", inclus: true, prix_supplement_cents: null, duree_minutes: null, ordre: 1 },
  ],

  // Pas d'offre Module B — uniquement Module A (Vitrine Permanente)
  offres: [
    {
      id: "offre-vaux-a-1",
      chateau_id: UUID_VAUX,
      module_id: UUID_MODULE_A,
      chambre_id: null,
      titre: "Présence vitrine Vaux",
      description: null,
      prix_base_cents: 38000,
      prix_promo_cents: null,
      reduction_pct: null,
      date_debut: null,
      date_fin: null,
      capacite_max: null,
      conditions: null,
      visible: true,
      requires_role: null,
      evenement_meta: null,
      ordre: 0,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURE_MINIMAL — cas limite (toutes jointures vides ou null)
// ─────────────────────────────────────────────────────────────────────────────

export const FIXTURE_MINIMAL = {
  id: "00000000-0000-0000-0000-000000000001",
  nom: "Château minimal",
  slug: "minimal",
  region: null,
  departement: null,
  ville: null,
  accroche: null,
  siecle: null,
  style: null,
  distance_paris: null,
  distance_paris_label: null,
  urgence: null,
  coordonnees_lat: null,
  coordonnees_lng: null,
  histoire: null,
  description: null,
  region_narrative: null,
  region_histoire: null,
  chiffres_cles: null,
  images: [],
  video_background_youtube_id: null,
  prop_nom: null,
  prop_depuis: null,
  prop_initiale: null,
  prop_nom_affiche: null,
  prop_portrait: null,
  prop_citation: null,
  prop_description: null,
  est_la_une: false,
  is_demo_mock: false,
  note_sur_5: null,
  nb_avis: 0,
  date_disponible: null,
  couleur_theme: null,
  accent_theme: null,
  petit_dejeuner: false,
  parking: false,
  wifi: false,
  animaux: false,
  chambres: [],
  chateau_timeline: [],
  chateau_alentours: [],
  chateau_amenities: [],
  offres: [],
};

// Constantes module exposées pour les tests applyOffreModuleB.
export const MODULE_IDS = {
  A: UUID_MODULE_A,
  B: UUID_MODULE_B,
  C: UUID_MODULE_C,
};
