const { test, expect } = require('@playwright/test');

/**
 * Tests E2E · Les offres ont TROIS etats, pas deux — PR2a robustesse.
 *
 * ── LE DEFAUT ────────────────────────────────────────────────────────────────
 *
 * `getOffresPourChateau` JETTE en cas d'echec (`offresService.js:59`), et les
 * quatre `.then` qui la consomment n'avaient AUCUN `.catch`. Le composant part
 * de `offres === null` et rien ne l'en sort : mesure du 20 aout, table `offres`
 * coupee et catalogue intact, sur /chateau/les-briottieres —
 *
 *     offres servies   « Les Dernieres Cles ⚜ … Chambre Verte  DU 9 MAI … »
 *     offres coupees   « Chargement des offres… »   ← et plus jamais autre chose
 *
 * Un spinner DEFINITIF. Dans la barre laterale, c'etait plus sournois encore :
 * la ligne « DES 237,80 € » DISPARAISSAIT, rendant la panne indiscernable de
 * « aucune offre » — le mensonge que PR1 a ferme ailleurs.
 *
 * ── CE QUE CE FILET PROTEGE ──────────────────────────────────────────────────
 *
 * TROIS etats distincts, et le fait qu'ils le RESTENT :
 *
 *     chargement    la requete est en vol         « Chargement des offres… »
 *     vide          elle a REUSSI, 0 offre        « Aucune offre disponible… »
 *     erreur        elle a ECHOUE                 « …n'ont pas pu etre chargees »
 *
 * Les confondre deux a deux serait la meme faute sous deux formes : afficher un
 * chargement qui ne finit pas, ou annoncer une absence qu'on n'a pas constatee.
 *
 * ⚠ ET LA VITRINE SURVIT. Le contrat est une degradation LOCALE : seule la
 * section des offres change d'etat, la demeure garde son hero, son histoire et
 * ses chambres. Un test l'assert explicitement.
 *
 * ── LES DEMEURES CHOISIES, ET POURQUOI ───────────────────────────────────────
 *
 * Mesure du 20 aout, pas lecture d'une note : `les-briottieres` porte une offre
 * Module B visible, `blanc-buisson` n'en porte aucune. Le second sert donc le
 * VIDE LEGITIME sur de la vraie donnee, sans le simuler.
 * ⚠ Si une offre etait saisie pour Le Blanc Buisson, le test du vide legitime
 * rougirait — ce serait alors le FILET qui aurait tort, pas le site : changer de
 * demeure temoin, pas de comportement.
 */

const API_OFFRES = '**/rest/v1/offres*';

const AVEC_OFFRE = '/chateau/les-briottieres';
const SANS_OFFRE = '/chateau/blanc-buisson';

const SECTION = "[data-onglet-contenu='dernieresCles']";
const SPINNER = '.vc4-loading';
const VIDE = '.vc4-dc-vide';
const ERREUR = '.vc4-dc-erreur';

// ⚠ DEUX CHEMINS VERS LES MEMES OFFRES, ET C'EST LE SITE QUI A RAISON.
//
// Mon filet n'empruntait que celui du desktop : `.bl button`. Sur mobile-safari
// il a rougi CINQ FOIS SUR CINQ — le motif meme d'un test qui se trompe, pas
// d'un site qui casse. Mesure : `.bl` existe dans le DOM mais `vitrine-chateau.css:324`
// la met en `display: none` sous 768 px, et Playwright le disait mot pour mot
// (« locator resolved to <button class="bl-offre">… unexpected value "hidden" »).
//
//   desktop   la barre laterale, toujours a l'ecran
//   mobile    la feuille « Explorer le chateau » : EXPLORER -> onglet Offres -> le module
//
// C'est la meme dualite que decrit `offresResume.js` en tete de fichier — « la
// barre laterale (desktop) et la feuille (mobile) affichent le meme resume ».
// Le filet doit donc connaitre les deux, sinon il ne teste qu'un demi-site.
//
// La bascule se lit sur le VIEWPORT, pas sur la visibilite : un `isVisible()`
// pose trop tot repondrait « non » sur desktop aussi, avant le premier rendu.
const SEUIL_MOBILE = 768;

async function ouvrirModuleDernieresCles(page, chemin) {
  await page.goto(chemin);
  await expect(page.locator('.vc3-overlay')).toBeVisible({ timeout: 20000 });

  const largeur = page.viewportSize()?.width ?? 1280;
  if (largeur >= SEUIL_MOBILE) {
    const bouton = page.locator('.bl button').filter({ hasText: /Derni[eè]res Cl[eé]s/i }).first();
    await expect(bouton).toBeVisible({ timeout: 20000 });
    await bouton.click();
  } else {
    await page.locator('.vc3-actions-btn').filter({ hasText: /EXPLORER/i }).first().click();
    await page.locator("[data-onglet='offres']").first().click();
    const item = page.locator('.vcs-item').filter({ hasText: /Derni[eè]res Cl[eé]s/i }).first();
    await expect(item).toBeVisible({ timeout: 20000 });
    await item.click();
  }
  await expect(page.locator(SECTION)).toBeVisible({ timeout: 20000 });
}

// La ligne de resume du module « Dernieres Cles », des deux cotes de la bascule.
function ligneResume(page) {
  const largeur = page.viewportSize()?.width ?? 1280;
  return largeur >= SEUIL_MOBILE
    ? page.locator('.bl button').filter({ hasText: /Derni[eè]res Cl[eé]s/i }).first()
    : page.locator('.vcs-item').filter({ hasText: /Derni[eè]res Cl[eé]s/i }).first();
}

// ⚠ FICHIER ENTIER EN SOMMEIL — le corps est CONSERVE, pas supprime.
//   REACTIVER quand les Dernieres Cles redeviennent publiques : elles sont
//   desormais une offre RESERVEE AUX CONNECTES, a l'interieur du Club, et
//   les chemins publics qu'elles empruntaient ont ete retires du code.
//   ⚠ Le module B n'est donc plus garde par AUCUN test E2E. C'est le prix
//   assume de ce chantier — a savoir avant d'y retoucher.
test.describe.skip('Les offres — trois etats, et pas un de moins', () => {

  test('ETAT 1 · chargement — le spinner s\'affiche pendant que la requete est en vol', async ({ page }) => {
    // On RETIENT la requete au lieu de la couper : c'est le seul moyen d'observer
    // l'etat intermediaire autrement qu'en le devinant.
    await page.route(API_OFFRES, async (route) => {
      await new Promise((r) => setTimeout(r, 5000));
      await route.continue();
    });

    await ouvrirModuleDernieresCles(page, AVEC_OFFRE);

    await expect(page.locator(SECTION).locator(SPINNER)).toBeVisible({ timeout: 10000 });
    // Pendant l'attente, ni vide ni erreur : on ne conclut rien avant la reponse.
    await expect(page.locator(SECTION).locator(VIDE)).toHaveCount(0);
    await expect(page.locator(SECTION).locator(ERREUR)).toHaveCount(0);
  });

  test('ETAT 2 · vide legitime — « Aucune offre », et SURTOUT PAS un message d\'erreur', async ({ page }) => {
    // ⚠ LE GARDE-FOU. Reseau intact, demeure sans offre : « aucune offre » est la
    // reponse JUSTE. Si quelqu'un cablait un jour l'erreur sur `length === 0`,
    // c'est ce test qui rougirait, et aucun autre.
    await ouvrirModuleDernieresCles(page, SANS_OFFRE);

    await expect(page.locator(SECTION).locator(VIDE)).toBeVisible({ timeout: 20000 });
    await expect(page.locator(SECTION).locator(ERREUR)).toHaveCount(0);
    await expect(page.locator(SECTION).locator(SPINNER)).toHaveCount(0);
  });

  test('ETAT 3 · erreur — un message, et NI le spinner NI « aucune offre »', async ({ page }) => {
    await page.route(API_OFFRES, (route) => route.abort('failed'));

    await ouvrirModuleDernieresCles(page, AVEC_OFFRE);

    await expect(page.locator(SECTION).locator(ERREUR)).toBeVisible({ timeout: 25000 });
    // Le spinner ne doit plus tourner : c'etait le defaut, un chargement sans fin.
    await expect(page.locator(SECTION).locator(SPINNER)).toHaveCount(0);
    // Et le texte du vide legitime ne doit pas servir d'alibi a la panne.
    await expect(page.locator(SECTION).locator(VIDE)).toHaveCount(0);
  });

  test('DEGRADATION LOCALE — la demeure survit entiere a la panne de ses offres', async ({ page }) => {
    // ⚠ LE CONTRAT DE CETTE PR. Seule la section des offres change d'etat. Si
    // quelqu'un remontait un jour l'erreur a la vitrine, ce test rougirait.
    await page.route(API_OFFRES, (route) => route.abort('failed'));

    const exceptions = [];
    page.on('pageerror', (e) => exceptions.push(e.message));

    await ouvrirModuleDernieresCles(page, AVEC_OFFRE);
    await expect(page.locator(SECTION).locator(ERREUR)).toBeVisible({ timeout: 25000 });

    // La vitrine est toujours la, et l'URL n'a pas bouge.
    // ⚠ MEME PIEGE QU'AU-DESSUS, DEUX LIGNES PLUS BAS : j'assertais `.bl`, que
    // le mobile masque. On verifie donc ce qui existe DES DEUX COTES — l'overlay
    // et le bouton de retour — plutot que le meuble d'un seul format.
    await expect(page.locator('.vc3-overlay')).toBeVisible();
    await expect(page.locator('.vc3-retour')).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(AVEC_OFFRE);
    expect(exceptions).toEqual([]);
  });

  test('LE RESUME LATERAL NE SE TAIT PLUS — la ligne dit la panne au lieu de disparaitre', async ({ page }) => {
    // ⚠ LE PLUS SOURNOIS DES QUATRE SITES. Mesure du 20 aout, barre laterale :
    //     offres servies   « Dernieres Cles … DES 237,80 € »
    //     offres coupees   « Dernieres Cles … »            ← la ligne s'evapore
    // Une panne rendue identique a « aucune offre ». `detailModule` rendait
    // `null`, et `null` ne se distingue de rien.
    await page.route(API_OFFRES, (route) => route.abort('failed'));

    await page.goto(AVEC_OFFRE);
    await expect(page.locator('.vc3-overlay')).toBeVisible({ timeout: 20000 });

    // En mobile, le resume vit dans la feuille : il faut l'ouvrir pour le lire.
    if ((page.viewportSize()?.width ?? 1280) < SEUIL_MOBILE) {
      await page.locator('.vc3-actions-btn').filter({ hasText: /EXPLORER/i }).first().click();
      await page.locator("[data-onglet='offres']").first().click();
    }

    const ligne = ligneResume(page);
    await expect(ligne).toBeVisible({ timeout: 20000 });
    // ⚠ VINGT-CINQ SECONDES, ET C'EST MESURE : supabase-js REESSAIE l'appel
    // avorte — 24 requetes tentees, message affiche a 7,5 s (chromium 7570 ms,
    // webkit 7710 ms, mesure du 20 aout). Le repli est juste, il se fait
    // attendre. C'est un fil distinct, pas un defaut de cette PR — mais un
    // timeout court ferait rougir un comportement correct.
    await expect(ligne).toContainText(/indisponible/i, { timeout: 25000 });
  });
});
