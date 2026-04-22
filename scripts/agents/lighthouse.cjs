/**
 * Agent QA · Lighthouse
 *
 * Délègue à scripts/lighthouse.cjs (qui produit lighthouse-results.json,
 * logique inchangée), puis écrit un bilan au format commun dans
 * qa-reports/lighthouse.json.
 *
 * Note : ok=true signifie "run terminé sans crash". Les scores 0-100 sont
 *        dans stats — le dashboard les rend avec sa propre sémantique
 *        (bon / moyen / mauvais) plutôt qu'un pass/fail binaire.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const ID = 'lighthouse';
const LIBELLE = 'Lighthouse';

const debut = Date.now();
let okRun = true;
const details = [];

try {
  execSync('node scripts/lighthouse.cjs', { cwd: ROOT, stdio: 'inherit' });
} catch (err) {
  okRun = false;
  details.push({ type: 'erreur', message: String(err.message || err).split('\n')[0] });
}

let stats = {};
const pages = [];

try {
  const brut = JSON.parse(fs.readFileSync(path.join(ROOT, 'lighthouse-results.json'), 'utf8'));
  if (Array.isArray(brut) && brut.length > 0 && brut[0].scores) {
    stats = { ...brut[0].scores };
  }
  for (const r of brut) {
    pages.push({ type: 'page', nom: r.nom, url: r.url, scores: r.scores, metriques: r.metriques, erreur: r.erreur });
  }
} catch (err) {
  details.push({ type: 'avertissement', message: `Lecture lighthouse-results.json : ${err.message}` });
}

const rapport = {
  agent: ID,
  libelle: LIBELLE,
  ok: okRun,
  dureeSec: Math.round((Date.now() - debut) / 1000),
  stats,
  details: [...details, ...pages],
  timestamp: new Date().toISOString(),
};

fs.mkdirSync(path.join(ROOT, 'qa-reports'), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, 'qa-reports', `${ID}.json`),
  JSON.stringify(rapport, null, 2)
);

process.exit(okRun ? 0 : 1);
