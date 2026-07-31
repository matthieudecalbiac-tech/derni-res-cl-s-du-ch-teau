// ═══════════════════════════════════════════════════════════════════════════
// LCC — Les 6 accroches éditoriales par emplacement de vitrine.
// ═══════════════════════════════════════════════════════════════════════════
// SOURCE UNIQUE, sur le patron de photosEmplacements.js. Quatre endroits la
// lisent : le mapper (colonne ↔ champ, dans les deux sens), le formulaire admin
// (libellés + aide), le journal et la barre latérale. Une liste, pas quatre.
//
// LE CONTRAT, partout le même : la valeur est OPTIONNELLE.
//   remplie → la vitrine l'affiche telle quelle ;
//   vide    → repli sur la logique d'origine, à l'identique.
// Rien ne change tant que rien n'est écrit.
//
// POURQUOI CES SIX-LÀ. Aucun texte d'appel de la vitrine n'était écrit par la
// direction artistique. Le journal DÉCOUPE (quatre premières phrases de
// l'histoire, deux de la description des propriétaires) et, pour les services,
// COMPOSE une phrase en JavaScript. La barre, elle, sert trois constantes
// identiques pour les cinq châteaux publiés. La DA pouvait réécrire le texte
// long en espérant que la coupe tombe bien ; elle ne pouvait pas décider de la
// phrase. Ces six champs sont exactement les six endroits où un texte court
// s'affiche sans que personne ne l'ait écrit.
//
// PAS DE FUSION AVEC photosEmplacements.js. Les deux listes n'ont ni la même
// cardinalité (7 photos dont le hero, 6 accroches sans lui — le hero n'a pas de
// texte d'appel), ni le même contrôle de saisie (une URL avec téléversement
// contre une phrase en zone de texte). Les tenir ensemble obligerait chaque
// entrée à porter des champs vides pour l'autre usage.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Les 6 accroches, dans l'ordre de lecture de la page (journal puis barre) —
 * c'est aussi l'ordre du formulaire admin.
 *
 * `aide` dit le repli EXACT, pas une paraphrase : c'est la seule information
 * dont l'éditeur a besoin pour décider s'il doit écrire ou laisser faire.
 *
 * @type {ReadonlyArray<{champ: string, colonne: string, label: string, aide: string}>}
 */
export const ACCROCHES_EMPLACEMENT = [
  {
    champ: "accrocheJournalHistoire",
    colonne: "accroche_journal_histoire",
    label: "Accroche — Journal · L'histoire du domaine",
    aide: "Vide : les 4 premières phrases de l'histoire, coupées à 460 signes.",
  },
  {
    champ: "accrocheJournalProprietaires",
    colonne: "accroche_journal_proprietaires",
    label: "Accroche — Journal · Les propriétaires",
    aide: "Vide : les 2 premières phrases de la description des propriétaires, à défaut leur citation.",
  },
  {
    champ: "accrocheJournalServices",
    colonne: "accroche_journal_services",
    label: "Accroche — Journal · L'art de recevoir",
    aide: "Vide : une phrase composée automatiquement (nombre de services et d'activités, puis quatre noms).",
  },
  {
    champ: "accrocheBarrePermanent",
    colonne: "accroche_barre_permanent",
    label: "Accroche — Barre · Permanent",
    aide: "Vide : « Les chambres du château, disponibles toute l'année. » — la même pour tous les châteaux.",
  },
  {
    champ: "accrocheBarreDernieresCles",
    colonne: "accroche_barre_dernieres_cles",
    label: "Accroche — Barre · Dernières Clés",
    aide: "Vide : « Des séjours exceptionnels à dates précises, à prix réduits. » — la même pour tous les châteaux.",
  },
  {
    champ: "accrocheBarreClub",
    colonne: "accroche_barre_club",
    label: "Accroche — Barre · Club Châtelains",
    aide: "Vide : « Offres confidentielles réservées aux membres du Club Châtelains. » — la même pour tous les châteaux.",
  },
];

/**
 * Code de module de la barre latérale → champ d'accroche.
 * Les trois clés sont celles de MODULES dans BarreLaterale.jsx.
 */
export const CHAMP_ACCROCHE_BARRE = {
  permanent: "accrocheBarrePermanent",
  dernieresCles: "accrocheBarreDernieresCles",
  club: "accrocheBarreClub",
};
