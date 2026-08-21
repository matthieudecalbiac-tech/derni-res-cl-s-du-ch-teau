const { test, expect } = require('@playwright/test');

/**
 * Tests E2E · La session s'attend, mais pas indefiniment — PR2b robustesse.
 *
 * ── LE DEFAUT, ET CE QU'IL N'ETAIT PAS ───────────────────────────────────────
 *
 * `AuthContext` appelait `supabase.auth.getSession().then(...)` sans `.catch`.
 * On a d'abord cru a un rejet non attrape. LA MESURE DIT AUTRE CHOSE — session
 * stockee, auth injoignable :
 *
 *     /club  TOUJOURS BLANC apres 120 s   —   13 requetes auth tentees
 *
 * `getSession()` NE SE REGLE JAMAIS : ni resolution, ni rejet. Il boucle. Un
 * `.catch` seul y est impuissant, puisqu'il attend un rejet qui ne vient pas.
 * D'ou une BORNE de huit secondes, dont le depassement tombe dans le meme repli
 * que le vrai rejet : non-connecte SUR (`session = null`, `loading = false`).
 *
 * ⚠ « BLANC » AU SENS PROPRE. `RequireAuth` rend `null` pendant le chargement :
 * une route protegee ne rendait donc RIEN. Pas un message, pas un squelette —
 * rien, et sans issue. C'est pourquoi ces tests interrogent la TAILLE DU DOM
 * plutot qu'un texte : le defaut etait une absence, pas un mauvais contenu.
 *
 * ⚠ ET IL NE FRAPPAIT QUE LES GENS CONNECTES. `getSession()` lit d'abord
 * `localStorage` : sans session enregistree, il n'y a aucun appel reseau a
 * echouer, ni meme a tenter. Le defaut visait precisement les membres du Club.
 * C'est ce qui oblige ces tests a PLANTER une session — sans elle, ils
 * testeraient un chemin qui n'a jamais eu le probleme.
 *
 * ── LE GARDE-FOU QUI COMPTE AUTANT QUE LE CORRECTIF ──────────────────────────
 *
 * Un visiteur ANONYME n'est pas une erreur. Pour lui, `getSession()` lit
 * `localStorage` et REUSSIT immediatement avec `session === null` — sans reseau,
 * sans attente. Ni la borne ni le `.catch` ne doivent le voir. Si la borne se
 * mettait un jour a s'appliquer a tout le monde, chaque visiteur attendrait huit
 * secondes devant un ecran vide : le defaut deplace, et aggrave.
 *
 * ── POURQUOI LA CLE EST DERIVEE, ET PAS LUE DANS L'ENVIRONNEMENT ─────────────
 *
 * `supabase-js` range la session sous `sb-<ref>-auth-token`. La CI ne passe PAS
 * `VITE_SUPABASE_URL` au processus Playwright (`qa.yml`, etape « Agent E2E ») :
 * un test qui en dependrait se SKIPPERAIT en CI, et un filet inerte se lit comme
 * un filet vert — on s'est deja fait prendre une fois.
 * On lit donc la reference dans ce que le serveur SERT : le module transforme en
 * dev, le bundle en build. Verifie sur les deux.
 */

// Retrouve la cle de stockage de la session en lisant la configuration servie.
async function cleDeSession(page) {
  const contient = (t) => /https:\/\/[a-z0-9]+\.supabase\.co/.test(t);

  // Dev : Vite sert le module avec la variable deja remplacee.
  const direct = await page.request.get('/src/lib/supabase.js').catch(() => null);
  if (direct && direct.ok()) {
    const t = await direct.text();
    if (contient(t)) return cle(t);
  }

  // Build : la reference vit dans le bundle.
  const html = await (await page.request.get('/')).text();
  for (const m of html.matchAll(/src="([^"]+\.js)"/g)) {
    const r = await page.request.get(m[1]).catch(() => null);
    if (r && r.ok()) {
      const t = await r.text();
      if (contient(t)) return cle(t);
    }
  }
  return null;

  function cle(texte) {
    return `sb-${texte.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)[1]}-auth-token`;
  }
}

// Une session PERIMEE : c'est elle qui force `getSession()` a passer par le
// reseau pour se rafraichir — donc a boucler quand ce reseau manque.
const SESSION_STOCKEE = {
  access_token: 'faux.jeton.perime',
  token_type: 'bearer',
  expires_at: 1000000000,
  expires_in: -1,
  refresh_token: 'faux-refresh',
  user: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'filet@example.com',
    aud: 'authenticated',
    role: 'authenticated',
  },
};

const PROTEGEE = '/club';

// Le DOM porte-t-il quelque chose ? Le defaut etait une racine VIDE.
const RACINE_REMPLIE = () => (document.getElementById('root')?.innerHTML.length ?? 0) > 200;

async function planterSession(page) {
  const cle = await cleDeSession(page);
  expect(cle, "la cle de session n'a pas pu etre derivee de la configuration servie").toBeTruthy();
  await page.addInitScript(
    ([c, s]) => window.localStorage.setItem(c, JSON.stringify(s)),
    [cle, SESSION_STOCKEE],
  );
}

test.describe('L\'attente de session est bornee', () => {

  test('LE BLANC EST BORNE — session stockee, auth injoignable', async ({ page }) => {
    // ⚠ LE TEST CENTRAL. Avant la borne, cette page restait vide AU-DELA DE
    // 120 s — mesure, pas estimation. Elle doit desormais conclure et rendre
    // l'etat deconnecte.
    await page.goto('/');
    await planterSession(page);
    await page.route('**/auth/v1/**', (route) => route.abort('failed'));

    await page.goto(PROTEGEE);
    await page.waitForFunction(RACINE_REMPLIE, null, { timeout: 30000 });

    // Non-connecte SUR : on atterrit sur la connexion, jamais sur du vide.
    await page.waitForURL(/\/connexion/, { timeout: 10000 });
    expect(new URL(page.url()).pathname).toBe('/connexion');
  });

  test('ANONYME — rendu immediat, la borne ne le voit jamais', async ({ page }) => {
    // ⚠ LE GARDE-FOU. Sans session stockee, `getSession()` ne touche pas au
    // reseau : il rend la main tout de suite. Si ce test se mettait a durer huit
    // secondes, cela voudrait dire que la borne s'applique a TOUS les visiteurs
    // — le defaut deplace sur l'ensemble du public.
    //
    // Le chronometre part APRES `domcontentloaded`, pour ne mesurer que le
    // demarrage de l'application et non le chargement de la page (lent en dev).
    await page.goto(PROTEGEE, { waitUntil: 'domcontentloaded' });
    const t0 = Date.now();
    await page.waitForFunction(RACINE_REMPLIE, null, { timeout: 30000 });
    const ms = Date.now() - t0;

    expect(new URL(page.url()).pathname).toBe('/connexion');
    // Tres en dessous des 8 000 ms de la borne — mesure locale : ~180 ms.
    expect(ms, `l'anonyme a attendu ${ms} ms : la borne s'applique a tort`).toBeLessThan(5000);
  });

  test('ANONYME — l\'accueil aussi rend tout de suite', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const t0 = Date.now();
    await page.waitForFunction(RACINE_REMPLIE, null, { timeout: 30000 });
    expect(Date.now() - t0).toBeLessThan(5000);
    expect(new URL(page.url()).pathname).toBe('/');
  });

  // ── La page de reinitialisation : deux causes, deux messages ───────────────
  //
  // Elle portait le meme defaut, avec une consequence propre : son repli
  // concluait TOUJOURS « Lien invalide ou expire », y compris quand le lien
  // n'y etait pour rien. Elle accusait le lien et envoyait en demander un
  // nouveau POUR RIEN — la demande aurait echoue de la meme facon.
  //
  // ⚠ « Trousseau expire » N'EST PAS SUPPRIME : c'est le message du vrai cas, et
  // le premier test ci-dessous le garde. Ce qui change, c'est qu'il est desormais
  // RESERVE a ce cas.

  test('LIEN VRAIMENT EXPIRE — « Trousseau expire » reste, c\'est son cas', async ({ page }) => {
    // ⚠ LE GARDE-FOU DE CETTE PAIRE. Reseau intact, aucune session : Supabase
    // REPOND, et sa reponse est « pas de session ». Le lien est reellement
    // perime, la formule est vraie, et le geste propose est le bon.
    // Si la borne reseau se mettait a couvrir ce cas, on cesserait de dire a des
    // gens au lien perime ce qu'ils doivent faire.
    await page.goto('/reinitialiser-mot-de-passe');

    const message = page.locator('.rmdp-error-msg');
    await expect(message).toBeVisible({ timeout: 20000 });
    await expect(message).toContainText(/Lien invalide ou expir/i);
    await expect(page.locator('.rmdp-titre')).toContainText(/Trousseau expir/i);
    // Le geste juste dans ce cas : en redemander un.
    await expect(page.getByText(/Demander un nouveau lien/i)).toBeVisible();
  });

  test('VERIFICATION IMPOSSIBLE — la panne n\'accuse plus le lien', async ({ page }) => {
    await page.goto('/');
    await planterSession(page);
    await page.route('**/auth/v1/**', (route) => route.abort('failed'));

    await page.goto('/reinitialiser-mot-de-passe');

    const message = page.locator('.rmdp-error-msg');
    await expect(message).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.rmdp-titre')).toContainText(/V[eé]rification impossible/i);
    // ⚠ ET SURTOUT PAS L'AUTRE. C'est l'assertion qui porte la PR : le lien est
    // peut-etre parfaitement valide, on n'en sait rien, on ne le condamne pas.
    await expect(message).not.toContainText(/Lien invalide ou expir/i);
    await expect(page.getByText(/Demander un nouveau lien/i)).toHaveCount(0);
  });

  test('RESEAU INTACT — une session stockee se resout vite, sans toucher la borne', async ({ page }) => {
    // Non-regression du parcours normal : quand l'auth repond, la decision se
    // prend en quelques centaines de millisecondes. La borne n'entre pas en jeu.
    // ⚠ CE TEST N'ASSERTE PAS UNE CONNEXION REUSSIE : le jeton plante est faux,
    // et le serveur le refusera — c'est justement une REPONSE, donc rapide. La
    // convention du dossier interdit d'asserter un resultat qui depend du
    // backend (cf. auth-password.spec.cjs) ; on n'asserte ici que le DELAI.
    await page.goto('/');
    await planterSession(page);

    await page.goto(PROTEGEE, { waitUntil: 'domcontentloaded' });
    const t0 = Date.now();
    await page.waitForFunction(RACINE_REMPLIE, null, { timeout: 30000 });
    const ms = Date.now() - t0;

    expect(ms, `resolution en ${ms} ms : la borne a ete atteinte alors que le reseau repondait`).toBeLessThan(5000);
  });
});
