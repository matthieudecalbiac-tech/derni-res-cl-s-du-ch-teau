/**
 * Tests E2E · Sprint alpha.2.5 Phase B — auth email + mot de passe
 *
 * Périmètre : UI / routing / garde de route uniquement. Aucun mock du client
 * Supabase, aucun stub réseau. On n'asserte JAMAIS un résultat dépendant du
 * backend (login réussi, email envoyé, reset appliqué) — ces étapes restent
 * en validation manuelle (cf. Vercel preview obligatoire avant merge).
 *
 * Sélecteurs : extraits des composants réels (pas de data-testid). Préférence
 * getByRole / getByLabel / getByText / id natif.
 *
 *   Inscription.jsx                    ids ins-email / ins-password / ins-confirm-password,
 *                                      bouton "Créer mon compte" (disabled tant que les 3
 *                                      champs ne sont pas remplis).
 *   Connexion.jsx                      ids cnx-email / cnx-password, bouton "Se connecter"
 *                                      (disabled tant que email + mot de passe vides).
 *   ReinitialiserMotDePasse.jsx        sans session recovery → écran loading
 *                                      "Vérification du lien…" puis, après 3 s timeout,
 *                                      écran "Trousseau expiré".
 *   MotDePasseOublie.jsx               id mdpo-email, bouton "Recevoir le lien".
 *   RequireAuth.jsx                    redirige /mon-compte → /connexion si pas de session.
 *   Header.jsx                         bouton .header-cta "Rejoindre le Club" → /inscription
 *                                      (caché sur viewport ≤ 768 px, cf. header.css L172).
 */
const { test, expect } = require('@playwright/test');

test.describe('Auth Phase B · email + mot de passe (UI/routing)', () => {

  test('/inscription rend la landing argumentaire + le formulaire création', async ({ page }) => {
    await page.goto('/inscription');
    await page.waitForLoadState('domcontentloaded');

    // Landing argumentaire — h1 patrimonial + 4 avantages
    await expect(page.getByRole('heading', { level: 1, name: 'Le Club des Châtelains' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Offres confidentielles' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Contribution patrimoniale' })).toBeVisible();

    // Formulaire — les 3 champs requis pour activer le bouton (cf. Inscription.jsx L236)
    const email = page.locator('#ins-email');
    const password = page.locator('#ins-password');
    const confirm = page.locator('#ins-confirm-password');
    const submit = page.getByRole('button', { name: 'Créer mon compte' });

    await expect(email).toBeVisible();
    await expect(password).toBeVisible();
    await expect(confirm).toBeVisible();

    // État initial : bouton désactivé tant que les champs sont vides
    await expect(submit).toBeDisabled();

    // Remplir email seul ne suffit pas (confirmPassword requis dans l'expression disabled)
    await email.fill('matthieu+test@example.fr');
    await expect(submit).toBeDisabled();

    // Remplir email + password + confirm active le bouton
    await password.fill('motdepasse-de-test');
    await confirm.fill('motdepasse-de-test');
    await expect(submit).toBeEnabled();
  });

  test('/connexion rend le formulaire mot de passe (champs + submit)', async ({ page }) => {
    await page.goto('/connexion');
    await page.waitForLoadState('domcontentloaded');

    // Titre patrimonial du mode password par défaut
    await expect(page.getByRole('heading', { level: 1, name: 'Espace membre du Club' })).toBeVisible();

    const email = page.locator('#cnx-email');
    const password = page.locator('#cnx-password');
    const submit = page.getByRole('button', { name: 'Se connecter' });

    await expect(email).toBeVisible();
    await expect(password).toBeVisible();
    await expect(submit).toBeVisible();

    // État initial : disabled, puis activé après remplissage des 2 champs (cf. Connexion.jsx L242)
    await expect(submit).toBeDisabled();
    await email.fill('matthieu+test@example.fr');
    await expect(submit).toBeDisabled();
    await password.fill('motdepasse-de-test');
    await expect(submit).toBeEnabled();

    // Présence des liens de bascule mode (perdu vos clés / créer un compte)
    await expect(page.getByRole('link', { name: 'Vous avez perdu vos clés ?' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Rejoindre le Club' })).toBeVisible();
  });

  test('Garde de route : /mon-compte sans session ne reste pas sur /mon-compte', async ({ page }) => {
    // RequireAuth (RequireAuth.jsx L23) : pas de user → <Navigate to="/connexion" replace />.
    // On n'asserte pas la cible exacte (couverte par s2-alpha-1-routing-smoke), on vérifie
    // simplement que la garde a bien joué : l'URL n'est plus /mon-compte.
    await page.goto('/mon-compte');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).not.toHaveURL(/\/mon-compte$/, { timeout: 5000 });
  });

  test('CTA Header "Rejoindre le Club" navigue vers /inscription (recâblage B7)', async ({ page, isMobile }) => {
    // .header-cta est caché sous 768 px (header.css L172) — le path mobile passe par le burger.
    // Le recâblage B7 testé ici concerne le bouton desktop. Sur mobile : skip ciblé.
    test.skip(isMobile, 'Bouton .header-cta caché sous 768 px (cf. header.css). Path mobile = burger menu, hors scope B7.');

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const cta = page.locator('.header-cta', { hasText: 'Rejoindre le Club' });
    await expect(cta).toBeVisible();
    await cta.click();

    await expect(page).toHaveURL(/\/inscription$/, { timeout: 5000 });
    // Vérifie qu'on est bien sur la landing (et pas juste l'URL changée)
    await expect(page.getByRole('heading', { level: 1, name: 'Le Club des Châtelains' })).toBeVisible();
  });

  test('/reinitialiser-mot-de-passe sans token affiche "Trousseau expiré" après le timeout', async ({ page }) => {
    // ReinitialiserMotDePasse.jsx L73-82 : timeout 3 s. Sans session recovery, getSession()
    // résout null, aucun event PASSWORD_RECOVERY ne fire, et le fallback bascule sur
    // initError → écran "Trousseau expiré". On ne suppose AUCUN token valide.
    await page.goto('/reinitialiser-mot-de-passe');
    await page.waitForLoadState('domcontentloaded');

    // État transitoire (3 s max) — pas une assertion stricte pour ne pas être flaky
    // si la machine est rapide et bascule directement sur l'écran d'erreur.

    // État final attendu : écran erreur
    await expect(page.getByRole('heading', { level: 1, name: 'Trousseau expiré' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('alert')).toContainText(/lien invalide ou expiré/i);
    await expect(page.getByRole('link', { name: /demander un nouveau lien/i })).toBeVisible();

    // Le formulaire "nouvelles clés" ne doit PAS être rendu sans session recovery
    await expect(page.getByRole('heading', { level: 1, name: 'Choisir vos nouvelles clés' })).toHaveCount(0);
  });

  test('/mot-de-passe-oublie rend le formulaire email', async ({ page }) => {
    await page.goto('/mot-de-passe-oublie');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('heading', { level: 1, name: 'Un trousseau de rechange' })).toBeVisible();

    const email = page.locator('#mdpo-email');
    const submit = page.getByRole('button', { name: 'Recevoir le lien' });

    await expect(email).toBeVisible();
    await expect(submit).toBeVisible();

    // Cohérence : disabled tant que l'email est vide (cf. MotDePasseOublie.jsx L99)
    await expect(submit).toBeDisabled();
    await email.fill('matthieu+test@example.fr');
    await expect(submit).toBeEnabled();

    // Lien retour vers /connexion
    await expect(page.getByRole('link', { name: /retour à la connexion/i })).toBeVisible();
  });

});
