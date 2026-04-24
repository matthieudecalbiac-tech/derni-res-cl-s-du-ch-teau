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
const { getChateauxVitrine } = require('../lib/charger-chateaux.cjs');

const ROOT = path.join(__dirname, '..', '..');
const ID = 'console-errors';
const LIBELLE = 'Erreurs console';
const PORT = Number(process.env.PORT) || 5174;
const BASE_URL = `http://localhost:${PORT}`;
const TIMEOUT_NAVIGATEUR = 90_000;
const TIMEOUT_VITE_BOOT = 60_000;

// ── Filtres de bruit courant ──
const IGNORE_PATTERNS = [
  /Download the React DevTools/i,
  /\[vite\] (connecting|connected)/i,
  /\[vite\] hot updated/i,
  /\[HMR\]/i,
  /favicon\.ico/i,
  /\[violation\].*handler took/i,
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
function regexNom(nom) {
  const e = String(nom).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(e, 'i');
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

async function ouvrirVitrineSurHome(page, chateau) {
  await page.goto(BASE_URL);
  await page.waitForLoadState('domcontentloaded');
  const article = page.locator('.une-semaine-demeure').filter({ hasText: regexNom(chateau.nom) });
  const cta = article.locator('.une-semaine-cta');
  await cta.scrollIntoViewIfNeeded();

  // Mobile-safari rate parfois le premier click — retry x3.
  let ouvert = false;
  for (let i = 0; i < 3; i++) {
    await cta.click();
    try {
      await page.locator('.vc3-overlay').waitFor({ state: 'visible', timeout: 3000 });
      ouvert = true;
      break;
    } catch {}
  }
  if (!ouvert) throw new Error(`Vitrine ${chateau.nom} : click CTA sans effet`);

  await page.locator('.tp-wrap').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
  await page.locator('.vc3-overlay.vc3-visible').waitFor({ state: 'visible', timeout: 3000 });
}

async function parcoursVitrine(page, chateau, compteurs) {
  await ouvrirVitrineSurHome(page, chateau);
  compteurs.actions += 2;

  await scrollVitrine(page);
  compteurs.actions += 1;

  await page.locator('.vc3-header-cta').click();
  await page.locator('.vc3-reserve-modal').waitFor({ state: 'visible', timeout: 5000 });
  const chambres = page.locator('.vc3-reserve-ch');
  const nbCh = await chambres.count();
  if (nbCh > 1) {
    await chambres.nth(1).click();
    compteurs.actions += 1;
  }
  await page.locator('.vc3-reserve-close').click();
  await page.locator('.vc3-reserve-modal').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  compteurs.actions += 3;

  const btnPres = page.locator('.vc3-mode-pres-btn');
  await btnPres.scrollIntoViewIfNeeded();
  await btnPres.click();
  await page.locator('.vc3-pres-overlay').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('.vc3-pres-close').click();
  await page.locator('.vc3-pres-overlay').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  compteurs.actions += 2;

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
  const compteurs = { actions: 0, pages: 0 };
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
      events.push({
        type: type === 'error' ? 'erreur' : 'avertissement',
        message: texte,
        navigateur: nav.id,
        urlPage: page.url(),
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
      });
    });
    page.on('requestfailed', (req) => {
      const url = req.url();
      if (estBruit(url)) return;
      const fail = req.failure();
      const errText = (fail && fail.errorText) || 'requête échouée';
      events.push({
        type: estRessourceExterne(url) ? 'avertissement' : 'erreur',
        message: `Requête échouée : ${errText}`,
        urlEchouee: url,
        navigateur: nav.id,
        urlPage: page.url(),
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
    });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
  return { events, compteurs };
}

// ── Main ──
async function main() {
  const debut = Date.now();

  const chateauxVitrine = getChateauxVitrine();
  if (chateauxVitrine.length === 0) {
    console.warn('[console-errors] Aucun château estLaUne:true — agent skippé.');
    ecrireRapport({
      ok: true,
      dureeSec: 0,
      stats: { navigateursTestes: 0, pagesVisitees: 0, actionsExecutees: 0, erreurs: 0, avertissements: 0, occurrencesTotales: 0, reseauxEchecs: 0 },
      details: [{ type: 'info', message: 'Aucun château estLaUne:true dans chateaux.js' }],
    });
    process.exit(0);
  }

  await lancerViteSiBesoin();

  const navigateursActifs = NAVIGATEURS.filter((n) => !skipNavs.has(n.id));
  const allEvents = [];
  let totalActions = 0;
  let pagesParNav = 1 + chateauxVitrine.length;

  for (const nav of navigateursActifs) {
    console.log(`[console-errors] Navigateur ${nav.id} — démarrage parcours`);
    const { events, compteurs } = await runNavigateur(nav, chateauxVitrine);
    allEvents.push(...events);
    totalActions += compteurs.actions;
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

  const details = [];
  let erreursUniques = 0;
  let avertissementsUniques = 0;
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
    if (v.type === 'erreur') erreursUniques++;
    if (v.type === 'avertissement') avertissementsUniques++;
  }

  const stats = {
    navigateursTestes: navigateursActifs.length,
    pagesVisitees: pagesParNav,
    actionsExecutees: totalActions,
    erreurs: erreursUniques,
    avertissements: avertissementsUniques,
    occurrencesTotales,
    reseauxEchecs,
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
