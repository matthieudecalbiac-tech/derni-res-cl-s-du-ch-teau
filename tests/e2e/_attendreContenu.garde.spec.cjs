const { test, expect } = require('@playwright/test');
const { attendreContenu } = require('./_attendreContenu.cjs');

/**
 * Le garde-fou du harnais — il doit ECHOUER, pas patienter.
 *
 * ⚠ RAISON D'ETRE. Un harnais d'attente est une arme a double tranchant : s'il
 * attend trop, il transforme un VRAI defaut du site en simple lenteur, et un
 * test qui aurait du rougir finit par passer. On aurait alors ferme des flakes
 * en ouvrant un trou bien pire — des bugs qui ne se voient plus.
 *
 * Ce test verifie donc l'inverse de tous les autres : que le harnais REND LA
 * MAIN EN ECHEC quand l'element n'arrive jamais.
 */
test('GARDE-FOU · le harnais echoue sur un selecteur qui n\'existe pas', async ({ page }) => {
  await page.goto('/');

  const t0 = Date.now();
  let aEchoue = false;
  let message = '';
  try {
    // Un selecteur qui n'existera jamais : le harnais ne doit pas l'attendre
    // indefiniment, il doit conclure a l'echec.
    await attendreContenu(page, '.selecteur-qui-nexiste-pas-du-tout', { timeout: 3000 });
  } catch (e) {
    aEchoue = true;
    message = String(e.message);
  }
  const ms = Date.now() - t0;

  expect(aEchoue, 'le harnais a laisse passer un selecteur inexistant').toBe(true);
  // Il a bien BORNE son attente, il n'a pas attendu sans fin.
  expect(ms).toBeLessThan(15000);
  // Et son message nomme le selecteur, pour que le diagnostic ne parte pas de zero.
  expect(message).toContain('selecteur-qui-nexiste-pas-du-tout');
});

test('GARDE-FOU · le harnais reussit sur un selecteur reel', async ({ page }) => {
  // Le pendant du precedent : sans lui, un harnais qui echouerait TOUJOURS
  // passerait le test ci-dessus et personne ne le verrait.
  await page.goto('/');
  const cartes = await attendreContenu(page, '.une-semaine-carte');
  expect(await cartes.count()).toBeGreaterThan(0);
});
