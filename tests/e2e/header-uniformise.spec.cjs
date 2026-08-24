const { test, expect } = require('@playwright/test');
const { attendreContenu } = require('./_attendreContenu.cjs');

/**
 * Tests E2E · Le Header mene partout au meme endroit — CLOTURE du Temps 2.
 *
 * ── LE DEFAUT N°2, ET SA MORT ────────────────────────────────────────────────
 *
 * Les calques vivaient dans le `useState` d'`App`, et une route rend un
 * composant A LA PLACE d'`App` : depuis `/resultats`, aucun moyen d'en ouvrir un.
 * `PageResultats` retombait donc sur `versHome` — le visiteur perdait sa
 * recherche SANS obtenir l'ecran demande.
 *
 * La cause n'etait pas dans le Header : elle etait dans le fait que DEUX ECRANS
 * LE CABLAIENT DIFFEREMMENT. Une fois ses cinq entrees en `navigate`, le Header
 * n'a plus AUCUNE prop de navigation — il ne peut donc plus se comporter
 * differemment selon qui le monte. Le defaut disparait par construction.
 *
 * ⚠ CE FICHIER EST LE GARDE-FOU DE CETTE CONSTRUCTION. Si quelqu'un
 * reintroduisait un callback `onOuvrir*` cable sur un repli, ces quatre
 * assertions rougiraient. C'est leur seule raison d'etre — et elle vaut mieux
 * qu'un commentaire, qui ne rougit jamais.
 */

const DEPART = '/resultats?region=Normandie&invites=2';
const BURGER = '.header-burger';

// Les quatre entrees de catalogue et leur destination. `club` n'y figure pas :
// sa destination depend de la session (voir next-connexion-club.spec.cjs).
const ENTREES = [
  { libelle: /Vitrines/i, chemin: '/vitrines',       temoin: '.vit-topbar' },
  // ⚠ « Les Dernieres Cles » retiree : l'entree de menu ET la route n'existent
  //   plus (offre reservee aux connectes, dans le Club). A restaurer avec elles.
  //   { libelle: /Derni[eè]res Cl[eé]s/i, chemin: '/dernieres-cles', temoin: '.dk-topbar' },
  { libelle: /À propos|A propos/i,    chemin: '/a-propos',       temoin: '.ap-overlay' },
  // ⚠ « Proprietaires » est MASQUEE sous 768 px, et c'est voulu : `header.css`
  //   s'en tient a quatre entrees en mobile. Le test le sait et se skippe.
  { libelle: /Propri[ée]taires/i,     chemin: '/proprietaires',  temoin: '.part-section', desktopSeulement: true },
];

for (const e of ENTREES) {
  test(`depuis /resultats, « ${e.chemin} » — et surtout PAS l'accueil`, async ({ page, isMobile }) => {
    test.skip(Boolean(e.desktopSeulement && isMobile),
      'Entree masquee sous 768 px par choix (header.css).');

    await page.goto(DEPART);
    await attendreContenu(page, '.pr-carte--cliquable');

    await page.locator(BURGER).click();
    const entree = page.locator('.hm-item-titre', { hasText: e.libelle }).first();
    await expect(entree).toBeVisible({ timeout: 10000 });
    await entree.click();

    await page.waitForURL(new RegExp(e.chemin.replace('/', '\\/')), { timeout: 15000 });
    expect(new URL(page.url()).pathname).toBe(e.chemin);
    // L'ecran est monte, pas seulement l'URL changee.
    await expect(page.locator(e.temoin)).toBeVisible({ timeout: 15000 });
  });
}

test('« Decouvrir la plateforme » mene a l\'accueil, pas en arriere', async ({ page }) => {
  // ⚠ LE PIEGE, CINQUIEME OCCURRENCE. Ce bouton disait « Decouvrir la
  // plateforme » et appelait `onClose`. En calque cela coincidait : fermer
  // REVELAIT l'accueil. En route, `onClose` porte la regle de retour — depuis
  // /resultats, ce bouton aurait ramene AUX RESULTATS, ce que son libelle ne
  // promet pas. Le libelle dit une navigation ; le gestionnaire doit la faire.
  await page.goto(DEPART);
  await attendreContenu(page, '.pr-carte--cliquable');

  await page.locator(BURGER).click();
  const entree = page.locator('.hm-item-titre', { hasText: /À propos|A propos/i }).first();
  await expect(entree).toBeVisible({ timeout: 10000 });
  await entree.click();
  await page.waitForURL(/\/a-propos/, { timeout: 15000 });

  const cta = page.locator('.ap-btn-or');
  await cta.scrollIntoViewIfNeeded();
  await cta.click();

  await page.waitForURL((u) => new URL(u).pathname === '/', { timeout: 15000 });
  expect(new URL(page.url()).pathname).toBe('/');
});

test('/a-propos est une PAGE : un retour, pas un « Fermer » de modale', async ({ page }) => {
  await page.goto('/a-propos');
  await expect(page.locator('.ap-overlay')).toBeVisible({ timeout: 15000 });

  await expect(page.locator('.btn-retour')).toHaveCount(1);
  await expect(page.locator('.page-header-fermer')).toHaveCount(0);
});
