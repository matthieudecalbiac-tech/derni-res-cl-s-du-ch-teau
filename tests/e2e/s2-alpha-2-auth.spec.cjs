/**
 * Tests E2E · Sprint S2-α.2 — Auth Supabase magic link
 *
 * Couvre :
 *   1. /connexion rend formulaire (autoFocus input + footer Fondation)
 *   2. Submit email invalide → message d'erreur
 *   3. Submit email valide → message success + cooldown 60s (mock signInWithOtp)
 *   4. Modale Club non-membre → click "Se connecter" → /connexion + sessionStorage
 *   5. /mon-compte sans session → redirect /connexion + sessionStorage origin
 *
 * SCOPE : user NON-CONNECTÉ uniquement. Les parcours user authentifié
 *         (role=client → écran "Vous êtes connecté", role=membre_club → bypass
 *         modale) sont validés en test manuel (cf commit b08831e — Tests A/B
 *         locaux). Mocker un user authentifié en E2E nécessiterait stubber
 *         (a) getSession() initial, (b) auth.users DB, (c) onAuthStateChange.
 *         Trop complexe pour le gain α.2 minimal. À reporter post-α.2 si besoin.
 *
 * MOCK STRATEGY : page.route Playwright intercepte les calls Supabase auth
 *                 (zéro modif code prod, pattern déjà utilisé pour open-meteo
 *                 dans tests/visual/regression.spec.cjs).
 */
const { test, expect } = require('@playwright/test');

test.describe('S2-α.2 · auth magic link (user non-connecté)', () => {

  test('Test 1 · /connexion rend formulaire avec autoFocus + footer Fondation', async ({ page }) => {
    await page.goto('/connexion');
    await page.waitForLoadState('domcontentloaded');

    // Container présent + lys + titre
    await expect(page.locator('.cnx-container')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.cnx-titre')).toContainText('Entrer dans votre espace');

    // Formulaire visible
    await expect(page.locator('#cnx-email')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText(/Recevoir le lien magique/);

    // autoFocus sur input email
    await expect(page.locator('#cnx-email')).toBeFocused();

    // Footer Fondation du Patrimoine présent
    await expect(page.locator('.cnx-footer')).toContainText(/Fondation du Patrimoine/i);
  });

  test('Test 2 · Submit email HTML5-valide mais regex-invalide → message erreur', async ({ page }) => {
    // Sécurité : on n'appelle PAS Supabase (regex client bloque avant)
    // mais on intercepte au cas où, pour ne pas spammer en cas de régression
    await page.route('**/auth/v1/otp**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {}, error: null }),
      });
    });

    await page.goto('/connexion');
    await page.waitForLoadState('domcontentloaded');

    // "a@b" passe la validation HTML5 type=email (format basique) mais échoue
    // notre regex JS plus stricte qui exige un domaine avec point (\.[^\s@]+$).
    // Évite les patches DOM dynamiques (setAttribute novalidate) que Safari
    // gère mal en E2E.
    await page.fill('#cnx-email', 'a@b');
    await page.locator('button[type="submit"]').click();

    // Message d'erreur visible avec le texte attendu
    await expect(page.locator('.cnx-error')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.cnx-error')).toContainText(/Format d'email invalide/i);
  });

  test('Test 3 · Submit email valide → success message + cooldown', async ({ page }) => {
    // Mock Supabase signInWithOtp → 200 OK (évite envoi réel d'email)
    await page.route('**/auth/v1/otp**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {}, error: null }),
      });
    });

    await page.goto('/connexion');
    await page.waitForLoadState('domcontentloaded');

    await page.fill('#cnx-email', 'test@example.com');
    await page.locator('button[type="submit"]').click();

    // Message success visible avec l'email saisi
    await expect(page.locator('.cnx-success-msg')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.cnx-success-msg')).toContainText('test@example.com');
    await expect(page.locator('.cnx-success-msg')).toContainText(/vérifiez vos spams/i);

    // Bouton "Renvoyer le lien" disabled avec cooldown
    const btnRenvoyer = page.locator('.cnx-btn-secondary');
    await expect(btnRenvoyer).toBeVisible();
    await expect(btnRenvoyer).toBeDisabled();
    await expect(btnRenvoyer).toContainText(/Renvoyer le lien \(\d+s\)/);
  });

  test('Test 4 · Modale Club non-membre → "Se connecter" → /connexion + sessionStorage', async ({ page }) => {
    await page.goto('/chateau/les-briottieres');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('.vc4-onglet-n1[data-onglet="permanent"]').waitFor({ timeout: 8000 });

    // Ouvrir la modale stub Club
    await page.locator('.vc4-onglet-n1[data-onglet="club"]').click();
    const modale = page.locator('.vc3-reserve-modal').filter({ hasText: /Club Châtelain/i });
    await expect(modale).toBeVisible({ timeout: 5000 });

    // Click "Se connecter" (NB : la note inline α.1.5-FIX a été retirée Phase 4)
    await modale.locator('button').filter({ hasText: /^Se connecter →$/ }).click();

    // URL devient /connexion
    await expect(page).toHaveURL(/\/connexion$/, { timeout: 5000 });

    // sessionStorage auth_redirect_origin = /chateau/les-briottieres
    const origin = await page.evaluate(() =>
      sessionStorage.getItem('auth_redirect_origin')
    );
    expect(origin).toBe('/chateau/les-briottieres');

    // Page /connexion affiche le formulaire (user non connecté → autoFocus input)
    await expect(page.locator('#cnx-email')).toBeFocused({ timeout: 3000 });
  });

  test('Test 5 · /mon-compte sans session → redirect /connexion + sessionStorage origin', async ({ page }) => {
    // Goto /mon-compte (route wrappée dans <RequireAuth>)
    await page.goto('/mon-compte');
    await page.waitForLoadState('domcontentloaded');

    // RequireAuth observe user=null + !loading → Navigate to /connexion
    await expect(page).toHaveURL(/\/connexion$/, { timeout: 5000 });

    // sessionStorage auth_redirect_origin = /mon-compte (posée par RequireAuth)
    const origin = await page.evaluate(() =>
      sessionStorage.getItem('auth_redirect_origin')
    );
    expect(origin).toBe('/mon-compte');

    // Page /connexion affiche le formulaire
    await expect(page.locator('#cnx-email')).toBeVisible();
  });

  test('Test 6 · sessionStorage origin → emailRedirectTo contient ?next= encodé (Mini-Phase 6)', async ({ page }) => {
    // Sprint S2-α.2 Mini-Phase 6 : redirect cross-tab via ?next=.
    // Vérifie que Connexion.jsx lit sessionStorage et passe la valeur à
    // signInWithMagicLink, qui construit emailRedirectTo avec ?next= encodé.
    //
    // Capture la requête OTP outbound via page.route().
    let interceptedBody = null;
    let interceptedUrl = null;
    await page.route('**/auth/v1/otp**', async (route) => {
      interceptedUrl = route.request().url();
      try {
        interceptedBody = route.request().postDataJSON();
      } catch {
        interceptedBody = null;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {}, error: null }),
      });
    });

    // Poser sessionStorage auth_redirect_origin avant /connexion
    // (simule RequireAuth ou bouton "Se connecter" modale Club)
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() =>
      sessionStorage.setItem('auth_redirect_origin', '/chateau/blanc-buisson')
    );

    // Aller sur /connexion et soumettre
    await page.goto('/connexion');
    await page.waitForLoadState('domcontentloaded');
    await page.fill('#cnx-email', 'test@example.com');
    await page.locator('button[type="submit"]').click();

    // Attendre le success message (signe que signInWithOtp a été appelé + mock OK)
    await expect(page.locator('.cnx-success-msg')).toBeVisible({ timeout: 5000 });

    // Vérifier que la requête OTP contenait emailRedirectTo avec ?next= encodé
    // Format SDK v2 : Supabase met l'emailRedirectTo dans le query param
    // `redirect_to` de l'URL OTP, en DOUBLE-encodant son contenu (notre %2F
    // devient %252F). Pour matcher le pattern original, on décode une fois.
    expect(interceptedBody || interceptedUrl).toBeTruthy();
    const redirectUrl =
      interceptedBody?.options?.emailRedirectTo ||
      interceptedBody?.gotrue_meta_security?.emailRedirectTo ||
      interceptedBody?.email_redirect_to ||
      interceptedUrl; // fallback : scan l'URL de requête (query param)

    // Décodage 1×  pour absorber le re-encoding query param Supabase :
    //   "redirect_to=http%3A%2F...%3Fnext%3D%252Fchateau%252Fblanc-buisson"
    //   → après decodeURIComponent : "...?next=%2Fchateau%2Fblanc-buisson"
    //   → match sur "next=%2Fchateau%2Fblanc-buisson"
    const decoded = decodeURIComponent(redirectUrl);
    expect(decoded).toMatch(/next=%2Fchateau%2Fblanc-buisson/);
  });

});
