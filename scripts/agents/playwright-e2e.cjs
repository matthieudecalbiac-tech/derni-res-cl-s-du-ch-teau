/**
 * Agent QA · Tests E2E Playwright
 *
 * Exécute le suite E2E avec le reporter JSON (qa-results.json),
 * puis écrit un bilan au format commun dans qa-reports/playwright-e2e.json.
 *
 * Env :
 *   E2E_PROJECTS=chromium-desktop               → restreint à un project
 *   E2E_PROJECTS=chromium-desktop,webkit-desktop → restreint à 2 projects
 *   (vide / non défini → tous les projects de playwright.config.cjs)
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const ID = 'playwright-e2e';
const LIBELLE = 'Tests E2E';

const debut = Date.now();
let okRun = true;
const details = [];

const projects = (process.env.E2E_PROJECTS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const flagsProjects = projects.map((p) => `--project=${p}`).join(' ');
const cmd = `npx playwright test tests/e2e --reporter=list,json${flagsProjects ? ' ' + flagsProjects : ''}`;

try {
  // --reporter=list,json sur CLI écrase l'outputFile du config. On force la
  // destination du JSON via PLAYWRIGHT_JSON_OUTPUT_NAME pour que le bilan
  // soit écrit dans qa-results.json et pas sur stdout.
  execSync(cmd, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: 'qa-results.json' },
  });
} catch (err) {
  okRun = false;
  details.push({ type: 'erreur', message: String(err.message || err).split('\n')[0] });
}

const dureeSec = Math.round((Date.now() - debut) / 1000);
let stats = {};

try {
  const brut = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa-results.json'), 'utf8'));
  const s = brut.stats || {};
  stats = {
    total: (s.expected || 0) + (s.unexpected || 0) + (s.skipped || 0) + (s.flaky || 0),
    ok: s.expected || 0,
    ko: s.unexpected || 0,
    skipped: s.skipped || 0,
    flaky: s.flaky || 0,
  };
} catch (err) {
  details.push({ type: 'avertissement', message: `Lecture qa-results.json : ${err.message}` });
}

const rapport = {
  agent: ID,
  libelle: LIBELLE,
  ok: okRun,
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

process.exit(okRun ? 0 : 1);
