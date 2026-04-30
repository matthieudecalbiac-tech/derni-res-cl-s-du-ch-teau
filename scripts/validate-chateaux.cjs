// scripts/validate-chateaux.cjs
//
// Script CLI de validation du schéma chateaux.js.
// Conçu Chantier 2.1 (Phase A3, Commit 2) le 30 avril 2026.
//
// Charge src/data/chateaux.js (ESM) via dynamic import depuis CJS,
// passe par validateChateauxArray, et affiche un rapport regroupé
// par château pour faciliter la revue.
//
// Usage : npm run validate:chateaux
// Exit  : 0 si tout valide, 1 si au moins une erreur

const path = require("path");
const { pathToFileURL } = require("url");

(async () => {
  const ROOT = path.join(__dirname, "..");
  const dataUrl = pathToFileURL(path.join(ROOT, "src/data/chateaux.js")).href;
  const validatorUrl = pathToFileURL(path.join(ROOT, "src/utils/validateChateau.js")).href;

  const { chateaux } = await import(dataUrl);
  const { validateChateauxArray } = await import(validatorUrl);

  try {
    validateChateauxArray(chateaux);
    console.log(`\n✓ Validation chateaux.js : ${chateaux.length} château(x) conforme(s) au schéma\n`);
    process.exit(0);
  } catch (e) {
    // Le message a la forme :
    //   Validation chateaux.js échouée — N erreur(s) :
    //     - Château X (id Y) : détail
    //     - Château X (id Y) : détail
    //     - id 5 dupliqué (...)        ← erreur globale, pas de prefix « Château »
    const allLines = e.message.split("\n").filter((l) => l.startsWith("  - "));

    // Regrouper par château (ou « Erreurs globales » pour les unicités)
    const groups = new Map();
    const order = [];
    const GLOBAL_KEY = "⚠ Erreurs globales (unicités)";

    allLines.forEach((rawLine) => {
      const line = rawLine.replace(/^ {2}- /, "");
      const match = line.match(/^(Château .+? \(id .+?\)) : (.*)$/);
      let key;
      let detail;
      if (match) {
        key = match[1];
        detail = match[2];
      } else {
        key = GLOBAL_KEY;
        detail = line;
      }
      if (!groups.has(key)) {
        groups.set(key, []);
        order.push(key);
      }
      groups.get(key).push(detail);
    });

    let total = 0;
    console.log(`\n❌ Validation chateaux.js échouée — rapport regroupé par château :\n`);
    order.forEach((label) => {
      const details = groups.get(label);
      total += details.length;
      console.log(`${label} — ${details.length} erreur(s) :`);
      details.forEach((d) => console.log(`    - ${d}`));
      console.log("");
    });

    console.log(`Total : ${total} erreur(s) sur ${chateaux.length} château(x)\n`);
    process.exit(1);
  }
})();
