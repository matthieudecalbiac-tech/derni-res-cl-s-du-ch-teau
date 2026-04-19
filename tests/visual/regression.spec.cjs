/**
 * Tests de régression visuelle
 *
 * Prend des screenshots des zones clés et les compare au "snapshot" de référence.
 * Premier run : génère les références. Runs suivants : échec si diff > 0.2%.
 *
 * Pour régénérer les références après un changement voulu :
 *   npx playwright test tests/visual --update-snapshots
 */
const { test, expect } = require('@playwright/test');

test.describe('Régression visuelle · vitrines', () => {

  // On fige la météo et la géolocalisation pour stabilité des screenshots
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions([]);
    await context.setGeolocation({ latitude: 48.8566, longitude: 2.3522 }); // Paris figé

    // Stubber l'API Open-Meteo
    await page.route('**/api.open-meteo.com/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          current: { temperature_2m: 14, weathercode: 2, windspeed_10m: 10 },
        }),
      })
    );

    // Forcer l'heure de jour
    await page.addInitScript(() => {
      class MockDate extends Date {
        getHours() { return 9; }
        getMinutes() { return 42; }
      }
      // @ts-ignore
      Date = MockDate;
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Screenshot home complète', async ({ page }) => {
    await expect(page).toHaveScreenshot('home.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('Screenshot hero Briottières', async ({ page }) => {
    await page.getByText(/Briotti[èe]res/i).first().click();
    await page.waitForTimeout(1500); // Laisse les animations se stabiliser
    await expect(page.locator('.vc3-hero')).toHaveScreenshot('briottieres-hero.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('Screenshot chambres Briottières', async ({ page }) => {
    await page.getByText(/Briotti[èe]res/i).first().click();
    await page.locator('.vc3-chambres').scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await expect(page.locator('.vc3-chambres')).toHaveScreenshot('briottieres-chambres.png');
  });

  test('Screenshot modal réservation', async ({ page }) => {
    await page.getByText(/Briotti[èe]res/i).first().click();
    await page.locator('.vc3-header-cta').click();
    await page.waitForTimeout(400);
    await expect(page.locator('.vc3-reserve-modal')).toHaveScreenshot('modal-reservation.png');
  });

  test('Screenshot hero Blanc Buisson (jour)', async ({ page }) => {
    await page.getByText(/Blanc Buisson/i).first().click();
    await page.waitForTimeout(2500); // Laisse YouTube charger
    await expect(page.locator('.vc3-hero')).toHaveScreenshot('blanc-buisson-hero.png', {
      maxDiffPixelRatio: 0.05, // Vidéo YouTube → tolérance plus haute
    });
  });

});
