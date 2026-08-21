const { test, expect } = require('@playwright/test');

/**
 * Tests E2E · Le filet de rendu et la page introuvable — PR3 robustesse.
 *
 * ── DEUX ASSURANCES, PAS DEUX REPARATIONS ────────────────────────────────────
 *
 * Aucune erreur de rendu n'est connue dans le projet, et aucune n'a ete
 * provoquee ailleurs que par la sonde de ce filet. `FiletErreur` est une
 * assurance : sans lui, une exception au rendu demonte l'arbre entier et laisse
 * `<div id="root">` VIDE — le meme ecran blanc que l'auth bloquee de PR2b, par
 * un tout autre chemin.
 *
 * La 404, elle, remplace un defaut bien reel. Mesure du 21 aout sur le build de
 * production, AVANT cette PR :
 *
 *     /cette-page-nexiste-pas   ->  l'accueil entier, URL inchangee
 *     /chateau/                 ->  idem
 *     /admin/nimporte-quoi      ->  idem
 *
 * Le visiteur voyait un site qui marche, a une adresse qui n'existe pas.
 *
 * ── LA DISTINCTION QUE CE FILET PROTEGE ──────────────────────────────────────
 *
 * Trois etats voisins, que rien ne doit confondre — c'est la meme discipline
 * qu'aux PR precedentes, appliquee a un troisieme couple :
 *
 *     panne reseau      « Les portes sont momentanement closes »  + Reessayer
 *     adresse inconnue  « Cette porte n'existe pas »              + Retour
 *     rendu interrompu  « Quelque chose s'est interrompu »        + Recharger
 *
 * Le titre de la 404 fait ECHO a celui de la panne pour dire son CONTRAIRE :
 * close est passager, n'existe pas est definitif. C'est pourquoi la 404 ne
 * propose AUCUN reessai — aucun n'y changerait rien.
 *
 * ⚠ CE FILET EXIGE LE SERVEUR DE DEV, et c'est assume. La sonde qui leve
 * (`/__sonde-filet-erreur`) est derriere `import.meta.env.DEV` : elle DISPARAIT
 * du bundle de production — verifie, 0 occurrence dans `dist/`. Playwright vise
 * le serveur de dev par defaut (`playwright.config.cjs`), la sonde y est donc
 * presente. Contre une cible `prod`, ce test echouera BRUYAMMENT plutot que de
 * se skipper : un filet inerte se lit comme un filet vert, et on s'est deja fait
 * prendre une fois.
 */

const BLOC = '.err-bloc';
const TITRE = '.err-titre';

test.describe('La page introuvable', () => {

  test('URL inconnue — la 404, et PLUS l\'accueil', async ({ page }) => {
    await page.goto('/cette-page-nexiste-pas');

    await expect(page.locator(TITRE)).toContainText(/Cette porte n.existe pas/i, { timeout: 20000 });
    // ⚠ L'URL NE BOUGE PAS. Une redirection vers « / » etait justement le defaut :
    // elle effacait la trace de l'erreur, et le visiteur ne pouvait ni la relire
    // ni la corriger.
    expect(new URL(page.url()).pathname).toBe('/cette-page-nexiste-pas');
    // Et surtout : ce n'est plus l'accueil.
    await expect(page.locator('.accueil-hero')).toHaveCount(0);
  });

  test('DEMEURE INCONNUE — la 404 au lieu du rebond muet vers l\'accueil', async ({ page }) => {
    // `VitrineChateauRoute` rendait `<Navigate to="/" replace />` : le visiteur
    // cliquait une demeure et se retrouvait ailleurs, sans un mot.
    await page.goto('/chateau/demeure-imaginaire');

    await expect(page.locator(TITRE)).toContainText(/Cette porte n.existe pas/i, { timeout: 20000 });
    expect(new URL(page.url()).pathname).toBe('/chateau/demeure-imaginaire');
  });

  test('PERSONNAGE INCONNU — meme reponse, meme phrase', async ({ page }) => {
    await page.goto('/personnage/nobody-du-tout');

    await expect(page.locator(TITRE)).toContainText(/Cette porte n.existe pas/i, { timeout: 20000 });
    expect(new URL(page.url()).pathname).toBe('/personnage/nobody-du-tout');
  });

  test('ELLE NE PROPOSE PAS DE REESSAYER — et c\'est le fond du sujet', async ({ page }) => {
    // ⚠ L'ASSERTION QUI PORTE LA DISTINCTION. Une adresse qui n'existe pas ne
    // deviendra pas valide au second essai. Proposer « Reessayer » ici serait
    // suggerer un espoir faux — la meme faute que d'annoncer « aucun chateau ne
    // correspond » sur une panne reseau.
    await page.goto('/cette-page-nexiste-pas');
    await expect(page.locator(BLOC)).toBeVisible({ timeout: 20000 });

    await expect(page.getByRole('button', { name: /^Réessayer$/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Retour à l.accueil/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Parcourir les demeures/i })).toBeVisible();
  });

  test('SES DEUX GESTES MENENT VRAIMENT QUELQUE PART', async ({ page }) => {
    await page.goto('/cette-page-nexiste-pas');
    await expect(page.locator(BLOC)).toBeVisible({ timeout: 20000 });

    await page.getByRole('button', { name: /Parcourir les demeures/i }).click();
    await page.waitForURL(/\/vitrines/, { timeout: 15000 });
    await expect(page.locator('.vit-topbar')).toBeVisible({ timeout: 20000 });
  });
});

test.describe('Le filet de rendu', () => {

  test('UNE EXCEPTION AU RENDU N\'EFFACE PLUS L\'ECRAN', async ({ page }) => {
    // ⚠ LE TEST CENTRAL. Sans `FiletErreur`, React demonte l'arbre entier et
    // `<div id="root">` reste VIDE. On verifie donc d'abord que le DOM porte
    // quelque chose — le defaut serait une absence, pas un mauvais contenu.
    //
    // ⚠ React RELANCE l'erreur dans la console en mode developpement, MEME
    // attrapee. Ce test ne l'assert donc pas comme une anomalie : si le repli
    // s'affiche, le filet a fait son travail.
    await page.goto('/__sonde-filet-erreur');

    await expect(page.locator(TITRE)).toContainText(/interrompu/i, { timeout: 20000 });
    const taille = await page.evaluate(
      () => document.getElementById('root')?.innerHTML.length ?? 0,
    );
    expect(taille, "la racine est vide : le filet n'a rien attrape").toBeGreaterThan(200);
  });

  test('SON GESTE EST « RECHARGER », PAS « REESSAYER »', async ({ page }) => {
    // Une erreur de RENDU n'a rien a refetcher : le libelle par defaut
    // d'`EtatErreur` serait ici un contresens.
    await page.goto('/__sonde-filet-erreur');
    await expect(page.locator(BLOC)).toBeVisible({ timeout: 20000 });

    await expect(page.getByRole('button', { name: /Recharger la page/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Réessayer$/ })).toHaveCount(0);
  });

  test('LE REPLI NE RESTE PAS COLLE APRES LE GESTE', async ({ page }) => {
    // ⚠ LE PIEGE DES ERROR BOUNDARIES, ET LA RAISON DU `window.location.assign`.
    // Un boundary NE SE REINITIALISE PAS tout seul : un repli qui naviguerait par
    // le routeur changerait l'URL EN RESTANT AFFICHE, et le visiteur croirait le
    // site mort. Recharger le document remonte tout, l'etat d'erreur avec.
    await page.goto('/__sonde-filet-erreur');
    await expect(page.locator(BLOC)).toBeVisible({ timeout: 20000 });

    await page.getByRole('button', { name: /Recharger la page/i }).click();

    await page.waitForURL((u) => new URL(u).pathname === '/', { timeout: 20000 });
    // L'accueil est REELLEMENT rendu : plus aucun bloc d'erreur a l'ecran.
    await expect(page.locator('.accueil-hero')).toBeVisible({ timeout: 20000 });
    await expect(page.locator(BLOC)).toHaveCount(0);
  });
});

test.describe('Non-regression — la prop de libelle n\'a rien deplace', () => {

  test('PR1/PR2 gardent « Reessayer » par defaut', async ({ page }) => {
    // ⚠ `EtatErreur` a gagne une prop `libelleAction`. Son DEFAUT doit rester
    // « Reessayer », sans quoi les ecrans de PR1 (donnees) et PR2a (offres)
    // changeraient de mot sans que personne l'ait demande.
    await page.route('**/rest/v1/**', (route) => route.abort('failed'));
    await page.goto('/');

    await expect(page.locator(BLOC)).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: /^Réessayer$/ })).toBeVisible();
  });
});
