// ═══════════════════════════════════════════════════════════════════════════
// LCC — Les 7 emplacements de photo de la vitrine.
// ═══════════════════════════════════════════════════════════════════════════
// SOURCE UNIQUE. Ces sept noms sont lus par quatre endroits : le mapper
// (colonne ↔ champ, dans les deux sens), le formulaire admin (libellés), la
// barre latérale et le journal (lecture). Une liste, pas quatre copies.
//
// LE CONTRAT, partout le même : la valeur est OPTIONNELLE.
//   remplie → la vitrine l'utilise, elle surclasse la logique de pioche ;
//   vide    → repli sur la logique d'origine, à l'identique.
// Rien ne change tant que rien n'est assigné.
//
// POURQUOI CES SEPT-LÀ. Le journal et la barre puisaient tous deux dans
// chateau.images en sautant le hero, au même index : la même photo apparaissait
// deux fois par écran, et un château à deux images la répétait six fois.
// Assigner un emplacement, c'est sortir de cette pioche.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Les 7 emplacements, dans l'ordre de lecture de la page (hero, puis journal,
 * puis barre) — c'est aussi l'ordre du formulaire admin.
 *
 * @type {ReadonlyArray<{champ: string, colonne: string, label: string, aide: string}>}
 */
export const EMPLACEMENTS_PHOTO = [
  {
    champ: "imgHero",
    colonne: "img_hero",
    label: "Photo — Hero",
    aide: "Vide : la 1re image de la galerie.",
  },
  {
    champ: "imgJournalHistoire",
    colonne: "img_journal_histoire",
    label: "Photo — Journal · L'histoire du domaine",
    aide: "Vide : une image de la galerie, hors hero.",
  },
  {
    champ: "imgJournalProprietaires",
    colonne: "img_journal_proprietaires",
    label: "Photo — Journal · Les propriétaires",
    aide: "Vide : le portrait des propriétaires, sinon une image de la galerie.",
  },
  {
    champ: "imgJournalServices",
    colonne: "img_journal_services",
    label: "Photo — Journal · L'art de recevoir",
    aide: "Vide : la 1re image d'équipement, sinon une image de la galerie.",
  },
  {
    champ: "imgBarrePermanent",
    colonne: "img_barre_permanent",
    label: "Photo — Barre · Permanent",
    aide: "Vide : une image de la galerie, hors hero.",
  },
  {
    champ: "imgBarreDernieresCles",
    colonne: "img_barre_dernieres_cles",
    label: "Photo — Barre · Dernières Clés",
    aide: "Vide : une image de la galerie, hors hero.",
  },
  {
    champ: "imgBarreClub",
    colonne: "img_barre_club",
    label: "Photo — Barre · Club Châtelains",
    aide: "Vide : une image de la galerie, hors hero.",
  },
];

/**
 * Code de module de la barre latérale → champ d'emplacement.
 * Les trois clés sont celles de MODULES dans BarreLaterale.jsx.
 */
export const CHAMP_PHOTO_BARRE = {
  permanent: "imgBarrePermanent",
  dernieresCles: "imgBarreDernieresCles",
  club: "imgBarreClub",
};
