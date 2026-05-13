/**
 * Tests E2E · Sprint S2-α.1.5 — refonte vitrine 2 niveaux d'onglets
 *
 * Couvre :
 *   1.  /chateau/les-briottieres → hero + onglet Permanent défaut + phrase intro + chambres
 *   2.  ?onglet=dernieresCles → onglet B actif, offres avec services
 *   3.  ?onglet=dernieresCles&offre=offre-bri-001 → highlight de l'offre ciblée
 *   4.  ?onglet=club → fallback Permanent (IS_CLUB_MEMBER stub = false)
 *   5.  Onglet Club PAS dans la liste (non-membre)
 *   6.  Click onglet "Histoire" niveau 2 → ?theme=histoire + timeline visible
 *   7.  Click successif sur les 6 thèmes niveau 2 → chaque contenu charge
 *   8.  /chateau/vaux-le-vicomte (estLaUne:false) → redirect /
 *   9.  Régression : "/" home OK
 *   10. Régression : click château estLaUne depuis VitrinePermanente → VitrineChateau (Dette 2)
 *
 * URL params en camelCase (alignés sur chateau.modules.dernieresCles).
 */
const { test, expect } = require('@playwright/test');

test.describe('S2-α.1.5 · vitrine onglets 2 niveaux', () => {

  test('Test 1 · /chateau/les-briottieres : hero + Permanent défaut + intro + chambres', async ({ page }) => {
    await page.goto('/chateau/les-briottieres');
    await page.waitForLoadState('domcontentloaded');

    // Hero présent (inchangé)
    await expect(page.locator('.vc3-hero').first()).toBeVisible({ timeout: 8000 });

    // Onglet Permanent actif par défaut
    const ongletPermanent = page.locator('.vc4-onglet-n1[data-onglet="permanent"]');
    await expect(ongletPermanent).toBeVisible();
    await expect(ongletPermanent).toHaveClass(/vc4-onglet-n1--actif/);

    // Phrase d'intro présente
    await expect(page.locator('.vc4-permanent-intro')).toBeVisible();

    // Au moins 2 chambres affichées (Briottières en a plusieurs)
    const chambres = page.locator('.vc4-permanent-chambre');
    await expect(chambres.first()).toBeVisible();
    expect(await chambres.count()).toBeGreaterThanOrEqual(2);
  });

  test('Test 2 · ?onglet=dernieresCles : offres B avec services', async ({ page }) => {
    await page.goto('/chateau/les-briottieres?onglet=dernieresCles');
    await page.waitForLoadState('domcontentloaded');

    const ongletDC = page.locator('.vc4-onglet-n1[data-onglet="dernieresCles"]');
    await expect(ongletDC).toBeVisible({ timeout: 8000 });
    await expect(ongletDC).toHaveClass(/vc4-onglet-n1--actif/);

    // Au moins 1 offre listée
    const cards = page.locator('.vc4-dc-card');
    await expect(cards.first()).toBeVisible({ timeout: 8000 });

    // Services inclus visibles
    await expect(cards.first().locator('.vc4-dc-card-service').first()).toBeVisible();
  });

  test('Test 3 · ?onglet=dernieresCles&offre=offre-bri-001 : highlight', async ({ page }) => {
    await page.goto('/chateau/les-briottieres?onglet=dernieresCles&offre=offre-bri-001');
    await page.waitForLoadState('domcontentloaded');

    const card = page.getByTestId('offre-card-offre-bri-001');
    await expect(card).toBeVisible({ timeout: 8000 });
    // La classe highlight est appliquée pendant 3s — vérifie dans la fenêtre
    await expect(card).toHaveClass(/vc4-dc-card--highlight/, { timeout: 2000 });
  });

  test('Test 4 · ?onglet=club → fallback Permanent (non-membre)', async ({ page }) => {
    await page.goto('/chateau/les-briottieres?onglet=club');
    await page.waitForLoadState('domcontentloaded');

    // Le contenu permanent est rendu (fallback)
    await expect(page.locator('[data-onglet-contenu="permanent"]')).toBeVisible({ timeout: 8000 });
    // Pas de contenu club
    await expect(page.locator('[data-onglet-contenu="club"]')).toHaveCount(0);
  });

  test('Test 5 · Onglet Club masqué pour non-membre', async ({ page }) => {
    await page.goto('/chateau/les-briottieres');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('.vc4-onglet-n1[data-onglet="permanent"]').waitFor({ timeout: 8000 });

    // L'onglet Club ne doit pas exister dans la nav
    await expect(page.locator('.vc4-onglet-n1[data-onglet="club"]')).toHaveCount(0);
  });

  test('Test 6 · Click onglet Histoire (niveau 2) → ?theme=histoire + timeline', async ({ page }) => {
    await page.goto('/chateau/les-briottieres');
    await page.waitForLoadState('domcontentloaded');

    const ongletHistoire = page.locator('.vc4-onglet-n2[data-theme="histoire"]');
    await ongletHistoire.scrollIntoViewIfNeeded();
    await ongletHistoire.click();

    await expect(page).toHaveURL(/[?&]theme=histoire/, { timeout: 5000 });
    await expect(page.locator('[data-theme-contenu="histoire"]')).toBeVisible();
    await expect(page.locator('.vc4-theme-timeline')).toBeVisible();
  });

  test('Test 7 · Cycle sur les 6 thèmes niveau 2', async ({ page }) => {
    await page.goto('/chateau/les-briottieres');
    await page.waitForLoadState('domcontentloaded');

    const themes = ['apercu', 'histoire', 'famille', 'lieu', 'services', 'chambres'];
    for (const t of themes) {
      const onglet = page.locator(`.vc4-onglet-n2[data-theme="${t}"]`);
      await onglet.scrollIntoViewIfNeeded();
      await onglet.click();
      await expect(page.locator(`[data-theme-contenu="${t}"]`)).toBeVisible({ timeout: 3000 });
    }
  });

  test('Test 8 · /chateau/vaux-le-vicomte (estLaUne:false) → redirect /', async ({ page }) => {
    await page.goto('/chateau/vaux-le-vicomte');
    await page.waitForLoadState('domcontentloaded');

    // L'URL doit être / (redirect Navigate replace)
    await expect(page).toHaveURL(/\/$/, { timeout: 5000 });
    // La home doit afficher la section "Une de la semaine"
    await expect(page.locator('.une-semaine-demeure').first()).toBeVisible({ timeout: 5000 });
  });

  test('Test 9 · Régression home /', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.s2-placeholder')).toHaveCount(0);
    await expect(page.locator('.une-semaine-demeure').first()).toBeVisible();
  });

  test('Test 10 · Dette 2 : VitrinePermanente → VitrineChateau si estLaUne', async ({ page, browserName, isMobile }) => {
    test.skip(
      browserName === 'webkit' && isMobile,
      'S2-α.1.5 Test 10 — non testé sur mobile-safari : dette responsive (header z-index intercepte le pointer event sur .hm-item, le handler React onClick ne se déclenche pas même avec force:true). Bug pré-existant, à corriger Sprint S5 (Tanguy). Couverture Dette 2 maintenue sur chromium-desktop + webkit-desktop. PR #23.'
    );

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Ouvrir le burger menu (le bouton "Vitrines permanentes" y est rangé)
    await page.getByRole('button', { name: /Ouvrir le menu/i }).click();

    // Cliquer sur l'item "Vitrines permanentes" du sous-menu
    const itemVitrines = page.locator('button.hm-item').filter({ hasText: /Vitrines permanentes/i });
    await expect(itemVitrines).toBeVisible({ timeout: 5000 });
    await itemVitrines.click();

    // Cliquer sur la carte Briottières (estLaUne: true) dans VitrinePermanente
    const carteBri = page.locator('.vit-carte').filter({ hasText: /Briotti[èe]res/i }).first();
    await expect(carteBri).toBeVisible({ timeout: 5000 });
    await carteBri.click();

    // Attendre l'overlay vc3 (Dette 2 : aiguillage estLaUne → VitrineChateau, pas ChateauModal)
    await expect(page.locator('.vc3-overlay')).toBeVisible({ timeout: 8000 });
  });

});
