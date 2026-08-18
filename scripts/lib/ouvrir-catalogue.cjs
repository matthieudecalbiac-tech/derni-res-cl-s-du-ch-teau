// Ouvre la modale « Liste » du toggle Carte/Liste (le catalogue integral) et
// attend que ses items soient reellement VISIBLES - pas seulement presents.
//
// POURQUOI CE MODULE. Cette fonction vivait en DEUX copies byte-identiques,
// une par agent (a11y-axe.cjs et console-errors.cjs). Le correctif du clic
// ci-dessous a du etre applique deux fois, et rien ne garantissait qu'elles ne
// divergent pas ensuite. Elles la consomment desormais ici.
//
// ⚠ IL EXISTE UNE TROISIEME COPIE, volontairement laissee de cote :
// tests/e2e/vitrines-tous-chateaux.spec.cjs. Elle ne doit PAS adopter le clic
// par le DOM - c'est elle qui verifie que le bouton est reellement cliquable.
// Ce module sert les HARNAIS, dont l'objet est d'atteindre un etat de page.
async function ouvrirCatalogue(page) {
  const onglet = page.locator('.tcl-onglet').filter({ hasText: 'Liste' });
  const items = page.locator('.tcl-item[data-slug]');

  let derniereErreur;
  for (let essai = 0; essai < 3; essai++) {
    // Ne reclique QUE si la modale n'est pas deja ouverte (sinon elle recouvre
    // le toggle et le clic serait intercepte). Retry car a l'arrivee des
    // donnees Supabase, le sous-arbre .tcl se re-rend et remplace le noeud du
    // bouton : un clic parti au mauvais moment atterrit sur un noeud detache.
    // Un delai plus long n'y changerait rien - le clic est perdu, pas en retard.
    //
    // CLIC PAR LE DOM, et non `onglet.click()`. Un clic Playwright exige que
    // l'element RECOIVE LES EVENEMENTS : il rejoue le hit-test jusqu'a ce que
    // le point vise lui appartienne. Or l'accueil entre en animations decalees
    // (.tcl-row : animation-delay 1.3s ; .hero-illus-img : translateX(60px)),
    // et pendant ce temps les couches voisines recouvrent le toggle. Le clic
    // n'est pas en retard : il est REFUSE, en boucle, jusqu'au timeout de 30 s,
    // et l'agent meurt. Deux rouges webkit-only en trois mois sont partis de la
    // (12 mai ; 18 aout, run 32126098640) - et dans ce dernier, l'autre agent,
    // portant CE MEME code, passait. Une difference de resultat sans difference
    // de cause : c'est une course, pas un defaut du site.
    //
    // element.click() ne fait aucun hit-test - il appelle le handler React. On
    // y perd le realisme du geste, qui n'est pas l'objet de cet agent : il doit
    // ATTEINDRE un etat de page. Que le bouton soit reellement cliquable reste
    // couvert par tests/e2e/vitrines-tous-chateaux.spec.cjs, qui clique pour de
    // vrai sur .tcl-onglet et tourne sur les 3 navigateurs.
    if ((await page.locator('.tcl-liste').count()) === 0) {
      await onglet.evaluate((el) => el.click());
    }
    try {
      await items.first().waitFor({ state: 'visible', timeout: 8000 });
      return;
    } catch (e) {
      derniereErreur = e;
    }
  }
  throw derniereErreur;
}

module.exports = { ouvrirCatalogue };
