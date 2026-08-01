// ═══════════════════════════════════════════════════════════════════════════
// LCC — Les 2 titres éditoriaux variables de la vitrine.
// ═══════════════════════════════════════════════════════════════════════════
// SOURCE UNIQUE, sur le patron de photosEmplacements.js et
// accrochesEmplacements.js. Quatre endroits la lisent : le mapper (colonne ↔
// champ, dans les deux sens), le formulaire admin, le thème Histoire et le
// journal.
//
// DEUX, ET PAS DIX. La vitrine porte une trentaine de textes en dur, et la
// plupart doivent le rester : « Le journal », « Les offres », « Explorer le
// château », les sept libellés de thème, les eyebrows. Ce sont des repères de
// NAVIGATION — les rendre variables ferait perdre au visiteur la carte du site
// d'un château à l'autre, et remplirait l'admin de champs que personne
// n'éditerait. Les six accroches posées la veille ne sont, à ce jour, remplies
// pour AUCUN château : un formulaire trop long ne se descend pas jusqu'au bout.
//
// Ne sont retenus que les deux titres qui racontent CE château :
//   1. le titre du thème Histoire — le seul factuellement FAUX aujourd'hui ;
//   2. le titre de l'affiche du journal — la plus grande carte de la page, la
//      porte d'entrée du récit, identique partout.
//
// ⚠ LEUR REPLI N'EST PAS LE MÊME CONTRAT QUE LES PHOTOS ET LES ACCROCHES.
//   Là-bas, champ vide = vitrine strictement inchangée. Ici, le titre du thème
//   Histoire REMPLACE un « Sept siècles » codé en dur — la copie du Blanc
//   Buisson (fondé 1290), servie aux onze châteaux et fausse pour dix d'entre
//   eux. Le champ vide ne conserve donc pas l'existant : il le corrige.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Les 2 titres, dans l'ordre de lecture de la page (le journal vient avant le
 * thème qu'il ouvre) — c'est aussi l'ordre du formulaire admin.
 *
 * `aide` dit le repli EXACT : c'est la seule information dont l'éditeur a besoin
 * pour décider s'il doit écrire ou laisser faire.
 *
 * @type {ReadonlyArray<{champ: string, colonne: string, label: string, aide: string}>}
 */
export const TITRES_EMPLACEMENT = [
  {
    champ: "titreJournalHistoire",
    colonne: "titre_journal_histoire",
    label: "Titre — Journal · affiche Histoire",
    aide: "Vide : « L'histoire du domaine ».",
  },
  {
    champ: "titreThemeHistoire",
    colonne: "titre_theme_histoire",
    label: "Titre — Thème Histoire",
    aide: "Vide : le siècle du château (champ Siècle, celui qu'affiche déjà le hero).",
  },
];

/** Repli du titre de l'affiche Histoire du journal, quand rien n'est écrit. */
export const TITRE_JOURNAL_HISTOIRE_DEFAUT = "L'histoire du domaine";
