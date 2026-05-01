export const chateaux = [
  {
    id: 1,
    isDemoMock: true,
    nom: "Château de Vaux-le-Vicomte",
    slug: "vaux-le-vicomte",
    region: "Île-de-France",
    departement: "Seine-et-Marne",
    ville: "Maincy",
    distanceParis: "55 km · 45 min",
    urgence: "J-7",
    chambresRestantes: 2,
    prix: 380,
    prixBarre: 620,
    reduction: 39,
    coordonnees: { lat: 48.5681, lng: 2.7157 },
    image:
      "https://images.unsplash.com/photo-1562602833-0f4ab2fc46e3?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1562602833-0f4ab2fc46e3?w=1200&q=80",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
    ],
    style: "Baroque classique",
    siecle: "XVIIe",
    accroche: "Le château qui inspira Versailles, le temps d'une nuit",
    histoire:
      "Demeure légendaire de Nicolas Fouquet, surintendant des finances de Louis XIV, Vaux-le-Vicomte fut érigé entre 1658 et 1661. Sa magnificence provoqua la jalousie du Roi-Soleil, qui fit arrêter Fouquet peu après la fête d'inauguration. Le château devint alors le modèle sur lequel fut conçu Versailles. Ses jardins à la française, dessinés par André Le Nôtre, ses appartements d'apparat peints par Charles Le Brun, et son architecture signée Louis Le Vau composent un ensemble d'une cohérence artistique rare.",
    description:
      "Demeure légendaire de Nicolas Fouquet, Vaux-le-Vicomte incarne le faste du Grand Siècle. Ses jardins à la française dessinés par Le Nôtre, ses appartements d'apparat et ses cuisines historiques composent un écrin incomparable pour une nuit d'exception.",
    timeline: [
      {
        annee: "1658",
        evenement: "Début de la construction sous la direction de Louis Le Vau",
      },
      {
        annee: "1661",
        evenement:
          "Inauguration fastueuse — Fouquet reçoit Louis XIV et 6 000 invités",
      },
      {
        annee: "1661",
        evenement:
          "Arrestation de Fouquet sur ordre du Roi — le château est saisi",
      },
      {
        annee: "1875",
        evenement:
          "Acquisition par Alfred Sommier, industriel sucrier, qui le restaure",
      },
      {
        annee: "1968",
        evenement: "Ouverture au public — premières Nuits aux Chandelles",
      },
      {
        annee: "2024",
        evenement: "Labellisé Patrimoine Exceptionnel de France",
      },
    ],
    chiffresCles: [
      { val: "1661", lab: "Inauguration" },
      { val: "33 ha", lab: "Domaine" },
      { val: "XVIIe", lab: "Siècle" },
      { val: "55 km", lab: "De Paris" },
    ],
    proprietaires: {
      nom: "Famille de Vogüé",
      depuis: "1875",
      initiale: "F",
      nomAffiche: "amille de Vogüé",
      portrait:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
      citation:
        "Vaux-le-Vicomte n'est pas un musée, c'est une maison vivante. Chaque soir aux chandelles, nous voyons des yeux s'émerveiller — c'est pour cela que nous continuons.",
      description:
        "La famille de Vogüé veille sur Vaux-le-Vicomte depuis cinq générations. Héritiers d'Alfred Sommier qui sauva le château de la ruine en 1875, ils ont fait le choix de l'ouvrir au monde tout en préservant son caractère intimement privé.",
    },
    chambres: [
      {
        nom: "Chambre Fouquet",
        description:
          "Suite d'apparat dans l'aile nord, mobilier Louis XIV d'origine, vue sur les jardins Le Nôtre et le Grand Canal.",
        superficie: "45 m²",
        capacite: 2,
        prix: 380,
        image:
          "https://images.unsplash.com/photo-1560185127-6a207d4bb8e0?w=800&q=80",
        equipements: [
          "Lit baldaquin",
          "Salle de bain marbre",
          "Vue jardins",
          "Petit-déjeuner inclus",
        ],
      },
      {
        nom: "Suite Le Brun",
        description:
          "Ancienne chambre du peintre Charles Le Brun, plafonds peints d'origine, atmosphère d'atelier royal.",
        superficie: "55 m²",
        capacite: 2,
        prix: 480,
        image:
          "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&q=80",
        equipements: [
          "Plafonds peints XVIIe",
          "Salon privé",
          "Vue cour d'honneur",
          "Champagne à l'arrivée",
        ],
      },
      {
        nom: "Appartement Le Nôtre",
        description:
          "Appartement de deux pièces donnant directement sur les parterres brodés, le plus grand domaine privé de France.",
        superficie: "80 m²",
        capacite: 4,
        prix: 680,
        image:
          "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80",
        equipements: [
          "2 chambres",
          "Terrasse privée",
          "Vue panoramique",
          "Butler dédié",
        ],
      },
    ],
    experiences: [
      "Dîner aux chandelles",
      "Visite privée nocturne",
      "Jardins à la française",
      "Spa baroque",
    ],
    activites: [
      {
        icone: "✦",
        nom: "Dîner aux chandelles",
        description:
          "Dîner gastronomique dans les salons d'apparat à la lueur de 2 000 bougies",
      },
      {
        icone: "✦",
        nom: "Jardins Le Nôtre",
        description:
          "Promenade guidée dans les jardins à la française, chef-d'œuvre d'André Le Nôtre",
      },
      {
        icone: "✦",
        nom: "Spa & bien-être",
        description: "Soins et massages dans les anciennes écuries rénovées",
      },
      {
        icone: "✦",
        nom: "Visite privée nocturne",
        description:
          "Exploration exclusive des appartements royaux après la fermeture au public",
      },
      {
        icone: "✦",
        nom: "Équitation",
        description: "Balade équestre dans le domaine au lever du soleil",
      },
      {
        icone: "✦",
        nom: "Cave privée",
        description:
          "Dégustation de grands crus en cave voûtée du XVIIe siècle",
      },
    ],
    alentours: [
      { nom: "Forêt de Fontainebleau", distance: "20 km", type: "nature", icone: "✦", description: "Massif forestier de 25 000 hectares classé, célèbre pour ses chaos rocheux et ses sentiers ouverts à la randonnée et à l'escalade." },
      { nom: "Melun (marché provençal)", distance: "6 km", type: "village", icone: "◆", description: "Préfecture de Seine-et-Marne, marché animé plusieurs fois par semaine au cœur de la vieille ville sur la Seine." },
      { nom: "Château de Fontainebleau", distance: "18 km", type: "culture", icone: "◆", description: "Résidence royale habitée pendant huit siècles, classée au patrimoine mondial de l'UNESCO depuis 1981." },
      { nom: "Barbizon (village des peintres)", distance: "25 km", type: "culture", icone: "◆", description: "Village des peintres pré-impressionnistes, où Millet et Théodore Rousseau ont vécu et travaillé au XIXe siècle." },
    ],
    regionNarrative: "L'Île-de-France réunit les grandes résidences royales et nobiliaires de France. Vaux-le-Vicomte, en Seine-et-Marne, s'inscrit dans cette tradition de proximité avec le pouvoir. Le domaine, aux portes de la Brie, illustre l'art des jardins à la française au XVIIe siècle.",
    regionHistoire: "La Seine-et-Marne fut historiquement le pays de Brie, terre fertile et prospère sous l'Ancien Régime. Sa proximité avec Paris et la Cour y attira l'aristocratie et les officiers du roi. Châteaux de Fontainebleau, Vaux-le-Vicomte, Champs-sur-Marne et Blandy-les-Tours témoignent de ce passé d'apparat et de pouvoir.",
    tags: ["Jardins", "Gastronomie", "Histoire", "Spa"],
    dateDisponible: "Ce week-end",
    noteSur5: 4.9,
    nbAvis: 127,
    petitDejeuner: true,
    parking: true,
    wifi: true,
    animaux: false,
    couleurTheme: "#1a2d5a",
    accentTheme: "#c8973e",
  },
  // TODO pass éditorial Tanguy : ajouter 1-2 vraies photos du château
  {
    id: 2,
    isDemoMock: true,
    nom: "Château de Pierrefonds",
    slug: "pierrefonds",
    region: "Hauts-de-France",
    departement: "Oise",
    ville: "Pierrefonds",
    distanceParis: "85 km · 1h10",
    urgence: "J-10",
    chambresRestantes: 4,
    prix: 290,
    prixBarre: 450,
    reduction: 36,
    coordonnees: { lat: 49.3442, lng: 2.9797 },
    image:
      "https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?w=1200&q=80",
    ],
    style: "Médiéval restauré",
    siecle: "XIIe–XIXe",
    accroche:
      "Une forteresse médiévale sortie tout droit des légendes arthuriennes",
    histoire:
      "Édifié au XIIe siècle, le château de Pierrefonds fut rasé sur ordre de Louis XIV en 1617. Napoléon III en fit l'acquisition en 1813 pour la somme symbolique de 2 500 francs, puis confia sa restauration à Eugène Viollet-le-Duc entre 1857 et 1885. Ce dernier ne se contenta pas de restaurer mais réinventa une forteresse médiévale idéale, enrichie d'une iconographie arthurienne et royale qui en fait un château de rêve autant qu'un monument historique.",
    description:
      "Restauré par Viollet-le-Duc pour Napoléon III, Pierrefonds est l'une des plus spectaculaires forteresses médiévales d'Europe. Ses tours majestueuses, ses douves et ses salles d'armes transportent instantanément dans un autre siècle.",
    timeline: [
      {
        annee: "1190",
        evenement: "Construction initiale par les comtes de Valois",
      },
      {
        annee: "1617",
        evenement:
          "Démantèlement sur ordre de Louis XIV pour punir les frondeurs",
      },
      {
        annee: "1813",
        evenement: "Acquisition par Napoléon Ier pour 2 500 francs",
      },
      {
        annee: "1857",
        evenement: "Viollet-le-Duc commence la restauration pour Napoléon III",
      },
      {
        annee: "1885",
        evenement:
          "Achèvement des travaux — chef-d'œuvre de l'architecture néo-médiévale",
      },
      {
        annee: "1980",
        evenement:
          "Classement Monument Historique et ouverture partielle au public",
      },
    ],
    chiffresCles: [
      { val: "1190", lab: "Construction initiale" },
      { val: "1885", lab: "Restauration Viollet-le-Duc" },
      { val: "XIIe–XIXe", lab: "Siècles" },
      { val: "85 km", lab: "De Paris" },
    ],
    proprietaires: {
      nom: "Centre des Monuments Nationaux",
      depuis: "1885",
      initiale: "C",
      nomAffiche: "entre des Monuments Nationaux",
      portrait:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80",
      citation:
        "Pierrefonds est l'œuvre d'un génie et d'un empereur. Notre mission est de faire vivre ce rêve de pierre pour les générations futures.",
      description:
        "Propriété de l'État depuis Napoléon III, Pierrefonds est géré par le Centre des Monuments Nationaux qui a ouvert une aile résidentielle d'exception permettant de dormir dans la forteresse même.",
    },
    chambres: [
      {
        nom: "Chambre des Preux",
        description:
          "Dans la tour nord, mobilier néo-gothique dessiné par Viollet-le-Duc, vue sur les douves et la forêt de Compiègne.",
        superficie: "38 m²",
        capacite: 2,
        prix: 290,
        image:
          "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80",
        equipements: [
          "Mobilier Viollet-le-Duc",
          "Vue sur douves",
          "Salle de bain pierre",
          "Petit-déjeuner inclus",
        ],
      },
      {
        nom: "Suite Impériale",
        description:
          "Appartements de Napoléon III entièrement restaurés, tapisseries d'Aubusson, vue sur la cour d'honneur.",
        superficie: "65 m²",
        capacite: 2,
        prix: 390,
        image:
          "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&q=80",
        equipements: [
          "Tapisseries Aubusson",
          "Salon impérial",
          "Vue cour d'honneur",
          "Champagne Napoléon",
        ],
      },
      {
        nom: "Tour de Charlemagne",
        description:
          "Suite circulaire dans la plus haute tour, panorama à 360° sur Pierrefonds et la forêt, escalier à vis privatif.",
        superficie: "50 m²",
        capacite: 2,
        prix: 450,
        image:
          "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80",
        equipements: [
          "Vue 360°",
          "Escalier privatif",
          "Lit à baldaquin",
          "Accès remparts",
        ],
      },
    ],
    experiences: [
      "Chevauchée en forêt de Compiègne",
      "Dîner médiéval",
      "Tir à l'arc",
      "Visite des remparts",
    ],
    activites: [
      {
        icone: "✦",
        nom: "Tir à l'arc médiéval",
        description:
          "Initiation au tir à l'arc dans les douves du château avec maître archer",
      },
      {
        icone: "✦",
        nom: "Chevauchée en forêt",
        description:
          "Randonnée équestre dans la forêt de Compiègne, 14 500 hectares de nature royale",
      },
      {
        icone: "✦",
        nom: "Festin médiéval",
        description:
          "Banquet servi à la grande table d'apparat, avec troubadours et jongleurs",
      },
      {
        icone: "✦",
        nom: "Remparts & donjon",
        description:
          "Visite exclusive des chemins de ronde et du grand donjon au coucher du soleil",
      },
      {
        icone: "✦",
        nom: "Chasse photographique",
        description:
          "Safari photo en forêt de Compiègne avec guide naturaliste",
      },
      {
        icone: "✦",
        nom: "Canoë sur l'Aisne",
        description: "Descente privée sur la rivière Aisne au pied du château",
      },
    ],
    alentours: [
      { nom: "Forêt de Compiègne", distance: "5 km", type: "nature", icone: "✦", description: "Massif royal de 14 500 hectares, ancienne réserve de chasse des rois et empereurs, sentiers et clairières ouverts au public." },
      { nom: "Compiègne (palais impérial)", distance: "14 km", type: "culture", icone: "◆", description: "Résidence d'été des rois de France et de Napoléon III, vaste palais ouvert à la visite et abritant le musée du Second Empire." },
      { nom: "Clairière de l'Armistice", distance: "12 km", type: "patrimoine", icone: "⚜", description: "Lieu de signature de l'Armistice du 11 novembre 1918, mémorial reconstruit après la Seconde Guerre mondiale." },
      { nom: "Village de Pierrefonds", distance: "0.5 km", type: "village", icone: "◆", description: "Bourg médiéval pittoresque dominé par le château, étapes de promenade autour de l'étang et des halles." },
    ],
    regionNarrative: "Les Hauts-de-France, autour de Compiègne, sont une terre de forêts royales et de châteaux où l'histoire s'est jouée à plusieurs reprises. Pierrefonds, dans l'Oise, illustre la fascination du XIXe siècle pour le Moyen Âge réinventé par Viollet-le-Duc.",
    regionHistoire: "L'Oise fut au cœur du royaume capétien, terre des seigneurs de Valois et résidence des rois de France à Compiègne. Forêts profondes, abbayes médiévales et palais impériaux y composent un paysage patrimonial dense, marqué aussi par les deux guerres mondiales — la signature de l'Armistice de 1918 s'y est tenue.",
    tags: ["Équitation", "Forêt", "Histoire", "Aventure"],
    dateDisponible: "Samedi prochain",
    noteSur5: 4.7,
    nbAvis: 89,
    petitDejeuner: true,
    parking: true,
    wifi: true,
    animaux: true,
    couleurTheme: "#2c1810",
    accentTheme: "#c8973e",
  },
  // TODO pass éditorial Tanguy : ajouter 1-2 vraies photos du château
  {
    id: 3,
    isDemoMock: true,
    nom: "Château de Chantilly",
    slug: "chantilly",
    region: "Hauts-de-France",
    departement: "Oise",
    ville: "Chantilly",
    distanceParis: "48 km · 35 min",
    urgence: "J-15",
    chambresRestantes: 6,
    prix: 450,
    prixBarre: 680,
    reduction: 34,
    coordonnees: { lat: 49.1936, lng: 2.4847 },
    image:
      "https://images.unsplash.com/photo-1659526062822-72f35fedff25?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1659526062822-72f35fedff25?w=1200&q=80",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
    ],
    style: "Renaissance & Classique",
    siecle: "XVIe–XIXe",
    accroche: "Le grand domaine des Condé, entre forêt, hippodrome et musée",
    histoire:
      "Le domaine de Chantilly appartint successivement aux plus grandes familles de France. Anne de Montmorency, connétable de France, y fit édifier le Grand Château au XVIe siècle. Le Grand Condé, vainqueur de Rocroi, en fit une résidence fastueuse confiée à Le Nôtre pour les jardins et Molière pour les divertissements. Le duc d'Aumale, fils de Louis-Philippe, légua l'ensemble à l'Institut de France avec sa collection de peintures, aujourd'hui l'une des plus importantes de France après le Louvre.",
    description:
      "Entouré de douves et de jardins à la française, le Château de Chantilly abrite l'un des plus beaux musées de peinture de France. L'hippodrome, la forêt et les Grandes Écuries composent un domaine d'une richesse incomparable.",
    timeline: [
      {
        annee: "1484",
        evenement: "Construction du premier château par Pierre d'Orgemont",
      },
      {
        annee: "1528",
        evenement:
          "Anne de Montmorency transforme Chantilly en résidence princière",
      },
      {
        annee: "1671",
        evenement:
          "Le Grand Condé confie les jardins à Le Nôtre, reçoit Louis XIV",
      },
      {
        annee: "1830",
        evenement:
          "Le duc d'Aumale hérite du domaine et constitue sa collection",
      },
      {
        annee: "1886",
        evenement: "Legs à l'Institut de France — naissance du Musée Condé",
      },
      {
        annee: "2023",
        evenement:
          "Restauration complète des Grandes Écuries, ouverture de l'hôtel",
      },
    ],
    chiffresCles: [
      { val: "1484", lab: "Premier château" },
      { val: "6 300 ha", lab: "Forêt domaniale" },
      { val: "XVIe–XIXe", lab: "Siècles" },
      { val: "48 km", lab: "De Paris" },
    ],
    proprietaires: {
      nom: "Institut de France",
      depuis: "1886",
      initiale: "I",
      nomAffiche: "nstitut de France",
      portrait:
        "https://images.unsplash.com/photo-1560250097-0dc005d9af94?w=400&q=80",
      citation:
        "Le duc d'Aumale nous a légué non seulement un château, mais une vision de la France à son apogée. Nous en sommes les gardiens humbles et fiers.",
      description:
        "L'Institut de France, gardien du domaine depuis le legs du duc d'Aumale en 1886, a ouvert les Grandes Écuries en hébergement de prestige. Une façon unique de dormir au cœur d'un des plus grands domaines de France.",
    },
    chambres: [
      {
        nom: "Stalle Princière",
        description:
          "Ancienne stalle des pur-sang du Grand Condé, transformée en chambre de caractère, poutres apparentes et box d'origine.",
        superficie: "42 m²",
        capacite: 2,
        prix: 450,
        image:
          "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80",
        equipements: [
          "Architecture XVIIe",
          "Poutres apparentes",
          "Vue cour des écuries",
          "Petit-déjeuner inclus",
        ],
      },
      {
        nom: "Suite Condé",
        description:
          "Suite de deux pièces dans l'aile d'honneur, mobilier Empire, vue directe sur les douves et le château.",
        superficie: "70 m²",
        capacite: 2,
        prix: 620,
        image:
          "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&q=80",
        equipements: [
          "Mobilier Empire",
          "Vue château et douves",
          "Salon privé",
          "Accès musée privé",
        ],
      },
      {
        nom: "Appartement Aumale",
        description:
          "Appartement de trois pièces dans les appartements privés du duc, collection de gravures d'origine, terrasse sur les jardins.",
        superficie: "95 m²",
        capacite: 4,
        prix: 890,
        image:
          "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80",
        equipements: [
          "3 pièces",
          "Terrasse jardins",
          "Collection gravures",
          "Butler & majordome",
        ],
      },
    ],
    experiences: [
      "Polo & hippodrome",
      "Musée Condé",
      "Crème Chantilly originale",
      "Promenade en calèche",
    ],
    activites: [
      {
        icone: "✦",
        nom: "Polo & hippodrome",
        description:
          "Visite des écuries princières et entraînement matinal des pur-sang",
      },
      {
        icone: "✦",
        nom: "Musée Condé",
        description:
          "Visite privée de la collection : Raphaël, Botticelli, Poussin...",
      },
      {
        icone: "✦",
        nom: "Atelier Crème Chantilly",
        description:
          "Secrets de la vraie crème Chantilly avec le chef pâtissier du domaine",
      },
      {
        icone: "✦",
        nom: "Calèche dans le parc",
        description:
          "Promenade en calèche d'époque dans les allées et jardins Le Nôtre",
      },
      {
        icone: "✦",
        nom: "Forêt de Chantilly",
        description:
          "Randonnée guidée dans les 6 300 hectares de forêt domaniale",
      },
      {
        icone: "✦",
        nom: "Fauconnerie",
        description: "Initiation à la fauconnerie avec les rapaces du domaine",
      },
    ],
    alentours: [
      { nom: "Forêt de Chantilly", distance: "0 km", type: "nature", icone: "✦", description: "Forêt domaniale de 6 300 hectares contiguë au château, sentiers, étangs et site classé Natura 2000." },
      { nom: "Senlis (cité médiévale)", distance: "10 km", type: "village", icone: "◆", description: "Cité épiscopale aux ruelles pavées, cathédrale gothique du XIIe siècle et remparts gallo-romains préservés." },
      { nom: "Abbaye de Royaumont", distance: "12 km", type: "culture", icone: "◆", description: "Abbaye cistercienne fondée par Saint Louis en 1228, aujourd'hui centre culturel et musical international." },
      { nom: "Hippodrome de Chantilly", distance: "1 km", type: "sport", icone: "✦", description: "L'un des plus prestigieux hippodromes d'Europe, accueille le Prix du Jockey Club et le Prix de Diane chaque année." },
    ],
    regionNarrative: "À une heure de Paris, la plaine cantilienne ouvre les Hauts-de-France sur un paysage de forêts royales et de grands domaines. Chantilly, terre des Condé puis du duc d'Aumale, abrite l'un des plus importants ensembles patrimoniaux français au nord de la capitale.",
    regionHistoire: "Le pays de Chantilly fut longtemps le territoire des Montmorency et des Condé, princes du sang et grands soldats du royaume. Le duc d'Aumale, fils de Louis-Philippe, légua le domaine à l'Institut de France en 1886 avec sa collection de peintures, l'une des plus importantes en France après celle du Louvre.",
    tags: ["Art", "Équitation", "Gastronomie", "Parc"],
    dateDisponible: "Dans 2 semaines",
    noteSur5: 4.8,
    nbAvis: 203,
    petitDejeuner: true,
    parking: true,
    wifi: true,
    animaux: false,
    couleurTheme: "#1a3a2a",
    accentTheme: "#c8973e",
  },
  {
    id: 4,
    isDemoMock: true,
    nom: "Château de Fontainebleau",
    slug: "fontainebleau",
    region: "Île-de-France",
    departement: "Seine-et-Marne",
    ville: "Fontainebleau",
    distanceParis: "65 km · 50 min",
    urgence: "J-7",
    chambresRestantes: 3,
    prix: 520,
    prixBarre: 790,
    reduction: 34,
    coordonnees: { lat: 48.4025, lng: 2.7017 },
    image:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200&q=80",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
    ],
    style: "Renaissance royale",
    siecle: "XVIe",
    accroche: "La demeure de trente rois de France, au cœur de la forêt",
    histoire:
      "Fontainebleau est la seule résidence royale française habitée sans interruption pendant huit siècles, de Saint Louis à Napoléon III. François Ier en fit une Renaissance à la française en y invitant les meilleurs artistes italiens — le Rosso Fiorentino et le Primatice — créant ainsi la première École de Fontainebleau. Napoléon Ier y signa son abdication le 11 avril 1814, dans le Salon Rouge, épisode entré dans l'histoire comme les Adieux de Fontainebleau.",
    description:
      "Résidence favorite des rois de France pendant huit siècles, Fontainebleau est un palais vivant, entouré d'une forêt de 25 000 hectares idéale pour l'escalade, l'équitation et les promenades au grand air.",
    timeline: [
      {
        annee: "1137",
        evenement:
          "Louis VII fait construire la première tour — naissance du domaine royal",
      },
      {
        annee: "1528",
        evenement:
          "François Ier entreprend la transformation Renaissance, invite artistes italiens",
      },
      {
        annee: "1600",
        evenement: "Henri IV agrandit massivement — création de la cour Ovale",
      },
      {
        annee: "1814",
        evenement:
          "Napoléon signe son abdication dans le Salon Rouge — les Adieux",
      },
      {
        annee: "1981",
        evenement: "Classement au Patrimoine Mondial de l'UNESCO",
      },
      {
        annee: "2019",
        evenement:
          "Ouverture des appartements privés en hébergement d'exception",
      },
    ],
    chiffresCles: [
      { val: "1137", lab: "Première tour" },
      { val: "25 000 ha", lab: "Forêt domaniale" },
      { val: "8 siècles", lab: "Habité sans interruption" },
      { val: "65 km", lab: "De Paris" },
    ],
    proprietaires: {
      nom: "République Française — CMN",
      depuis: "1793",
      initiale: "R",
      nomAffiche: "épublique Française — CMN",
      portrait:
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80",
      citation:
        "Fontainebleau n'appartient pas à la France — c'est la France elle-même, condensée en pierre, en or et en forêt.",
      description:
        "Propriété nationale depuis la Révolution, Fontainebleau est géré par le Centre des Monuments Nationaux. Une aile privée a été ouverte aux hôtes de marque, permettant de vivre dans les murs où trente rois ont résidé.",
    },
    chambres: [
      {
        nom: "Chambre François Ier",
        description:
          "Dans l'aile Renaissance, lambris peints par l'École de Fontainebleau, mobilier XVIe, vue sur la cour Ovale.",
        superficie: "50 m²",
        capacite: 2,
        prix: 520,
        image:
          "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80",
        equipements: [
          "Lambris Renaissance",
          "Vue cour Ovale",
          "Salle de bain marbre",
          "Petit-déjeuner inclus",
        ],
      },
      {
        nom: "Suite Napoléon",
        description:
          "Appartements de l'Empereur entièrement restaurés, mobilier Empire d'origine, vue sur le Grand Parterre.",
        superficie: "75 m²",
        capacite: 2,
        prix: 720,
        image:
          "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&q=80",
        equipements: [
          "Mobilier Empire original",
          "Vue Grand Parterre",
          "Salon privé",
          "Accès appartements privés",
        ],
      },
      {
        nom: "Appartement Royal",
        description:
          "Suite de prestige occupant l'angle de l'aile Louis XV, panorama sur la forêt et les jardins anglais.",
        superficie: "110 m²",
        capacite: 4,
        prix: 980,
        image:
          "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80",
        equipements: [
          "4 pièces",
          "Vue forêt & jardins",
          "Piano à queue",
          "Butler Royal dédié",
        ],
      },
    ],
    experiences: [
      "Escalade en forêt",
      "Appartements royaux",
      "Spa & hammam",
      "Table gastronomique",
    ],
    activites: [
      {
        icone: "✦",
        nom: "Escalade sur chaos de grès",
        description:
          "Initiation sur les fameux chaos de la forêt avec guide certifié",
      },
      {
        icone: "✦",
        nom: "Appartements royaux",
        description:
          "Visite privée des appartements de François Ier, Henri IV et Napoléon Ier",
      },
      {
        icone: "✦",
        nom: "Spa & rituels royaux",
        description:
          "Soins inspirés des traditions royales dans le spa du domaine",
      },
      {
        icone: "✦",
        nom: "Table gastronomique",
        description:
          "Dîner dans la salle d'État avec accord mets et vins de Bourgogne",
      },
      {
        icone: "✦",
        nom: "Forêt de Fontainebleau",
        description:
          "25 000 hectares classés — randonnée, VTT, observation de la faune",
      },
      {
        icone: "✦",
        nom: "Atelier École de Fontainebleau",
        description:
          "Peinture dans les galeries inspiré des maîtres maniéristes italiens",
      },
    ],
    alentours: [
      { nom: "Forêt de Fontainebleau", distance: "0 km", type: "nature", icone: "✦", description: "25 000 hectares de forêt royale classée, paradis des grimpeurs et des randonneurs, à pied du château." },
      { nom: "Barbizon (village des peintres)", distance: "8 km", type: "culture", icone: "◆", description: "Village où vécurent Millet, Rousseau et l'École de Barbizon, mouvement précurseur de l'impressionnisme français." },
      { nom: "Moret-sur-Loing (cité médiévale)", distance: "12 km", type: "village", icone: "◆", description: "Cité fortifiée sur le Loing, ancienne place forte royale aux portes ogivales et aux maisons à colombages." },
      { nom: "Vaux-le-Vicomte", distance: "18 km", type: "culture", icone: "◆", description: "Chef-d'œuvre du Grand Siècle, modèle direct de Versailles, à dix-huit kilomètres au nord-ouest." },
    ],
    regionNarrative: "La forêt de Fontainebleau, vaste de 25 000 hectares, forme un écrin sauvage rare aux portes de l'Île-de-France. Le château, résidence favorite de trente rois de France, s'y déploie depuis le XIIe siècle au cœur des chaos de grès et des chemins forestiers.",
    regionHistoire: "Fontainebleau fut la seule résidence royale française habitée sans interruption pendant huit siècles, de Saint Louis à Napoléon III. François Ier y créa la première École de Fontainebleau en invitant les artistes italiens du XVIe siècle. Napoléon Ier y signa son abdication en 1814 — les Adieux entrés dans la légende française.",
    tags: ["Forêt", "Sport", "Histoire", "Spa"],
    dateDisponible: "Ce week-end",
    noteSur5: 4.8,
    nbAvis: 341,
    petitDejeuner: true,
    parking: true,
    wifi: true,
    animaux: true,
    couleurTheme: "#1a2d1a",
    accentTheme: "#c8973e",
  },
  // TODO pass éditorial Tanguy : ajouter 1-2 vraies photos du château
  {
    id: 5,
    isDemoMock: true,
    nom: "Château de La Ferté-Saint-Aubin",
    slug: "ferte-saint-aubin",
    region: "Centre-Val de Loire",
    departement: "Loiret",
    ville: "La Ferté-Saint-Aubin",
    distanceParis: "155 km · 1h30",
    urgence: "J-10",
    chambresRestantes: 5,
    prix: 220,
    prixBarre: 350,
    reduction: 37,
    coordonnees: { lat: 47.7197, lng: 1.9558 },
    image:
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&q=80",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80",
    ],
    style: "Classique ligérien",
    siecle: "XVIIe",
    accroche: "Un château habité, chaleureux, au cœur de la Sologne",
    histoire:
      "La Ferté-Saint-Aubin est l'un des rares châteaux de France encore habité et transmis dans la même famille depuis le XVIIe siècle. Édifié pour Henri de Saint-Nectaire, maréchal de France, il conserve son mobilier d'origine et ses cuisines d'époque intactes. La Sologne environnante, avec ses étangs, ses forêts de pins et ses domaines de chasse, forme le cadre idéal de cette immersion dans une aristocratie rurale authentique, loin des fastes versaillais.",
    description:
      "Rare château encore habité et transmis dans la même famille depuis des siècles, La Ferté-Saint-Aubin offre une expérience authentique et intimiste : grands appartements, cuisines d'époque, parc giboyeux et étangs de Sologne.",
    timeline: [
      {
        annee: "1635",
        evenement:
          "Construction par Henri de Saint-Nectaire, maréchal de France",
      },
      {
        annee: "1720",
        evenement:
          "Agrandissement par le marquis de la Ferté — création des ailes en retour",
      },
      {
        annee: "1840",
        evenement: "Transmission à la famille Jouffroy-Gonsans par mariage",
      },
      {
        annee: "1970",
        evenement: "Ouverture au public — premier château privé de la région",
      },
      {
        annee: "2005",
        evenement: "Restauration des cuisines d'époque et des appartements",
      },
      {
        annee: "2020",
        evenement:
          "Lancement des séjours immersifs en chambre d'hôtes de prestige",
      },
    ],
    chiffresCles: [
      { val: "1635", lab: "Construction" },
      { val: "5", lab: "Générations Jouffroy-Gonsans" },
      { val: "XVIIe", lab: "Siècle" },
      { val: "155 km", lab: "De Paris" },
    ],
    proprietaires: {
      nom: "Famille de Jouffroy-Gonsans",
      depuis: "1840",
      initiale: "F",
      nomAffiche: "amille de Jouffroy-Gonsans",
      portrait:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80",
      citation:
        "Mon arrière-grand-père aurait pu vendre. Mon grand-père aurait pu transformer en hôtel. Nous avons choisi de rester. Ce château vit parce que nous y vivons — et nos hôtes le sentent dès qu'ils franchissent le pont-levis.",
      description:
        "Cinq générations. Une seule famille. La famille de Jouffroy-Gonsans n'a jamais cédé à la tentation de la vente ni à celle de la chaîne hôtelière. Ils habitent La Ferté à l'année, reçoivent leurs hôtes à leur table et transmettent, saison après saison, l'art de vivre d'une aristocratie rurale française qui n'existe plus nulle part ailleurs avec cette authenticité.",
    },
    chambres: [
      {
        nom: "Chambre du Maréchal",
        description:
          "La chambre d'apparat du maréchal Henri de Saint-Nectaire, inchangée depuis 1635. Baldaquin d'origine, lambris peints, cheminée en pierre de taille. La vue sur les douves et le parc centenaire est celle qu'avait le maréchal lui-même au lever du soleil.",
        superficie: "35 m²",
        capacite: 2,
        prix: 220,
        image:
          "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80",
        equipements: [
          "Mobilier Louis XIII d'origine",
          "Vue douves & parc centenaire",
          "Cheminée pierre de taille",
          "Petit-déjeuner servi en chambre",
        ],
      },
      {
        nom: "Suite Sologne",
        description:
          "La plus belle suite du château, tournée vers les étangs privés et la forêt de pins. Décoration de maison de chasse noble — trophées anciens, bibliothèque du XVIIIe, cheminée en marbre. Le matin, les brumes de Sologne effacent le monde extérieur. C'est exactement pour cela qu'on vient ici.",
        superficie: "55 m²",
        capacite: 2,
        prix: 290,
        image:
          "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&q=80",
        equipements: [
          "Vue étangs privés & forêt",
          "Bibliothèque XVIIIe",
          "Cheminée marbre",
          "Dîner à la table des propriétaires",
        ],
      },
      {
        nom: "Appartement des Communs",
        description:
          "Dans les communs du XVIIe siècle entièrement restaurés, cet appartement indépendant dispose de son propre jardin clos, d'une entrée privée sur le parc et d'un accès direct aux étangs. Idéal pour un séjour en couple cherchant l'isolement total, ou pour deux couples voyageant ensemble.",
        superficie: "75 m²",
        capacite: 4,
        prix: 380,
        image:
          "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80",
        equipements: [
          "Jardin clos privatif",
          "Entrée indépendante",
          "2 chambres & salon",
          "Accès étangs & barque",
        ],
      },
    ],
    experiences: [
      "Chasse & pêche",
      "Cuisine d'époque",
      "Promenade en Sologne",
      "Feu de cheminée",
    ],
    activites: [
      {
        icone: "✦",
        nom: "Pêche en étang privé",
        description:
          "Pêche à la carpe et au brochet dans les étangs privés du domaine",
      },
      {
        icone: "✦",
        nom: "Cuisines d'époque",
        description:
          "Cours dans les authentiques cuisines du XVIIe siècle avec le chef",
      },
      {
        icone: "✦",
        nom: "Soirée au coin du feu",
        description:
          "Veillée dans le grand salon avec dégustation de vins de Loire",
      },
      {
        icone: "✦",
        nom: "Promenade en Sologne",
        description: "Balade guidée dans les étangs et forêts avec botaniste",
      },
      {
        icone: "✦",
        nom: "Observation ornithologique",
        description:
          "Affût photographique à l'aube — hérons, martins-pêcheurs, cigognes",
      },
      {
        icone: "✦",
        nom: "Attelage d'époque",
        description: "Promenade en attelage dans les allées du parc",
      },
    ],
    alentours: [
      { nom: "Forêt de Sologne", distance: "0 km", type: "nature", icone: "✦", description: "Pays de bocages et d'étangs, forêts de pins et de chênes, ancienne terre de chasse royale au sud d'Orléans." },
      { nom: "Orléans (cathédrale)", distance: "20 km", type: "culture", icone: "◆", description: "Capitale historique du Val de Loire, cathédrale Sainte-Croix gothique flamboyant, mémoire de Jeanne d'Arc." },
      { nom: "Chambord", distance: "35 km", type: "culture", icone: "◆", description: "Plus grand château de la Loire, chef-d'œuvre de la Renaissance française commandé par François Ier en 1519." },
      { nom: "La Ferté-Saint-Aubin (village)", distance: "2 km", type: "village", icone: "◆", description: "Bourg solognot traversé par le Cosson, halles couvertes du XIXe siècle, gare ouverte sur la ligne Paris-Orléans." },
    ],
    regionNarrative: "Le Loiret, en lisière nord du Centre-Val de Loire, ouvre les paysages de Sologne — étangs, forêts de pins, manoirs de chasse. La Ferté-Saint-Aubin s'inscrit dans cette tradition d'aristocratie rurale française, à mi-chemin entre Orléans et les grands châteaux ligériens du Val de Loire.",
    regionHistoire: "Le Centre-Val de Loire est la terre des grands châteaux royaux et nobiliaires de la Renaissance — Chambord, Cheverny, Chenonceau, Blois. Le Val de Loire est inscrit au patrimoine mondial de l'UNESCO depuis 2000. La Sologne au nord, ancienne réserve de chasse des rois et de la noblesse, conserve ses étangs, ses forêts et ses traditions cynégétiques.",
    tags: ["Authenticité", "Nature", "Gastronomie", "Intimité"],
    dateDisponible: "Samedi prochain",
    noteSur5: 4.6,
    nbAvis: 74,
    petitDejeuner: true,
    parking: true,
    wifi: false,
    animaux: true,
    couleurTheme: "#2d1f0e",
    accentTheme: "#c8973e",
  },
  {
    id: 6,
    isDemoMock: true,
    nom: "Château de Pierreclos",
    slug: "pierreclos",
    region: "Bourgogne-Franche-Comté",
    departement: "Saône-et-Loire",
    ville: "Pierreclos",
    distanceParis: "370 km · 3h",
    urgence: "J-15",
    chambresRestantes: 8,
    prix: 195,
    prixBarre: 310,
    reduction: 37,
    coordonnees: { lat: 46.3764, lng: 4.6897 },
    image:
      "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200&q=80",
      "https://images.unsplash.com/photo-1760372057956-d20c2195c7a2?w=1200&q=80",
      "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1200&q=80",
    ],
    style: "Médiéval bourguignon",
    siecle: "XIIe–XVe",
    accroche:
      "Huit siècles de pierre, douze hectares de vignes, une famille — le château le plus vivant de Bourgogne",
    histoire:
      "Depuis le XIIe siècle, le château de Pierreclos domine en silence les vignes du Mâconnais. Ses murs épais d'un mètre ont traversé les guerres de Religion, la Révolution, deux conflits mondiaux — sans jamais changer de nature. C'est un château de travail autant que de prestige : la famille Goyard y cultive ses 12 hectares de vignes en agriculture raisonnée depuis quatre générations, produisant un Mâcon Villages que les amateurs s'arrachent. Lamartine, enfant du pays, venait s'y ressourcer et y puisa l'inspiration de ses plus belles Méditations. Aujourd'hui comme hier, Pierreclos est un château qui vit — qui produit, qui reçoit, qui transmet. Pas un monument figé dans l'ambre, mais une demeure où chaque saison a son rythme, ses vendanges, ses lumières.",
    description:
      "Juché sur les hauteurs du Mâconnais, entre Pouilly-Fuissé et Cluny, le château de Pierreclos est à la fois une forteresse médiévale du XIIe siècle, un domaine viticole en activité et une maison de famille habitée depuis des générations. La famille Goyard vous reçoit à leur table, vous emmène dans leurs vignes et vous ouvre leur cave du Moyen Âge. À 3h de Paris, c'est la Bourgogne dans son état le plus pur — celle d'avant les guides et les circuits touristiques.",
    timeline: [
      {
        annee: "1180",
        evenement: "Construction du donjon par les seigneurs de Pierreclos",
      },
      {
        annee: "1350",
        evenement:
          "Agrandissement et fortification — création des tours d'angle",
      },
      {
        annee: "1562",
        evenement:
          "Dommages lors des guerres de Religion — reconstruction partielle",
      },
      {
        annee: "1820",
        evenement:
          "Lamartine séjourne au château — il en fera le décor de Jocelyn",
      },
      {
        annee: "1960",
        evenement:
          "Plantation des vignes actuelles — naissance du Mâcon Pierreclos",
      },
      {
        annee: "2010",
        evenement: "Restauration du donjon et ouverture des chambres d'hôtes",
      },
    ],
    chiffresCles: [
      { val: "1180", lab: "Donjon" },
      { val: "12 ha", lab: "Vignes Mâconnais" },
      { val: "XIIe–XVe", lab: "Siècles" },
      { val: "370 km", lab: "De Paris" },
    ],
    proprietaires: {
      nom: "Famille Goyard",
      depuis: "1920",
      initiale: "F",
      nomAffiche: "amille Goyard",
      portrait:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80",
      citation:
        "Mon grand-père vendangeait ces vignes à la main. Je fais pareil. Et quand nos hôtes descendent à la cave avec moi le soir, ils comprennent pourquoi on ne vendra jamais — ni le château, ni les vignes.",
      description:
        "Quatre générations de Goyard ont cultivé ces vignes et habité ces murs sans jamais envisager autre chose. Vignerons le matin, châtelains le soir — ils incarnent un art de vivre bourguignon qui ne se trouve plus dans les brochures. Leurs hôtes ne sont pas des touristes : ce sont des gens à qui ils choisissent d'ouvrir leur maison, leur cave et leur table.",
    },
    chambres: [
      {
        nom: "Chambre du Vigneron",
        description:
          "La chambre la plus authentique du château — celle où dormaient les maîtres de chai au XVIIIe siècle. Vue plongeante sur les rangs de vigne du Mâconnais, mobilier bourguignon massif, tomettes anciennes. Le matin, vous vous réveillez avec l'odeur de la pierre et des ceps. Il n'existe pas d'hôtel au monde qui puisse reproduire ça.",
        superficie: "30 m²",
        capacite: 2,
        prix: 195,
        image:
          "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80",
        equipements: [
          "Vue vignes Mâconnais",
          "Mobilier bourguignon XVIIIe",
          "Tomettes d'origine",
          "Dégustation cave incluse",
        ],
      },
      {
        nom: "Suite du Donjon",
        description:
          "Dormir dans un donjon du XIIe siècle — pas une métaphore, une réalité. Les murs ont un mètre d'épaisseur. Les fenêtres à meneaux d'origine cadrent un panorama sur les vignes, la vallée de la Saône et, par temps clair, les Alpes. Le lit à baldaquin du XVIIe siècle n'a jamais quitté cette pièce. C'est la chambre la plus demandée du château — réservez tôt.",
        superficie: "45 m²",
        capacite: 2,
        prix: 280,
        image:
          "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&q=80",
        equipements: [
          "Donjon XIIe · murs 1m",
          "Vue Alpes par temps clair",
          "Lit baldaquin XVIIe",
          "Verticale Pierreclos offerte",
        ],
      },
      {
        nom: "Chambre Lamartine",
        description:
          "Alphonse de Lamartine venait régulièrement à Pierreclos chercher l'inspiration que Paris ne lui donnait plus. Cette chambre est celle qu'il occupait — mobilier romantique d'époque, bibliothèque rassemblant ses œuvres complètes, vue sur la vallée de la Saône que le poète décrivait comme 'la plus douce de France'. Une nuit ici, c'est une nuit dans un poème.",
        superficie: "40 m²",
        capacite: 2,
        prix: 240,
        image:
          "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80",
        equipements: [
          "Vue vallée Saône",
          "Bibliothèque Lamartine complète",
          "Mobilier romantique d'époque",
          "Table d'hôtes & vins du domaine",
        ],
      },
    ],
    experiences: [
      "Dégustation vins",
      "Visite des vignes",
      "Table d'hôtes",
      "Donjon panoramique",
    ],
    activites: [
      {
        icone: "✦",
        nom: "Dégustation en cave",
        description:
          "Verticale de 6 millésimes de Mâcon Villages dans la cave du XIIe siècle",
      },
      {
        icone: "✦",
        nom: "Visite des vignes",
        description:
          "Promenade entre les ceps avec le vigneron, explication du terroir et des cépages",
      },
      {
        icone: "✦",
        nom: "Table des propriétaires",
        description:
          "Dîner gastronomique à la table des propriétaires, accords mets et vins du domaine",
      },
      {
        icone: "✦",
        nom: "Donjon panoramique",
        description:
          "Montée au donjon médiéval — vue à 360° sur le Mâconnais et les Alpes",
      },
      {
        icone: "✦",
        nom: "Vélo dans les vignes",
        description:
          "Circuit dans les appellations Pouilly-Fuissé et Saint-Véran",
      },
      {
        icone: "✦",
        nom: "Sur les pas de Lamartine",
        description:
          "Circuit culturel dans les villages inspirateurs du poète romantique",
      },
    ],
    alentours: [
      { nom: "Mâcon (vieille ville)", distance: "12 km", type: "village", icone: "◆", description: "Préfecture de Saône-et-Loire sur les rives de la Saône, vieille ville aux toits de tuiles romaines et marché couvert animé." },
      { nom: "Cluny (abbaye médiévale)", distance: "15 km", type: "culture", icone: "◆", description: "Vestiges de la plus grande abbaye bénédictine d'Europe, fondée en 910, centre rayonnant de la chrétienté médiévale." },
      { nom: "Solutré (roche)", distance: "5 km", type: "nature", icone: "✦", description: "Éperon rocheux mythique du Mâconnais, site préhistorique majeur et panorama exceptionnel sur le vignoble." },
      { nom: "Pouilly-Fuissé (vignoble)", distance: "8 km", type: "gastronomie", icone: "◆", description: "Appellation emblématique du Mâconnais, grands vins blancs de chardonnay sur sols argilo-calcaires." },
    ],
    regionNarrative: "Le Mâconnais, au sud de la Bourgogne, ouvre les coteaux des grands blancs de chardonnay — Pouilly-Fuissé, Mâcon Villages, Saint-Véran. Pierreclos s'élève au cœur de ce paysage viticole, sur les hauteurs qui dominent la Saône et marquent le début des reliefs du Beaujolais.",
    regionHistoire: "La Bourgogne fut au Moyen Âge l'un des duchés les plus puissants d'Europe occidentale, rivale du royaume de France. Cluny y rayonna comme premier ordre monastique de la chrétienté. Le Mâconnais, terre frontière entre Bourgogne et Lyonnais, vit naître Lamartine et conserve un patrimoine roman et viticole exceptionnel — les Climats du vignoble sont classés à l'UNESCO.",
    tags: ["Vin", "Gastronomie", "Nature", "Panorama"],
    dateDisponible: "Dans 2 semaines",
    noteSur5: 4.7,
    nbAvis: 112,
    petitDejeuner: true,
    parking: true,
    wifi: true,
    animaux: false,
    couleurTheme: "#2d1a0e",
    accentTheme: "#c8973e",
  },

  {
    id: 7,
    estLaUne: true,
    nom: "Château des Briottières",
    slug: "les-briottieres",
    region: "Pays de la Loire",
    departement: "Maine-et-Loire",
    ville: "Champigné",
    chiffresCles: [
      { val: "1485", lab: "Année de fondation" },
      { val: "7", lab: "Générations" },
      { val: "50 ha", lab: "Parc à l'anglaise" },
      { val: "1979", lab: "Ouverture aux hôtes" },
    ],
    accroche: "Sept générations d’une même famille, cinquante hectares d’Anjou, une table aux chandelles chaque soir",
    urgence: "J-10",
    chambresRestantes: 3,
    prixBarre: 480,
    reduction: 18,
    histoire: "Nées au coeur de l'Anjou à la fin du Moyen Âge, les Briottières ont traversé les siècles entre nobles alliances et bâtisseurs passionnés. La chapelle Saint-Bonaventure, édifiée en 1528, en témoigne. Acquis au XIXe siècle par Alfred de Mieulle, aïeul de l'actuel propriétaire, le Château devient une élégante demeure estivale entourée d'un parc à l'anglaise de 50 hectares. Madame de Staël l'a aimée. George Sand et Chopin y ont séjourné. Depuis sept générations, chaque famille y a cultivé un art de vivre singulier.",
    description: "Au coeur de l'Anjou, dans un parc à l'anglaise de 50 hectares dessiné par le paysagiste Châtelain, le Château des Briottières est dans la même famille depuis sept générations. Arnaud et Madeleine de Valbray y accueillent les voyageurs du monde entier comme à la maison — promenades dans le parc arboré, sieste au bord de la piscine, dîner aux chandelles. Ici, le luxe se mesure en silence, en espace et en beauté.",
    images: [
        "/bri-1.avif",
        "/bri-2.avif",
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
      ],
    proprietaires: {
        nom: "Arnaud & Madeleine de Valbray",
        depuis: "2010",
        initiale: "V",
        nomAffiche: "albray",
        portrait: "/bri-arnaud.avif",
        citation: "Dans la même famille depuis sept générations. Ici, le luxe se mesure en silence, en espace et en beauté.",
        description: "Arnaud de Valbray a grandi dans ces murs. Avec Madeleine, ils perpétuent le flambeau de François et Hedwige de Valbray qui firent renaître la maison en 1979. Ils reçoivent leurs hôtes comme des invités — chaleur d'une maison de famille, discrétion d'un hôtel confidentiel, fierté d'une histoire transmise depuis sept générations.",
      },
          timeline: [
        { annee: "1485", evenement: "Jean de La Saussaie acquiert les Briottières par mariage" },
        { annee: "1528", evenement: "Édification de la chapelle Saint-Bonaventure par René de Baïf" },
        { annee: "1855", evenement: "Alfred de Mieulle crée le parc à l'anglaise de 50 hectares" },
        { annee: "1921", evenement: "Jean de Mieulle reprend les Briottières — 3 jardiniers, un garde chasse" },
        { annee: "1979", evenement: "François de Valbray invente le concept du château-hôtel" },
        { annee: "Aujourd'hui", evenement: "Arnaud et Madeleine perpétuent l'art de vivre des Briottières" },
      ],
    chambres: [
      {
        nom: "Chambre Charles X",
        description: "Suite junior avec balcon donnant sur le lac et les jardins de lavande. Mobilier Empire d’époque, lit à baldaquin, vue imprenable sur le parc au lever du soleil.",
        superficie: "27 m²",
        capacite: 2,
        prix: 320,
        image: "https://cdn.prod.website-files.com/668c039e26d1cccd00445552/67dda2a0db79b0e72bbb5d7a_Chbre-Charles-X-007w.avif",
        equipements: ["Balcon vue lac", "Mobilier Empire", "Lit à baldaquin", "Jardins de lavande"],
      },
      {
        nom: "Chambre Verte",
        description: "L’une des chambres les plus demandées du château — papiers peints d’époque, lumière du matin sur le parc, silence absolu. L’Anjou à portee de fenêtre.",
        superficie: "30 m²",
        capacite: 2,
        prix: 290,
        image: "https://cdn.prod.website-files.com/668c039e26d1cccd00445552/683da70fd2eed5231f812399_Chambre-verte-013w.avif",
        equipements: ["Vue parc centenaire", "Papiers peints anciens", "Salle de bain marbre", "Petit-déjeuner inclus"],
      },
      {
        nom: "Cabane Lodge",
        description: "Au cœur des bois du parc, à 50 mètres du château. Sauna privé, baignoire, vue sur la forêt. L’expérience la plus insolite des Briottières — une nuit de Robinson en plein Anjou.",
        superficie: "23 m²",
        capacite: 2,
        prix: 350,
        image: "https://cdn.prod.website-files.com/668c039e26d1cccd00445552/6853d2f4bf4fe01ed9e59ad5_PXL_20250430_101041102.MP%20(1)%20(1).avif",
        equipements: ["Sauna privé", "Vue forêt", "Baignoire", "Accès parc 50 ha"],
      },
    ],
    activites: [
      {
        icone: "◆",
        nom: "Dîner aux chandelles",
        description: "Table d’hôtes familiale dressée chaque soir dans la grande salle, à la lueur des chandelles. Cuisine maison, vins de l’Anjou — Savennières, Layon — partagés à la table des propriétaires.",
      },
      {
        icone: "✦",
        nom: "Piscine dans le parc",
        description: "Piscine extérieure nichée au cœur des cinquante hectares de parc à l’anglaise, ouverte aux beaux jours. Une parenthèse silencieuse, loin des bassins d’hôtel.",
      },
      {
        icone: "✦",
        nom: "Tennis, trampoline, vélos",
        description: "Court de tennis privé, trampoline pour enfants, et flotte de vélos à disposition pour explorer les allées du parc et le bocage angevin alentour.",
      },
      {
        icone: "✦",
        nom: "Promenades dans le parc à l’anglaise",
        description: "Cinquante hectares dessinés au XIXe siècle par le paysagiste Châtelain. Allées centenaires, cèdres, étangs et jardins de lavande — un parc qui change à chaque saison.",
      },
      {
        icone: "✦",
        nom: "Balade à cheval dans les bois",
        description: "Sortie équestre dans le bocage angevin entourant le domaine, à l’heure où le tourisme dort encore. Accompagnement par un guide équestre local.",
      },
      {
        icone: "⚜",
        nom: "Châteaux de la Loire à proximité",
        description: "Saumur, Brissac, le Plessis-Bourré, Angers — les grands châteaux ligériens à partir de quarante-cinq minutes de route. Les Briottières comme camp de base discret pour les explorer.",
      },
    ],
    regionNarrative: "L'Anjou est l'une des provinces les plus douces de France — ni la brutalité de l'Atlantique, ni la rigueur continentale. Un bocage généreux, des châteaux discrets, des vignes qui donnent le Savennières et le Layon. Les Briottières s'inscrivent dans ce paysage comme une évidence : une demeure qui n'a jamais cherché à impressionner, seulement à accueillir.",
    regionHistoire: "Le Maine-et-Loire fut longtemps le cœur du royaume des Plantagenets. Angers, capitale de l’Anjou, vit naître Henri II d’Angleterre et le roi René, dernier duc d’Anjou, ce prince lettré qui fit de sa cour l’une des plus brillantes d’Europe. La Loire, classée au patrimoine mondial de l’Unesco, borde le département au sud. L’Anjou bleu au nord — où se trouvent les Briottières — est un pays de bocage, de forêts et d’étangs, plus discret que la Loire mais tout aussi envoutant.",
    alentours: [
      { nom: "Château du Plessis-Bourré", distance: "20 min", type: "patrimoine", icone: "⚜", description: "L’un des joyaux méconnus de la Loire — intact depuis 1480, ponts-levis, douves et grand appartement Louis XI. L’antééthèse du château-musée : ici, on entre dans l’histoire." },
      { nom: "Angers — la tapisserie de l’Apocalypse", distance: "30 min", type: "patrimoine", icone: "◆", description: "Chef-d’œuvre du XIVe siècle, la plus grande tapisserie médiévale du monde (104 mètres) conservée dans le château des rois d’Anjou. Incontournable." },
      { nom: "Abbaye de Solesmes", distance: "30 min", type: "spirituel", icone: "★", description: "Haut lieu du chant grégorien. Les moines bénédictins perpétuent une tradition musicale millénaire. Assister à un office reste une expérience hors du commun." },
      { nom: "Vignobles de Savenières & Coulée de Serrant", distance: "45 min", type: "gastronomie", icone: "✦", description: "L’un des grands blancs secs du monde, issu de chenin blanc. La Coulée de Serrant est l’une des rares AOC mono-propriétaire de France — six hectares, une famille." },
      { nom: "Château du Lude", distance: "35 min", type: "patrimoine", icone: "⚜", description: "Château Renaissance habité par la même famille depuis 1750. Leur spectacle Son & Lumière est l’un des plus grands de France — 300 acteurs, 2 000 spectateurs." },
      { nom: "Sarthe à vélo — Anjou bleu", distance: "10 min", type: "nature", icone: "◆", description: "Le canal de la Sarthe et ses écluses, les étangs et bocages de l’Anjou bleu. Des circuits vélo depuis les Briottières traversent des paysages que le tourisme n’a pas encore découverts." },
    ],
    coordonnees: { lat: 47.6833, lng: -0.5333 },
    style: "Demeure familiale · Art de vivre anjouvin",
    siecle: "XVIIIe siècle",
    distanceParis: "2h15 de Paris",
    parking: true,
    wifi: true,
    animaux: true,
    couleurTheme: "#1a0e05",
    accentTheme: "#C09840",
  },
  {
    id: 8,
    estLaUne: true,
    nom: "Château du Blanc Buisson",
    slug: "blanc-buisson",
    region: "Normandie",
    departement: "Eure",
    ville: "Rugles",
    chiffresCles: [
      { val: "1290", lab: "Année de fondation" },
      { val: "3", lab: "Familles en 7 siècles" },
      { val: "8 ha", lab: "Parc classé" },
      { val: "1949", lab: "Monument Historique" },
    ],
    accroche: "Sept siècles d’histoire, trois familles, des douves, un donjon — le plus discret des châteaux normands",
    siecle: "XIIIe siècle",
    distanceParis: "2h de Paris",
    urgence: "J-15",
    chambresRestantes: 2,
    prixBarre: 380,
    reduction: 21,
    histoire: "En 1290, sous le règne de Philippe le Bel, Colinet Lecomte fait édifier le Blanc Buisson pour protéger les paysans du Pays d’Ouche contre les brigands. Sept siècles ont passé. Le château n’a appartenu qu’à trois familles, transmis presque toujours par mariage ou héritage. Au XIVe siècle, les troupes du roi Jean II assiègent la demeure et détruisent son premier étage. Il faudra attendre le XVe siècle pour que Marie Colinet Le Conte et Jean II du Merle le reconstruisent, mélant douves, tourelles, pont-levis et échauguéttes dans un style à la charnière du Góthique et de la Renaissance. En 1801, vendu pour la première et unique fois, il entre dans la famille Pillons de Saint-Philbert, ancêtres des propriétaires actuels. Aujourd’hui, Maïté et Éric de la Fresnaye l’habitent, le restaurent et l’animent avec une passion intègre. Le château n’est pas un musée : c’est une maison vivante, où chaque pièce semble habitée, comme si le temps s’y était arrêté.",
    description: "Au cœur du Pays d’Ouche normand, niché dans un parc de 8 hectares classé pour ses essences rares, le Château du Blanc Buisson est un chef-d'œuvre de l’architecture féodale tardive. Douves intégrales, pont-levis, donjon carré, tourelles de garde — tout est intact depuis 1290. Maïté et Éric de la Fresnaye y accueillent leurs hôtes dans la Suite du Donjon et dans La Réserve, avec la chaleur d’une maison de famille.",
    images: [
      "/bb-p1.avif",
      "/bb-p2.avif",
      "/bb-p3.avif",
    ],
    proprietaires: {
      nom: "Maïté & Éric de la Fresnaye",
      depuis: "2014",
      initiale: "F",
      nomAffiche: "resnaye",
      portrait: "/bb-eric2.jpg",
      citation: "Ce château n’a appartenu qu’à trois familles en sept siècles. Quand vous venez ici, vous sentez que les murs ont une mémoire. Notre rôle est de la garder vivante.",
      description: "Éric de la Fresnaye a hérité du Blanc Buisson en 2014. Avec Maïté, ils ont engagé une restauration minutieuse et décidé d’ouvrir le château aux séminaires, mariages et séjours — non par nécessité commerciale, mais par conviction patrimoniale. Ils reçoivent leurs hôtes comme des invités de marque, dans une atmosphère d’intimité et de confidentialité absolues.",
    },
    timeline: [
      { annee: "1290", evenement: "Construction sous Philippe le Bel par Colinet Lecomte" },
      { annee: "1355", evenement: "Siège par les troupes de Jean II — premier étage détruit" },
      { annee: "1474", evenement: "Reconstruction par Jean du Merle et Marie Le Conte" },
      { annee: "1801", evenement: "Vendu pour la 1ère fois — entre dans la famille des propriétaires actuels" },
      { annee: "1949", evenement: "Inscription aux Monuments Historiques" },
      { annee: "2018", evenement: "Ouverture aux séminaires, réceptions et séjours" },
    ],
    chambres: [
      {
        nom: "Suite du Donjon",
        description: "Dormir dans un donjon du XIIIe siècle — murs de pierre épaisse, fenêtres à méneaux, vue sur les douves. L’expérience la plus médiévale que la Normandie puisse offrir. Réserver tôt — il n’y a qu’une seule suite.",
        superficie: "40 m²",
        capacite: 2,
        prix: 280,
        image: "/bb-donjon.avif",
        equipements: ["Donjon XIIIe · murs pierre", "Vue douves", "Salle de bain privée", "Petit-déjeuner inclus"],
      },
      {
        nom: "La Réserve",
        description: "Dans l’ancienne charreterie entièrement rénovée, un gîte lumineux et contemporain. Décoration soignée, protégée par les anciens ponts-levis. Parfait pour un couple ou une petite famille.",
        superficie: "55 m²",
        capacite: 4,
        prix: 220,
        image: "/bb-gite.avif",
        equipements: ["Ancienne charreterie rénovée", "Décoration contemporaine", "Accès parc 8 ha", "Pont-levis privé"],
      },
    ],
    activites: [
      {
        icone: "⚜",
        nom: "Visite guidée du château",
        description: "Visite menée par Maïté ou Éric de la Fresnaye à travers les pièces habitées, le donjon du XIIIe siècle, les ponts-levis et les douves intégrales. Sept siècles d’histoire d’une seule maison.",
      },
      {
        icone: "★",
        nom: "Festival médiéval de printemps",
        description: "Rendez-vous annuel autour de Pâques. Reconstitutions historiques, troubadours, banquet médiéval dans la cour du donjon. Le château ouvre exceptionnellement ses jardins le temps d’un week-end.",
      },
      {
        icone: "◆",
        nom: "Son et lumières d’été",
        description: "Mise en scène de l’histoire du Blanc Buisson sur les murs du donjon, plusieurs soirs par été. Sept siècles racontés par la pierre elle-même, depuis Colinet Lecomte jusqu’à aujourd’hui.",
      },
      {
        icone: "◆",
        nom: "Ateliers d’art de vivre",
        description: "Sessions de cuisine normande, dégustations œnologiques de cidres et calvados, ateliers d’herboristerie au potager. Programme variable selon la saison et les invités du moment.",
      },
      {
        icone: "✦",
        nom: "Sylvothérapie au parc classé",
        description: "Marches conscientes parmi les essences rares du parc de huit hectares — chênes pluricentenaires, hêtres, ifs. Le silence du Pays d’Ouche au plus près des arbres.",
      },
      {
        icone: "◆",
        nom: "Enquête médiévale immersive",
        description: "Enquête immersive en costume dans les pièces du château et les douves, le temps d’une nuit. Sur réservation pour groupes privés. Cadre du XIIIe siècle, scénario sur mesure.",
      },
    ],
    coordonnees: { lat: 48.9167, lng: 0.7333 },
    regionNarrative: "Le Pays d’Ouche est l’une des contrées les plus secrets de Normandie. Ni côtière ni touristique, cette terre de bocages, de forêts denses et d’étangs silencieux s’étend entre l’Eure et l’Orne, loin des circuits battus. On y croise des abbayes cisterciennes, des manoirs de brique et de silex, des villages où le temps semble suspendu. Le Blanc Buisson s’inscrit dans ce paysage comme il y a sept siècles : discret, intact, vivant.",
    regionHistoire: "La Normandie est l’une des provinces les plus chargées d’histoire de France. Conquise par les Vikings au IXe siècle, elle devient le duché qui donnera Guillaume le Conquérant et changera le destin de l’Angleterre en 1066. Le Pays d’Ouche, lui, vécut au rythme des guerres entre capétiens et plantagenêts, des chevauchées anglaises pendant la Guerre de Cent Ans, et des reconstructions patientes qui suivirent. C’est dans ce contexte que le Blanc Buisson fut assiégé au XIVe siècle par les troupes du roi Jean II — et que ses propriétaires le reconstruisirent, pierre par pierre, tel qu’il se dresse encore aujourd’hui.",
    alentours: [
      { nom: "Abbaye du Bec-Hellouin", distance: "25 min", type: "patrimoine", icone: "⚜", description: "L’une des grandes abbayes bénédictines d’Europe, fondée en 1034. Herluin, Lanfranc, Anselme — ses abbés ont formé des archevêques de Canterbury et influencé la pensée médiévale. Toujours habitée par des moines." },
      { nom: "Giverny — jardins de Monet", distance: "35 min", type: "patrimoine", icone: "◆", description: "Le jardin où Claude Monet peignit ses Nénufars. Un lieu de pèlerinage pour les amateurs d’impressionnisme, à voir au printemps quand les iris et les roses sont en fleur." },
      { nom: "Les Andelys — Château Gaillard", distance: "30 min", type: "patrimoine", icone: "✦", description: "La forteresse de Richard Cœur de Lion, construite en un an en 1196 pour défendre la Normandie contre Philippe Auguste. Un panorama exceptionnel sur les méandres de la Seine." },
      { nom: "Évreux — cathédrale Notre-Dame", distance: "30 min", type: "patrimoine", icone: "⚜", description: "Une des plus belles cathédrales gothiques de Normandie, avec ses vitraux du XIIIe au XVIIe siècle. La ville d’Évreux possède un centre médiéval remarquablement préservé." },
      { nom: "Vernón — vieille ville", distance: "30 min", type: "nature", icone: "◆", description: "Une halte bucolique sur les bords de Seine, avec son vieux moulin sur pilotis et ses colombages. Point de départ idéal pour rejoindre Giverny à vélo le long de la rivière." },
      { nom: "Forêt de Breteuil", distance: "15 min", type: "nature", icone: "★", description: "5 000 hectares de hêtres et de chênes au cœur du Pays d’Ouche. Sentiers de randonnée, étangs de pêche, silence absolu. La Normandie intérieure à son meilleur." },
    ],
        videoBackground: "JQ9m51Bl900",
    style: "Château médiéval · Normandie historique",
    parking: true,
    wifi: true,
    animaux: false,
    couleurTheme: "#1a1205",
    accentTheme: "#C09840",
  },
];
