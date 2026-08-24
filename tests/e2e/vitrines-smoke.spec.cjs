const { test, expect } = require('@playwright/test');

/**
 * Tests E2E · Les Vitrines — filet de securite AVANT la refonte Prop 3.
 *
 * POURQUOI CE FICHIER EXISTE. Comme Dernieres Cles avant lui, cet ecran n'avait
 * AUCUNE couverture : le grep `vit-page` sur tests/ ne retournait rien. C'est le
 * second module commercial du site, et il partait en refonte sans filet.
 * L'ordre compte : un filet ecrit apres la refonte n'enregistre que l'etat
 * d'arrivee ; ecrit avant, il prouve que la refonte n'a pas casse le parcours.
 *
 * CE QU'IL GARDE, ET CE QU'IL NE GARDE PAS. Il verifie que l'ecran S'OUVRE, que
 * ses blocs editoriaux REPONDENT, que les filtres FILTRENT, et qu'une carte
 * OUVRE la vitrine. Aucune valeur precise n'est figee : ni un nombre de
 * chateaux, ni un libelle de region, ni une taille. La refonte va restyler les
 * filtres en pastilles, remonter la typo, deplacer la carte SVG et ajouter un
 * titre — un filet qui figerait ces details rougirait a chaque etape sans rien
 * proteger. Ce qu'on protege, c'est le PARCOURS.
 *
 * ── LA PORTE D'ENTREE ────────────────────────────────────────────────────────
 * Meme raisonnement que pour Dernieres Cles : `BandeauOffres` est en
 * `display:none` sous 768 (bandeau-offres.css, media 768), donc la porte desktop
 * n'existe pas en mobile. Le menu du Header, lui, n'a aucun `display:none` et
 * expose un attribut STABLE `data-id="vitrines"` — un libelle editorial se
 * reecrit, un data-id non.
 *
 * ── LES FILTRES, SANS LIRE LEUR TEXTE ───────────────────────────────────────
 * Les boutons sont produits par `regions.map()`, et leur libelle vient de la
 * BASE. Les viser par leur texte (« Normandie ») ferait dependre le test du
 * catalogue. On les vise par POSITION, ce qui est stable par construction :
 * l'entree « tous » est toujours produite en tete du tableau `regions`, donc
 * le premier bouton est toujours « toutes les regions » et les suivants sont
 * toujours des regions reelles.
 */

// Ouvre l'overlay par le menu du Header — seule porte visible aux deux tailles.
async function ouvrirVitrines(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  const burger = page.locator('.header-burger');
  await expect(burger).toBeVisible({ timeout: 10000 });
  await burger.click();

  await expect(page.locator('.hm-overlay--ouvert')).toBeVisible({ timeout: 8000 });

  const item = page.locator('.hm-item[data-id="vitrines"]');
  await expect(item).toBeVisible({ timeout: 8000 });
  await item.click();

  await expect(page.locator('.vit-page')).toBeVisible({ timeout: 12000 });
  // Le menu se referme 550 ms APRES l'ouverture de la destination (Header.jsx
  // handleAction) : il sert de backdrop pendant le cross-fade. Sans attendre son
  // retrait, il intercepte les clics des filtres et des cartes.
  await expect(page.locator('.hm-overlay--ouvert')).toHaveCount(0, { timeout: 8000 });
}

// Attend que les chateaux soient arrives de Supabase. La grille est vide tant
// que `useChateaux` n'a pas repondu : compter avant, c'est compter zero.
async function attendreCartes(page) {
  await expect(page.locator('.vit-carte').first()).toBeVisible({ timeout: 15000 });
}

test.describe('Les Vitrines · filet avant refonte Prop 3', () => {
  test.beforeEach(async ({ page }) => {
    await ouvrirVitrines(page);
  });

  test("L'overlay s'ouvre et rend ses blocs editoriaux", async ({ page }) => {
    await expect(page.locator('.vit-page')).toBeVisible();
    // Le fil d'Ariane, le titre, le sur-titre, le manifeste et la citation : les
    // cinq blocs que la Prop 3 conserve. On verifie qu'ils RENDENT, pas ce
    // qu'ils disent — la copie appartient a l'editorial, pas au test.
    for (const sel of ['.vit-fil', '.vit-titre', '.vit-surtitre', '.vit-accroche', '.vit-citation']) {
      await expect(page.locator(sel)).toBeVisible();
      await expect(page.locator(sel)).not.toBeEmpty();
    }
  });

  test('La grille rend une carte par chateau servi', async ({ page }) => {
    await attendreCartes(page);
    const cartes = page.locator('.vit-carte');
    expect(await cartes.count()).toBeGreaterThan(0);
    // Chaque carte porte son nom et sa region : les deux seuls champs dont
    // l'absence rendrait la carte inutilisable.
    await expect(page.locator('.vit-carte-nom').first()).not.toBeEmpty();
    await expect(page.locator('.vit-carte-region').first()).not.toBeEmpty();
  });

  test('La carte de France est rendue et reste unique', async ({ page }) => {
    await attendreCartes(page);
    // Elle sera DEPLACEE sous la grille a l'etape 6 : ce test garantit qu'elle
    // reste presente et en un seul exemplaire, sans rien dire de sa position.
    // Un deplacement qui la dupliquerait ou la perdrait rougirait ici.
    await expect(page.locator('.vit-carte-france')).toHaveCount(1);
    await expect(page.locator('.vit-carte-france svg')).toBeVisible();
  });

  test('Un filtre de region restreint la grille, le reset la retablit', async ({ page }) => {
    await attendreCartes(page);
    const cartes = page.locator('.vit-carte');
    const filtres = page.locator('.vit-filtre');
    expect(await filtres.count()).toBeGreaterThan(1);

    const total = await cartes.count();

    // Le 2e bouton est la 1re region reelle (le 1er est toujours « toutes »).
    await filtres.nth(1).click();
    await expect(filtres.nth(1)).toHaveClass(/actif/);
    // Un filtre ne peut que RESTREINDRE. On verifie la propriete, pas un
    // nombre : le catalogue et ses regions bougent.
    const filtre = await cartes.count();
    expect(filtre).toBeGreaterThan(0);
    expect(filtre).toBeLessThanOrEqual(total);

    // Et toutes les cartes affichees portent bien la meme region.
    const regions = await page.locator('.vit-carte-region').allTextContents();
    expect(new Set(regions.map((r) => r.trim())).size).toBe(1);

    // Retour a « toutes » : la grille retrouve son compte de depart.
    await filtres.nth(0).click();
    await expect(filtres.nth(0)).toHaveClass(/actif/);
    await expect(cartes).toHaveCount(total);
  });

  test('Une carte ouvre la vitrine du chateau', async ({ page }) => {
    await attendreCartes(page);
    await page.locator('.vit-carte').first().click();
    // TransitionPorte joue AVANT le montage de la vitrine : viser directement
    // l'overlay sans laisser la porte se detacher donne un clic dans le vide.
    await page.locator('.tp-wrap').waitFor({ state: 'detached', timeout: 12000 }).catch(() => {});
    await expect(page.locator('.vc3-overlay').first()).toBeVisible({ timeout: 12000 });
  });

  test("Echap referme l'overlay", async ({ page }) => {
    await page.keyboard.press('Escape');
    await expect(page.locator('.vit-page')).toHaveCount(0, { timeout: 8000 });
  });
});
