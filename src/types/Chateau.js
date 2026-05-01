// src/types/Chateau.js
//
// Schéma type unique pour les entrées de src/data/chateaux.js.
// Conçu en Chantier 2.1 (Phase A2) le 30 avril 2026.
// Toute modification de ce schéma doit être accompagnée :
//   1. d'une migration des entrées dans chateaux.js,
//   2. d'une mise à jour de validateChateau() dans src/utils/,
//   3. d'une note dans CLAUDE.md § Historique des chantiers.

// ─── Sous-types ────────────────────────────────────────────────

/**
 * Coordonnées GPS du château.
 * @typedef {Object} ChateauCoordonnees
 * @property {number} lat — Latitude décimale (France métropolitaine : 41 < lat < 51)
 * @property {number} lng — Longitude décimale (France métropolitaine : -5 < lng < 10)
 */

/**
 * Niveau d'urgence pour le module Dernières Clés.
 * @typedef {"J-7"|"J-10"|"J-15"} ChateauUrgence
 */

/**
 * Famille ou institution propriétaire du château.
 * @typedef {Object} ChateauProprietaires
 * @property {string} nom — Nom complet, ex « Famille de Vogüé », « Centre des Monuments Nationaux »
 * @property {string} depuis — Année string, ex « 1875 »
 * @property {string} portrait — URL portrait (CDN externe ou /public/<prefixe>-<...>.{avif,jpg})
 * @property {string} citation — Citation validée par les propriétaires (cf. règle éditoriale CLAUDE.md)
 * @property {string} description — Biographie ~80-150 mots
 * @property {string} initiale — 1 lettre pour typographie monumentale VitrineChateau (ex « V »)
 * @property {string} nomAffiche — Reste du nom pour typographie (ex « albray » pour « Valbray »)
 */

/**
 * Une chambre (ou suite, gîte, lodge) du château.
 * @typedef {Object} ChateauChambre
 * @property {string} nom — ex « Chambre Fouquet », « Suite du Donjon »
 * @property {string} description — ~50-100 mots
 * @property {string} superficie — ex « 45 m² »
 * @property {number} capacite — Nombre de personnes (entier > 0)
 * @property {number} prix — Prix EUR/nuit (entier > 0)
 * @property {string} image — URL (CDN ou local /public/)
 * @property {string[]} equipements — Liste de strings courtes, ex [« Lit baldaquin », « Vue jardins »]
 */

/**
 * Une activité ou expérience proposée au château.
 * @typedef {Object} ChateauActivite
 * @property {string} icone — Caractère unicode, défaut « ✦ », alternatives « ⚜ » ou « ◆ » pour prestige
 * @property {string} nom — Titre court, 5-7 mots
 * @property {string} description — ~30-40 mots
 */

/**
 * Catégorie d'un lieu d'intérêt à proximité du château.
 * Taxonomie unique, harmonisée Chantier 2.1.
 * @typedef {"patrimoine"|"nature"|"village"|"gastronomie"|"culture"|"spirituel"|"sport"|"histoire"} ChateauAlentourType
 */

/**
 * Un lieu d'intérêt à proximité du château.
 * @typedef {Object} ChateauAlentour
 * @property {string} nom — ex « Forêt de Compiègne »
 * @property {string} distance — Toujours en minutes voiture, ex « 25 min »
 * @property {ChateauAlentourType} type
 * @property {string} icone — Choisi parmi ⚜ / ◆ / ★ / ✦
 * @property {string} description — ~25-50 mots
 */

/**
 * Un chiffre clé affiché en accroche dans VitrineChateau (cartouche en haut).
 * @typedef {Object} ChateauChiffreCle
 * @property {string} val — Valeur, ex « 1485 », « 50 ha », « 7 »
 * @property {string} lab — Libellé, ex « Année de fondation », « Parc à l'anglaise »
 */

/**
 * Une entrée de la timeline historique du château.
 * @typedef {Object} ChateauTimelineEntry
 * @property {string} annee — String pour permettre « Aujourd'hui » ou « XIIe siècle »
 * @property {string} evenement — Description courte, ~10-20 mots
 */

// ─── Type principal ────────────────────────────────────────────

/**
 * Un château référencé sur Les Clés du Château.
 * Source unique : src/data/chateaux.js.
 *
 * @typedef {Object} Chateau
 *
 * # Identité
 * @property {number} id — Identifiant unique, entier > 0
 * @property {string} nom — Nom complet, ex « Château de Vaux-le-Vicomte ». Pour Le Blanc Buisson : toujours avec article (cf. CLAUDE.md voix éditoriale règle 4)
 * @property {string} slug — kebab-case URL-safe, ex « vaux-le-vicomte »
 *
 * # Géographie
 * @property {string} region — Région française officielle complète, ex « Île-de-France », « Bourgogne-Franche-Comté »
 * @property {string} departement — ex « Seine-et-Marne »
 * @property {string} ville — Commune d'implantation, ex « Maincy », « Champigné »
 * @property {string} distanceParis — Format libre, ex « 55 km · 45 min » ou « 2h15 de Paris »
 * @property {ChateauCoordonnees} coordonnees
 *
 * # Architecture
 * @property {string} style — ex « Baroque classique », « Médiéval restauré »
 * @property {string} siecle — ex « XVIIe », « XIIe–XIXe », « XIIIe siècle »
 *
 * # Disponibilité (module Dernières Clés)
 * @property {ChateauUrgence} urgence — Niveau J-7 | J-10 | J-15
 * @property {number} chambresRestantes — Entier > 0
 * @property {number} prixBarre — Prix de référence EUR (entier > 0)
 * @property {number} reduction — Pourcentage entier dans [0, 100]
 *
 * # Aiguillage vitrine
 * @property {boolean} [estLaUne] — Optionnel, défaut false. Si true → routing vers VitrineChateau (layout premium). Sinon → ChateauModal (layout standard). Cf. App.jsx:118
 * @property {boolean} [isDemoMock] — Optionnel, défaut false. Marque un château comme « stub de démonstration » (contenu placeholder, pas de valeur éditoriale, à supprimer dès qu'un vrai château signe). Permet de filtrer les mocks programmatiquement (`chateaux.filter(c => !c.isDemoMock)`) et de les distinguer dans l'IDE et la CI. Les vrais châteaux n'ont PAS ce champ (pas `false` explicite, simplement absent).
 *
 * # Médias
 * @property {string[]} images — Min 1, idéal 3+. URLs CDN externes (Unsplash) ou locales (/public/<prefixe>-<...>.avif)
 * @property {string} [videoBackground] — Optionnel. ID YouTube (ex « JQ9m51Bl900 ») pour fond vidéo VitrineChateau
 *
 * # Contenu éditorial
 * @property {string} accroche — ~10-20 mots, ton patrimonial
 * @property {string} histoire — Récit historique long, ~150-300 mots
 * @property {string} description — Présentation générale, ~80-150 mots
 * @property {string} regionNarrative — Évocation de la région, ~80-150 mots. Pour les régions à 2 châteaux (Île-de-France, Hauts-de-France) : narratifs DISTINCTS ancrés sur la sous-région
 * @property {string} regionHistoire — Contexte historique régional, ~150-200 mots
 * @property {ChateauChiffreCle[]} chiffresCles — Exactement 4 entrées
 * @property {ChateauTimelineEntry[]} timeline — Min 4 entrées, ordre chronologique
 *
 * # Familles & lieux
 * @property {ChateauProprietaires} proprietaires
 * @property {ChateauChambre[]} chambres — Min 1
 * @property {ChateauActivite[]} activites — Min 4 (objets, jamais strings)
 * @property {ChateauAlentour[]} alentours — Min 4
 *
 * # Équipements (porte d'entrée)
 * @property {boolean} parking
 * @property {boolean} wifi
 * @property {boolean} animaux
 *
 * # Thème visuel (réservé pour Phase 4.1)
 * @property {string} couleurTheme — Couleur hex 6 chars, ex « #1a2d5a »
 * @property {string} accentTheme — Couleur hex 6 chars, ex « #C09840 » (généralement = brand or)
 */

export {}; // Force le module ESM (les @typedef ne génèrent rien)
