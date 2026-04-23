/**
 * Helpers communs aux specs E2E Playwright.
 *
 * Ce fichier n'est pas un spec (pas de ".spec." dans le nom) → Playwright ne
 * l'exécute pas comme un test, il est importé par les specs qui en ont besoin.
 *
 * Expose :
 *   - getChateaux()               → liste filtrée (slug non-vide, au moins une chambre)
 *   - ouvrirVitrine(page, chateau) → ouvre la vitrine riche .vc3-* depuis la home
 */
const fs = require('fs');
const path = require('path');
const { expect } = require('@playwright/test');

const CHEMIN_DATA = path.join(__dirname, '..', '..', 'src', 'data', 'chateaux.js');

let cacheChateaux = null;

function chargerDataChateaux() {
  if (cacheChateaux) return cacheChateaux;
  // src/data/chateaux.js est en ESM natif (package.json a "type":"module").
  // Les specs Playwright restent en CJS (pas de top-level await), on charge
  // donc le fichier via Function() après une transformation minimale
  // export→module.exports. Sûr ici : aucun import, aucun side-effect.
  const source = fs.readFileSync(CHEMIN_DATA, 'utf8');
  const cjs = source.replace(
    /^export\s+const\s+chateaux\s*=/m,
    'module.exports.chateaux ='
  );
  const m = { exports: {} };
  new Function('module', 'exports', cjs)(m, m.exports);
  cacheChateaux = m.exports.chateaux;
  return cacheChateaux;
}

function getChateaux() {
  return chargerDataChateaux().filter(
    (c) => c.slug && Array.isArray(c.chambres) && c.chambres.length > 0
  );
}

function regexNom(nom) {
  const echappe = String(nom).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(echappe, 'i');
}

/**
 * Ouvre la vitrine riche (.vc3-*) d'un château depuis la home.
 * Parcours : home → UneDeLaSemaine (.une-semaine-demeure) → CTA → TransitionPorte → vc3.
 * Prérequis : le château doit être rendu par UneDeLaSemaine (estLaUne:true aujourd'hui).
 */
async function ouvrirVitrine(page, chateau) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const article = page
    .locator('.une-semaine-demeure')
    .filter({ hasText: regexNom(chateau.nom) });
  await expect(
    article,
    `Carte UneDeLaSemaine introuvable pour ${chateau.nom}`
  ).toBeVisible();

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

module.exports = { getChateaux, ouvrirVitrine };
