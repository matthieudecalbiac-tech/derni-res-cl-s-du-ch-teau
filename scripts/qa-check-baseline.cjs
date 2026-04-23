/**
 * Script QA · Vérification baseline
 *
 * Compare les rapports qa-reports/*.json avec les seuils définis dans
 * qa-baseline.json à la racine. Sort exit 0 si toutes les métriques sont
 * sous ou égales aux seuils "max", exit 1 sinon (régression ou rapport
 * manquant), exit 2 si le fichier baseline est lui-même absent.
 *
 * Usage :
 *   node scripts/qa-check-baseline.cjs             # mode normal (tableau)
 *   node scripts/qa-check-baseline.cjs --strict    # idem, sémantique CI
 *   node scripts/qa-check-baseline.cjs --json      # sortie JSON
 *   node scripts/qa-check-baseline.cjs --help      # aide
 *
 * Mapping métriques (baseline → rapport) :
 *
 *   baseline.seuils['a11y-axe'].violationsCritical.max
 *     ↔ qa-reports/a11y-axe.json stats.violationsCritical
 *
 *   baseline.seuils['a11y-axe'].violationsSerious.max
 *     ↔ qa-reports/a11y-axe.json stats.violationsSerious
 *
 *   baseline.seuils['console-errors'].erreurs.max
 *     ↔ qa-reports/console-errors.json stats.erreurs
 *
 *   baseline.seuils['validation-donnees'].erreurs.max
 *     ↔ qa-reports/validation-donnees.json stats.anomaliesErreurs      (nommage différent)
 *
 *   baseline.seuils['validation-donnees'].avertissements.max
 *     ↔ qa-reports/validation-donnees.json stats.anomaliesAvertissements (nommage différent)
 *
 *   baseline.seuils['playwright-e2e'].ko.max
 *     ↔ qa-reports/playwright-e2e.json stats.ko
 *
 * Le baseline utilise volontairement des noms métier courts et uniformes
 * (erreurs, avertissements, ko) pour rester éditorial et lisible. Les
 * rapports techniques, eux, ont parfois des noms plus spécifiques — pour
 * validation-donnees en particulier, l'agent préfixe ses stats par
 * "anomalies" pour distinguer les anomalies data des erreurs Node. Le
 * mapping ci-dessous fait le pont ; c'est son rôle.
 *
 * Philosophie : la dette actuelle est acceptée et documentée dans les
 * champs "dette" de qa-baseline.json. Ce script protège uniquement contre
 * la dégradation future. Toute modification volontaire des seuils doit
 * passer par un commit chore(qa): révision baseline avec justification
 * dans meta.revisions.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASELINE_PATH = path.join(ROOT, 'qa-baseline.json');
const REPORTS_DIR = path.join(ROOT, 'qa-reports');

// ── Table de mapping (seuil baseline ↔ champ stats rapport) ──
// Voir commentaire d'en-tête : validation-donnees utilise anomaliesErreurs /
// anomaliesAvertissements côté rapport, le baseline reste en noms métier courts.
const MAPPING = [
  // [agentId,             baselineKey,           rapportStatKey,             displayLabel]
  ['a11y-axe',             'violationsCritical',  'violationsCritical',       'critical'],
  ['a11y-axe',             'violationsSerious',   'violationsSerious',        'serious'],
  ['console-errors',       'erreurs',             'erreurs',                  'erreurs'],
  ['validation-donnees',   'erreurs',             'anomaliesErreurs',         'erreurs'],
  ['validation-donnees',   'avertissements',      'anomaliesAvertissements',  'avertissements'],
  ['playwright-e2e',       'ko',                  'ko',                       'ko'],
];

// ── Args + couleurs ANSI ──
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  afficherAide();
  process.exit(0);
}
const modeStrict = args.includes('--strict');
const modeJson = args.includes('--json');

const useColor = !process.env.NO_COLOR && !modeJson;
function esc(code, s) { return useColor ? `\x1b[${code}m${s}\x1b[0m` : String(s); }
const c = {
  rouge:     (s) => esc('31', s),
  vert:      (s) => esc('32', s),
  jaune:     (s) => esc('33', s),
  gris:      (s) => esc('90', s),
  rougeBold: (s) => esc('1;31', s),
  vertBold:  (s) => esc('1;32', s),
  jauneBold: (s) => esc('1;33', s),
};

// ── Chargement ──
function chargerBaseline() {
  try {
    return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  } catch (err) {
    console.error(c.rougeBold('❌ Baseline absent ou illisible : ' + BASELINE_PATH));
    console.error('   ' + (err.code === 'ENOENT' ? 'Fichier introuvable. Créer qa-baseline.json à la racine du repo.' : err.message));
    process.exit(2);
  }
}

const cacheRapports = new Map();
function chargerRapport(agentId) {
  if (cacheRapports.has(agentId)) return cacheRapports.get(agentId);
  const p = path.join(REPORTS_DIR, agentId + '.json');
  let res = { etat: 'ok', rapport: null, erreur: null };
  try {
    res.rapport = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    res = { etat: err.code === 'ENOENT' ? 'manquant' : 'malforme', rapport: null, erreur: err.message };
  }
  cacheRapports.set(agentId, res);
  return res;
}

// ── Comparaison par métrique ──
function evaluerLigne(entry, baseline) {
  const [agentId, baselineKey, rapportKey, displayLabel] = entry;
  const def = baseline.seuils && baseline.seuils[agentId] && baseline.seuils[agentId][baselineKey];
  if (!def || typeof def.max !== 'number') {
    return { agent: agentId, metrique: displayLabel, seuil: '?', actuel: '?', delta: null, statut: 'baseline-manquant' };
  }
  const res = chargerRapport(agentId);
  if (res.etat === 'manquant') {
    return { agent: agentId, metrique: displayLabel, seuil: def.max, actuel: '—', delta: null, statut: 'rapport-manquant' };
  }
  if (res.etat === 'malforme') {
    return { agent: agentId, metrique: displayLabel, seuil: def.max, actuel: '—', delta: null, statut: 'rapport-malforme' };
  }
  const stats = res.rapport && res.rapport.stats;
  if (!stats || typeof stats[rapportKey] !== 'number') {
    return { agent: agentId, metrique: displayLabel, seuil: def.max, actuel: '—', delta: null, statut: 'stat-manquant' };
  }
  const actuel = stats[rapportKey];
  const delta = actuel - def.max;
  let statut;
  if (delta > 0) statut = 'regression';
  else if (delta === 0) statut = 'tangent';
  else statut = 'ok';
  return { agent: agentId, metrique: displayLabel, seuil: def.max, actuel, delta, statut };
}

// ── Rendu tableau ──
function padEndAnsi(s, w) {
  const visible = String(s).replace(/\x1b\[[0-9;]*m/g, '');
  const pad = Math.max(0, w - visible.length);
  return String(s) + ' '.repeat(pad);
}

function formatDelta(d) {
  if (d == null) return '—';
  if (d === 0) return '=';
  return d > 0 ? `+${d}` : String(d);
}

function formatStatut(statut) {
  switch (statut) {
    case 'ok':                return c.vert('✅ OK');
    case 'tangent':           return c.jaune('⚠  tangent');
    case 'regression':        return c.rougeBold('❌ RÉGRESSION');
    case 'rapport-manquant':  return c.jaune('⚠  rapport manquant');
    case 'rapport-malforme':  return c.jaune('⚠  rapport malformé');
    case 'stat-manquant':     return c.jaune('⚠  stat absent');
    case 'baseline-manquant': return c.rouge('❌ baseline incomplet');
    default:                  return statut;
  }
}

const COLS = [
  { label: 'Agent',     w: 20 },
  { label: 'Métrique',  w: 18 },
  { label: 'Seuil',     w: 9 },
  { label: 'Actuel',    w: 9 },
  { label: 'Delta',     w: 10 },
  { label: 'Statut',    w: 0 },   // dernière colonne, largeur libre
];

function afficherTableau(lignes) {
  const regressions = lignes.filter((l) => l.statut === 'regression').length;
  const manquants = lignes.filter((l) => ['rapport-manquant', 'rapport-malforme', 'stat-manquant', 'baseline-manquant'].includes(l.statut)).length;

  if (regressions === 0 && manquants === 0) {
    console.log(c.vertBold('✅ CHECK BASELINE — OK') + '\n');
  } else if (regressions > 0) {
    console.log(c.rougeBold('❌ CHECK BASELINE — RÉGRESSION DÉTECTÉE') + '\n');
  } else {
    console.log(c.jauneBold('⚠  CHECK BASELINE — RAPPORT MANQUANT OU MALFORMÉ') + '\n');
  }

  // En-tête + séparateur
  console.log(COLS.map((col) => padEndAnsi(col.label, col.w)).join(''));
  console.log(c.gris(COLS.map((col) => (col.w > 0 ? '─'.repeat(Math.max(1, col.w - 2)) + '  ' : '──────')).join('')));

  // Lignes
  for (const l of lignes) {
    const cells = [
      padEndAnsi(l.agent,                  COLS[0].w),
      padEndAnsi(l.metrique,               COLS[1].w),
      padEndAnsi(String(l.seuil),          COLS[2].w),
      padEndAnsi(String(l.actuel),         COLS[3].w),
      padEndAnsi(formatDelta(l.delta),     COLS[4].w),
      formatStatut(l.statut),
    ];
    console.log(cells.join(''));
  }

  // Synthèse + actions
  console.log();
  if (regressions === 0 && manquants === 0) {
    const total = lignes.length;
    const tangents = lignes.filter((l) => l.statut === 'tangent').length;
    const oks = lignes.filter((l) => l.statut === 'ok').length;
    console.log(`Dette documentée dans qa-baseline.json (voir champ "dette" par métrique) :`);
    console.log(`• Total : ${total} métriques sous ou égales aux seuils (${oks} en-dessous, ${tangents} tangentes)`);
    console.log(`• Aucune régression détectée`);
    console.log();
    console.log(c.vert('Exit 0 — OK pour merger / déployer'));
  } else {
    if (regressions > 0) {
      console.log(c.rougeBold(`⚠  ${regressions} régression(s) détectée(s).`));
      console.log();
      console.log('Actions possibles :');
      console.log();
      console.log('  1. Si la régression est involontaire (vrai bug à corriger) :');
      console.log('     → Fix le code ET re-lance la CI. Ne touche pas à qa-baseline.json.');
      console.log();
      console.log('  2. Si la régression est volontaire et acceptée (nouvelle dette consciente) :');
      console.log('     → Édite qa-baseline.json, mets à jour les champs "max" et "actuel"');
      console.log('       des métriques concernées.');
      console.log('     → Ajoute une entrée dans meta.revisions avec date + raison.');
      console.log('     → Commit séparé : chore(qa): révision baseline agent X.');
    }
    if (manquants > 0) {
      console.log(c.jauneBold(`⚠  ${manquants} rapport(s) manquant(s) / malformé(s) / incomplet(s). Relancer qa:fast avant re-vérification.`));
    }
    console.log();
    console.log(c.rouge('Exit 1 — CI bloquée'));
  }
}

function afficherJson(lignes) {
  const regressions = lignes.filter((l) => l.statut === 'regression').length;
  const manquants = lignes.filter((l) => ['rapport-manquant', 'rapport-malforme', 'stat-manquant', 'baseline-manquant'].includes(l.statut)).length;
  console.log(JSON.stringify({
    ok: regressions === 0 && manquants === 0,
    regressions,
    manquants,
    lignes,
  }, null, 2));
}

function afficherAide() {
  console.log(`Usage : node scripts/qa-check-baseline.cjs [options]

Compare les rapports qa-reports/*.json aux seuils de qa-baseline.json.

Exit 0  — toutes les métriques sous ou égales aux seuils "max"
Exit 1  — au moins une régression, ou un rapport manquant/malformé
Exit 2  — qa-baseline.json absent ou illisible à la racine

Options :
  --strict    Mode CI : un rapport absent ou malformé → exit 1 immédiat
              avec message fatal. Les régressions restent affichées
              normalement en tableau. En mode normal (sans --strict),
              un rapport manquant est seulement un warning jaune dans
              le tableau (utile en local pour check partiel).
  --json      Sortie JSON au lieu du tableau coloré (pour parsing)
  --help, -h  Affiche cette aide

Variables d'environnement :
  NO_COLOR=1  Désactive les couleurs ANSI (standard https://no-color.org)
`);
}

// ── Main ──
function main() {
  const baseline = chargerBaseline();

  // Mode --strict : pré-check qu'aucun rapport ne manque ni n'est malformé.
  // En CI, un rapport absent = un agent qui n'a pas tourné ou a crashé — on ne
  // peut rien valider silencieusement, on sort tout de suite avec un message
  // explicite. Les régressions restent affichées normalement en tableau.
  if (modeStrict) {
    const agentsRequis = [...new Set(MAPPING.map((e) => e[0]))];
    for (const agentId of agentsRequis) {
      const res = chargerRapport(agentId);
      if (res.etat === 'manquant' || res.etat === 'malforme') {
        const kind = res.etat === 'manquant' ? 'absent' : 'malformé';
        console.error(c.rougeBold('❌ ERREUR FATALE (mode --strict)'));
        console.error();
        console.error(`Le rapport ${agentId}.json est ${kind}.`);
        console.error(`Un agent n'a pas tourné ou a crashé. La CI ne peut pas valider sans`);
        console.error(`rapport complet. Relancer qa:fast avant re-vérification.`);
        if (res.erreur) {
          console.error();
          console.error(c.gris(`   Détail : ${res.erreur}`));
        }
        process.exit(1);
      }
    }
  }

  const lignes = MAPPING.map((entry) => evaluerLigne(entry, baseline));

  if (modeJson) {
    afficherJson(lignes);
  } else {
    afficherTableau(lignes);
  }

  const regressions = lignes.filter((l) => l.statut === 'regression').length;
  const manquants = lignes.filter((l) =>
    ['rapport-manquant', 'rapport-malforme', 'stat-manquant', 'baseline-manquant'].includes(l.statut)
  ).length;
  process.exit(regressions + manquants === 0 ? 0 : 1);
}

main();
