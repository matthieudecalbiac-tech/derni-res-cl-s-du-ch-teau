const { test, expect } = require('@playwright/test');

/**
 * Tests E2E · Vitrines — comportement, decouverte DOM (piece 5).
 *
 * Zero lecture de fichier. La liste des chateaux servis est decouverte au
 * runtime depuis les medaillons de HeureAuxDemeures (.da-medaillon[data-slug],
 * attribut stable pose en piece 3). Pour chacun, on verifie que la vitrine
 * REND ses sections - jamais qu'une donnee vaut une valeur precise.
 *
 * Robustesse : un ajout de chambre, une timeline plus longue, une citation
 * reecrite ne cassent rien. Seule une vitrine qui cesse de rendre une section,
 * ou une image en 4xx, fait rougir. Les sections optionnelles (accroche,
 * timeline, citation) sont gardees par leur presence dans le DOM : un chateau
 * qui n'en a pas n'echoue pas.
 */

// Ouvre la vitrine d'un chateau par son slug, via son medaillon (meme section
// que la decouverte). Patron eprouve : retry click mobile-safari + attente de
// la TransitionPorte avant l'overlay visible.
async function ouvrirVitrineParSlug(page, slug) {
  const medaillon = page.locator(`.da-medaillon[data-slug="${slug}"]`);
  await medaillon.scrollIntoViewIfNeeded();

  let derniereErreur;
  for (let essai = 0; essai < 3; essai++) {
    await medaillon.click();
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

// Charge la home et retourne les slugs des chateaux servis (medaillons stables).
async function decouvrirSlugs(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('.da-medaillon[data-slug]').first()).toBeVisible({ timeout: 10000 });
  return page.locator('.da-medaillon[data-slug]').evaluateAll(
    (els) => els.map((e) => e.getAttribute('data-slug')).filter(Boolean)
  );
}

test.describe('Vitrines · comportement (decouverte DOM)', () => {

  test('Au moins un chateau est servi et decouvrable sur la home', async ({ page }) => {
    const slugs = await decouvrirSlugs(page);
    // Seule alarme si le catalogue public se vide : plus aucune vitrine a tester.
    expect(slugs.length, 'Aucun medaillon [data-slug] rendu sur la home').toBeGreaterThan(0);
  });

  test('Chaque vitrine servie rend ses sections', async ({ page }) => {
    // Sweep O(nombre de chateaux publies) : ouvre CHAQUE vitrine avec parcours
    // complet. Le catalogue public grandit (nouveaux partenaires) → le budget doit
    // suivre. test.slow() triple le timeout (30s -> 90s) plutot qu'un timeout fixe
    // qui casserait au prochain chateau ajoute.
    test.slow();

    // 4xx d'images collectees sur tout le parcours, asserees a la fin.
    const imagesEnErreur = [];
    page.on('response', (res) => {
      if (res.status() >= 400 && res.request().resourceType() === 'image') {
        imagesEnErreur.push(`${res.status()} ${res.url()}`);
      }
    });

    const slugs = await decouvrirSlugs(page);
    expect(slugs.length).toBeGreaterThan(0);

    for (const slug of slugs) {
      await test.step(`Vitrine ${slug}`, async () => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('.da-medaillon[data-slug]').first()).toBeVisible({ timeout: 10000 });
        await ouvrirVitrineParSlug(page, slug);

        // — Nom : present et non vide.
        const nom = (await page.locator('.vc3-header-nom').textContent()) || '';
        expect(nom.trim().length, 'Nom de vitrine vide').toBeGreaterThan(0);

        // — Hero : accroche gardee par presence, prix contenant l'euro.
        const accroche = page.locator('.vc3-hero2-accroche');
        if (await accroche.count() > 0) {
          await expect(accroche.first()).toBeVisible();
        }
        await expect(page.locator('.vc3-sejour-prix')).toContainText('€');

        // Les themes s'ouvrent desormais en MODALE : le contenu n'est plus
        // insere dans le flux. On porte donc les assertions sur .mdl-panneau,
        // et on REFERME entre deux themes — sinon l'overlay de la premiere
        // modale intercepte le clic sur la barre. C'est aussi le geste reel du
        // visiteur : il ferme, puis rouvre ailleurs.
        const modaleTheme = page.locator('.mdl-panneau');

        // — Theme Histoire : timeline gardee par sa presence (chateau sans
        //   timeline = pas de .vc4-theme-timeline, on ne teste rien).
        await page.locator('[data-theme="histoire"]').click();
        await expect(modaleTheme).toBeVisible({ timeout: 5000 });
        if (await modaleTheme.locator('.vc4-theme-timeline').count() > 0) {
          expect(
            await modaleTheme.locator('.vc4-theme-tl-item').count(),
            'Timeline rendue mais sans evenement'
          ).toBeGreaterThan(0);
        }
        await page.keyboard.press('Escape');
        await expect(modaleTheme).toHaveCount(0, { timeout: 3000 });

        // — Theme Famille : citation gardee par sa presence.
        await page.locator('[data-theme="famille"]').click();
        await expect(modaleTheme).toBeVisible({ timeout: 5000 });
        const citation = modaleTheme.locator('.vc4-theme-famille-citation');
        if (await citation.count() > 0) {
          await expect(citation.first()).toBeVisible();
        }
        await page.keyboard.press('Escape');
        await expect(modaleTheme).toHaveCount(0, { timeout: 3000 });

        // — Module Permanent : meme regime que les themes desormais. La bande de
        //   cartes Niveau 1 a quitte le flux (barre laterale = seul acces), et
        //   l'overlay maison .vc3-module-panel a fait place a Modale.jsx.
        await page.locator('.bl-offre[data-module="permanent"]').click();
        await expect(modaleTheme).toBeVisible({ timeout: 5000 });
        expect(
          await modaleTheme.locator('.vc4-permanent-chambre').count(),
          'Aucune chambre dans le module Permanent'
        ).toBeGreaterThan(0);

        // — Modale de reservation : s'ouvre PAR-DESSUS celle du module
        //   (.vc3-reserve-overlay est en z-index 9100 contre 9000), puis se ferme.
        await modaleTheme.locator('.vc4-permanent-chambre-cta').first().click();
        await expect(page.locator('.vc3-reserve-modal')).toBeVisible();
        await page.locator('.vc3-reserve-close').click();
        await expect(page.locator('.vc3-reserve-modal')).not.toBeVisible();

        // Referme la modale du module : sans ca, l'Escape suivant serait absorbe
        // par elle au lieu de fermer la vitrine (garde pose dans VitrineChateau).
        await page.keyboard.press('Escape');
        await expect(modaleTheme).toHaveCount(0, { timeout: 3000 });
        await expect(page.locator('.vc3-module-panel')).toHaveCount(0);

        // — Images : declenche le chargement sous le fold (4xx collectes globalement).
        await page.evaluate(() => {
          const corps = document.querySelector('.vc3-corps');
          if (corps) corps.scrollTo({ top: corps.scrollHeight, behavior: 'instant' });
        });
        await page.waitForTimeout(800);

        // — Escape ferme la vitrine.
        await page.keyboard.press('Escape');
        await expect(page.locator('.vc3-overlay')).toHaveCount(0, { timeout: 3000 });
      });
    }

    expect(imagesEnErreur, `Images en 4xx :\n${imagesEnErreur.join('\n')}`).toEqual([]);
  });

});
