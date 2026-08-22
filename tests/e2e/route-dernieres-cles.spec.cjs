const { test, expect } = require('@playwright/test');
const { attendreContenu } = require('./_attendreContenu.cjs');

/**
 * Tests E2E · La route /dernieres-cles — filet ECRIT AVANT la conversion.
 *
 * POURQUOI CE FICHIER EXISTE. Le Header n'avait AUCUNE couverture : le grep
 * `hm-item` sur tests/ ne retournait rien. C'est par lui que passent les cinq
 * entrees principales du site, et l'une d'elles etait cassee depuis toujours
 * sans que rien ne le dise.
 *
 * ── LE DEFAUT QU'IL CIBLE ────────────────────────────────────────────────────
 *
 * Les overlays du site vivent dans le `useState` d'`App`. Une route rend un
 * composant A LA PLACE d'`App` (`<Routes>` est exclusif) : depuis `/resultats`,
 * il n'existe donc AUCUN moyen d'ouvrir un overlay. `PageResultats` en tire la
 * seule conclusion possible aujourd'hui — `versHome`, cable sur les CINQ
 * boutons du menu :
 *
 *   /resultats -> menu -> « Les Dernieres Cles » -> l'ACCUEIL, rien d'ouvert
 *
 * Le visiteur perd sa recherche ET n'obtient pas l'ecran demande.
 *
 * `club` est la seule entree qui fonctionne, et c'est instructif : elle NAVIGUE
 * (`Header.jsx:79`) la ou les quatre autres appellent un callback. Le defaut
 * tient litteralement a cette difference.
 *
 * ── CE QU'IL GARDE, ET CE QU'IL NE GARDE PAS ─────────────────────────────────
 *
 * Il verifie qu'on ARRIVE sur `/dernieres-cles`. Il ne fige ni le libelle du
 * bouton, ni le dessin du menu, ni le contenu de l'ecran — la conversion va
 * deplacer tout cela. Ce qu'on protege, c'est la DESTINATION.
 */

const DEPART = '/resultats?region=Normandie&invites=2';

// Le menu s'ouvre par le burger. `.header-cta` est masque sous 768 px
// (header.css) : le burger est le seul chemin commun aux trois navigateurs, on
// ne s'embarrasse donc pas d'un branchement par largeur.
const BURGER = '.header-burger';
const ITEM_DERNIERES = '.hm-item-titre';

test.describe('Route /dernieres-cles · le menu mene au bon ecran', () => {

  test('depuis /resultats, le menu ouvre les Dernieres Cles (et non l\'accueil)', async ({ page }) => {
    await page.goto(DEPART);
    await attendreContenu(page, '.pr-carte--cliquable');

    await page.locator(BURGER).click();
    // Le menu joue un fondu d'entree : on attend que l'entree soit reellement
    // visible plutot que de compter sur un delai.
    const entree = page.locator(ITEM_DERNIERES, { hasText: /Dernières Clés/i }).first();
    await expect(entree).toBeVisible({ timeout: 10000 });
    await entree.click();

    // ── L'ASSERTION QUI COMPTE ──
    // Aujourd'hui on atterrit sur `/` : le test expire ici, et c'est la preuve
    // du defaut. Apres conversion, l'URL porte la destination.
    await page.waitForURL(/\/dernieres-cles/, { timeout: 15000 });
    expect(new URL(page.url()).pathname).toBe('/dernieres-cles');

    // L'ecran est bien monte, pas seulement l'URL changee.
    await expect(page.locator('.dk-topbar')).toBeVisible({ timeout: 15000 });
  });

  test('l\'ecran s\'ouvre aussi depuis l\'accueil, et son URL le dit', async ({ page }) => {
    // Une seule voie : ouvrir depuis l'accueil doit produire la MEME URL que
    // depuis le menu. Deux chemins vers un meme ecran, c'est exactement la
    // dualite qui a produit le defaut ci-dessus.
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const cta = page.locator('button', { hasText: /Dernières Clés/i }).first();
    await expect(cta).toBeVisible({ timeout: 15000 });
    await cta.evaluate((el) => el.click());   // clic DOM : l'accueil est en animations decalees

    await page.waitForURL(/\/dernieres-cles/, { timeout: 15000 });
    await expect(page.locator('.dk-topbar')).toBeVisible({ timeout: 15000 });
  });
  test("le logo de l'ecran est un ANCRAGE : il mene a l'accueil, pas en arriere", async ({ page }) => {
    // Le logo porte `aria-label="Accueil"`. En mode calque, `onClose` suffisait :
    // fermer REVENAIT a l'accueil, puisqu'il n'y avait rien d'autre dessous. En
    // mode route il faut le dire explicitement — sinon le bouton libelle
    // « Accueil » ramene aux resultats. Regle du chantier retour : le logo est
    // un ancrage, le « ← Retour » revient d'ou l'on vient.
    await page.goto('/resultats?region=Normandie&invites=2');
    await attendreContenu(page, '.pr-carte--cliquable');

    await page.locator('.header-burger').click();
    const entree = page.locator('.hm-item-titre', { hasText: /Dernières Clés/i }).first();
    await expect(entree).toBeVisible({ timeout: 10000 });
    await entree.click();
    await page.waitForURL(/\/dernieres-cles/, { timeout: 15000 });

    await page.locator('.dk-topbar-logo').click();
    await page.waitForURL((u) => new URL(u).pathname === '/', { timeout: 15000 });
    expect(new URL(page.url()).pathname).toBe('/');
  });
});
