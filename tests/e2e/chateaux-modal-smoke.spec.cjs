const { test, expect } = require('@playwright/test');
const { getChateaux, ouvrirChateauModal } = require('./_helpers.cjs');

/**
 * Smoke tests E2E pour les 5 châteaux non-estLaUne atteignables via
 * HeureAuxDemeures (path UI nominal vers ChateauModal).
 *
 * Couverture : id 1 (Vaux-le-Vicomte), id 2 (Pierrefonds), id 3 (Chantilly),
 *              id 5 (Ferté-Saint-Aubin), id 6 (Pierreclos).
 *
 * Hors couverture : id 4 (Fontainebleau) — orphan du path UI nominal,
 *                   référencé uniquement dans data/chateaux.js. Dette
 *                   Phase 4.x documentée dans CLAUDE.md.
 *
 * Châteaux estLaUne (id 7+8) : couverts par vitrines-tous-chateaux.spec.cjs
 * (path VitrineChateau, suite paramétrée plus complète).
 *
 * Créé Sprint 5-β v2 (Phase 1.x Chantier 1.11) le 7 mai 2026.
 */

const IDS_COUVERTS = [1, 2, 3, 5, 6];
const cibles = getChateaux().filter((c) => IDS_COUVERTS.includes(c.id));

if (cibles.length !== IDS_COUVERTS.length) {
  throw new Error(
    `chateaux-modal-smoke: attendu ${IDS_COUVERTS.length} châteaux, trouvé ${cibles.length}. ` +
    `Vérifier data/chateaux.js et la liste IDS_COUVERTS.`
  );
}

for (const chateau of cibles) {
  test.describe(`Modal · ${chateau.nom} (id ${chateau.id})`, () => {
    test("Modal s'ouvre, nom visible dans header", async ({ page }) => {
      await ouvrirChateauModal(page, chateau);
      // Le nom apparaît dans .cp-header-nom (cf audit ChateauModal.jsx)
      await expect(page.locator('.cp-header-nom')).toContainText(chateau.nom);
    });

    test('Image[0] charge sans 404', async ({ page }) => {
      const failures = [];
      page.on('response', (res) => {
        const url = res.url();
        if (res.status() >= 400 && (url.includes('/bri-') || url.includes('/bb-') || url === chateau.image)) {
          failures.push(`${res.status()} ${url}`);
        }
      });
      await ouvrirChateauModal(page, chateau);
      // Laisse 500ms pour les images chargées asynchronement
      await page.waitForTimeout(500);
      expect(failures, `Images en erreur pour "${chateau.nom}":\n${failures.join('\n')}`).toHaveLength(0);
    });

    test('Prix première chambre lisible (skip si chambres absentes)', async ({ page }) => {
      test.skip(!chateau.chambres?.length, 'Pas de chambres définies dans data/chateaux.js');
      await ouvrirChateauModal(page, chateau);
      const prix = chateau.chambres[0].prix;
      // Match texte "390 €" ou "390€" — préfixe non-chiffre (évite "1390" qui matche "390")
      const regex = new RegExp(`(?<!\\d)${prix}\\s*€`);
      await expect(page.locator('.cp-overlay.cp-visible')).toContainText(regex, {
        timeout: 3000,
      });
    });

    test('Escape ferme la modale', async ({ page }) => {
      await ouvrirChateauModal(page, chateau);
      await page.keyboard.press('Escape');
      // Le retrait peut être instantané ou progressif (animation 300ms)
      await expect(page.locator('.cp-overlay.cp-visible')).not.toBeVisible({ timeout: 1500 });
    });
  });
}
