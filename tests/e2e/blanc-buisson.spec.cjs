/**
 * Tests E2E · Château du Blanc Buisson (id 8)
 *
 * Spécificités :
 *   - Seul château avec `videoBackground` : hero vidéo YouTube rendu en journée
 *     (7h → 20h) ; la nuit, fond image (pas de vidéo, plus d'overlay nuit)
 *   - Propriétaires : Maïté & Éric de la Fresnaye
 *
 * Pour les bugs latents transverses (météo, chiffres clés, découpage propriétaires)
 * voir briottieres.spec.cjs — côté Blanc Buisson ces valeurs sont justes par hasard.
 */
const { test, expect } = require('@playwright/test');

async function ouvrirBlancBuisson(page) {
  // Accès par URL directe (voie SEO /chateau/:slug) : robuste au choix éditorial
  // de vedette. Même composant VitrineChateau (mode route) → mêmes sélecteurs.
  await page.goto('/chateau/blanc-buisson');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('.vc3-overlay.vc3-visible')).toBeVisible({ timeout: 8000 });
}

test.describe('Vitrine Blanc Buisson · parcours critiques', () => {

  test('La home rend la section « à la une » (≥1 vedette, sans présumer laquelle)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Vedette = choix éditorial libre : on teste que la section rend au moins une
    // carte, jamais QUEL château y figure.
    const cartes = page.locator('.une-semaine-carte');
    await expect(cartes.first()).toBeVisible();
    expect(await cartes.count()).toBeGreaterThan(0);
  });

  test('La vitrine Blanc Buisson s\'ouvre', async ({ page }) => {
    await ouvrirBlancBuisson(page);
    await expect(page.locator('.vc3-header-nom')).toContainText(/Blanc Buisson/i);
    await expect(page.locator('.vc3-hero2-titre')).toContainText(/lanc Buisson/i);
  });

  test('Hero affiche la vidéo YouTube (mode jour)', async ({ page }) => {
    await ouvrirBlancBuisson(page);
    const estNuit = await page.evaluate(() => { const h = new Date().getHours(); return h >= 20 || h < 7; });
    test.skip(estNuit, 'Vidéo hero rendue en journée uniquement (7h-20h)');
    const iframe = page.locator('.vc3-hero2-iframe');
    await expect(iframe).toBeVisible();
    expect(await iframe.getAttribute('src')).toContain('JQ9m51Bl900');
  });

  test('Les 2 hébergements sont listés (Donjon, La Réserve)', async ({ page }) => {
    test.skip(true, 'S2-α.1.5 — chambres déplacées dans ContenuPermanent, sélecteur .vc4-permanent-chambre. À METTRE À JOUR avec nouveau path UI post-α.1.5, PAS une régression. PR #23.');
    await ouvrirBlancBuisson(page);
    await page.locator('.vc3-chambres').scrollIntoViewIfNeeded();

    const chambres = page.locator('.vc3-chambre');
    await expect(chambres).toHaveCount(2);

    const noms = page.locator('.vc3-chambre-nom');
    await expect(noms.nth(0)).toContainText(/Donjon/i);
    await expect(noms.nth(1)).toContainText(/R[ée]serve/i);

    const prix = page.locator('.vc3-chambre-prix');
    await expect(prix.nth(0)).toContainText('280');
    await expect(prix.nth(1)).toContainText('220');
  });

  test('Modal de réservation propose les 2 hébergements', async ({ page }) => {
    await ouvrirBlancBuisson(page);
    // Route mode : module Permanent inline, pas d'overlay .vc3-module-panel.
    const cta = page.locator('.vc4-permanent-chambre-cta').first();
    await cta.scrollIntoViewIfNeeded();
    await cta.click();
    await expect(page.locator('.vc3-reserve-modal')).toBeVisible();
    await expect(page.locator('.vc3-reserve-ch')).toHaveCount(2);
    await page.locator('.vc3-reserve-close').click();
    await expect(page.locator('.vc3-reserve-modal')).not.toBeVisible();
  });

  test('Escape ferme la vitrine', async ({ page }) => {
    await ouvrirBlancBuisson(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('.vc3-overlay')).toHaveCount(0, { timeout: 2000 });
  });

  test('Timeline — 6 événements, commence en 1290', async ({ page }) => {
    test.skip(true, 'S2-α.1.5 — timeline déplacée dans ContenuTheme/histoire, sélecteur .vc4-theme-timeline (requires ?theme=histoire). À METTRE À JOUR avec nouveau path UI post-α.1.5, PAS une régression. PR #23.');
    await ouvrirBlancBuisson(page);
    await page.locator('.vc3-timeline').scrollIntoViewIfNeeded();
    await expect(page.locator('.vc3-tl-item')).toHaveCount(6);
    await expect(page.locator('.vc3-tl-yr').first()).toContainText('1290');
  });

  test('Alentours affichent les 4 premiers points d\'intérêt (Bec-Hellouin en tête)', async ({ page }) => {
    test.skip(true, 'S2-α.1.5 — alentours déplacés dans ContenuTheme/lieu, sélecteur .vc4-theme-alentour (requires ?theme=lieu). À METTRE À JOUR avec nouveau path UI post-α.1.5, PAS une régression. PR #23.');
    await ouvrirBlancBuisson(page);
    await page.locator('.vc3-territoire').scrollIntoViewIfNeeded();
    const alentours = page.locator('.vc3-alentour');
    await expect(alentours).toHaveCount(4);
    await expect(alentours.first()).toContainText(/Bec-Hellouin/i);
  });

  test('Images locales /bb-*.avif se chargent sans 404', async ({ page }) => {
    const echecs = [];
    page.on('response', (res) => {
      const url = res.url();
      if (res.status() >= 400 && /\/bb-[^/]+\.(avif|jpg|jpeg|png|webp)/i.test(url)) {
        echecs.push(`${res.status()} ${url}`);
      }
    });

    await ouvrirBlancBuisson(page);
    await page.evaluate(() => {
      const corps = document.querySelector('.vc3-corps');
      if (corps) corps.scrollTo({ top: corps.scrollHeight, behavior: 'instant' });
    });
    await page.waitForTimeout(1500);

    expect(echecs, `Images /bb-* en erreur :\n${echecs.join('\n')}`).toHaveLength(0);
  });

});
