const { test, expect } = require('@playwright/test');

/**
 * Tests E2E · Dernieres Cles — filet de securite AVANT la refonte Prop 3.
 *
 * POURQUOI CE FICHIER EXISTE. L'overlay Dernieres Cles n'avait AUCUNE
 * couverture E2E : le grep `dk-overlay` sur tests/ ne retournait rien. Le seul
 * fichier qui mentionnait `dernieresCles` testait l'onglet Module B DANS la
 * vitrine chateau — un autre ecran. Le module commercial partait donc en
 * refonte sans filet. Ce spec est ce filet : il doit passer sur l'existant
 * AVANT la premiere modification, et rester vert a chaque etape.
 *
 * CE QU'IL GARDE, ET CE QU'IL NE GARDE PAS. Il verifie que l'ecran S'OUVRE,
 * que le calendrier REND sa grille, qu'une PLAGE se selectionne et que le
 * compteur de domaines REPOND. Il ne verifie aucune valeur precise : ni un
 * nombre de chateaux, ni un prix, ni une date. La refonte Prop 3 va deplacer
 * le recap, changer les tailles, retirer le prix barre — un filet qui fige ces
 * details rougirait a chaque etape sans rien proteger. Ce qu'on protege ici,
 * c'est le PARCOURS.
 *
 * ── LA PORTE D'ENTREE ────────────────────────────────────────────────────────
 * Trois portes existent vers cet overlay (App.jsx) : le bandeau d'offres de la
 * home, le menu du Header, et HeureAuxDemeures. Une seule est utilisable aux
 * deux tailles :
 *
 *   BandeauOffres     `display: none` sous 768 (bandeau-offres.css:128)
 *   HeureAuxDemeures  ses medaillons sont masques sous 768 (precedent connu)
 *   Header burger     AUCUN display:none — visible a toutes les largeurs
 *
 * On passe donc par le menu du Header, et par son attribut STABLE
 * `data-id="dernieres"` plutot que par le libelle : un titre editorial se
 * reecrit (« Les Dernieres Cles » a deja bouge), un data-id non.
 *
 * C'est le meme piege que `.da-medaillon` et que `.bl-offre` : viser une source
 * masquee sous le seuil fait tomber mobile-safari de facon deterministe.
 */

// Ouvre l'overlay par le menu du Header — seule porte visible aux deux tailles.
async function ouvrirDernieresCles(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  const burger = page.locator('.header-burger');
  await expect(burger).toBeVisible({ timeout: 10000 });
  await burger.click();

  await expect(page.locator('.hm-overlay--ouvert')).toBeVisible({ timeout: 8000 });

  const item = page.locator('.hm-item[data-id="dernieres"]');
  await expect(item).toBeVisible({ timeout: 8000 });
  await item.click();

  await expect(page.locator('.dk-overlay')).toBeVisible({ timeout: 10000 });
  // Le menu se referme 550 ms APRES l'ouverture de la destination (Header.jsx
  // handleAction) : il sert de backdrop pendant le cross-fade. On attend qu'il
  // soit parti, sinon il intercepte les clics du calendrier.
  await expect(page.locator('.hm-overlay--ouvert')).toHaveCount(0, { timeout: 8000 });
}

// Attend la fin du chargement des donnees. `.dk-liste-header` est rendu meme
// pendant le chargement (il est hors du ternaire), donc son compteur vaut "0"
// tant que les slugs d'offres ne sont pas revenus de Supabase. Sans cette
// attente, un test du compteur lirait un zero transitoire.
async function attendreDonnees(page) {
  await expect(page.locator('.sk-chateau-card').first()).toHaveCount(0, { timeout: 15000 });
}

// Rend selectionnables au moins deux cases, et attend d'abord qu'il y en ait.
//
// ⚠ CETTE ATTENTE EST INDISPENSABLE DEPUIS L'ETAPE 3. Le calendrier n'ouvre
// plus J+1..J+30 en dur : il attend le Set de `datesAvecOffre`, une SECONDE
// source asynchrone. Tant qu'elle n'est pas arrivee, le predicat repond faux et
// AUCUNE case n'est ouverte — l'ecran est complet, mais le calendrier est
// entierement grise.
//
// `attendreDonnees` ne couvre pas ce cas : elle guette les squelettes, qui
// dependent de `slugsAvecOffre`, pas de `datesOuvertes`. Les deux requetes
// partent ensemble mais n'arrivent pas ensemble. En isole, le test passait ;
// dans la suite complete, chromium-desktop a echoue sur `count() === 0` puis
// avance de trois mois dans le vide. Symptome classique d'un `count()` — qui
// ne PATIENTE pas — la ou il faut un `expect`, qui reessaie.
//
// La fenetre etant bornee, en fin de periode le mois courant peut n'offrir
// qu'une poignee de cases : on avance d'un mois tant qu'il n'y a pas de quoi
// tracer une plage.
async function casesDisponibles(page, minimum = 2) {
  const cases = page.locator('.dk-cal-case-dispo:not([disabled])');
  await expect(cases.first()).toBeVisible({ timeout: 15000 });
  for (let essai = 0; essai < 3; essai++) {
    if ((await cases.count()) >= minimum) return cases;
    await page.locator('.dk-cal-nav-btn').last().click();
    await expect(cases.first()).toBeVisible({ timeout: 8000 });
  }
  return cases;
}

// ⚠ FICHIER ENTIER EN SOMMEIL — le corps est CONSERVE, pas supprime.
//   REACTIVER quand les Dernieres Cles redeviennent publiques : elles sont
//   desormais une offre RESERVEE AUX CONNECTES, a l'interieur du Club, et
//   les chemins publics qu'elles empruntaient ont ete retires du code.
//   ⚠ Le module B n'est donc plus garde par AUCUN test E2E. C'est le prix
//   assume de ce chantier — a savoir avant d'y retoucher.
test.describe.skip('Dernieres Cles · filet avant refonte Prop 3', () => {
  test.beforeEach(async ({ page }) => {
    await ouvrirDernieresCles(page);
  });

  test("L'overlay s'ouvre et rend ses quatre sections", async ({ page }) => {
    await expect(page.locator('.dk-overlay')).toBeVisible();
    await expect(page.locator('.dk-section-hero')).toBeVisible();
    await expect(page.locator('.dk-section-dates')).toBeVisible();
    await expect(page.locator('.dk-section-filtres')).toBeVisible();
    await expect(page.locator('.dk-section-grille')).toBeVisible();
  });

  test('Le calendrier rend sa grille de sept colonnes', async ({ page }) => {
    await expect(page.locator('.dk-cal-grille')).toBeVisible();
    // Sept en-tetes de jour, invariant de toute grille hebdomadaire. C'est la
    // seule constante numerique du fichier, et elle ne depend d'aucune donnee.
    await expect(page.locator('.dk-cal-jour-entete')).toHaveCount(7);
    // Une grille mensuelle complete fait 28 a 42 cases selon le mois.
    const cases = page.locator('.dk-cal-case');
    expect(await cases.count()).toBeGreaterThanOrEqual(28);
    await expect(page.locator('.dk-cal-nav-label')).not.toBeEmpty();
  });

  test('Le compteur de domaines repond', async ({ page }) => {
    await attendreDonnees(page);
    const nb = page.locator('.dk-liste-nb');
    await expect(nb).toBeVisible();
    // On lit un ENTIER, sans exiger sa valeur : le catalogue bouge.
    const txt = (await nb.textContent()).trim();
    expect(txt).toMatch(/^\d+$/);
    // Et il correspond au nombre de cartes reellement rendues.
    await expect(page.locator('.dk-carte-offre')).toHaveCount(Number(txt));
  });

  test('Une plage de dates se selectionne, arrivee puis depart', async ({ page }) => {
    await attendreDonnees(page);
    const cases = await casesDisponibles(page, 2);
    expect(await cases.count()).toBeGreaterThanOrEqual(2);

    // 1er clic : l'arrivee se pose et l'etape bascule sur le depart.
    await cases.first().click();
    await expect(page.locator('.dk-cal-arrivee')).toHaveCount(1);

    // 2e clic sur une case POSTERIEURE : le depart se pose. `handleSelectDate`
    // ne l'accepte que si d > dateArrivee ; sinon il redemarre une arrivee.
    // On vise la derniere case disponible du mois affiche pour etre certain de
    // l'ordre sans lire aucune date.
    await cases.last().click();
    await expect(page.locator('.dk-cal-depart')).toHaveCount(1);

    // Le recap porte les deux dates, et la ligne de resultats les rappelle.
    const vals = page.locator('.dk-dates-etape-val');
    await expect(vals.first()).not.toHaveText('Choisir');
    await expect(vals.last()).not.toHaveText('Choisir');
    await expect(page.locator('.dk-liste-dates')).toBeVisible();
  });

  test('La selection filtre la liste, et le reset la retablit', async ({ page }) => {
    await attendreDonnees(page);
    const avant = Number((await page.locator('.dk-liste-nb').textContent()).trim());

    const cases = await casesDisponibles(page, 2);
    await cases.first().click();
    await expect(page.locator('.dk-cal-arrivee')).toHaveCount(1);

    // Le filtrage par date ne peut que RESTREINDRE (chateauxDisponibles filtre
    // la liste, il n'y ajoute jamais). On verifie la propriete, pas un nombre :
    // le seuil depend de `urgence`, donnee editoriale qui bouge.
    const apres = Number((await page.locator('.dk-liste-nb').textContent()).trim());
    expect(apres).toBeLessThanOrEqual(avant);

    // Le reset efface la selection et rend la liste complete.
    await page.locator('.dk-dates-reset').click();
    await expect(page.locator('.dk-cal-arrivee')).toHaveCount(0);
    const retabli = Number((await page.locator('.dk-liste-nb').textContent()).trim());
    expect(retabli).toBe(avant);
  });

  test('Echap referme l\'overlay', async ({ page }) => {
    await page.keyboard.press('Escape');
    await expect(page.locator('.dk-overlay')).toHaveCount(0, { timeout: 8000 });
  });
});
