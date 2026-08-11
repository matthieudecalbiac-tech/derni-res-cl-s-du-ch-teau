/**
 * Tests E2E · Sprint S2-α.1.5 — refonte vitrine 2 niveaux d'onglets
 *
 * Couvre :
 *   1.  /chateau/les-briottieres → hero + module Permanent actif + intro + chambres
 *   2.  ?onglet=dernieresCles → module B actif, offre B affichée
 *   3.  ?onglet=dernieresCles&offre=<id lu au DOM> → highlight de l'offre ciblée
 *   4.  ?onglet=club → fallback Permanent (non-membre)
 *   5.  Module Club visible pour tous, click non-membre ouvre la modale de verrou
 *   6.  Click thème "Histoire" → ?theme=histoire + timeline visible
 *   7.  Click successif sur les 6 thèmes → chaque contenu charge
 *   8.  /chateau/vaux-le-vicomte (estLaUne:false) → redirect /
 *   9.  Régression : "/" home OK
 *   10. Régression : click château estLaUne depuis VitrinePermanente → VitrineChateau (Dette 2)
 *   12. Switch de module préserve hero + navigation thèmes
 *   13. DernieresCles overlay → /chateau/:slug?onglet=dernieresCles, module actif
 *
 * ── SÉLECTEURS RÉÉCRITS (retrait des onglets N1/N2 du flux) ──────────────────
 * La bande de cartes Niveau 1 et la barre d'onglets Niveau 2 ont quitté la page :
 * la BARRE LATÉRALE est le seul point d'accès. Les tests visent donc désormais
 *   .vc4-offre-card[data-onglet="X"]  →  .bl-offre[data-module="X"]
 *   .vc4-offre-card--actif            →  .bl-offre--actif
 *   .vc4-onglet-n2[data-theme="X"]    →  .bl-theme[data-theme="X"]
 *   .vc4-onglets-n2-wrap              →  .bl-themes
 * Ce qu'ils VÉRIFIENT est inchangé — seul le chemin d'accès a bougé. Aucune
 * assertion n'a été relâchée, aucun test neutralisé pour faire passer la suite.
 * Le Test 11 (sticky de la bande N1) est SUPPRIMÉ : son sujet n'existe plus.
 *
 * URL params en camelCase (alignés sur chateau.modules.dernieresCles).
 */
const { test, expect } = require('@playwright/test');

test.describe('S2-α.1.5 · vitrine onglets 2 niveaux', () => {

  test('Test 1 · /chateau/les-briottieres : hero + Permanent défaut + intro + chambres', async ({ page }) => {
    await page.goto('/chateau/les-briottieres');
    await page.waitForLoadState('domcontentloaded');

    // Hero présent (inchangé)
    await expect(page.locator('.vc3-hero2').first()).toBeVisible({ timeout: 8000 });

    // Onglet Permanent actif par défaut
    const ongletPermanent = page.locator('.bl-offre[data-module="permanent"]');
    await expect(ongletPermanent).toBeVisible();
    await expect(ongletPermanent).toHaveClass(/bl-offre--actif/);

    // Le contenu du module est DANS LE DOM (bloc SEO crawlable) mais invisible
    // avant clic. On verifie donc la PRESENCE ici, et la visibilite apres
    // ouverture de la modale — deux assertions la ou il y en avait une.
    await expect(page.locator('.vc4-permanent-intro')).toBeAttached();
    const chambres = page.locator('.vc4-permanent-chambre');
    await expect(chambres.first()).toBeAttached();
    expect(await chambres.count()).toBeGreaterThanOrEqual(2);
    await expect(page.locator('.vc4-permanent-intro')).not.toBeVisible();

    // Ouverture de la modale Permanent : le meme contenu devient visible.
    await ongletPermanent.click();
    const modale = page.locator('.mdl-panneau');
    await expect(modale).toBeVisible({ timeout: 5000 });
    await expect(modale.locator('.vc4-permanent-intro')).toBeVisible();
    expect(await modale.locator('.vc4-permanent-chambre').count()).toBeGreaterThanOrEqual(2);
  });

  test('Test 2 · ?onglet=dernieresCles : offre B affichée', async ({ page }) => {
    await page.goto('/chateau/les-briottieres?onglet=dernieresCles');
    await page.waitForLoadState('domcontentloaded');

    const ongletDC = page.locator('.bl-offre[data-module="dernieresCles"]');
    await expect(ongletDC).toBeVisible({ timeout: 8000 });
    await expect(ongletDC).toHaveClass(/bl-offre--actif/);

    // Au moins 1 offre listée (les services ne sont plus en base : la colonne
    // conditions est du texte libre, mapper renvoie servicesInclus: [], assume).
    const cards = page.locator('.vc4-dc-card');
    await expect(cards.first()).toBeVisible({ timeout: 8000 });
  });

  test('Test 3 · ?onglet=dernieresCles&offre=<id> : highlight', async ({ page }) => {
    // On lit l'id de la premiere offre reelle dans le DOM, plutot que de le coder
    // en dur : le test valide le mecanisme de highlight, pas une donnee de la base.
    await page.goto('/chateau/les-briottieres?onglet=dernieresCles');
    const premiere = page.locator('.vc4-dc-card').first();
    await expect(premiere).toBeVisible({ timeout: 8000 });

    const testId = await premiere.getAttribute('data-testid');
    expect(testId).toBeTruthy();
    const offreId = testId.replace('offre-card-', '');

    // Rechargement avec le parametre offre : la carte ciblee recoit la classe
    // --highlight (appliquee 3s par ContenuDernieresCles apres scrollIntoView).
    await page.goto(`/chateau/les-briottieres?onglet=dernieresCles&offre=${offreId}`);
    const ciblee = page.getByTestId(`offre-card-${offreId}`);
    await expect(ciblee).toBeVisible({ timeout: 8000 });
    await expect(ciblee).toHaveClass(/vc4-dc-card--highlight/, { timeout: 2000 });
  });

  test('Test 4 · ?onglet=club → fallback Permanent (non-membre)', async ({ page }) => {
    await page.goto('/chateau/les-briottieres?onglet=club');
    await page.waitForLoadState('domcontentloaded');

    // Le contenu permanent est rendu (fallback)
    await expect(page.locator('[data-onglet-contenu="permanent"]')).toBeVisible({ timeout: 8000 });
    // Pas de contenu club
    await expect(page.locator('[data-onglet-contenu="club"]')).toHaveCount(0);
  });

  test('Test 5 · Onglet Club visible pour tous, click non-membre ouvre modale stub auth', async ({ page }) => {
    // Sprint S2-α.1.5-FIX : décision UX du 14 mai — l'onglet Club est désormais
    // toujours visible (effet de découverte). La restriction membre s'applique
    // au click via modale stub (TODO α.2 : brancher Supabase auth).
    await page.goto('/chateau/les-briottieres');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('.bl-offre[data-module="permanent"]').waitFor({ timeout: 8000 });

    // L'onglet Club EST visible (modules.club=true via _mapping.js fallback)
    const ongletClub = page.locator('.bl-offre[data-module="club"]');
    await expect(ongletClub).toBeVisible({ timeout: 5000 });

    // Click sur Club non-membre → le verrou s'ouvre. Il passe desormais par
    // Modale.jsx (.mdl-panneau) comme les modules et les themes, au lieu de son
    // ancien overlay maison .vc3-reserve-modal.
    await ongletClub.click();
    const modaleAuth = page.locator('.mdl-panneau').filter({ hasText: /Club Châtelain/i });
    await expect(modaleAuth).toBeVisible({ timeout: 5000 });
    await expect(modaleAuth).toContainText(/Connectez-vous/i);

    // ContenuClub PAS rendu du tout — ni en modale, ni dans le bloc SEO : le
    // Module C reste invisible aux non-membres, le SEO ne doit pas devenir la
    // porte derobee qui publierait un contenu reserve.
    await expect(page.locator('[data-onglet-contenu="club"]')).toHaveCount(0);
    // Le clic sur Club n'a PAS ouvert de modale de module : Permanent reste
    // dans le bloc crawlable, invisible.
    await expect(page.locator('[data-onglet-contenu="permanent"]')).toBeAttached();
    await expect(page.locator('[data-onglet-contenu="permanent"]')).not.toBeVisible();

    // Fermer le verrou via son bouton Fermer
    await modaleAuth.locator('button').filter({ hasText: /^Fermer$/ }).click();
    await expect(modaleAuth).toHaveCount(0, { timeout: 3000 });

    // L'onglet Permanent reste actif après fermeture
    await expect(page.locator('.bl-offre[data-module="permanent"]')).toHaveClass(/bl-offre--actif/);
  });

  test('Test 6 · Click onglet Histoire (niveau 2) → ?theme=histoire + timeline', async ({ page }) => {
    await page.goto('/chateau/les-briottieres');
    await page.waitForLoadState('domcontentloaded');

    const ongletHistoire = page.locator('.bl-theme[data-theme="histoire"]');
    await ongletHistoire.scrollIntoViewIfNeeded();
    await ongletHistoire.click();

    await expect(page).toHaveURL(/[?&]theme=histoire/, { timeout: 5000 });

    // Le contenu n'est plus inséré sous le journal : il s'ouvre en MODALE.
    // L'assertion est RENFORCÉE, pas relâchée — on exige désormais que le
    // contenu soit visible ET contenu dans le panneau de la modale.
    const modale = page.locator('.mdl-panneau');
    await expect(modale).toBeVisible({ timeout: 5000 });
    await expect(modale.locator('[data-theme-contenu="histoire"]')).toBeVisible();
    await expect(modale.locator('.vc4-theme-timeline')).toBeVisible();
  });

  test('Test 7 · Cycle sur les 6 thèmes niveau 2', async ({ page }) => {
    await page.goto('/chateau/les-briottieres');
    await page.waitForLoadState('domcontentloaded');

    const themes = ['apercu', 'histoire', 'famille', 'lieu', 'services', 'chambres'];
    const modale = page.locator('.mdl-panneau');

    for (const t of themes) {
      const onglet = page.locator(`.bl-theme[data-theme="${t}"]`);
      await onglet.scrollIntoViewIfNeeded();
      await onglet.click();
      await expect(modale.locator(`[data-theme-contenu="${t}"]`)).toBeVisible({ timeout: 3000 });

      // On REFERME avant le thème suivant. Ce n'est pas une commodité de test :
      // la modale couvre la page, son overlay intercepte le clic sur la barre.
      // Un visiteur fait exactement ce geste — il ferme, puis rouvre ailleurs.
      await page.keyboard.press('Escape');
      await expect(modale).toHaveCount(0, { timeout: 3000 });
    }
  });

  test('Test 8 · /chateau/vaux-le-vicomte (estLaUne:false) → redirect /', async ({ page }) => {
    await page.goto('/chateau/vaux-le-vicomte');
    await page.waitForLoadState('domcontentloaded');

    // L'URL doit être / (redirect Navigate replace)
    await expect(page).toHaveURL(/\/$/, { timeout: 5000 });
    // La home doit afficher la section "Une de la semaine"
    await expect(page.locator('.une-semaine-carte').first()).toBeVisible({ timeout: 5000 });
  });

  test('Test 9 · Régression home /', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.s2-placeholder')).toHaveCount(0);
    await expect(page.locator('.une-semaine-carte').first()).toBeVisible();
  });

  // Ce test tourne désormais sur LES TROIS navigateurs, mobile-safari compris.
  // Il en était exclu depuis la PR #23 par un test.skip dont le motif était :
  // « header z-index intercepte le pointer event sur .hm-item, le handler React
  // onClick ne se déclenche pas même avec force:true — bug pré-existant, à
  // corriger Sprint S5 ». Le diagnostic accusait le z-index ; la cause réelle
  // était ailleurs, et le chantier Sommaire mobile l'a corrigée. Les pistes de
  // la grille .hm-item étaient inversées — le texte héritait d'une piste FIXE
  // de 20 à 24 px pendant que le filet décoratif de 1 px prenait la piste
  // flexible — et la grille externe ne s'effondrait jamais sous 768 px. Les
  // entrées débordaient donc d'un conteneur non défilable : Playwright ne
  // pouvait pas cliquer ce qu'aucun doigt n'aurait pu atteindre non plus.
  test('Test 10 · Dette 2 : VitrinePermanente → VitrineChateau si estLaUne', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Ouvrir le burger menu (le bouton "Vitrines permanentes" y est rangé)
    await page.getByRole('button', { name: /Ouvrir le menu/i }).click();

    // Cliquer sur l'item "Vitrines permanentes" du sous-menu
    const itemVitrines = page.locator('button.hm-item').filter({ hasText: /Vitrines permanentes/i });
    await expect(itemVitrines).toBeVisible({ timeout: 5000 });
    await itemVitrines.click();

    // DEUX attentes distinctes, et c'est volontaire.
    //
    // 1. La donnée arrive. VitrinePermanente monte son chrome immédiatement
    //    (titre, fil d'Ariane, carte de France) puis rend une grille VIDE tant
    //    que le fetch Supabase n'a pas répondu — `useChateaux` expose bien
    //    { loading, error }, mais VitrinePermanente.jsx:27 les déstructure sans
    //    jamais les rendre : ni skeleton, ni aria-busy, ni état vide. Il n'existe
    //    donc aucun marqueur d'état plus fin que « la grille est peuplée ».
    //    Budget généreux : la mesure sur 12 tirages donne 1,3 à 8,1 s pour ce
    //    parcours, dont 0,8 à 3,0 s pour l'aller-retour Supabase seul. Ce n'est
    //    pas une lenteur qu'on accepte, c'est la variance d'un test qui traverse
    //    le réseau — et le lot ne cesse de croître (5 → 7 châteaux au 2 août,
    //    +17 chambres, +22 lignes de chronologie, chacune tirée par SELECT_FULL).
    //    ⚠ À remplacer par une vraie attente d'état le jour où VitrinePermanente
    //      exposera son `loading` (aria-busy, data-attribut ou skeleton).
    await expect(page.locator('.vit-carte').first()).toBeVisible({ timeout: 20000 });

    // 2. Briottières est bien servie. Ici le réseau a déjà répondu : un échec
    //    signale une vraie régression métier, pas un aléa, et il tombe vite.
    const carteBri = page.locator('.vit-carte').filter({ hasText: /Briotti[èe]res/i }).first();
    await expect(carteBri).toBeVisible({ timeout: 5000 });
    await carteBri.click();

    // Attendre l'overlay vc3 (depuis la pièce 2, toute demeure servie ouvre la vitrine)
    await expect(page.locator('.vc3-overlay')).toBeVisible({ timeout: 8000 });
  });

  // Test 11 SUPPRIMÉ — il vérifiait que la bande d'onglets Niveau 1 restait
  // collante au défilement. Cette bande a quitté le flux : la barre latérale est
  // désormais le seul point d'accès, et c'est ELLE qui est collante. Le test
  // était de toute façon neutralisé par un test.skip(true, …) depuis la dette
  // Phase 6.x (le wrapper ongletsN1Ref, trop court pour position:sticky). Il
  // n'avait donc plus de sujet, et son sujet n'existe plus.

  test('Test 12 · Switch de module préserve hero + navigation thèmes (R3)', async ({ page }) => {
    // Sprint S2-α.1.5-FIX : régression R3 (architecture "vues séparées" perçue)
    // — l'architecture en code est correcte : Hero + N2 sont toujours rendus,
    // indépendamment du module actif. Seule la section module change.
    // (IntroTroncCommun retiré du flux en 7d8967a.)
    await page.goto('/chateau/les-briottieres');
    await page.waitForLoadState('domcontentloaded');

    const modale = page.locator('.mdl-panneau');

    // AU CHARGEMENT : le contenu du module est DANS LE DOM — bloc SEO crawlable,
    // decision Matthieu — mais PAS visible. Rien ne s'insere plus sous le
    // journal. L'assertion est donc DEDOUBLEE, pas relachee : on exige a la fois
    // la presence (SEO) et l'invisibilite (mise en page).
    const permanent = page.locator('[data-onglet-contenu="permanent"]');
    await expect(permanent).toBeAttached({ timeout: 8000 });
    await expect(permanent).not.toBeVisible();
    await expect(modale).toHaveCount(0);

    // Hero + navigation des themes attaches au DOM
    await expect(page.locator('.vc3-hero2')).toBeAttached();
    await expect(page.locator('.bl-themes')).toBeAttached();

    // Switch vers Dernieres Cles : la modale REVELE ce module.
    await page.locator('.bl-offre[data-module="dernieresCles"]').click();
    await expect(modale).toBeVisible({ timeout: 8000 });
    await expect(modale.locator('[data-onglet-contenu="dernieresCles"]')).toBeVisible({ timeout: 8000 });

    // Hero + themes TOUJOURS attaches (jamais unmounted)
    await expect(page.locator('.vc3-hero2')).toBeAttached();
    await expect(page.locator('.bl-themes')).toBeAttached();

    // Seul le module ACTIF est dans la modale : Permanent n'y figure pas. Il
    // reste dans le bloc SEO — d'ou l'assertion portee sur la modale et non sur
    // la page, sinon elle nierait le SEO qu'on vient d'exiger.
    await expect(modale.locator('[data-onglet-contenu="permanent"]')).toHaveCount(0);
  });

  test('Test 13 · FIX D : DernieresCles overlay → click château → /chateau/:slug?onglet=dernieresCles', async ({ page }) => {
    // Sprint S2-α.1.5 FIX D : depuis l'overlay DernieresCles (qui liste les
    // châteaux avec offres Module B), un click sur une carte doit ouvrir la
    // vitrine routée /chateau/:slug?onglet=dernieresCles (et pas l'overlay
    // legacy VitrineDernieresCle qui devient orphelin, dette S5).
    //
    // Tourne désormais sur les trois navigateurs. Son skip mobile-safari
    // renvoyait à celui du Test 10 (« dette responsive header z-index, cf
    // Test 10 ») : même passage par button.hm-item, même cause réelle, levée
    // par le même chantier. Cf. le commentaire du Test 10 pour le détail.
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Ouvrir le burger menu et naviguer vers Dernières Clés
    await page.getByRole('button', { name: /Ouvrir le menu/i }).click();
    const itemDC = page.locator('button.hm-item').filter({ hasText: /Dernières Clés/i });
    await expect(itemDC).toBeVisible({ timeout: 5000 });
    await itemDC.click();

    // Cliquer sur la première carte château de l'overlay (DernieresCles → .dk-carte-offre)
    const carteChat = page.locator('.dk-carte-offre').first();
    await expect(carteChat).toBeVisible({ timeout: 8000 });
    await carteChat.click();

    // URL doit devenir /chateau/{slug}?onglet=dernieresCles
    await expect(page).toHaveURL(/\/chateau\/[^?]+\?onglet=dernieresCles/, { timeout: 5000 });

    // Onglet Dernières Clés actif à l'arrivée
    const ongletDC = page.locator('.bl-offre[data-module="dernieresCles"]');
    await expect(ongletDC).toBeVisible({ timeout: 8000 });
    await expect(ongletDC).toHaveClass(/bl-offre--actif/);
  });

});
