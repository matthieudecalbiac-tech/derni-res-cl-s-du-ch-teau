/**
 * Orchestration QA complète
 *
 * Lance dans l'ordre :
 *   1. Tests E2E Playwright
 *   2. Tests régression visuelle
 *   3. Lighthouse (si --perf)
 *   4. Sauvegarde état → dashboard
 *
 * Usage :
 *   node scripts/qa-run.cjs                 → tout
 *   node scripts/qa-run.cjs --fast          → E2E seulement
 *   node scripts/qa-run.cjs --visual        → E2E + visuel
 *   node scripts/qa-run.cjs --update-snaps  → régénère les screenshots de référence
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const fast = args.includes('--fast');
const withVisual = args.includes('--visual') || (!fast && !args.includes('--no-visual'));
const withPerf = args.includes('--perf');
const updateSnaps = args.includes('--update-snaps');

const LOG = {
  ok: (m) => console.log(`\x1b[32m✓\x1b[0m ${m}`),
  ko: (m) => console.log(`\x1b[31m✗\x1b[0m ${m}`),
  info: (m) => console.log(`\x1b[36m→\x1b[0m ${m}`),
  bloc: (m) => console.log(`\n\x1b[1m\x1b[35m━━ ${m} ━━\x1b[0m\n`),
};

function runStep(nom, cmd) {
  LOG.bloc(nom);
  LOG.info(cmd);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    LOG.ok(`${nom} · OK`);
    return { nom, ok: true };
  } catch (err) {
    LOG.ko(`${nom} · ÉCHEC`);
    return { nom, ok: false, erreur: err.message };
  }
}

const resultats = [];
const debut = Date.now();

// 1. E2E
resultats.push(runStep(
  'Tests E2E',
  'npx playwright test tests/e2e --reporter=list,json'
));

// 2. Visuel
if (withVisual) {
  const cmd = updateSnaps
    ? 'npx playwright test tests/visual --update-snapshots'
    : 'npx playwright test tests/visual --reporter=list';
  resultats.push(runStep('Régression visuelle', cmd));
}

// 3. Lighthouse
if (withPerf) {
  resultats.push(runStep('Lighthouse', 'node scripts/lighthouse.cjs'));
}

// 4. État global → dashboard
const etat = {
  timestamp: new Date().toISOString(),
  dureeSec: Math.round((Date.now() - debut) / 1000),
  cible: process.env.QA_TARGET || 'local',
  baseUrl: process.env.QA_TARGET === 'prod'
    ? (process.env.QA_PROD_URL || 'https://derni-res-cl-s-du-ch-teau.vercel.app')
    : 'http://localhost:5174',
  etapes: resultats,
  ok: resultats.every((r) => r.ok),
};

fs.writeFileSync(
  path.join(__dirname, '..', 'qa-status.json'),
  JSON.stringify(etat, null, 2)
);

LOG.bloc('BILAN');
console.log(`Durée : ${etat.dureeSec}s  ·  Cible : ${etat.cible}`);
resultats.forEach((r) => {
  (r.ok ? LOG.ok : LOG.ko)(r.nom);
});
console.log(`\nDashboard : npm run qa:dashboard  →  http://localhost:9323\n`);

process.exit(etat.ok ? 0 : 1);
