const { test, expect } = require('@playwright/test');

/**
 * Tests E2E · Le retour intelligent — filet ECRIT AVANT le cablage.
 *
 * POURQUOI CE FICHIER EXISTE. `/resultats` n'avait AUCUNE couverture, et c'est
 * l'ecran qui porte le defaut le plus visible du site : on cherche, on ouvre un
 * chateau, on revient — et on atterrit sur l'accueil, la recherche perdue.
 * Ecrit APRES le cablage, ce filet n'enregistrerait que l'etat d'arrivee. Ecrit
 * AVANT, il prouve d'abord que le defaut existe, puis qu'il a disparu.
 *
 * LA REGLE QU'IL PROTEGE, mesuree avant d'etre codee :
 *   window.history.state.idx > 0  -> navigate(-1)   on reste dans le site
 *   window.history.state.idx === 0 -> navigate("/")  arrivee directe, repli
 * Mesure du 18 aout 2026 : idx vaut 0 sur une arrivee directe et 1 apres une
 * navigation interne. Le discriminant est donc reel, pas suppose.
 *
 * ── LES CRITERES DE RECHERCHE, ET POURQUOI CEUX-LA ───────────────────────────
 *
 * `region=Normandie&invites=2` rend 3 cartes sur les 7 publiees (mesure). Deux
 * raisons a ce choix :
 *   - AUCUNE DATE. Un `arrivee`/`depart` en dur expire ; le filet rougirait un
 *     matin sans qu'aucun code n'ait bouge.
 *   - L'ECART EST VISIBLE. Si le retour perdait la recherche, on reviendrait
 *     sur 7 cartes au lieu de 3. Le compte devient donc une assertion a part
 *     entiere, en plus de l'URL.
 * `siecle=XVIIe` avait l'air raisonnable et rend ZERO carte : il aurait fait
 * rougir le filet faute de carte a cliquer, pour une raison etrangere au
 * retour. Un rouge qui ne prouve rien est pire qu'un test absent.
 *
 * ── CE QU'IL GARDE, ET CE QU'IL NE GARDE PAS ─────────────────────────────────
 *
 * Il protege le PARCOURS : d'ou l'on part, ou l'on revient, avec quoi. Il ne
 * fige ni le libelle du bouton, ni sa position, ni son style — l'integration
 * mobile va justement les deplacer. Un filet qui figerait l'apparence rougirait
 * a chaque etape sans rien proteger.
 */

const CRITERES = 'region=Normandie&invites=2';
const DEPART = `/resultats?${CRITERES}`;
const CARTES_ATTENDUES = 3; // Normandie ; 7 chateaux publies au total

// La carte de resultat est un <article role="button"> avec un onClick, PAS un
// <a href>. Un clic Playwright ordinaire suffit ici (aucune couche animee ne la
// recouvre, contrairement au toggle de l'accueil), mais le selecteur doit viser
// l'article et non un enfant.
const CARTE = '.pr-carte--cliquable';
const RETOUR = '.vc3-retour';

test.describe('Retour intelligent · on revient d\'ou l\'on vient', () => {

  test('resultats filtres -> chateau -> retour : on retrouve SA recherche', async ({ page }) => {
    await page.goto(DEPART);
    await page.waitForSelector(CARTE, { timeout: 15000 });

    // Garde-fou : si le depart ne rend pas ses cartes, tout ce qui suit
    // mesurerait autre chose que le retour.
    expect(await page.locator(CARTE).count()).toBe(CARTES_ATTENDUES);

    await page.locator(CARTE).first().click();
    await page.waitForURL(/\/chateau\/[^/]+$/, { timeout: 15000 });

    await page.locator(RETOUR).first().click();

    // ── L'ASSERTION QUI COMPTE ──
    // Le chemin seul ne suffirait pas : revenir sur `/resultats` NU, c'est
    // revenir sur une recherche vide. On exige donc les trois : le chemin, les
    // criteres dans l'URL, et le nombre de cartes qui en decoule.
    await page.waitForURL(/\/resultats/, { timeout: 15000 });
    const url = new URL(page.url());
    expect(url.pathname).toBe('/resultats');
    expect(url.searchParams.get('region')).toBe('Normandie');
    expect(url.searchParams.get('invites')).toBe('2');

    await page.waitForSelector(CARTE, { timeout: 15000 });
    expect(await page.locator(CARTE).count()).toBe(CARTES_ATTENDUES);
  });

  test('arrivee directe sur une vitrine -> le retour reste dans le site', async ({ page, browser }) => {
    // Cas du lien partage, du resultat de recherche Google, de l'onglet neuf :
    // il n'y a pas de page precedente INTERNE. `navigate(-1)` sortirait du site
    // (ou ne ferait rien). Le repli doit ramener a l'accueil.

    // On decouvre d'abord une vitrine reelle plutot que d'ecrire un slug en dur
    // (la base evolue ; un slug fige serait un filet qui rougit sans bug).
    await page.goto(DEPART);
    await page.waitForSelector(CARTE, { timeout: 15000 });
    await page.locator(CARTE).first().click();
    await page.waitForURL(/\/chateau\/[^/]+$/, { timeout: 15000 });
    const vitrine = new URL(page.url()).pathname;

    // ⚠ CONTEXTE NEUF OBLIGATOIRE. Un `page.goto` dans la MEME page EMPILE
    // l'historique : mesure faite, `idx` y vaut 1, pas 0 — ce n'est donc pas
    // une arrivee directe mais une navigation de plus. Seul un contexte neuf
    // reproduit l'onglet vierge du lien partage.
    const contexte = await browser.newContext();
    const vierge = await contexte.newPage();
    await vierge.goto(new URL(vitrine, page.url()).toString());
    await vierge.waitForSelector(RETOUR, { timeout: 15000 });
    expect(await vierge.evaluate(() => window.history.state?.idx ?? 0)).toBe(0);

    await vierge.locator(RETOUR).first().click();
    await vierge.waitForURL((u) => new URL(u).pathname === '/', { timeout: 15000 });
    expect(new URL(vierge.url()).pathname).toBe('/');
    await contexte.close();
  });
});
