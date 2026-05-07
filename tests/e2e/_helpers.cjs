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
const { expect } = require('@playwright/test');
const { chargerChateaux } = require('../../scripts/lib/charger-chateaux.cjs');

function getChateaux() {
  return chargerChateaux().filter(
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
  await page.waitForLoadState('domcontentloaded');

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

/**
 * Ouvre la modale standard (.cp-*) d'un château non-estLaUne depuis la home.
 * Parcours : home → HeureAuxDemeures (.journal-carte ou .journal-index-entree)
 *          → onClick → App.ouvrirChateau → TransitionPorte → ChateauModal.
 * Aiguillage App.jsx:114-116 : estLaUne ? VitrineChateau : ChateauModal.
 * Prérequis : le château doit être référencé dans HeureAuxDemeures
 *   (idsCartes [6,5,1] ou idsIndex [7,8,2,3]).
 */
async function ouvrirChateauModal(page, chateau) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Path UI nominal pour les châteaux non-estLaUne : HeureAuxDemeures
  // (cartes éditoriales .journal-carte + index grille .journal-index-entree).
  // onClick déclenche onOuvrirChateau → App.ouvrirChateau → ChateauModal
  // (aiguillage estLaUne ? VitrineChateau : ChateauModal dans App.jsx:114-116).
  const article = page.locator('.journal-carte, .journal-index-entree')
    .filter({ hasText: regexNom(chateau.nom) });

  await expect(
    article,
    `HeureAuxDemeures: aucune carte/index trouvé pour "${chateau.nom}" (id ${chateau.id})`
  ).toBeVisible();
  await article.scrollIntoViewIfNeeded();

  // Retry click x3 (pattern mobile-safari pour fiabilité)
  let clicked = false;
  for (let i = 0; i < 3 && !clicked; i++) {
    try {
      await article.click({ timeout: 2000 });
      clicked = true;
    } catch (e) {
      if (i === 2) throw e;
      await page.waitForTimeout(200);
    }
  }

  // Attendre la fin de TransitionPorte (montée pendant transitionChateau)
  await page.locator('.tp-wrap').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});

  // Confirmer que ChateauModal est monté (et pas VitrineChateau pour estLaUne)
  await expect(
    page.locator('.cp-overlay.cp-visible'),
    `ChateauModal n'est pas apparu pour "${chateau.nom}" — possible aiguillage vers VitrineChateau si estLaUne`
  ).toBeVisible({ timeout: 3000 });
}

module.exports = { getChateaux, ouvrirVitrine, ouvrirChateauModal };
