export const chateaux = [
  {
    id: 1,
    nom: "Château de Vaux-le-Vicomte",
    slug: "vaux-le-vicomte",
    region: "Île-de-France",
    departement: "Seine-et-Marne",
    distanceParis: "55 km · 45 min",
    urgence: "J-7",
    chambresRestantes: 2,
    prix: 380,
    prixBarre: 620,
    reduction: 39,
    coordonnees: { lat: 48.5681, lng: 2.7157 },
    image:
      "https://images.unsplash.com/photo-1548267245-9c5f2e2c28b2?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1548267245-9c5f2e2c28b2?w=1200&q=80",
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
    proprietaires: {
      nom: "Famille de Vogüé",
      depuis: "1875",
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
          "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80",
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
      { nom: "Forêt de Fontainebleau", distance: "20 km", type: "nature" },
      { nom: "Melun (marché provençal)", distance: "6 km", type: "village" },
      { nom: "Château de Fontainebleau", distance: "18 km", type: "culture" },
      {
        nom: "Barbizon (village des peintres)",
        distance: "25 km",
        type: "culture",
      },
    ],
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
  {
    id: 2,
    nom: "Château de Pierrefonds",
    slug: "pierrefonds",
    region: "Hauts-de-France",
    departement: "Oise",
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
      "https://images.unsplash.com/photo-1520637736862-4d197d17c93a?w=1200&q=80",
      "https://images.unsplash.com/photo-1548267245-9c5f2e2c28b2?w=1200&q=80",
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
    proprietaires: {
      nom: "Centre des Monuments Nationaux",
      depuis: "1885",
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
      { nom: "Forêt de Compiègne", distance: "5 km", type: "nature" },
      {
        nom: "Compiègne (palais impérial)",
        distance: "14 km",
        type: "culture",
      },
      { nom: "Clairière de l'Armistice", distance: "12 km", type: "histoire" },
      { nom: "Village de Pierrefonds", distance: "0.5 km", type: "village" },
    ],
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
  {
    id: 3,
    nom: "Château de Chantilly",
    slug: "chantilly",
    region: "Hauts-de-France",
    departement: "Oise",
    distanceParis: "48 km · 35 min",
    urgence: "J-15",
    chambresRestantes: 6,
    prix: 450,
    prixBarre: 680,
    reduction: 34,
    coordonnees: { lat: 49.1936, lng: 2.4847 },
    image:
      "https://images.unsplash.com/photo-1585116938354-3f0f70744573?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1585116938354-3f0f70744573?w=1200&q=80",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
      "https://images.unsplash.com/photo-1548267245-9c5f2e2c28b2?w=1200&q=80",
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
    proprietaires: {
      nom: "Institut de France",
      depuis: "1886",
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
      { nom: "Forêt de Chantilly", distance: "0 km", type: "nature" },
      { nom: "Senlis (cité médiévale)", distance: "10 km", type: "village" },
      { nom: "Abbaye de Royaumont", distance: "12 km", type: "culture" },
      { nom: "Hippodrome de Chantilly", distance: "1 km", type: "sport" },
    ],
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
    nom: "Château de Fontainebleau",
    slug: "fontainebleau",
    region: "Île-de-France",
    departement: "Seine-et-Marne",
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
    proprietaires: {
      nom: "République Française — CMN",
      depuis: "1793",
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
      { nom: "Forêt de Fontainebleau", distance: "0 km", type: "nature" },
      {
        nom: "Barbizon (village des peintres)",
        distance: "8 km",
        type: "culture",
      },
      {
        nom: "Moret-sur-Loing (cité médiévale)",
        distance: "12 km",
        type: "village",
      },
      { nom: "Vaux-le-Vicomte", distance: "18 km", type: "culture" },
    ],
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
  {
    id: 5,
    nom: "Château de La Ferté-Saint-Aubin",
    slug: "ferte-saint-aubin",
    region: "Centre-Val de Loire",
    departement: "Loiret",
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
      "https://images.unsplash.com/photo-1548267245-9c5f2e2c28b2?w=1200&q=80",
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
    proprietaires: {
      nom: "Famille de Jouffroy-Gonsans",
      depuis: "1840",
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
      { nom: "Forêt de Sologne", distance: "0 km", type: "nature" },
      { nom: "Orléans (cathédrale)", distance: "20 km", type: "culture" },
      { nom: "Chambord", distance: "35 km", type: "culture" },
      {
        nom: "La Ferté-Saint-Aubin (village)",
        distance: "2 km",
        type: "village",
      },
    ],
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
    nom: "Château de Pierreclos",
    slug: "pierreclos",
    region: "Bourgogne",
    departement: "Saône-et-Loire",
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
      "https://images.unsplash.com/photo-1548267245-9c5f2e2c28b2?w=1200&q=80",
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
    proprietaires: {
      nom: "Famille Goyard",
      depuis: "1920",
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
      { nom: "Mâcon (vieille ville)", distance: "12 km", type: "village" },
      { nom: "Cluny (abbaye médiévale)", distance: "15 km", type: "culture" },
      { nom: "Solutré (roche)", distance: "5 km", type: "nature" },
      {
        nom: "Pouilly-Fuissé (vignoble)",
        distance: "8 km",
        type: "gastronomie",
      },
    ],
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
];
