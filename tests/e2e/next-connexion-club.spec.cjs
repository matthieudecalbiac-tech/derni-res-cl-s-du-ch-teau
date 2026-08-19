const { test, expect } = require('@playwright/test');

/**
 * Tests E2E · La destination survit a l'authentification — filet ECRIT AVANT.
 *
 * LE DEFAUT. On clique « Club Chatelains », on saisit ses identifiants, et on
 * atterrit sur L'ACCUEIL. Il faut recliquer « Club » pour y entrer.
 *
 * LA CAUSE N'EST PAS LA REDIRECTION. `Connexion.jsx:190-192` fait exactement ce
 * qu'il faut :
 *
 *     const origin = localStorage.getItem("lcc_auth_next") || "/";
 *     navigate(origin, { replace: true });
 *
 * La destination n'est pas perdue en chemin : ELLE N'A JAMAIS ETE ECRITE. Sur
 * onze points d'entree vers `/connexion` ou `/inscription`, DEUX seulement
 * posent l'origine — `RequireAuth.jsx:27` et `VitrineChateau.jsx:887`. Les neuf
 * autres y vont a vide, et `|| "/"` fait le reste.
 *
 * Le mecanisme `?next=` existe pourtant, complet et protege contre
 * l'open-redirect (`Connexion.jsx:99-102`, filtre par `isPathInterneValide`).
 * Il n'y a rien a construire : il faut l'alimenter.
 *
 * ── CE QUE CE FILET COUVRE, ET CE QU'IL NE PEUT PAS ──────────────────────────
 *
 * Il verifie que la DESTINATION EST POSEE et qu'elle SURVIT aux deplacements
 * entre ecrans d'authentification. Il ne verifie pas l'atterrissage apres une
 * connexion reussie : cela demanderait une session Supabase, et le spec d'auth
 * existant pose la regle — « UI / routing / garde de route uniquement, aucun
 * mock du client Supabase ». Le maillon aval est deja couvert par le code lu
 * ci-dessus ; c'est l'amont qui manquait.
 */

// Le menu s'ouvre par le burger, seul chemin commun aux trois navigateurs
// (`.header-cta` est masque sous 768 px, cf. header.css).
const BURGER = '.header-burger';

test.describe('La destination survit a l\'authentification', () => {

  test('« Club Chatelains » mene a la CONNEXION, en annoncant /club', async ({ page }) => {
    // Matthieu A DEJA UN COMPTE : l'entree Club doit mener a `/connexion`, pas
    // a `/inscription` ou il devrait trouver lui-meme « Deja membre ? ». Et elle
    // doit dire ou revenir.
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.locator(BURGER).click();
    const entree = page.locator('.hm-item-titre', { hasText: /Club Ch[aâ]telains/i }).first();
    await expect(entree).toBeVisible({ timeout: 10000 });
    await entree.click();

    await page.waitForURL(/\/connexion/, { timeout: 15000 });
    const url = new URL(page.url());
    expect(url.pathname).toBe('/connexion');
    expect(url.searchParams.get('next')).toBe('/club');
  });

  test('le next SURVIT au passage entre ecrans d\'authentification', async ({ page }) => {
    // LE PIEGE CENTRAL. On arrive sur /connexion en annoncant /club, puis on se
    // ravise et l'on va s'inscrire. Si le lien inter-auth REINITIALISE le next
    // au lieu de le propager, la destination est perdue au moment meme ou le
    // visiteur change d'avis — et il retombera sur l'accueil.
    await page.goto('/connexion?next=/club');
    await page.waitForLoadState('domcontentloaded');

    const versInscription = page.locator('a[href*="/inscription"]').first();
    await expect(versInscription).toBeVisible({ timeout: 10000 });
    await versInscription.click();

    await page.waitForURL(/\/inscription/, { timeout: 15000 });
    expect(new URL(page.url()).searchParams.get('next')).toBe('/club');
  });

  test('et il survit au retour /inscription -> /connexion', async ({ page }) => {
    // Le chemin inverse : « Deja membre ? Se connecter » (Inscription.jsx:240).
    // C'est le parcours reel de quelqu'un qui a un compte et que le Header
    // envoyait jusqu'ici sur l'inscription.
    await page.goto('/inscription?next=/club');
    await page.waitForLoadState('domcontentloaded');

    const versConnexion = page.locator('a[href*="/connexion"]').first();
    await expect(versConnexion).toBeVisible({ timeout: 10000 });
    await versConnexion.click();

    await page.waitForURL(/\/connexion/, { timeout: 15000 });
    expect(new URL(page.url()).searchParams.get('next')).toBe('/club');
  });
});
