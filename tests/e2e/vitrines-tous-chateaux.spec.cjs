/**
 * Tests E2E · Vitrines paramétrées (lit src/data/chateaux.js)
 *
 * Pour chaque château avec estLaUne === true, génère une suite de tests
 * essentiels basés sur les sélecteurs .vc3-* (VitrineChateau). Les valeurs
 * attendues (nombre de chambres, prix, timeline, chiffres clés) sont lues
 * depuis chateaux.js — zéro hardcoding. Un futur château promu à
 * estLaUne:true sera testé automatiquement, sans modification de ce fichier.
 *
 * Filtrage sur estLaUne (critère métier) plutôt que sur c.id in [7,8]
 * (critère d'implémentation). Note : App.jsx:137-140 utilise encore l'id
 * hardcodé pour choisir entre VitrineChateau et ChateauModal — un mini-fix
 * cohérent (utiliser c.estLaUne à la place) est à prévoir hors audit.
 *
 * Champs optionnels → test.skip si absents, pas d'échec :
 *   - chateau.accroche              (assertion hero accroche)
 *   - chateau.distanceParis         (assertion meta hero)
 *   - chateau.chiffresCles          (test chiffres clés)
 *   - chateau.timeline              (test timeline)
 *   - chateau.proprietaires.citation (test citation)
 *   - chateau.images                (test 4xx)
 *
 * Traçabilité — enrichissement éditorial à venir :
 * Sur les 8 châteaux actuels, seuls id 7 (Briottières) et id 8 (Blanc Buisson)
 * ont estLaUne:true ET les champs patrimoniaux (ville, chiffresCles,
 * proprietaires.initiale, proprietaires.nomAffiche, images locales). Les 6
 * autres (Vaux-le-Vicomte, Pierrefonds, Chantilly, Fontainebleau,
 * Ferté-Saint-Aubin, Pierreclos) devront être enrichis de ces champs avant
 * d'être promus en vitrine riche.
 */
const { test, expect } = require('@playwright/test');
const { getChateaux, ouvrirVitrine } = require('./_helpers.cjs');

const enVitrine = getChateaux().filter((c) => c.estLaUne === true);

if (enVitrine.length === 0) {
  test('Aucun château estLaUne:true — suite paramétrée vide', () => {
    test.skip(true, 'Aucun château avec estLaUne:true dans chateaux.js');
  });
}

for (const chateau of enVitrine) {
  test.describe(`Vitrine · ${chateau.nom}`, () => {

    test('La vitrine s\'ouvre et affiche le nom du château', async ({ page }) => {
      await ouvrirVitrine(page, chateau);
      await expect(page.locator('.vc3-header-nom')).toContainText(chateau.nom);
      await expect(page.locator('.vc3-hero-titre')).toBeVisible();
    });

    test('Hero : prix avec € et meta distance Paris', async ({ page }) => {
      await ouvrirVitrine(page, chateau);

      if (chateau.accroche) {
        await expect(page.locator('.vc3-hero-accroche')).toBeVisible();
      }

      const metaVals = page.locator('.vc3-hero-meta-val');
      await expect(metaVals.first()).toContainText('€');

      if (chateau.distanceParis) {
        const token = String(chateau.distanceParis).match(/\d+h\d*|\d+\s*km|\d+\s*min|Paris/i);
        if (token) {
          await expect(metaVals.nth(1)).toContainText(token[0].trim());
        }
      }
    });

    test(`Chambres : ${chateau.chambres.length} cartes avec prix cohérents`, async ({ page }) => {
      await ouvrirVitrine(page, chateau);
      await page.locator('.vc3-chambres').scrollIntoViewIfNeeded();

      const chambres = page.locator('.vc3-chambre');
      await expect(chambres).toHaveCount(chateau.chambres.length);

      const prix = page.locator('.vc3-chambre-prix');
      for (let i = 0; i < chateau.chambres.length; i++) {
        const prixAttendu = chateau.chambres[i].prix;
        if (prixAttendu != null) {
          await expect(prix.nth(i)).toContainText(String(prixAttendu));
        }
      }
    });

    test('Modale réservation : ouvre, liste les chambres, sélection, ferme', async ({ page }) => {
      await ouvrirVitrine(page, chateau);

      await page.locator('.vc3-header-cta').click();
      await expect(page.locator('.vc3-reserve-modal')).toBeVisible();

      const chambresModal = page.locator('.vc3-reserve-ch');
      await expect(chambresModal).toHaveCount(chateau.chambres.length);

      if (chateau.chambres.length > 1) {
        await chambresModal.nth(1).click();
        await expect(chambresModal.nth(1)).toHaveClass(/actif/);
      }

      await page.locator('.vc3-reserve-close').click();
      await expect(page.locator('.vc3-reserve-modal')).not.toBeVisible();
    });

    test('Escape ferme la vitrine', async ({ page }) => {
      await ouvrirVitrine(page, chateau);
      await page.keyboard.press('Escape');
      await expect(page.locator('.vc3-overlay')).toHaveCount(0, { timeout: 2000 });
    });

    test('Chiffres clés : val affichées = chateau.chiffresCles', async ({ page }) => {
      test.skip(
        !Array.isArray(chateau.chiffresCles) || chateau.chiffresCles.length === 0,
        'Pas de chiffresCles dans les données'
      );

      await ouvrirVitrine(page, chateau);
      await page.locator('.vc3-chiffres').scrollIntoViewIfNeeded();

      const chiffres = page.locator('.vc3-chiffre-val');
      await expect(chiffres).toHaveCount(chateau.chiffresCles.length);

      for (let i = 0; i < chateau.chiffresCles.length; i++) {
        await expect(chiffres.nth(i)).toContainText(String(chateau.chiffresCles[i].val));
      }
    });

    test('Citation propriétaire présente et non vide', async ({ page }) => {
      test.skip(
        !chateau.proprietaires || !chateau.proprietaires.citation,
        'Pas de citation propriétaire dans les données'
      );

      await ouvrirVitrine(page, chateau);
      await page.locator('.vc3-citation').scrollIntoViewIfNeeded();
      const citation = page.locator('.vc3-citation-txt');
      await expect(citation).toBeVisible();
      const txt = (await citation.textContent()) || '';
      expect(txt.trim().length, 'Citation trop courte').toBeGreaterThan(30);
    });

    test('Timeline : count = chateau.timeline.length, première année affichée', async ({ page }) => {
      test.skip(
        !Array.isArray(chateau.timeline) || chateau.timeline.length === 0,
        'Pas de timeline dans les données'
      );

      await ouvrirVitrine(page, chateau);
      await page.locator('.vc3-timeline').scrollIntoViewIfNeeded();
      await expect(page.locator('.vc3-tl-item')).toHaveCount(chateau.timeline.length);
      await expect(page.locator('.vc3-tl-yr').first()).toContainText(
        String(chateau.timeline[0].annee)
      );
    });

    test('Mode présentation : s\'ouvre et se ferme', async ({ page }) => {
      await ouvrirVitrine(page, chateau);
      const bouton = page.locator('.vc3-mode-pres-btn');
      await bouton.scrollIntoViewIfNeeded();
      await bouton.click();
      await expect(page.locator('.vc3-pres-overlay')).toBeVisible();
      await page.locator('.vc3-pres-close').click();
      await expect(page.locator('.vc3-pres-overlay')).not.toBeVisible();
    });

    test('Images de chateau.images[0..2] ne renvoient pas de 4xx', async ({ page }) => {
      test.skip(
        !Array.isArray(chateau.images) || chateau.images.length === 0,
        'Pas d\'images dans les données'
      );

      const cibles = chateau.images.slice(0, 3).map((u) => {
        try {
          return new URL(u, 'http://x').pathname;
        } catch {
          return String(u);
        }
      });

      const echecs = [];
      page.on('response', (res) => {
        if (res.status() < 400) return;
        const url = res.url();
        for (const cible of cibles) {
          if (cible && url.includes(cible)) {
            echecs.push(`${res.status()} ${url}`);
            break;
          }
        }
      });

      await ouvrirVitrine(page, chateau);
      await page.evaluate(() => {
        const corps = document.querySelector('.vc3-corps');
        if (corps) corps.scrollTo({ top: corps.scrollHeight, behavior: 'instant' });
      });
      await page.waitForTimeout(1500);

      expect(echecs, `Images en 4xx :\n${echecs.join('\n')}`).toHaveLength(0);
    });

  });
}
