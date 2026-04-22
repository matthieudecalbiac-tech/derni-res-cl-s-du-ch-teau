/**
 * Agent QA · Régression visuelle Playwright
 *
 * Flag --update-snaps : régénère les snapshots de référence au lieu de comparer.
 * Pas de reporter JSON ici (on reste sur list pour ne pas écraser qa-results.json) :
 * le verdict ok/ko se déduit du code de sortie.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const ID = 'playwright-visual';
const LIBELLE = 'Régression visuelle';
const updateSnaps = process.argv.includes('--update-snaps');

const cmd = updateSnaps
  ? 'npx playwright test tests/visual --update-snapshots'
  : 'npx playwright test tests/visual --reporter=list';

const debut = Date.now();
let okRun = true;
const details = [];

try {
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
} catch (err) {
  okRun = false;
  details.push({ type: 'erreur', message: String(err.message || err).split('\n')[0] });
}

const rapport = {
  agent: ID,
  libelle: LIBELLE,
  ok: okRun,
  dureeSec: Math.round((Date.now() - debut) / 1000),
  stats: { mode: updateSnaps ? 'update' : 'compare' },
  details,
  timestamp: new Date().toISOString(),
};

fs.mkdirSync(path.join(ROOT, 'qa-reports'), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, 'qa-reports', `${ID}.json`),
  JSON.stringify(rapport, null, 2)
);

process.exit(okRun ? 0 : 1);
