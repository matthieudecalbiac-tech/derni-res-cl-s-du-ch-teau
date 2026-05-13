// Mock offres pour démo Sprint S2-α.1.5.
// TODO α.2/α.3 : remplacer par lecture Supabase `offres` (cf. supabase/seed.sql section 8).
// Les chambresRestantes et urgences sont éditoriales — pas branchées sur calendrier réel
// (Phase 5.1 client calendar + RPC count_chambres_disponibles).

export const mockOffres = [
  // ──────────────────────────────────────────────────────────────────────────
  // Briottières (id 7) — Module B (Dernières Clés)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "offre-bri-001",
    chateauId: 7,
    module: "dernieresCles",
    titre: "Weekend de mai aux Briottières",
    description:
      "Du vendredi soir au dimanche midi, dans la suite Charles X aux Briottières.",
    dates: { debut: "2026-05-24", fin: "2026-05-26", label: "24 — 26 mai 2026" },
    prixOriginal: 480,
    prixOffre: 360,
    reduction: 25,
    chambresRestantes: 2,
    urgence: "⚜ 2 chambres restantes",
    servicesInclus: [
      "Dîner aux chandelles vendredi soir",
      "Petit-déjeuner servi en chambre",
      "Accès parc et piscine",
      "Brunch dominical",
    ],
    photo: null,
  },
  {
    id: "offre-bri-002",
    chateauId: 7,
    module: "dernieresCles",
    titre: "Une semaine d'été au cœur de l'Anjou",
    description:
      "Sept jours pleins, à votre rythme, dans la chambre verte ou la chambre rose.",
    dates: { debut: "2026-07-12", fin: "2026-07-19", label: "12 — 19 juillet 2026" },
    prixOriginal: 1680,
    prixOffre: 1428,
    reduction: 15,
    chambresRestantes: 1,
    urgence: "⚜ 1 séjour restant",
    servicesInclus: [
      "Petit-déjeuner inclus chaque matin",
      "Accès parc, piscine, vélos",
      "Visite guidée du château (1h)",
    ],
    photo: null,
  },
  {
    id: "offre-bri-003",
    chateauId: 7,
    module: "dernieresCles",
    titre: "Séminaire de cinq jours · privatisation partielle",
    description:
      "Pour une équipe de 6 à 10 personnes, du lundi au vendredi, salle de réunion incluse.",
    dates: { debut: "2026-09-21", fin: "2026-09-25", label: "21 — 25 septembre 2026" },
    prixOriginal: 4800,
    prixOffre: 3840,
    reduction: 20,
    chambresRestantes: 6,
    urgence: "⚜ 6 chambres réservables",
    servicesInclus: [
      "Salle de réunion équipée",
      "Repas du midi et du soir",
      "Pauses café maison",
      "Accès parc et piscine",
    ],
    photo: null,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Le Blanc Buisson (id 8) — Module B (Dernières Clés)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "offre-bb-001",
    chateauId: 8,
    module: "dernieresCles",
    titre: "Weekend au Blanc Buisson",
    description:
      "Du vendredi au dimanche, dans une demeure rare du Pays d'Ouche.",
    dates: { debut: "2026-06-05", fin: "2026-06-07", label: "5 — 7 juin 2026" },
    prixOriginal: 540,
    prixOffre: 378,
    reduction: 30,
    chambresRestantes: 2,
    urgence: "⚜ 2 chambres restantes",
    servicesInclus: [
      "Petit-déjeuner maison",
      "Dîner gastronomique samedi soir",
      "Promenade guidée dans le parc",
    ],
    photo: null,
  },
  {
    id: "offre-bb-002",
    chateauId: 8,
    module: "dernieresCles",
    titre: "Une semaine à la fin de l'été",
    description:
      "Sept nuits dans la chambre de la tour, parc de cinq hectares à votre disposition.",
    dates: { debut: "2026-08-23", fin: "2026-08-30", label: "23 — 30 août 2026" },
    prixOriginal: 1890,
    prixOffre: 1512,
    reduction: 20,
    chambresRestantes: 1,
    urgence: "⚜ Dernière disponibilité",
    servicesInclus: [
      "Petit-déjeuner inclus",
      "Accès parc et bibliothèque",
      "Une soirée avec les propriétaires",
    ],
    photo: null,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Briottières (id 7) — Module C (Club Châtelains)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "offre-club-001",
    chateauId: 7,
    module: "club",
    titre: "Soirée privée des Vendanges",
    description:
      "Réservée aux membres du Club Châtelains. Soirée d'exception avec les propriétaires.",
    dates: { debut: "2026-09-15", fin: "2026-09-15", label: "Septembre 2026" },
    prixOriginal: null,
    prixOffre: 850,
    reduction: 0,
    chambresRestantes: 8,
    urgence: "⚜ 8 places disponibles",
    servicesInclus: [
      "Réception privée des propriétaires",
      "Dégustation cave personnelle",
      "Vins du domaine voisin",
    ],
    photo: null,
  },
];
