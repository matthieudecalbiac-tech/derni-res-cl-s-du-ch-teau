/**
 * Tests E2E · Sprint S2-α.1 — smoke routing react-router + non-régression overlays
 *
 * Vérifie que :
 *   1-3. Les nouvelles routes transactionnelles répondent et affichent leur placeholder.
 *   4.   La home ("/") affiche toujours les overlays historiques (régression).
 *   5.   Ouvrir un château depuis la home fonctionne toujours (régression : toute
 *        demeure servie ouvre la vitrine).
 *
 * Pattern strangler fig : les <Routes> sont ajoutées à côté des overlays, pas
 * en remplacement — d'où les checks de non-régression 4 et 5.
 */
const { test, expect } = require('@playwright/test');

test.describe('S2-α.1 · routing smoke + non-régression', () => {

  test('Route /club sans session → RequireAuth redirect /connexion + lcc_auth_next=/club', async ({ page }) => {
    await page.goto('/club');
    await page.waitForURL('**/connexion');
    const origin = await page.evaluate(() =>
      localStorage.getItem('lcc_auth_next')
    );
    expect(origin).toBe('/club');
  });

  test('Route /mon-compte (alias) sans session → redirige vers /club → RequireAuth /connexion + lcc_auth_next=/club', async ({ page }) => {
    await page.goto('/mon-compte');
    await page.waitForURL('**/connexion');
    const origin = await page.evaluate(() =>
      localStorage.getItem('lcc_auth_next')
    );
    // /mon-compte redirige vers /club (route pérenne) ; c'est /club que RequireAuth mémorise.
    expect(origin).toBe('/club');
  });

  test('Route /reserver/les-briottieres affiche le placeholder booking', async ({ page }) => {
    await page.goto('/reserver/les-briottieres');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.s2-placeholder-route')).toHaveText('/reserver/les-briottieres');
  });

  test('Route /chatelain/dashboard sans session → redirect /connexion + localStorage (Mini-Phase 6.1)', async ({ page }) => {
    // Sprint S2-α.2 Phase 2 : idem /mon-compte — RequireAuth redirige avant
    // d'évaluer RequireRole. Mini-Phase 6.1 : localStorage["lcc_auth_next"]
    // permet le retour post-auth (consommé par AuthCallback.jsx).
    await page.goto('/chatelain/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/connexion$/, { timeout: 5000 });
    const origin = await page.evaluate(() =>
      localStorage.getItem('lcc_auth_next')
    );
    expect(origin).toBe('/chatelain/dashboard');
  });

  test('Régression : "/" affiche toujours la home (overlays historiques)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle(/./);
    // Pas de placeholder S2 sur la home.
    await expect(page.locator('.s2-placeholder')).toHaveCount(0);
    // Section historique "Une de la semaine" présente.
    await expect(page.locator('.une-semaine-carte').first()).toBeVisible();
  });

  test('Régression : ouvrir un château depuis la home fonctionne toujours', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Générique : la vedette « à la une » est un choix éditorial libre. On teste
    // le MÉCANISME (une carte vedette ouvre une vitrine), pas QUEL château.
    const carte = page.locator('.une-semaine-carte').first();
    await expect(carte).toBeVisible();
    const cta = carte.locator('.une-semaine-cta');
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
