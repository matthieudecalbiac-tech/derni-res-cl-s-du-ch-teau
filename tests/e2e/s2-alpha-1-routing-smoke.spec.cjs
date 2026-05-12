/**
 * Tests E2E · Sprint S2-α.1 — smoke routing react-router + non-régression overlays
 *
 * Vérifie que :
 *   1-3. Les nouvelles routes transactionnelles répondent et affichent leur placeholder.
 *   4.   La home ("/") affiche toujours les overlays historiques (régression).
 *   5.   Ouvrir un château depuis la home fonctionne toujours (régression aiguillage
 *        ChateauModal / VitrineChateau).
 *
 * Pattern strangler fig : les <Routes> sont ajoutées à côté des overlays, pas
 * en remplacement — d'où les checks de non-régression 4 et 5.
 */
const { test, expect } = require('@playwright/test');

test.describe('S2-α.1 · routing smoke + non-régression', () => {

  test('Route /mon-compte répond (stub RequireAuth — pas de redirection en α.1)', async ({ page }) => {
    await page.goto('/mon-compte');
    await page.waitForLoadState('domcontentloaded');
    const ph = page.locator('.s2-placeholder');
    await expect(ph).toBeVisible();
    await expect(ph.locator('.s2-placeholder-route')).toHaveText('/mon-compte');
    // Le pipeline i18n doit avoir résolu la clé : "Chargement…", pas "common.loading".
    await expect(ph).toContainText('Chargement');
    await expect(ph).not.toContainText('common.loading');
  });

  test('Route /reserver/les-briottieres affiche le placeholder booking', async ({ page }) => {
    await page.goto('/reserver/les-briottieres');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.s2-placeholder-route')).toHaveText('/reserver/les-briottieres');
  });

  test('Route /chatelain/dashboard affiche le placeholder (stubs RequireAuth/RequireRole)', async ({ page }) => {
    await page.goto('/chatelain/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.s2-placeholder-route')).toHaveText('/chatelain/dashboard');
  });

  test('Régression : "/" affiche toujours la home (overlays historiques)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle(/./);
    // Pas de placeholder S2 sur la home.
    await expect(page.locator('.s2-placeholder')).toHaveCount(0);
    // Section historique "Une de la semaine" présente.
    await expect(page.locator('.une-semaine-demeure').first()).toBeVisible();
  });

  test('Régression : ouvrir un château depuis la home fonctionne toujours', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const article = page.locator('.une-semaine-demeure').filter({ hasText: /Briotti[èe]res/i });
    await expect(article).toBeVisible();
    const cta = article.locator('.une-semaine-cta');
    await cta.scrollIntoViewIfNeeded();
    let ouvert = false;
    for (let i = 0; i < 3; i++) {
      await cta.click();
      try {
        await expect(page.locator('.vc3-overlay')).toBeVisible({ timeout: 3000 });
        ouvert = true;
        break;
      } catch { /* retry */ }
    }
    expect(ouvert).toBe(true);
  });

});
