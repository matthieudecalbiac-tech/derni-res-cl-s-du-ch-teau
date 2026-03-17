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
    ],
    style: "Classique ligérien",
    siecle: "XVIIe",
    accroche: "Un château habité, chaleureux, au cœur de la Sologne",
    histoire:
      "La Ferté-Saint-Aubin est l'un des rares châteaux de France encore habité et transmis dans la même famille depuis le XVIIe siècle. Édifié pour Henri de Saint-Nectaire, maréchal de France, il conserve son mobilier d'origine et ses cuisines d'époque intactes. La Sologne environnante, avec ses étangs, ses forêts de pins et ses domaines de chasse, forme le cadre idéal de cette immersion dans une aristocratie rurale authentique, loin des fastes versaillais.",
    description:
      "Rare château encore habité et transmis dans la même famille depuis des siècles, La Ferté-Saint-Aubin offre une expérience authentique et intimiste : grands appartements, cuisines d'époque, parc giboyeux et étangs de Sologne.",
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
      "Vignes, donjon et Mâconnais : la Bourgogne dans toute sa splendeur",
    histoire:
      "Le château de Pierreclos domine les vignes du Mâconnais depuis le XIIe siècle. Propriété successive de puissantes familles bourguignonnes, il fut le théâtre de nombreux épisodes des guerres de Religion. Aujourd'hui encore habité par ses propriétaires, il produit un Mâcon Villages réputé sur ses 12 hectares de vignes en agriculture raisonnée. Le poète Lamartine, natif de la région, en fit l'un des cadres de ses Méditations poétiques.",
    description:
      "Dominant les vignes du Mâconnais, ce château médiéval en parfait état propose une immersion totale dans la Bourgogne viticole. Dégustations en cave, balades entre les ceps et table d'hôtes aux saveurs du terroir.",
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
