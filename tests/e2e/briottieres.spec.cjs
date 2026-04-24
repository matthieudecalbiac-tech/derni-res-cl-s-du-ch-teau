/**
 * Tests E2E · Vitrine Château des Briottières (id 7)
 *
 * Parcours attendus :
 *   1. Home → UneDeLaSemaine rend bien Briottières
 *   2. Click "Franchir le seuil" → TransitionPorte (~3.5s) → VitrineChateau
 *   3. Hero, chambres, modal de réservation, timeline, mode présentation
 *   4. Escape referme
 *   5. Images locales /bri-*.avif sans 404
 *
 * Corrections vérifiées en non-régression (voir suite "Corrections des bugs historiques") :
 *   - météo lit chateau.ville / chateau.region (ex-hardcode « Rugles · Normandie »)
 *   - chiffres clés lus depuis chateau.chiffresCles (ex-hardcode 1290 / 3 / 8 ha / 1949)
 *   - portrait typo lit proprietaires.initiale + nomAffiche (ex-découpe nom[0] + slice)
 */
const { test, expect } = require('@playwright/test');

async function ouvrirBriottieres(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  const article = page.locator('.une-semaine-demeure').filter({ hasText: /Briotti[èe]res/i });
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

test.describe('Vitrine Briottières · parcours critiques', () => {

  test('La home charge et propose Briottières dans « La Une »', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle(/./);
    const article = page.locator('.une-semaine-demeure').filter({ hasText: /Briotti[èe]res/i });
    await expect(article).toBeVisible();
    await expect(article).toContainText(/Briotti[èe]res/i);
  });

  test('On peut ouvrir la vitrine Briottières', async ({ page }) => {
    await ouvrirBriottieres(page);
    await expect(page.locator('.vc3-header-nom')).toContainText(/Briotti[èe]res/i);
    await expect(page.locator('.vc3-hero-titre')).toContainText(/riotti[èe]res/i);
  });

  test('Hero affiche accroche, prix, distance Paris', async ({ page }) => {
    await ouvrirBriottieres(page);
    await expect(page.locator('.vc3-hero-accroche')).toBeVisible();
    await expect(page.locator('.vc3-hero-accroche')).toContainText(/sept|g[ée]n[ée]rations|Anjou/i);
    const metaVals = page.locator('.vc3-hero-meta-val');
    await expect(metaVals.first()).toContainText('€');
    await expect(metaVals.nth(1)).toContainText(/2h15|Paris/i);
  });

  test('Les 3 chambres apparaissent avec les bons prix', async ({ page }) => {
    await ouvrirBriottieres(page);
    await page.locator('.vc3-chambres').scrollIntoViewIfNeeded();

    const chambres = page.locator('.vc3-chambre');
    await expect(chambres).toHaveCount(3);

    const noms = page.locator('.vc3-chambre-nom');
    await expect(noms.nth(0)).toContainText(/Charles\s*X/i);
    await expect(noms.nth(1)).toContainText(/Verte/i);
    await expect(noms.nth(2)).toContainText(/Cabane|Lodge/i);

    const prix = page.locator('.vc3-chambre-prix');
    await expect(prix.nth(0)).toContainText('320');
    await expect(prix.nth(1)).toContainText('290');
    await expect(prix.nth(2)).toContainText('350');
  });

  test('Modal de réservation s\'ouvre, sélectionne et se ferme', async ({ page }) => {
    await ouvrirBriottieres(page);

    await page.locator('.vc3-header-cta').click();
    await expect(page.locator('.vc3-reserve-modal')).toBeVisible();

    const chambresModal = page.locator('.vc3-reserve-ch');
    await expect(chambresModal).toHaveCount(3);

    await chambresModal.nth(1).click();
    await expect(chambresModal.nth(1)).toHaveClass(/actif/);

    await page.locator('.vc3-reserve-close').click();
    await expect(page.locator('.vc3-reserve-modal')).not.toBeVisible();
  });

  test('Escape ferme la vitrine et retourne à la home', async ({ page }) => {
    await ouvrirBriottieres(page);
    await expect(page.locator('.vc3-overlay.vc3-visible')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.vc3-overlay')).toHaveCount(0, { timeout: 2000 });
  });

  test('Timeline affiche les 6 événements historiques (1485 en tête)', async ({ page }) => {
    await ouvrirBriottieres(page);
    await page.locator('.vc3-timeline').scrollIntoViewIfNeeded();
    const items = page.locator('.vc3-tl-item');
    await expect(items).toHaveCount(6);
    await expect(page.locator('.vc3-tl-yr').first()).toContainText('1485');
  });

  test('Citation propriétaire présente et signée Valbray', async ({ page }) => {
    await ouvrirBriottieres(page);
    await page.locator('.vc3-citation').scrollIntoViewIfNeeded();
    const citation = page.locator('.vc3-citation-txt');
    await expect(citation).toBeVisible();
    const txt = await citation.textContent();
    expect(txt && txt.length).toBeGreaterThan(50);
    await expect(page.locator('.vc3-citation-auteur')).toContainText(/Valbray/i);
  });

  test('Mode présentation s\'ouvre pour pitch partenaire', async ({ page }) => {
    await ouvrirBriottieres(page);
    const bouton = page.locator('.vc3-mode-pres-btn');
    await bouton.scrollIntoViewIfNeeded();
    await bouton.click();

    await expect(page.locator('.vc3-pres-overlay')).toBeVisible();
    await expect(page.locator('.vc3-pres-titre')).toContainText(/Les Cl[ée]s du Ch[aâ]teau/i);

    await page.locator('.vc3-pres-close').click();
    await expect(page.locator('.vc3-pres-overlay')).not.toBeVisible();
  });

  test('Images locales /bri-*.avif se chargent sans 404', async ({ page }) => {
    const echecs = [];
    page.on('response', (res) => {
      const url = res.url();
      if (res.status() >= 400 && /\/bri-[^/]+\.avif/i.test(url)) {
        echecs.push(`${res.status()} ${url}`);
      }
    });

    await ouvrirBriottieres(page);
    // Force le parcours complet pour déclencher les images sous le fold.
    await page.evaluate(() => {
      const corps = document.querySelector('.vc3-corps');
      if (corps) corps.scrollTo({ top: corps.scrollHeight, behavior: 'instant' });
    });
    await page.waitForTimeout(1500);

    expect(echecs, `Images /bri-*.avif en erreur :\n${echecs.join('\n')}`).toHaveLength(0);
  });

  /* ═══════════════════════════════════════════════════
   *  CORRECTIONS — vérifications positives post-fix
   *  (bugs météo / chiffres / portrait corrigés côté React,
   *   ces tests garantissent la non-régression)
   * ═══════════════════════════════════════════════════
   */
  test.describe('Corrections des bugs historiques', () => {

    test('Météo affiche bien la ville du château (Champigné · Pays de la Loire)', async ({ page }) => {
      await ouvrirBriottieres(page);
      const meteo = page.locator('.vc3-meteo-lieu');
      await meteo.scrollIntoViewIfNeeded();
      const lieu = (await meteo.textContent()) || '';
      expect(lieu).toMatch(/Champign[ée]|Pays de la Loire/i);
      expect(lieu).not.toMatch(/Rugles|Normandie/i);
    });

    test('Chiffres clés affichent les données Briottières (1485 / 7 / 50 ha)', async ({ page }) => {
      await ouvrirBriottieres(page);
      await page.locator('.vc3-chiffres').scrollIntoViewIfNeeded();
      const joined = (await page.locator('.vc3-chiffre-val').allTextContents()).join(' | ');
      expect(joined).toMatch(/1485/);
      expect(joined).toMatch(/50\s*ha/i);
      expect(joined).not.toMatch(/1290|1949/);
    });

    test('Portrait propriétaire : initiale V + reste albray (Valbray)', async ({ page }) => {
      await ouvrirBriottieres(page);
      await page.locator('.vc3-portrait').scrollIntoViewIfNeeded();
      const init = ((await page.locator('.vc3-portrait-init').textContent()) || '').trim();
      const reste = ((await page.locator('.vc3-portrait-reste').textContent()) || '').trim();
      expect(init).toBe('V');
      expect(reste.toLowerCase()).toContain('albray');
    });

  });

});
