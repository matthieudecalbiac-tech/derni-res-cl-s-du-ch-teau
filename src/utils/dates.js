// ═══════════════════════════════════════════════════════════════════════════
// Helpers dates — fonctions pures du calendrier (Chantier #1b-1)
// ═══════════════════════════════════════════════════════════════════════════
// Primitives calendrier extraites de DernieresCles.jsx pour reutilisation par
// BarreRecherche (calendrier de plage de la barre de recherche home).
// Corps recopies a l'identique depuis DernieresCles — comportement preserve.
//
// A ne PAS confondre avec utils/heure.js (logique horaire jour/nuit).
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genere la matrice d'un mois : 42 cases (6 semaines), demarrage LUNDI.
 * Comble le debut et la fin avec les jours des mois adjacents (horsMois: true).
 * @param {Date} premierJourMois - une date du mois a afficher (1er conseille)
 * @returns {Array<{date: Date, horsMois: boolean}>} 42 cases ordonnees lundi->dimanche
 */
export function genererGrilleMois(premierJourMois) {
  const annee = premierJourMois.getFullYear();
  const mois = premierJourMois.getMonth();
  const premier = new Date(annee, mois, 1);
  const decalage = (premier.getDay() + 6) % 7;
  const nbJours = new Date(annee, mois + 1, 0).getDate();
  const cases = [];
  // jours du mois PRECEDENT pour combler le debut de la 1re semaine
  for (let i = decalage; i > 0; i--) {
    cases.push({ date: new Date(annee, mois, 1 - i), horsMois: true });
  }
  // jours du mois COURANT
  for (let j = 1; j <= nbJours; j++) {
    cases.push({ date: new Date(annee, mois, j), horsMois: false });
  }
  // jours du mois SUIVANT pour completer jusqu'a 42 cases (6 semaines)
  let suiv = 1;
  while (cases.length < 42) {
    cases.push({ date: new Date(annee, mois + 1, suiv++), horsMois: true });
  }
  return cases;
}

/**
 * Formate une date en francais court : "lun. 5 mai".
 * @param {Date} d
 * @returns {string}
 */
export function formatDate(d) {
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

/**
 * Nombre de jours entre aujourd'hui et d (positif si d est dans le futur).
 * ⚠ Depend de l'heure systeme (new Date()) — non deterministe dans le temps.
 * @param {Date} d
 * @returns {number}
 */
export function joursAvant(d) {
  const today = new Date();
  return Math.round((d - today) / (1000 * 60 * 60 * 24));
}

/**
 * Vrai si a et b tombent le meme jour calendaire (les deux doivent etre definis).
 * @param {Date} a
 * @param {Date} b
 * @returns {boolean}
 */
export function estMemeJour(a, b) {
  return Boolean(a && b && a.toDateString() === b.toDateString());
}

/**
 * Vrai si d est STRICTEMENT entre debut et fin (bornes exclues, les deux definis).
 * @param {Date} d
 * @param {Date} debut
 * @param {Date} fin
 * @returns {boolean}
 */
export function estEntre(d, debut, fin) {
  return Boolean(debut && fin && d > debut && d < fin);
}
