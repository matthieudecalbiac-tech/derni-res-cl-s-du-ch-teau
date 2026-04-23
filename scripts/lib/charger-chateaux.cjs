/**
 * Loader synchrone pour src/data/chateaux.js.
 *
 * Le fichier de données est en ESM natif (package.json a "type":"module").
 * Comme les scripts/tests qui le consomment sont en CJS (pas de top-level
 * await), on le charge via Function() après une transformation minimale
 * export→module.exports. Sûr ici : chateaux.js est un fichier de données
 * pur, sans import ni side-effect.
 *
 * Résultat caché au premier appel.
 */
const fs = require('fs');
const path = require('path');

const CHEMIN = path.join(__dirname, '..', '..', 'src', 'data', 'chateaux.js');
let cache = null;

function chargerChateaux() {
  if (cache) return cache;
  const source = fs.readFileSync(CHEMIN, 'utf8');
  const cjs = source.replace(
    /^export\s+const\s+chateaux\s*=/m,
    'module.exports.chateaux ='
  );
  const m = { exports: {} };
  new Function('module', 'exports', cjs)(m, m.exports);
  cache = m.exports.chateaux;
  return cache;
}

module.exports = { chargerChateaux };
