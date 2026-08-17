/**
 * Agent QA · Erreurs console
 *
 * Instrumente l'écoute `console` + `pageerror` + `requestfailed` pendant un
 * parcours utilisateur scripté sur 3 navigateurs (chromium-desktop,
 * webkit-desktop, mobile-safari). Observateur : on ne teste rien au sens
 * strict, on capture et on rapporte.
 *
 * Parcours par navigateur :
 *   1. Home → domcontentloaded → scroll complet
 *   2. Pour chaque château estLaUne:true :
 *      - Ouvre la vitrine (retry x3 mobile-safari)
 *      - Scroll complet de .vc3-corps
 *      - Ouvre la modale réservation, sélectionne une chambre, ferme
 *      - Ouvre le mode présentation, ferme
 *      - Escape pour fermer la vitrine
 *
 * Filtrage : IGNORE_PATTERNS en tête de fichier (Vite dev, React DevTools,
 * favicon, HMR...). Dédoublonné par (type + texte normalisé + navigateur).
 * Classification réseau : tout hostname ≠ localhost = avertissement (CDN
 * externe flaky). Hostname localhost en échec = erreur (régression locale).
 *
 * Vite lifecycle : démarrage détaché si absent sur localhost:5174, laissé
 * tournant pour les agents suivants (playwright-e2e réutilise).
 *
 * Signaux découverts au premier run standalone (à investiguer ailleurs) :
 *   - Vidéo Pexels (videos.pexels.com/.../*.mp4) rechargée 11× sur
 *     chromium-desktop en ~3 min. Probable remount en boucle du composant
 *     qui l'embarque (Hero ?). Dette perf, chantier dédié post-audit.
 *   - Message JS fragmenté "/www.youtube.com'." côté webkit-desktop
 *     uniquement. Possible régression Safari d'un embed iframe YouTube ;
 *     disparaîtra si videoBackground est retiré de Blanc Buisson. Accepté
 *     comme erreur visible dans le dashboard (pas masqué via IGNORE).
 *
 * Env :
 *   - CONSOLE_SKIP_BROWSERS=webkit-desktop,mobile-safari → skipper navs
 *   - PORT=5175 → cible un autre port
 */
const { chromium, webkit, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
// Acces a la navigation vitrine — MEME source que les specs E2E. La vitrine
// expose ses modules par deux sources dont une seule est visible a la fois
// (barre laterale > 768, feuille « Explorer » en dessous) ; ce module porte
// deja cette connaissance, la recopier ici la ferait diverger.
const { selModule, ouvrirNavVitrine } = require('../../tests/e2e/_navVitrine.cjs');

const ROOT = path.join(__dirname, '..', '..');
const ID = 'console-errors';
const LIBELLE = 'Erreurs console';
const PORT = Number(process.env.PORT) || 5174;
const BASE_URL = `http://localhost:${PORT}`;
// Budget de parcours PAR NAVIGATEUR. Il valait 90 s depuis la creation de
// l'agent (commit 52b28fb, 23 avril 2026), quand le site servait DEUX vitrines.
// Il en sert sept : le parcours traverse 8 pages par navigateur (home + 7
// chateaux), et mobile-safari — le plus lent — frolait le plafond.
//
// Mesure du 2026-08-17, 4 passes : trois a 216 actions, une coupee a 200 (93 %
// du parcours) par « timeout parcours 90s ». chromium et webkit tiennent en
// ~75 s chacun ; mobile-safari demande ~97 s au minimum, plus sa variance.
// Le budget ne passait donc pas par confort mais par marge etroite, et il a
// fini par ne plus passer.
//
// ⚠ Ce plafond n'etait pas visible tant que le parcours mourait au troisieme
// geste sur un selecteur mort (15 actions). Reparer le parcours l'a revele :
// ce n'est pas une regression, c'est un budget calibre pour un catalogue qui
// a quadruple depuis.
//
// 240 s et non 120 : ce garde-fou existe pour attraper un BLOCAGE REEL, pas
// pour arbitrer quelques secondes de rendu normal. A 120 s il redeviendrait
// marginal au huitieme chateau. a11y-axe, dont le parcours est plus lourd
// (analyse axe a chaque checkpoint), tourne deja avec 120 s.
const TIMEOUT_NAVIGATEUR = 240_000;
const TIMEOUT_VITE_BOOT = 60_000;

// ── Filtres de bruit courant ──
const IGNORE_PATTERNS = [
  /Download the React DevTools/i,
  /\[vite\] (connecting|connected)/i,
  /\[vite\] hot updated/i,
  /\[HMR\]/i,
  /favicon\.ico/i,
  /\[violation\].*handler took/i,
  // ─── Phase 1.x Chantier 1.8 — domaines CDN externes (variance CI) ───
  /videos\.pexels\.com/i,
  /images\.pexels\.com/i,
  /images\.unsplash\.com/i,
  /api\.open-meteo\.com/i,
  /www\.youtube\.com/i,
  /i\.ytimg\.com/i,
  // Polices Google — chargees par CDN depuis index.html (cf. CLAUDE.md
  // § Styles). Meme nature que les six au-dessus : hote externe, variance
  // reseau du runner, aucun rapport avec le code du site. `fonts.googleapis`
  // sert la feuille, `fonts.gstatic` les fichiers de police : deux hotes, et
  // le preconnect echoue sur le SECOND. Les deux, sinon le filtre est borgne.
  /fonts\.googleapis\.com/i,
  /fonts\.gstatic\.com/i,
  // ─── Bruit du lecteur YouTube — PENDANT CONSOLE de l'exclusion axe ───
  // « Permissions policy violation: compute-pressure is not allowed in this
  // document. » est emis par le lecteur YouTube embarque de
  // `chateau.videoBackground`, pas par notre code. Chromium seul, intermittent :
  // mesure du 2026-08-17, 1 passe sur 3 (216 actions chacune).
  //
  // MEME OBJET, MEME DOCTRINE, MEME PEREMPTION que la constante IFRAMES_TIERS
  // de scripts/agents/a11y-axe.cjs, qui exclut `iframe[src*="youtube.com"]` de
  // l'analyse axe. Les deux filtres visent le meme lecteur tiers ; l'un le
  // retire de l'arbre d'accessibilite, l'autre de la console. Les laisser
  // diverger serait incoherent : on excluerait l'iframe d'un cote et on la
  // laisserait rougir de l'autre.
  //
  // ⚠ A RETIRER ENSEMBLE, ET SEULEMENT ENSEMBLE, le jour ou la dette Phase 4.4
  // aboutit (migration du lecteur vers une video HTML5 native servie depuis
  // /public/). Ce jour-la : supprimer cette ligne ET la constante IFRAMES_TIERS
  // de a11y-axe.cjs. Aucun des deux ne masque une dette applicative — la dette,
  // c'est d'embarquer le lecteur, et elle est tracee ailleurs.
  //
  // Ce motif n'est PAS un hote : c'est un texte de message, qu'aucune
  // correlation d'URL ne peut rattacher a une requete. Le buffer `urlsEchouees`
  // ne peut rien pour lui, par construction — d'ou le filtre explicite.
  /compute-pressure/i,
];

function estBruit(texte) {
  return IGNORE_PATTERNS.some((r) => r.test(texte || ''));
}

// ── Navigateurs (doit matcher playwright.config.cjs projects) ──
const NAVIGATEURS = [
  { id: 'chromium-desktop', launcher: chromium, contextOpts: { viewport: { width: 1440, height: 900 } } },
  { id: 'webkit-desktop',   launcher: webkit,   contextOpts: { viewport: { width: 1440, height: 900 } } },
  { id: 'mobile-safari',    launcher: webkit,   contextOpts: { ...devices['iPhone 14'] } },
];

const skipNavs = new Set(
  (process.env.CONSOLE_SKIP_BROWSERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

// ── Vite lifecycle ──
function checkVite() {
  return new Promise((resolve) => {
    const req = http.request(
      { method: 'HEAD', host: 'localhost', port: PORT, path: '/', timeout: 1500 },
      (res) => { resolve(res.statusCode != null && res.statusCode < 500); res.resume(); }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

async function lancerViteSiBesoin() {
  if (await checkVite()) {
    console.log(`[console-errors] Vite déjà actif sur ${BASE_URL}, réutilisation.`);
    return;
  }
  const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!fs.existsSync(viteBin)) {
    throw new Error(`Vite CLI introuvable (${viteBin}). npm install nécessaire ?`);
  }
  console.log(`[console-errors] Démarrage Vite détaché sur port ${PORT}...`);
  const child = spawn(process.execPath, [viteBin, '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  const debut = Date.now();
  while (Date.now() - debut < TIMEOUT_VITE_BOOT) {
    if (await checkVite()) {
      console.log(`[console-errors] Vite prêt après ${Math.round((Date.now() - debut) / 1000)}s (laissé tournant).`);
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Vite n'a pas répondu sur ${BASE_URL} après ${TIMEOUT_VITE_BOOT / 1000}s`);
}

// ── Helpers parcours ──
// Decouverte DOM : liste des chateaux servis, lue depuis la modale "Liste" du
// toggle Carte/Liste (.tcl-item[data-slug]). Aucune lecture de fichier, aucune
// cle : le navigateur charge la base via le bundle.
//
// POURQUOI CETTE SOURCE, et plus les medaillons de HeureAuxDemeures : ce
// catalogue est INTEGRAL par contrat et visible aux deux tailles. Les
// medaillons sont masques sous 768 px depuis le design mobile - presents dans
// le DOM, jamais visibles - ce qui faisait echouer le parcours mobile-safari.
// Le carrousel "a la une" n'exposerait que 2 chateaux sur 7 : couverture
// partielle en silence, ecarte.
async function ouvrirCatalogue(page) {
  const onglet = page.locator('.tcl-onglet').filter({ hasText: 'Liste' });
  const items = page.locator('.tcl-item[data-slug]');

  let derniereErreur;
  for (let essai = 0; essai < 3; essai++) {
    // Ne reclique QUE si la modale n'est pas deja ouverte (sinon elle recouvre
    // le toggle et le clic serait intercepte). Retry car a l'arrivee des
    // donnees Supabase, le sous-arbre .tcl se re-rend et remplace le noeud du
    // bouton : un clic parti au mauvais moment atterrit sur un noeud detache.
    // Un delai plus long n'y changerait rien - le clic est perdu, pas en retard.
    if ((await page.locator('.tcl-liste').count()) === 0) await onglet.click();
    try {
      await items.first().waitFor({ state: 'visible', timeout: 8000 });
      return;
    } catch (e) {
      derniereErreur = e;
    }
  }
  throw derniereErreur;
}

async function decouvrirChateauxServis(page) {
  await page.goto(BASE_URL);
  await page.waitForLoadState('domcontentloaded');
  await ouvrirCatalogue(page);
  return page.locator('.tcl-item[data-slug]').evaluateAll((els) =>
    els.map((e) => ({
      slug: e.getAttribute('data-slug'),
      nom: e.querySelector('.tcl-item-nom')?.textContent?.trim() || '',
    })).filter((c) => c.slug)
  );
}

async function scrollPage(page) {
  await page.evaluate(() => new Promise((res) => {
    const h = document.body.scrollHeight;
    let y = 0;
    const step = 400, delay = 60;
    const it = setInterval(() => {
      window.scrollBy(0, step);
      y += step;
      if (y >= h) { clearInterval(it); res(); }
    }, delay);
  }));
  await page.waitForTimeout(300);
}

async function scrollVitrine(page) {
  await page.evaluate(() => {
    const c = document.querySelector('.vc3-corps');
    if (c) c.scrollTo({ top: c.scrollHeight, behavior: 'instant' });
  });
  await page.waitForTimeout(600);
}

// Ouvre la vitrine par slug, via son item de catalogue (meme source que la
// decouverte, et meme parcours qu'un visiteur : versVitrine() passe par
// onEntrerChateau, donc par la TransitionPorte).
// Patron piece 5 : retry click (mobile-safari) + attente TransitionPorte.
async function ouvrirVitrineParSlug(page, slug) {
  await page.goto(BASE_URL);
  await page.waitForLoadState('domcontentloaded');
  const item = page.locator(`.tcl-item[data-slug="${slug}"]`);

  let derniereErreur;
  for (let essai = 0; essai < 3; essai++) {
    // versVitrine() REFERME la modale a chaque clic : la rouvrir avant de
    // reessayer, sinon le 2e essai cliquerait dans le vide.
    if (!(await item.isVisible().catch(() => false))) await ouvrirCatalogue(page);
    await item.scrollIntoViewIfNeeded();
    await item.click();
    try {
      // 12 s, et non 3 : depuis le catalogue, versVitrine() joue la porte PUIS
      // navigue vers /chateau/<slug> - l'overlay n'est monte qu'a l'arrivee
      // (~4,3 s mesures, contre ~0,5 s par les medaillons). Le total jusqu'a
      // .vc3-visible est inchange : seul l'ordre des jalons change.
      await page.locator('.vc3-overlay').first().waitFor({ state: 'visible', timeout: 12000 });
      derniereErreur = null;
      break;
    } catch (e) {
      derniereErreur = e;
      // Ne JAMAIS reessayer pendant la porte : .tp-fond intercepte les clics.
      await page.locator('.tp-wrap').waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
    }
  }
  if (derniereErreur) throw derniereErreur;

  await page.locator('.tp-wrap').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
  await page.locator('.vc3-overlay.vc3-visible').first().waitFor({ state: 'visible', timeout: 3000 });
}

async function parcoursVitrine(page, chateau, compteurs) {
  await ouvrirVitrineParSlug(page, chateau.slug);
  compteurs.actions += 2;

  await scrollVitrine(page);
  compteurs.actions += 1;

  // Nouveau parcours α.1.5 : le CTA header ne fait plus que scroll+focus.
  // La modale réserve s'ouvre via module Permanent → modale module → bouton chambre.
  //
  // DEUX SELECTEURS MORTS CORRIGES ICI, mesures sur le DOM aux deux moteurs :
  //   .vc4-offre-card    DOM=0 — OngletsNiveau1 n'est plus monte depuis α.1.5
  //   .vc3-module-panel  DOM=0 — les modules s'ouvrent desormais dans
  //                              Modale.jsx (portail), panneau `.mdl-panneau`
  // Ici le clic n'etait PAS garde : il partait sur un locator a zero noeud,
  // attendait son timeout, et faisait remonter un « Crash parcours » par
  // navigateur. C'est ce crash qui occupait l'unique place que la baseline
  // reserve aux erreurs transitoires — d'ou une PR sur deux qui rougissait
  // au gre du compute-pressure ou d'un 404 CDN.
  //
  // La navigation vise les DEUX sources filtrees par `:visible` : l'agent
  // tourne aussi en mobile-safari (iPhone 14, 390 px), sous le seuil 768 ou
  // `.bl` est en display:none et ou la feuille « Explorer » prend le relais.
  await ouvrirNavVitrine(page, 'offres');
  await page.locator(selModule('permanent')).first().click();
  await page.locator('.mdl-panneau').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('.vc4-permanent-chambre-cta').first().click();
  await page.locator('.vc3-reserve-modal').waitFor({ state: 'visible', timeout: 5000 });
  compteurs.actions += 1;
  const chambres = page.locator('.vc3-reserve-ch');
  const nbCh = await chambres.count();
  if (nbCh > 1) {
    await chambres.nth(1).click();
    compteurs.actions += 1;
  }
  await page.locator('.vc3-reserve-close').click();
  await page.locator('.vc3-reserve-modal').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  compteurs.actions += 3;

  // Refermer la modale du module : Modale.jsx capte la touche Echap, donc
  // l'Escape de fin de parcours fermerait ELLE et non la vitrine.
  await page.locator('.mdl-close').first().click().catch(() => {});
  await page.locator('.mdl-panneau').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  compteurs.actions += 1;

  // S2-α.1.5 Option A : mode présentation supprimé (régression volontaire documentée
  // dans PR #23). Le parcours mode-pres est retiré ; il sera rapatrié si le mode
  // présentation revient via les régressions à reprendre post-α.1.5.

  await page.keyboard.press('Escape');
  await page.locator('.vc3-overlay').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  compteurs.actions += 1;
}

async function parcoursComplet(page, chateaux, compteurs) {
  compteurs.pages = 1;
  await page.goto(BASE_URL);
  await page.waitForLoadState('domcontentloaded');
  await scrollPage(page);
  compteurs.actions += 2;

  for (const ch of chateaux) {
    compteurs.pages++;
    await parcoursVitrine(page, ch, compteurs);
  }
}

// ── Normalisation pour dédup ──
function normaliserPourDedup(texte) {
  return String(texte || '')
    .replace(/https?:\/\/[^\s)'"]+/g, '<url>')
    .replace(/:\d+:\d+/g, '')
    .replace(/\s+at\s.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function categoriser(texte) {
  const t = (texte || '').toLowerCase();
  if (/warning:|react|jsx|hydration/.test(t)) return 'react';
  if (/network|failed to fetch|err_|requête échouée/.test(t)) return 'network';
  if (/typeerror|syntaxerror|referenceerror|undefined is|null is|is not a function/.test(t)) return 'javascript';
  return 'autre';
}

function estRessourceExterne(url) {
  try {
    const h = new URL(url).hostname;
    return h !== 'localhost' && h !== '127.0.0.1' && h !== '::1';
  } catch {
    return false;
  }
}

// ── Exécution d'un navigateur ──
async function runNavigateur(nav, chateaux) {
  const events = [];
  const compteurs = { actions: 0, pages: 0, cancelsFiltres: 0 };

  // ── Memoire de correlation, DISTINCTE de events[] ──────────────────────────
  // Toute URL qui echoue passe ici, SANS AUCUN FILTRE : hotes ignores compris,
  // cancels compris. C'est la difference avec events[], qui reste filtre pour
  // le rapport.
  //
  // POURQUOI DEUX LISTES. La correlation lisait events[] — c'est-a-dire la
  // liste DEJA filtree. Les trois listeners y renoncaient avant d'ecrire :
  //   response      `if (estBruit(url)) return`   -> 404 d'hote ignore invisible
  //   requestfailed `if (estBruit(url)) return`   -> idem pour les echecs reseau
  //   requestfailed `if (isCancel) return`        -> et tous les cancels avec
  //
  // Consequence mesuree : un 404 sur un hote ignore emet quand meme une
  // console.error « Failed to load resource », Playwright ne lui attache pas
  // d'URL, la correlation cherchait dans events[] et n'y trouvait rien — donc
  // aucun filtrage possible, et l'erreur finissait comptee comme LOCALE.
  // Un hote qu'on avait explicitement decide d'ignorer produisait ainsi une
  // fausse regression locale. Vu le 2026-08-17 : 9 occurrences en mobile-safari,
  // message sans URL, classe erreur.
  //
  // La liste est bornee : seule une fenetre de quelques secondes est lue, en
  // garder plus n'a aucune valeur et ferait croitre la memoire sur un parcours
  // de plusieurs minutes.
  const urlsEchouees = [];
  const MAX_CORRELATION = 300;
  const noterUrlEchouee = (url) => {
    if (!url) return;
    urlsEchouees.push({ url, ts: Date.now() });
    if (urlsEchouees.length > MAX_CORRELATION) urlsEchouees.shift();
  };

  let browser;
  try {
    browser = await nav.launcher.launch({ headless: true });
    const context = await browser.newContext(nav.contextOpts);
    const page = await context.newPage();

    page.on('console', (msg) => {
      const type = msg.type();
      if (type !== 'error' && type !== 'warning') return;
      const texte = msg.text();
      if (estBruit(texte)) return;

      // Corrélation URL pour console.error orphelines (Phase 1.x Chantier 1.8,
      // trou de correlation bouche le 2026-08-17).
      // Une console.error type "Failed to load resource" n'a pas d'URL exposée
      // par Playwright. On cherche en arrière la dernière URL en échec dans une
      // fenêtre de 5 secondes pour la récupérer.
      //
      // La recherche se fait dans `urlsEchouees` — la memoire NON filtree — et
      // non plus dans events[]. C'est tout l'objet du correctif : sans cela,
      // les URL des hotes ignores et des cancels n'y figuraient pas, et le
      // message orphelin ne pouvait etre rattache a rien.
      let urlAssociee = null;
      if (type === 'error' && /failed to load resource|net::|err_|status of \d{3}/i.test(texte)) {
        const FENETRE_MS = 5000;
        const maintenant = Date.now();
        for (let i = urlsEchouees.length - 1; i >= 0; i--) {
          const e = urlsEchouees[i];
          if (maintenant - e.ts > FENETRE_MS) break;
          urlAssociee = e.url;
          break;
        }
        if (urlAssociee && estBruit(urlAssociee)) return;
      }

      // Classification reseau, contrat d'en-tete du fichier : « tout hostname
      // != localhost = avertissement (CDN externe flaky), hostname localhost en
      // echec = erreur (regression locale) ». Elle etait appliquee par les
      // listeners reseau mais PAS ici : un message console rattache a une URL
      // externe restait compte comme erreur. Une fois l'URL connue, on tranche
      // avec la meme regle que partout ailleurs.
      const type_ =
        type === 'error' && urlAssociee && estRessourceExterne(urlAssociee)
          ? 'avertissement'
          : type === 'error'
            ? 'erreur'
            : 'avertissement';

      events.push({
        type: type_,
        message: texte,
        navigateur: nav.id,
        urlPage: page.url(),
        ...(urlAssociee ? { urlAssociee } : {}),
        ts: Date.now(),
      });
    });
    page.on('pageerror', (err) => {
      const texte = String((err && err.message) || err || '');
      if (estBruit(texte)) return;
      events.push({
        type: 'erreur',
        message: texte,
        navigateur: nav.id,
        urlPage: page.url(),
        ts: Date.now(),
      });
    });
    page.on('requestfailed', (req) => {
      const url = req.url();
      // AVANT tout filtrage : la correlation doit voir cette URL meme si on
      // decide ensuite de ne pas la rapporter (hote ignore, ou cancel).
      noterUrlEchouee(url);
      if (estBruit(url)) return;
      const fail = req.failure();
      const errText = (fail && fail.errorText) || 'requête échouée';
      const isCancel = /cancel|abort/i.test(errText);
      // Les cancels (net::ERR_ABORTED, Load request cancelled) sont des requêtes
      // que le navigateur a abandonnées parce que la page a navigué ou qu'un
      // composant a démonté. Elles n'ont jamais produit d'erreur visible
      // utilisateur et ne sont pas un bug applicatif. On les compte en
      // télémétrie brute (compteurs.cancelsFiltres → agrégé dans
      // occurrencesTotales et reseauxEchecs) pour détecter d'éventuels
      // cancel-storms (composant qui remonte en boucle), mais on les exclut de
      // events[] — donc de details[] et des compteurs erreurs/avertissements —
      // pour ne pas créer de churn de baseline à chaque variation de timing E2E.
      // Voir CI run #25724409954 (12 mai 2026).
      if (isCancel) {
        compteurs.cancelsFiltres++;
        return;
      }
      events.push({
        type: estRessourceExterne(url) ? 'avertissement' : 'erreur',
        message: `Requête échouée : ${errText}`,
        urlEchouee: url,
        navigateur: nav.id,
        urlPage: page.url(),
        ts: Date.now(),
      });
    });
    page.on('response', (res) => {
      // Corrélation 4xx/5xx orphelines (Phase 1.x Chantier 1.10).
      // Playwright émet 'response' (pas 'requestfailed') pour les responses
      // HTTP d'erreur. Sans ce listener, leur URL n'entre jamais dans events[]
      // et la corrélation du listener console échoue silencieusement.
      const status = res.status();
      if (status < 400) return;
      const url = res.url();
      // AVANT tout filtrage, meme raison que dans requestfailed : c'est
      // precisement le 404 d'hote ignore qui produisait la fausse erreur locale.
      noterUrlEchouee(url);
      if (estBruit(url)) return;
      events.push({
        type: estRessourceExterne(url) ? 'avertissement' : 'erreur',
        message: `Réponse HTTP ${status}`,
        urlEchouee: url,
        navigateur: nav.id,
        urlPage: page.url(),
        ts: Date.now(),
      });
    });

    await Promise.race([
      parcoursComplet(page, chateaux, compteurs),
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error(`timeout parcours ${TIMEOUT_NAVIGATEUR / 1000}s`)), TIMEOUT_NAVIGATEUR)
      ),
    ]);
  } catch (err) {
    events.push({
      type: 'erreur',
      message: `Crash parcours : ${String((err && err.message) || err)}`,
      navigateur: nav.id,
      urlPage: '(inconnue)',
      ts: Date.now(),
    });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
  return { events, compteurs };
}

// ── Main ──
async function main() {
  const debut = Date.now();

  await lancerViteSiBesoin();

  // Decouverte DOM des chateaux servis (une fois, via un navigateur jetable).
  let chateauxVitrine;
  {
    const browser = await chromium.launch({ headless: true });
    try {
      chateauxVitrine = await decouvrirChateauxServis(await browser.newPage());
    } finally {
      await browser.close().catch(() => {});
    }
  }

  if (chateauxVitrine.length === 0) {
    console.warn('[console-errors] Aucune vitrine servie sur la home — agent skippé.');
    ecrireRapport({
      ok: true,
      dureeSec: 0,
      stats: { navigateursTestes: 0, pagesVisitees: 0, actionsExecutees: 0, erreurs: 0, avertissements: 0, occurrencesTotales: 0, reseauxEchecs: 0 },
      details: [{ type: 'info', message: 'Aucune vitrine servie sur la home' }],
    });
    process.exit(0);
  }

  const navigateursActifs = NAVIGATEURS.filter((n) => !skipNavs.has(n.id));
  const allEvents = [];
  let totalActions = 0;
  let totalCancelsFiltres = 0;
  let pagesParNav = 1 + chateauxVitrine.length;

  for (const nav of navigateursActifs) {
    console.log(`[console-errors] Navigateur ${nav.id} — démarrage parcours`);
    const { events, compteurs } = await runNavigateur(nav, chateauxVitrine);
    allEvents.push(...events);
    totalActions += compteurs.actions;
    totalCancelsFiltres += compteurs.cancelsFiltres;
  }

  // Dédup : clé = type + message normalisé + navigateur
  const dedup = new Map();
  let occurrencesTotales = 0;
  let reseauxEchecs = 0;
  for (const e of allEvents) {
    occurrencesTotales++;
    if (e.urlEchouee) reseauxEchecs++;
    const cle = `${e.type}::${normaliserPourDedup(e.message)}::${e.navigateur}`;
    if (!dedup.has(cle)) {
      dedup.set(cle, { ...e, occurrences: 1 });
    } else {
      dedup.get(cle).occurrences++;
    }
  }

  // Les cancels filtrés (cf. listener requestfailed) ne sont pas dans allEvents
  // mais comptent en télémétrie brute : un cancel = +1 occurrence et +1 échec
  // réseau (il a toujours une URL), comme avant le fix #25724409954.
  occurrencesTotales += totalCancelsFiltres;
  reseauxEchecs += totalCancelsFiltres;

  const details = [];
  // Comptage stats (Option X) : (type x message normalise) UNIQUES, navigateur IGNORE.
  // Le compteur reflete le nombre de defauts distincts, independant du nombre de
  // navigateurs (qa-fast 1 nav == qa-full 3 nav). details[] garde navigateur (debug).
  const uniqErr = new Set();
  const uniqWarn = new Set();
  for (const v of dedup.values()) {
    const entry = {
      type: v.type,
      message: v.message,
      navigateur: v.navigateur,
      urlPage: v.urlPage,
      categorie: categoriser(v.message),
    };
    if (v.occurrences > 1) entry.occurrences = v.occurrences;
    if (v.urlEchouee) entry.urlEchouee = v.urlEchouee;
    details.push(entry);
    const cleUnique = `${v.type}::${normaliserPourDedup(v.message)}`;
    if (v.type === 'erreur') uniqErr.add(cleUnique);
    else if (v.type === 'avertissement') uniqWarn.add(cleUnique);
  }

  const stats = {
    navigateursTestes: navigateursActifs.length,
    pagesVisitees: pagesParNav,
    actionsExecutees: totalActions,
    erreurs: uniqErr.size,
    avertissements: uniqWarn.size,
    occurrencesTotales,
    reseauxEchecs,
    cancelsFiltres: totalCancelsFiltres,
  };

  const okGlobal = stats.erreurs === 0;
  ecrireRapport({
    ok: okGlobal,
    dureeSec: Math.round((Date.now() - debut) / 1000),
    stats,
    details,
  });

  console.log(`\n⚜  Erreurs console · ${stats.erreurs} erreur(s) · ${stats.avertissements} avertissement(s) (${stats.occurrencesTotales} occurrences)`);
  console.log(`   ${stats.navigateursTestes} navigateur(s) · ${stats.pagesVisitees} pages/nav · ${stats.actionsExecutees} actions totales`);
  if (stats.reseauxEchecs > 0) console.log(`   ${stats.reseauxEchecs} requête(s) réseau échouée(s)`);

  process.exit(okGlobal ? 0 : 1);
}

function ecrireRapport({ ok, dureeSec, stats, details }) {
  const rapport = {
    agent: ID,
    libelle: LIBELLE,
    ok,
    dureeSec,
    stats,
    details,
    timestamp: new Date().toISOString(),
  };
  fs.mkdirSync(path.join(ROOT, 'qa-reports'), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, 'qa-reports', `${ID}.json`),
    JSON.stringify(rapport, null, 2)
  );
}

main().catch((err) => {
  console.error('[console-errors] crash :', err);
  process.exit(2);
});
