const { test, expect } = require('@playwright/test');

/**
 * Tests E2E · /vitrines et /proprietaires — filet ECRIT AVANT la conversion.
 *
 * ETAPE 2 du Temps 2. Meme defaut que celui qu'a ferme le pilote
 * (`route-dernieres-cles.spec.cjs`), sur deux boutons de plus : les calques
 * vivent dans le `useState` d'`App`, et une route rend un composant A LA PLACE
 * d'`App` — depuis `/resultats`, il n'existe donc aucun moyen d'en ouvrir un.
 * `PageResultats` retombe sur `versHome`, et le visiteur perd sa recherche SANS
 * obtenir l'ecran demande.
 *
 * ── CE QU'IL VERIFIE ─────────────────────────────────────────────────────────
 *
 * La DESTINATION, depuis le menu, sur les deux boutons. Il ne fige ni le dessin
 * des ecrans ni leur contenu : la conversion va changer le chrome de
 * `/proprietaires` (mode page au lieu de calque), et un filet qui figerait cela
 * rougirait sans rien proteger.
 *
 * ⚠ CE QU'IL NE VERIFIE PAS, ET POURQUOI. Le clic sur un chateau depuis
 * `/vitrines` NE navigue pas : il ouvre un CALQUE imbrique, avec l'animation de
 * porte. C'est une decision assumee — l'asymetrie avec `/dernieres-cles`, qui
 * navigue lui, est le prix de l'animation qu'on garde. On assert donc
 * l'OUVERTURE DU CALQUE, jamais un changement d'URL.
 */

const DEPART = '/resultats?region=Normandie&invites=2';

// Le menu s'ouvre par le burger, seul chemin commun aux trois navigateurs
// (`.header-cta` est masque sous 768 px, cf. header.css).
const BURGER = '.header-burger';

// Ouvre le menu et clique une entree par son libelle exact.
async function parLeMenu(page, libelle) {
  await page.locator(BURGER).click();
  const entree = page.locator('.hm-item-titre', { hasText: libelle }).first();
  await expect(entree).toBeVisible({ timeout: 10000 });
  await entree.click();
}

test.describe('Temps 2 · le menu mene aux ecrans de catalogue', () => {

  test('depuis /resultats, « Vitrines permanentes » mene a /vitrines', async ({ page }) => {
    await page.goto(DEPART);
    await page.waitForSelector('.pr-carte--cliquable', { timeout: 15000 });

    await parLeMenu(page, /Vitrines permanentes/i);

    await page.waitForURL(/\/vitrines/, { timeout: 15000 });
    expect(new URL(page.url()).pathname).toBe('/vitrines');
    // L'ecran est monte, pas seulement l'URL changee.
    await expect(page.locator('.vit-topbar')).toBeVisible({ timeout: 15000 });
  });

  test('depuis /resultats, « Proprietaires » mene a /proprietaires', async ({ page, isMobile }) => {
    // ⚠ L'ENTREE « Proprietaires » EST MASQUEE SOUS 768 px, et c'est VOULU :
    // `header.css:300` la met en `display: none` avec un commentaire qui
    // l'explique — le menu mobile s'en tient a quatre entrees, et la
    // numerotation `0${i+1}` reste juste puisque c'est la derniere du tableau.
    // Mon filet l'ignorait ; c'est lui qui avait tort, pas le site.
    test.skip(isMobile, 'Entree masquee sous 768 px par choix (header.css:300).');

    await page.goto(DEPART);
    await page.waitForSelector('.pr-carte--cliquable', { timeout: 15000 });

    await parLeMenu(page, /Propri[ée]taires/i);

    await page.waitForURL(/\/proprietaires/, { timeout: 15000 });
    expect(new URL(page.url()).pathname).toBe('/proprietaires');
    await expect(page.locator('.part-section')).toBeVisible({ timeout: 15000 });
  });

  test('les deux ecrans s\'ouvrent aussi depuis l\'accueil, et leur URL le dit', async ({ page }) => {
    // Une seule voie : ouvrir depuis l'accueil doit produire la MEME URL que
    // depuis le menu. Deux chemins vers un meme ecran, c'est la dualite qui a
    // produit le defaut.
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await parLeMenu(page, /Vitrines permanentes/i);
    await page.waitForURL(/\/vitrines/, { timeout: 15000 });
    await expect(page.locator('.vit-topbar')).toBeVisible({ timeout: 15000 });
  });

  test('depuis /vitrines, cliquer un chateau ouvre le CALQUE — l\'URL ne bouge pas', async ({ page }) => {
    // ⚠ C'est le contraire du pilote, et c'est voulu : l'animation de porte est
    // conservee ici, donc le chateau s'ouvre EN CALQUE au-dessus de /vitrines.
    // Ce test garde cette decision — si quelqu'un convertissait ce clic en
    // navigation, il rougirait, et c'est son role.
    await page.goto('/vitrines');
    await expect(page.locator('.vit-topbar')).toBeVisible({ timeout: 15000 });

    // Le selecteur exact, lu dans VitrinePermanente:131 : les cartes portent
    // `.vit-carte`, la carte SVG de Tanguy porte `.vit-carte-france` — d'ou le
    // `:not`, sans quoi on cliquerait la carte de France.
    // ⚠ ON ATTEND LA CARTE, on ne la compte pas. `count()` juste apres
    // l'apparition de la topbar s'executait AVANT l'arrivee des donnees
    // Supabase : il rendait 0, et le test se skippait tout seul sur les trois
    // navigateurs — un filet inerte qui se lisait comme un filet vert.
    const carte = page.locator('.vit-grille .vit-carte').first();
    await expect(carte).toBeVisible({ timeout: 20000 });

    await carte.click();
    // La vitrine s'ouvre par-dessus, apres l'animation de porte.
    await expect(page.locator('.vc3-overlay')).toBeVisible({ timeout: 20000 });
    expect(new URL(page.url()).pathname).toBe('/vitrines');
  });
});
