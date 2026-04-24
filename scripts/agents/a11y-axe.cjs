/**
 * Agent QA · Accessibilité via axe-core (WCAG 2.1 AA)
 *
 * Injecte axe-core sur chaque checkpoint d'un parcours utilisateur scripté
 * et récupère violations + passes + incomplete pour 3 navigateurs
 * (chromium-desktop, webkit-desktop, mobile-safari).
 *
 * Checkpoints par navigateur :
 *   1. home (après goto + domcontentloaded)
 *   Pour chaque château avec estLaUne:true (vitrines) :
 *   2. vitrine-ouverte:<slug> (après ouvrirVitrine, .vc3-overlay.vc3-visible)
 *   3. modale-reservation:<slug> (après clic .vc3-header-cta, modale visible)
 *   4. mode-presentation:<slug> (après clic .vc3-mode-pres-btn, overlay visible)
 *
 * Avec 2 vitrines : 1 + 3×2 = 7 checkpoints par navigateur, soit 21 total
 * sur 3 navigateurs.
 *
 * Classification des violations (seuils Y validés) :
 *   impact critical || serious → type 'erreur' (bloque ok: false)
 *   impact moderate || minor   → type 'avertissement' (n'affecte pas le verdict)
 *
 * Dédup : clé = (rule id + checkpoint + navigateur). Nombre de nœuds DOM
 * dans compteurViolations, 3 premiers selectors dans premiersNodes.
 *
 * Vite lifecycle : démarre le dev server s'il est absent sur localhost:5174,
 * laissé tournant pour les agents suivants. [Duplication de console-errors.cjs
 * — candidat à extraction dans scripts/lib/vite-lifecycle.cjs si un 3e agent
 * Playwright est créé.]
 *
 * Env :
 *   - A11Y_SKIP_BROWSERS=webkit-desktop,mobile-safari → skipper navs
 *   - A11Y_TAGS=wcag2aa,wcag21aa → override tags (défaut : tous WCAG 2.0/2.1 A+AA)
 *   - PORT=5175 → cible un autre port Vite
 */
const { chromium, webkit, devices } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { getChateauxVitrine } = require('../lib/charger-chateaux.cjs');

const ROOT = path.join(__dirname, '..', '..');
const ID = 'a11y-axe';
const LIBELLE = 'Accessibilité (axe)';
const PORT = Number(process.env.PORT) || 5174;
const BASE_URL = `http://localhost:${PORT}`;
const TIMEOUT_NAVIGATEUR = 120_000;
const TIMEOUT_VITE_BOOT = 60_000;

const WCAG_TAGS_DEFAUT = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const WCAG_TAGS = process.env.A11Y_TAGS
  ? process.env.A11Y_TAGS.split(',').map((s) => s.trim()).filter(Boolean)
  : WCAG_TAGS_DEFAUT;

const NAVIGATEURS = [
  { id: 'chromium-desktop', launcher: chromium, contextOpts: { viewport: { width: 1440, height: 900 } } },
  { id: 'webkit-desktop',   launcher: webkit,   contextOpts: { viewport: { width: 1440, height: 900 } } },
  { id: 'mobile-safari',    launcher: webkit,   contextOpts: { ...devices['iPhone 14'] } },
];

const skipNavs = new Set(
  (process.env.A11Y_SKIP_BROWSERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

// ── Vite lifecycle (dupliqué de console-errors.cjs, cf. note en-tête) ──
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
    console.log(`[a11y-axe] Vite déjà actif sur ${BASE_URL}, réutilisation.`);
    return;
  }
  const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!fs.existsSync(viteBin)) {
    throw new Error(`Vite CLI introuvable (${viteBin}). npm install nécessaire ?`);
  }
  console.log(`[a11y-axe] Démarrage Vite détaché sur port ${PORT}...`);
  const child = spawn(process.execPath, [viteBin, '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  const debut = Date.now();
  while (Date.now() - debut < TIMEOUT_VITE_BOOT) {
    if (await checkVite()) {
      console.log(`[a11y-axe] Vite prêt après ${Math.round((Date.now() - debut) / 1000)}s (laissé tournant).`);
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

async function ouvrirVitrineSurHome(page, chateau) {
  await page.goto(BASE_URL);
  await page.waitForLoadState('domcontentloaded');
  const article = page.locator('.une-semaine-demeure').filter({ hasText: regexNom(chateau.nom) });
  const cta = article.locator('.une-semaine-cta');
  await cta.scrollIntoViewIfNeeded();

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

// ── Exécution axe sur la page courante ──
async function auditerPage(page, checkpoint, navigateur) {
  const r = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return {
    checkpoint,
    navigateur,
    violations: r.violations,
    passesIds: r.passes.map((p) => p.id),
    incompleteIds: r.incomplete.map((i) => i.id),
  };
}

// ── Parcours complet par navigateur ──
async function executerParcours(page, nav, chateaux, audits) {
  // Home
  await page.goto(BASE_URL);
  await page.waitForLoadState('domcontentloaded');
  audits.push(await auditerPage(page, 'home', nav.id));

  for (const ch of chateaux) {
    const slug = ch.slug || `id-${ch.id}`;

    await ouvrirVitrineSurHome(page, ch);
    audits.push(await auditerPage(page, `vitrine-ouverte:${slug}`, nav.id));

    // Modale réservation
    const hcta = page.locator('.vc3-header-cta');
    if ((await hcta.count()) > 0) {
      try {
        await hcta.click();
        await page.locator('.vc3-reserve-modal').waitFor({ state: 'visible', timeout: 5000 });
        audits.push(await auditerPage(page, `modale-reservation:${slug}`, nav.id));
        await page.locator('.vc3-reserve-close').click();
        await page.locator('.vc3-reserve-modal').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      } catch (e) {
        console.warn(`[a11y-axe] modale-reservation:${slug} non auditée (${e.message || e})`);
      }
    } else {
      console.log(`[a11y-axe] modale-reservation:${slug} : pas de .vc3-header-cta — checkpoint skippé`);
    }

    // Mode présentation
    const btnPres = page.locator('.vc3-mode-pres-btn');
    if ((await btnPres.count()) > 0) {
      try {
        await btnPres.scrollIntoViewIfNeeded();
        await btnPres.click();
        await page.locator('.vc3-pres-overlay').waitFor({ state: 'visible', timeout: 5000 });
        audits.push(await auditerPage(page, `mode-presentation:${slug}`, nav.id));
        await page.locator('.vc3-pres-close').click();
        await page.locator('.vc3-pres-overlay').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      } catch (e) {
        console.warn(`[a11y-axe] mode-presentation:${slug} non auditée (${e.message || e})`);
      }
    } else {
      console.log(`[a11y-axe] mode-presentation:${slug} : pas de .vc3-mode-pres-btn — checkpoint skippé`);
    }

    // Fermer la vitrine pour le prochain tour
    await page.keyboard.press('Escape');
    await page.locator('.vc3-overlay').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
}

async function runNavigateur(nav, chateaux) {
  const audits = [];
  let browser;
  try {
    browser = await nav.launcher.launch({ headless: true });
    const context = await browser.newContext(nav.contextOpts);
    const page = await context.newPage();

    await Promise.race([
      executerParcours(page, nav, chateaux, audits),
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error(`timeout parcours ${TIMEOUT_NAVIGATEUR / 1000}s`)), TIMEOUT_NAVIGATEUR)
      ),
    ]);
  } catch (err) {
    // Crash du parcours → enregistre comme checkpoint 'agent-error'
    audits.push({
      checkpoint: 'agent-error',
      navigateur: nav.id,
      violations: [
        {
          id: 'agent-crash',
          impact: 'critical',
          help: `Agent a11y crash : ${String((err && err.message) || err)}`,
          helpUrl: '',
          nodes: [],
        },
      ],
      passesIds: [],
      incompleteIds: [],
    });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
  return audits;
}

// ── Main ──
async function main() {
  const debut = Date.now();

  const chateaux = getChateauxVitrine();
  if (chateaux.length === 0) {
    console.warn('[a11y-axe] Aucun château estLaUne:true — agent skippé.');
    ecrireRapport({
      ok: true,
      dureeSec: 0,
      stats: {
        navigateursTestes: 0, checkpointsAudites: 0, regleTotalesTestees: 0,
        violationsCritical: 0, violationsSerious: 0, violationsModerate: 0, violationsMinor: 0,
        violationsUniques: 0, noeudsAffectes: 0, passes: 0, incomplete: 0,
      },
      details: [{ type: 'info', message: 'Aucun château estLaUne:true dans chateaux.js' }],
    });
    process.exit(0);
  }

  await lancerViteSiBesoin();

  const navsActifs = NAVIGATEURS.filter((n) => !skipNavs.has(n.id));
  const tousAudits = [];

  for (const nav of navsActifs) {
    console.log(`[a11y-axe] ${nav.id} — démarrage parcours`);
    const audits = await runNavigateur(nav, chateaux);
    tousAudits.push(...audits);
    console.log(`[a11y-axe] ${nav.id} — ${audits.length} checkpoint(s) audité(s)`);
  }

  // ── Agrégation + dédup ──
  const dedup = new Map();
  const reglesEvaluees = new Set();
  const stats = {
    navigateursTestes: navsActifs.length,
    checkpointsAudites: tousAudits.length,
    regleTotalesTestees: 0,
    violationsCritical: 0,
    violationsSerious: 0,
    violationsModerate: 0,
    violationsMinor: 0,
    violationsUniques: 0,
    noeudsAffectes: 0,
    passes: 0,
    incomplete: 0,
  };

  for (const audit of tousAudits) {
    stats.passes += audit.passesIds.length;
    stats.incomplete += audit.incompleteIds.length;
    for (const id of audit.passesIds) reglesEvaluees.add(id);
    for (const id of audit.incompleteIds) reglesEvaluees.add(id);
    for (const v of audit.violations) {
      reglesEvaluees.add(v.id);
      const nodes = Array.isArray(v.nodes) ? v.nodes : [];
      stats.noeudsAffectes += nodes.length;
      const cle = `${v.id}::${audit.checkpoint}::${audit.navigateur}`;
      if (!dedup.has(cle)) {
        dedup.set(cle, {
          regleId: v.id,
          impact: v.impact || 'minor',
          help: v.help || v.description || v.id,
          helpUrl: v.helpUrl || '',
          checkpoint: audit.checkpoint,
          navigateur: audit.navigateur,
          nodes,
        });
      } else {
        dedup.get(cle).nodes.push(...nodes);
      }
    }
  }
  stats.regleTotalesTestees = reglesEvaluees.size;

  const details = [];
  for (const v of dedup.values()) {
    const estErreur = v.impact === 'critical' || v.impact === 'serious';
    const entry = {
      type: estErreur ? 'erreur' : 'avertissement',
      message: v.help,
      regleId: v.regleId,
      impact: v.impact,
      checkpoint: v.checkpoint,
      navigateur: v.navigateur,
      compteurViolations: v.nodes.length,
      premiersNodes: v.nodes.slice(0, 3).map((n) => {
        if (n && Array.isArray(n.target) && n.target.length > 0) return n.target.join(' ');
        return '(sans selector)';
      }),
      helpUrl: v.helpUrl,
    };
    details.push(entry);
    stats.violationsUniques++;
    if (v.impact === 'critical') stats.violationsCritical++;
    else if (v.impact === 'serious') stats.violationsSerious++;
    else if (v.impact === 'moderate') stats.violationsModerate++;
    else stats.violationsMinor++;
  }

  const okGlobal = stats.violationsCritical === 0 && stats.violationsSerious === 0;
  ecrireRapport({
    ok: okGlobal,
    dureeSec: Math.round((Date.now() - debut) / 1000),
    stats,
    details,
  });

  console.log(
    `\n⚜  Accessibilité · ${stats.violationsCritical} critique(s) · ${stats.violationsSerious} sérieuse(s) · ` +
      `${stats.violationsModerate} modérée(s) · ${stats.violationsMinor} mineure(s)`
  );
  console.log(
    `   ${stats.checkpointsAudites} checkpoints · ${stats.noeudsAffectes} nœuds affectés · ${stats.passes} passes · ${stats.incomplete} incomplete`
  );

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
  console.error('[a11y-axe] crash :', err);
  process.exit(2);
});
