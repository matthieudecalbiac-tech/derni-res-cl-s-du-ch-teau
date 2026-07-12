/* ═══════════════════════════════════════════════════════════════════════════
 * LES CLÉS DU CHÂTEAU — GÉNÉRATEUR DE SEED SUPABASE (dump base → seed)
 * ═══════════════════════════════════════════════════════════════════════════
 * Fichier : scripts/generate-seed.cjs
 * Output  : supabase/seed.sql (overwrite à chaque run)
 * Source  : la BASE Supabase lcc-prod (plus src/data/chateaux.js).
 * Usage   : node scripts/generate-seed.cjs
 *
 * FLUX INVERSÉ (pièce 6)
 *   Le générateur ne transforme plus le fichier statique : il DUMPE la base.
 *   Chaque table est lue en SELECT * ; les colonnes de l'INSERT sont dérivées
 *   des clés RÉELLES des lignes, jamais d'une liste codée en dur. Toute colonne
 *   future (comme statut hier) est donc reprise automatiquement, sans oubli
 *   silencieux. La base est la source de vérité ; le seed en est l'instantané.
 *
 * SÉRIALISATION PAR VALEUR (pas par colonne connue d'avance)
 *   null → NULL · bool → true/false · number → littéral · string → ' échappé
 *   tableau de chaînes → ARRAY[...]::text[] · tableau d'objets → '...'::jsonb
 *   objet → '...'::jsonb
 *   (Les littéraux chaîne sont castés implicitement par Postgres vers le type
 *    cible : numeric, date, enum — pas besoin de ::cast explicite.)
 *
 * CLÉ service_role OBLIGATOIRE
 *   L'anon ne voit que les publiés (RLS) : un dump anon serait amputé des
 *   brouillons. Le générateur EXIGE SUPABASE_SERVICE_ROLE_KEY (bypass RLS) et
 *   refuse de tourner sans elle — jamais de fallback silencieux.
 *   LOCAL ONLY : cette clé ne doit jamais être commitée ni exposée en CI.
 *
 * IDEMPOTENCE
 *   ON CONFLICT (id) DO NOTHING sur toutes les tables. Les UUID viennent des
 *   lignes de la base. Ordre déterministe (ORDER BY) → re-run stable.
 *
 * SECTIONS (ordre FK)
 *   1. modules · 2. chateaux · 3. chambres · 4. chateau_amenities
 *   5. chateau_timeline · 6. chateau_alentours · 7. chateau_modules
 *   8. offres · 9. migrations_log
 * ═══════════════════════════════════════════════════════════════════════════ */

const fs      = require("node:fs/promises");
const fsSync  = require("node:fs");
const path    = require("node:path");
const { creerClientNode } = require("./lib/supabase-node.cjs");


// ─────────────────────────────────────────────────────────────────────────────
// .env LOADER (patron smoke-test-supabase.cjs — parse manuel, pas de dotenv)
// ─────────────────────────────────────────────────────────────────────────────

function loadEnv(envPath) {
  const env = {};
  if (!fsSync.existsSync(envPath)) return env;
  fsSync.readFileSync(envPath, "utf8").split(/\r?\n/).forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return;
    const i = line.indexOf("=");
    if (i < 0) return;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  });
  return env;
}


// ─────────────────────────────────────────────────────────────────────────────
// SÉRIALISATION SQL — le type est déterminé depuis la VALEUR
// ─────────────────────────────────────────────────────────────────────────────

/** Chaîne SQL échappée (doublement des quotes). */
function sqlString(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

/** Array Postgres TEXT[]. [] → ARRAY[]::text[]. */
function sqlArrayText(arr) {
  if (!arr.length) return "ARRAY[]::text[]";
  return `ARRAY[${arr.map((s) => sqlString(s)).join(",")}]::text[]`;
}

/** JSONB : objet ou tableau d'objets → '...'::jsonb. */
function sqlJsonb(v) {
  return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
}

/**
 * Sérialise une valeur SQL selon son type JS réel (aucune connaissance de
 * colonne). Les chaînes sont castées implicitement par Postgres vers numeric /
 * date / enum côté colonne cible.
 */
function serialiseValue(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number")  return String(v);
  if (typeof v === "string")  return sqlString(v);
  if (Array.isArray(v)) {
    // Tableau de chaînes pures → text[] ; dès qu'un élément n'est pas une
    // chaîne (objet), c'est du jsonb (ex. chiffres_cles = [{...}, ...]).
    return v.every((e) => typeof e === "string") ? sqlArrayText(v) : sqlJsonb(v);
  }
  if (typeof v === "object") return sqlJsonb(v);
  return sqlString(String(v));
}


// Colonnes de gestion technique exclues du seed : pas d'info metier, defaut NOW()
// plus fidele qu'une date figee, et evitent un diff bruyant a chaque regeneration.
// EXCLUSION ciblee, pas liste blanche : toute colonne metier future reste reprise.
const COLONNES_EXCLUES = new Set(["created_at", "updated_at"]);


// ─────────────────────────────────────────────────────────────────────────────
// TABLES À DUMPER — ordre FK + tri stable (pour un output reproductible).
// Aucune liste de colonnes : elles sont dérivées des lignes (SELECT *).
// ─────────────────────────────────────────────────────────────────────────────

const TABLES = [
  { table: "modules",           comment: "modules (référentiel A/B/C/D)", order: ["code"] },
  { table: "chateaux",          comment: "chateaux",           order: ["slug"] },
  { table: "chambres",          comment: "chambres",           order: ["chateau_id", "ordre"] },
  { table: "chateau_amenities", comment: "chateau_amenities",  order: ["chateau_id", "ordre"] },
  { table: "chateau_timeline",  comment: "chateau_timeline",   order: ["chateau_id", "ordre"] },
  { table: "chateau_alentours", comment: "chateau_alentours",  order: ["chateau_id", "ordre"] },
  { table: "chateau_modules",   comment: "chateau_modules",    order: ["chateau_id", "module_id"] },
  { table: "offres",            comment: "offres",             order: ["chateau_id", "ordre"] },
  { table: "migrations_log",    comment: "migrations_log",     order: ["nom_migration"] },
];


// ─────────────────────────────────────────────────────────────────────────────
// DUMP D'UNE TABLE → INSERT exhaustif (toutes les colonnes de la base)
// ─────────────────────────────────────────────────────────────────────────────

async function dumpTable(supabase, spec, sectionNum) {
  let q = supabase.from(spec.table).select("*");
  for (const o of spec.order) q = q.order(o, { ascending: true });

  const { data, error } = await q;
  if (error) throw new Error(`SELECT ${spec.table} : ${error.message}`);
  const rows = data ?? [];

  if (rows.length === 0) {
    return { sql: `-- ${sectionNum}. ${spec.comment} (0 ligne — rien à insérer)`, count: 0, cols: 0 };
  }

  // Colonnes = union des clés réelles des lignes (ordre de première apparition),
  // moins les colonnes de gestion technique exclues (created_at / updated_at).
  const seen = new Set();
  const cols = [];
  for (const r of rows) for (const k of Object.keys(r)) {
    if (COLONNES_EXCLUES.has(k)) continue;
    if (!seen.has(k)) { seen.add(k); cols.push(k); }
  }

  const values = rows
    .map((row) => `  (${cols.map((k) => serialiseValue(row[k])).join(", ")})`)
    .join(",\n");

  const sql = `-- ${sectionNum}. ${spec.comment} (${rows.length} lignes, ${cols.length} colonnes)
INSERT INTO public.${spec.table} (${cols.join(", ")}) VALUES
${values}
ON CONFLICT (id) DO NOTHING;`;

  return { sql, count: rows.length, cols: cols.length };
}


// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const env = loadEnv(path.resolve(__dirname, "../.env"));
  const url = env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  // ── GARDE-FOU : service_role obligatoire, jamais de fallback anon ──
  if (!key) {
    console.error("✗ SUPABASE_SERVICE_ROLE_KEY absente du .env.");
    console.error("  service_role requise : l'anon ne voit que les publiés, le seed serait amputé");
    console.error("  des brouillons. Ajoute la clé (LOCAL ONLY) dans .env — cf. .env.example.");
    process.exit(1);
  }
  if (!url) {
    console.error("✗ VITE_SUPABASE_URL absente du .env.");
    process.exit(1);
  }

  const supabase = creerClientNode(url, key);

  const sections = [];
  const counts = {};
  const colCounts = {};
  let sectionNum = 0;
  for (const spec of TABLES) {
    sectionNum += 1;
    const { sql, count, cols } = await dumpTable(supabase, spec, sectionNum);
    sections.push(sql);
    counts[spec.table] = count;
    colCounts[spec.table] = cols;
  }
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  const header = `-- ═══════════════════════════════════════════════════════════════════════════
-- LES CLÉS DU CHÂTEAU — SEED (dump base → seed)
-- ═══════════════════════════════════════════════════════════════════════════
-- Fichier généré automatiquement par scripts/generate-seed.cjs
-- Source     : base Supabase lcc-prod (dump via service_role, brouillons compris)
-- Exhaustif  : toutes les colonnes métier (timestamps techniques de gestion exclus)
-- Idempotent : ON CONFLICT (id) DO NOTHING sur toutes les tables
-- Rejouable  : oui — UUID lus depuis la base, ordre déterministe (ORDER BY)
-- Pré-requis : schema.sql + policies.sql appliqués
-- ═══════════════════════════════════════════════════════════════════════════`;

  const footer = `-- ═══════════════════════════════════════════════════════════════════════════
-- STATISTIQUES SEED
-- ═══════════════════════════════════════════════════════════════════════════
${TABLES.map((s) => `-- ${s.table.padEnd(18)} : ${counts[s.table]} lignes, ${colCounts[s.table]} colonnes`).join("\n")}
-- TOTAL              : ${total} INSERT (idempotents via ON CONFLICT (id) DO NOTHING)
-- ═══════════════════════════════════════════════════════════════════════════`;

  const fullSQL = [
    header, "", "BEGIN;", "",
    ...sections.flatMap((s) => [s, ""]),
    "COMMIT;", "",
    footer, "",
  ].join("\n");

  const outPath = path.resolve(__dirname, "../supabase/seed.sql");
  await fs.writeFile(outPath, fullSQL, "utf8");

  console.log("═══ Dump base → seed (exhaustif) ═══");
  TABLES.forEach((s) => console.log(`  ${s.table.padEnd(20)} : ${counts[s.table]} lignes, ${colCounts[s.table]} colonnes`));
  console.log(`  ${"TOTAL".padEnd(20)} : ${total} INSERT`);
  console.log(`\n✓ Seed généré : ${outPath}`);
  console.log(`  Taille : ${fullSQL.length} octets`);
}

main().catch((err) => {
  console.error("Erreur génération seed :", err.message || err);
  process.exit(1);
});
