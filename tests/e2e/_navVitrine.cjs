const { expect } = require('@playwright/test');

/**
 * Acces a la navigation de la vitrine, sans savoir sur quelle largeur on tourne.
 *
 * La vitrine expose ses trois modules et ses sept themes par DEUX sources, une
 * seule visible a la fois :
 *   - desktop  : la barre laterale `.bl` (.bl-offre[data-module], .bl-theme[data-theme])
 *   - mobile   : la feuille « Explorer le chateau » (.vcs-item[data-module|data-theme]),
 *                ouverte par le bouton « Explorer » de la barre d'action du bas
 *
 * Sous 768 px, `.bl` est en display:none — ses boutons restent DANS le DOM mais
 * ne sont jamais visibles. Un harnais qui vise `.bl-offre[...]` sans plus de
 * precaution echoue donc en mobile, ce qui s'est verifie a la mesure : 10 tests
 * mobile-safari tombes des l'extinction de la barre. C'est le meme piege que
 * `.da-medaillon` masque par le design mobile de la home.
 *
 * On vise donc LES DEUX sources, filtrees par `:visible` : une seule repond,
 * celle qui correspond a la largeur. Les attributs `data-module` / `data-theme`
 * et `aria-current` sont volontairement identiques des deux cotes.
 */

const selModule = (m) =>
  `.bl-offre[data-module="${m}"]:visible, .vcs-item[data-module="${m}"]:visible`;

const selTheme = (t) =>
  `.bl-theme[data-theme="${t}"]:visible, .vcs-item[data-theme="${t}"]:visible`;

/**
 * Rend la navigation atteignable, puis retourne la voie empruntee.
 * - desktop : rien a faire, la barre laterale est deja la ;
 * - mobile  : ouvre la feuille si besoin et selectionne son onglet.
 *
 * Idempotent, et a rappeler AVANT CHAQUE interaction : la feuille se referme
 * a chaque choix (on ouvre un theme, on ne reste pas dans le sommaire).
 *
 * @param {'themes'|'offres'} onglet  quel cote de la bascule mobile
 */
async function ouvrirNavVitrine(page, onglet = 'themes') {
  // La voie se decide sur la LARGEUR DU VIEWPORT, pas sur une sonde DOM.
  // Premiere version : `if (!await explorer.isVisible()) return 'laterale'`.
  // Or `isVisible()` est un controle INSTANTANE, sans attente : sur une page
  // encore en cours de rendu il repond `false`, et le helper prenait alors la
  // voie desktop… en mobile. Il ouvrait donc rien, et les tests cherchaient un
  // element qui n'existait pas. Le seuil, lui, ne court pas : 768 px.
  const largeur = page.viewportSize()?.width ?? 1280;
  if (largeur > 768) return 'laterale';

  const explorer = page.locator('.vc3-actions-btn', { hasText: 'Explorer' });
  if ((await page.locator('.vcs-sheet--ouvert').count()) === 0) {
    await expect(explorer).toBeVisible({ timeout: 10000 });
    await explorer.click();
    await expect(page.locator('.vcs-sheet--ouvert')).toBeVisible({ timeout: 8000 });
  }
  await page.locator(`.vcs-toggle-btn[data-onglet="${onglet}"]`).click();
  await expect(page.locator(`.vcs-item[data-${onglet === 'offres' ? 'module' : 'theme'}]`).first())
    .toBeVisible({ timeout: 5000 });
  return 'feuille';
}

module.exports = { selModule, selTheme, ouvrirNavVitrine };
