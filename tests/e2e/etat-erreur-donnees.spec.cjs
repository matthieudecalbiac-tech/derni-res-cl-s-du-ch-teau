const { test, expect } = require('@playwright/test');

/**
 * Tests E2E · La panne se dit, et elle se repare — PR1 robustesse.
 *
 * ── LES DEUX DEFAUTS QUE CE FILET GARDE ──────────────────────────────────────
 *
 * 1. L'ECRAN SE TAISAIT. `error` etait deconstruit dans quatre composants et
 *    n'etait lu NULLE PART : le hook signalait la panne, l'ecran affichait une
 *    grille vide — indiscernable d'un catalogue vide. Sur la vitrine d'une
 *    demeure, c'etait pire : un `<Navigate to="/">` silencieux, qui empilait en
 *    plus une entree d'historique.
 *
 * 2. L'ECRAN NE SE REPARAIT PAS. Les `useEffect` des hooks avaient pour seule
 *    dependance `excludeMocks` : rien, jamais, ne les relancait. Une coupure
 *    d'UNE SECONDE laissait l'ecran vide JUSQU'AU RECHARGEMENT DE LA PAGE.
 *
 * ── LA DISTINCTION QUE CE FILET PROTEGE, ET QUI COMPTE PLUS QUE LE RESTE ─────
 *
 *   erreur  le fetch a ECHOUE           -> « nous n'avons pas pu joindre »
 *   vide    le fetch a REUSSI, 0 ligne  -> « aucun chateau ne correspond »
 *
 * Les confondre serait pire que de n'afficher aucun des deux : accuser le site
 * d'une panne quand la reponse est juste, ou pretendre qu'une recherche n'a pas
 * d'echo quand on n'a jamais pu la poser. Le dernier test de ce fichier est le
 * garde-fou de cette distinction — il verifie qu'un ecran LEGITIMEMENT vide ne
 * montre PAS l'ecran d'erreur.
 */

// Tout passe par PostgREST. Couper cette route, c'est couper la donnee sans
// toucher a l'application — exactement ce que fait le mode avion.
const API = '**/rest/v1/**';

const BLOC = '.err-bloc';

async function couperLaDonnee(page) {
  await page.route(API, (route) => route.abort('failed'));
}

async function retablirLaDonnee(page) {
  await page.unroute(API);
}

test.describe('Quand la donnee ne vient pas', () => {

  test('ACCUEIL — UN SEUL bloc d\'erreur, pas six', async ({ page }) => {
    // ⚠ LE TEST CENTRAL DE CETTE PR. CINQ sections de l'accueil consomment les
    // chateaux (BarreRecherche, PastillesInspiration, ToggleCarteListe,
    // UneDeLaSemaine, HeureAuxDemeures) et une sixieme les compteurs. Si chacune
    // rendait son propre message, une coupure reseau empilerait autant de blocs
    // identiques : le visiteur lirait cinq fois la meme phrase et croirait a
    // cinq pannes. La decision est donc prise UNE FOIS, dans App.
    await couperLaDonnee(page);
    await page.goto('/');

    await expect(page.locator(BLOC)).toBeVisible({ timeout: 20000 });
    await expect(page.locator(BLOC)).toHaveCount(1);

    // Le Header et le pied de page restent : un ecran en panne n'est pas un
    // cul-de-sac, le visiteur peut toujours partir ailleurs.
    await expect(page.locator('.header-burger')).toBeVisible();
  });

  test('RESULTATS — l\'erreur, et SURTOUT PAS « aucun chateau ne correspond »', async ({ page }) => {
    // La phrase du vide serait ici un mensonge caracterise : elle affirmerait
    // que les criteres n'ont pas d'echo alors qu'on n'a jamais pu demander.
    await couperLaDonnee(page);
    await page.goto('/resultats?region=Normandie&invites=2');

    await expect(page.locator(BLOC)).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/Aucun ch[aâ]teau ne correspond/i)).toHaveCount(0);
  });

  test('VITRINES — l\'erreur remplace la grille', async ({ page }) => {
    await couperLaDonnee(page);
    await page.goto('/vitrines');

    await expect(page.locator(BLOC)).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.vit-grille')).toHaveCount(0);
  });

  test('DERNIERES CLES — l\'erreur, et aucun chiffre au-dessus', async ({ page }) => {
    // Le compteur annoncerait « 0 domaine disponible » AU-DESSUS du message de
    // panne : deux phrases qui se contredisent, dont la premiere est fausse.
    await couperLaDonnee(page);
    await page.goto('/dernieres-cles');

    await expect(page.locator(BLOC)).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.dk-liste-header')).toHaveCount(0);
  });

  test('VITRINE D\'UNE DEMEURE — on reste sur place, on ne rebondit plus a l\'accueil', async ({ page }) => {
    // ⚠ CE TEST GARDE UNE DECISION, PAS UN DESSIN. La ligne remplacee etait
    // `<Navigate to="/" replace />` : le visiteur cliquait une demeure et se
    // retrouvait sur la home SANS UN MOT. Si quelqu'un retablissait ce repli,
    // l'assertion d'URL rougirait — c'est sa seule raison d'etre.
    await couperLaDonnee(page);
    await page.goto('/chateau/les-briottieres');

    await expect(page.locator(BLOC)).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/Cette demeure n'a pas pu/i)).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/chateau/les-briottieres');
  });

  test('REESSAYER REMPLIT L\'ECRAN — pas seulement un appel reseau', async ({ page }) => {
    // ⚠ LA PREUVE QUI COMPTE. Un `refetch` qui part sans rien ramener serait un
    // bouton decoratif : on verifie donc que LES CHATEAUX REVIENNENT, pas qu'une
    // requete est partie.
    //
    // Il y a un piege que ce test desamorce : le service memorise la PROMESSE du
    // catalogue. Si un echec restait en cache pendant les 5 minutes du TTL,
    // « Reessayer » rejouerait l'echec indefiniment. L'entree est retiree sur
    // rejet — et c'est precisement ce que ce test mesure.
    await couperLaDonnee(page);
    await page.goto('/vitrines');
    await expect(page.locator(BLOC)).toBeVisible({ timeout: 20000 });

    await retablirLaDonnee(page);
    await page.locator('.err-btn').click();

    await expect(page.locator(BLOC)).toHaveCount(0, { timeout: 20000 });
    // L'ecran est REMPLI, pas seulement debarrasse de son message.
    await expect(page.locator('.vit-grille .vit-carte').first()).toBeVisible({ timeout: 20000 });
  });

  test('FAUX POSITIF — un ecran legitimement vide ne montre PAS d\'erreur', async ({ page }) => {
    // ⚠ LE GARDE-FOU DE LA DISTINCTION. Reseau intact, criteres sans echo : la
    // reponse « aucun chateau ne correspond » est JUSTE, et l'ecran d'erreur
    // serait ici le vrai defaut. Si quelqu'un cablait un jour l'erreur sur
    // `length === 0`, ce test rougirait — aucun des six autres ne le ferait.
    await page.goto('/resultats?region=Laponie&invites=2');

    await expect(page.getByText(/Aucun ch[aâ]teau ne correspond/i)).toBeVisible({ timeout: 20000 });
    await expect(page.locator(BLOC)).toHaveCount(0);
  });
});
