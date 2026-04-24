/**
 * Tests E2E · Château du Blanc Buisson (id 8)
 *
 * Spécificités :
 *   - Seul château avec `videoBackground` (YouTube iframe) en mode jour
 *   - Mode nuit (20h → 7h) : lune + étoiles + image, pas de vidéo
 *   - Propriétaires : Maïté & Éric de la Fresnaye
 *
 * Pour les bugs latents transverses (météo, chiffres clés, découpage propriétaires)
 * voir briottieres.spec.cjs — côté Blanc Buisson ces valeurs sont justes par hasard.
 */
const { test, expect } = require('@playwright/test');

async function ouvrirBlancBuisson(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  const article = page.locator('.une-semaine-demeure').filter({ hasText: /Blanc Buisson/i });
  await expect(article).toBeVisible();
  const cta = article.locator('.une-semaine-cta');
  await cta.scrollIntoViewIfNeeded();

  // Mobile-safari rate occasionellement le premier click ; on réessaie jusqu'à
  // voir l'overlay monter (TransitionPorte joue ~3.5s par-dessus avant de se retirer).
  let derniereErreur;
  for (let essai = 0; essai < 3; essai++) {
    await cta.click();
    try {
      await expect(page.locator('.vc3-overlay')).toBeVisible({ timeout: 3000 });
      derniereErreur = null;
      break;
    } catch (e) {
      derniereErreur = e;
    }
  }
  if (derniereErreur) throw derniereErreur;

  await page.locator('.tp-wrap').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
  await expect(page.locator('.vc3-overlay.vc3-visible')).toBeVisible({ timeout: 3000 });
}

test.describe('Vitrine Blanc Buisson · parcours critiques', () => {

  test('La home charge et propose Blanc Buisson dans « La Une »', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const article = page.locator('.une-semaine-demeure').filter({ hasText: /Blanc Buisson/i });
    await expect(article).toBeVisible();
    await expect(article).toContainText(/Blanc Buisson/i);
  });

  test('La vitrine Blanc Buisson s\'ouvre', async ({ page }) => {
    await ouvrirBlancBuisson(page);
    await expect(page.locator('.vc3-header-nom')).toContainText(/Blanc Buisson/i);
    await expect(page.locator('.vc3-hero-titre')).toContainText(/lanc Buisson/i);
  });

  test('Hero affiche vidéo YouTube ou image selon l\'heure', async ({ page }) => {
    await ouvrirBlancBuisson(page);

    const heurePage = await page.evaluate(() => new Date().getHours());
    const estNuit = heurePage >= 20 || heurePage < 7;

    if (estNuit) {
      await expect(page.locator('.vc3-hero--nuit')).toBeVisible();
      await expect(page.locator('.vc3-hero-moon')).toBeVisible();
      await expect(page.locator('.vc3-hero-star')).toHaveCount(20);
      await expect(page.locator('.vc3-hero-iframe')).toHaveCount(0);
    } else {
      const iframe = page.locator('.vc3-hero-iframe');
      await expect(iframe).toBeVisible();
      const src = await iframe.getAttribute('src');
      expect(src).toContain('JQ9m51Bl900'); // videoBackground dans chateaux.js
    }
  });

  test('Les 2 hébergements sont listés (Donjon, La Réserve)', async ({ page }) => {
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
    await page.locator('.vc3-header-cta').click();
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
    await ouvrirBlancBuisson(page);
    await page.locator('.vc3-timeline').scrollIntoViewIfNeeded();
    await expect(page.locator('.vc3-tl-item')).toHaveCount(6);
    await expect(page.locator('.vc3-tl-yr').first()).toContainText('1290');
  });

  test('Alentours affichent les 4 premiers points d\'intérêt (Bec-Hellouin en tête)', async ({ page }) => {
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

  test('Simulation mode nuit — force l\'heure à 23h', async ({ page }) => {
    await page.addInitScript(() => {
      const RealDate = Date;
      class MockDate extends RealDate {
        constructor(...args) { super(...args); }
        getHours() { return 23; }
        getMinutes() { return 15; }
      }
      // @ts-ignore
      // eslint-disable-next-line no-global-assign
      Date = MockDate;
    });

    await ouvrirBlancBuisson(page);

    await expect(page.locator('.vc3-hero--nuit')).toBeVisible();
    await expect(page.locator('.vc3-hero-moon')).toBeVisible();
    await expect(page.locator('.vc3-hero-iframe')).toHaveCount(0);
  });

});
