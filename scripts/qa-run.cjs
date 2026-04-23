/**
 * Orchestration QA · LCC
 *
 * Table déclarative AGENTS : chaque agent est un script Node autonome qui
 * écrit son bilan dans qa-reports/<id>.json au format commun
 *   { agent, libelle, ok, dureeSec, stats, details, timestamp }.
 *
 * Le bilan global reste sérialisé dans qa-status.json avec la forme
 * rétro-compatible attendue par le dashboard (etapes[].nom / .ok).
 *
 * Usage :
 *   node scripts/qa-run.cjs                 → E2E + visuel
 *   node scripts/qa-run.cjs --fast          → E2E seulement
 *   node scripts/qa-run.cjs --visual        → E2E + visuel (explicite)
 *   node scripts/qa-run.cjs --perf          → E2E + visuel + Lighthouse
 *   node scripts/qa-run.cjs --update-snaps  → régénère les snapshots
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const opts = {
  fast: args.includes('--fast'),
  withVisual: args.includes('--visual') || (!args.includes('--fast') && !args.includes('--no-visual')),
  withPerf: args.includes('--perf'),
  updateSnaps: args.includes('--update-snaps'),
};

const AGENTS = [
  {
    id: 'validation-donnees',
    libelle: 'Validation données',
    script: 'scripts/agents/validation-donnees.cjs',
    actif: () => true,
    flags: () => [],
  },
  {
    id: 'console-errors',
    libelle: 'Erreurs console',
    script: 'scripts/agents/console-errors.cjs',
    actif: () => true,
    flags: () => [],
  },
  {
    id: 'a11y-axe',
    libelle: 'Accessibilité (axe)',
    script: 'scripts/agents/a11y-axe.cjs',
    actif: () => true,
    flags: () => [],
  },
  {
    id: 'playwright-e2e',
    libelle: 'Tests E2E',
    script: 'scripts/agents/playwright-e2e.cjs',
    actif: () => true,
    flags: () => [],
  },
  {
    id: 'playwright-visual',
    libelle: 'Régression visuelle',
    script: 'scripts/agents/playwright-visual.cjs',
    actif: (o) => o.withVisual,
    flags: (o) => (o.updateSnaps ? ['--update-snaps'] : []),
  },
  {
    id: 'lighthouse',
    libelle: 'Lighthouse',
    script: 'scripts/agents/lighthouse.cjs',
    actif: (o) => o.withPerf,
    flags: () => [],
  },
];

const LOG = {
  ok: (m) => console.log(`\x1b[32m✓\x1b[0m ${m}`),
  ko: (m) => console.log(`\x1b[31m✗\x1b[0m ${m}`),
  info: (m) => console.log(`\x1b[36m→\x1b[0m ${m}`),
  bloc: (m) => console.log(`\n\x1b[1m\x1b[35m━━ ${m} ━━\x1b[0m\n`),
};

function lancerAgent(agent, extra) {
  const cmd = `node ${agent.script}${extra.length ? ' ' + extra.join(' ') : ''}`;
  LOG.bloc(agent.libelle);
  LOG.info(cmd);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: ROOT });
    LOG.ok(`${agent.libelle} · OK`);
    return { nom: agent.libelle, ok: true };
  } catch (err) {
    LOG.ko(`${agent.libelle} · ÉCHEC`);
    return { nom: agent.libelle, ok: false, erreur: err.message };
  }
}

const debut = Date.now();
const resultats = [];

for (const agent of AGENTS) {
  if (!agent.actif(opts)) continue;
  resultats.push(lancerAgent(agent, agent.flags(opts)));
}

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

fs.writeFileSync(path.join(ROOT, 'qa-status.json'), JSON.stringify(etat, null, 2));

LOG.bloc('BILAN');
console.log(`Durée : ${etat.dureeSec}s  ·  Cible : ${etat.cible}`);
resultats.forEach((r) => {
  (r.ok ? LOG.ok : LOG.ko)(r.nom);
});
console.log(`\nDashboard : npm run qa:dashboard  →  http://localhost:9323\n`);

process.exit(etat.ok ? 0 : 1);
