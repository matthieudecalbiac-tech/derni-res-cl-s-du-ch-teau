/* ═══════════════════════════════════════════════════════════════════════════
 * LCC — SMOKE TEST CONNEXION SUPABASE (S1-δ)
 * ═══════════════════════════════════════════════════════════════════════════
 * Fichier  : scripts/smoke-test-supabase.cjs
 * Usage    : node scripts/smoke-test-supabase.cjs
 *
 * Vérifie qu'un client Supabase configuré avec la clé anon (publique)
 * peut lire les données semées en S1-γ et que les RLS posées en S1-β
 * bloquent bien les écritures non autorisées.
 *
 * 5 tests :
 *   1. SELECT count chateaux           → 8
 *   2. SELECT count chambres           → 23
 *   3. SELECT chateaux WHERE slug=...  → 1 ligne (Briottières)
 *   4. SELECT count chateau_modules_public (vue sans commission) → 12
 *   5. INSERT reservations en anon     → DOIT échouer (RLS deny)
 *
 * Pas de dépendance dotenv — parse .env manuellement (~10 lignes).
 * ═══════════════════════════════════════════════════════════════════════════ */

const fs   = require("node:fs");
const path = require("node:path");
const { creerClientNode } = require("./lib/supabase-node.cjs");


// ─────────────────────────────────────────────────────────────────────────────
// Parse .env manuel (KEY=value par ligne, # commentaire)
// ─────────────────────────────────────────────────────────────────────────────
function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    console.error(`✗ Fichier .env absent à ${envPath}`);
    console.error("  Crée-le à partir de .env.example.");
    process.exit(1);
  }
  const env = {};
  fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return;
    const key = trimmed.substring(0, eq).trim();
    const val = trimmed.substring(eq + 1).trim();
    env[key] = val;
  });
  return env;
}


// ─────────────────────────────────────────────────────────────────────────────
// Test runner — affiche ✓ ou ✗ + détail
// ─────────────────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function pass(name, detail) {
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
  passed++;
}
function fail(name, detail) {
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  failed++;
}

/**
 * Formate une erreur Supabase pour affichage smoke test.
 * Les erreurs `head: true` peuvent avoir un .message vide — fallback sur
 * .code, .details, .hint, ou JSON.stringify.
 */
function formatError(err) {
  if (!err) return "(no error)";
  const code = err.code || err.statusCode || "";
  const msg  = err.message || err.details || err.hint || "";
  if (code && msg) return `erreur ${code}: ${msg}`;
  if (msg)         return `erreur: ${msg}`;
  if (code)        return `erreur ${code} (sans message)`;
  return `erreur: ${JSON.stringify(err)}`;
}


// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const env = loadEnv(path.resolve(__dirname, "../.env"));

  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key || key === "A_REMPLIR_PAR_MATTHIEU") {
    console.error("✗ VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquante / non remplie dans .env");
    process.exit(1);
  }

  console.log("═══ Smoke test Supabase ═══");
  console.log(`  URL : ${url}`);
  console.log(`  Key : ${key.substring(0, 16)}...${key.substring(key.length - 6)} (${key.length} chars)`);
  console.log("");

  const supabase = creerClientNode(url, key);

  // ─── Test 1 : count chateaux ─────────────────────────────────────────────
  {
    const { count, error } = await supabase
      .from("chateaux")
      .select("*", { count: "exact", head: true });
    if (error) fail("Test 1 — count chateaux", formatError(error));
    else if (count === 8) pass("Test 1 — count chateaux", `8 lignes (attendu 8)`);
    else fail("Test 1 — count chateaux", `${count} lignes (attendu 8)`);
  }

  // ─── Test 2 : count chambres ─────────────────────────────────────────────
  {
    const { count, error } = await supabase
      .from("chambres")
      .select("*", { count: "exact", head: true });
    if (error) fail("Test 2 — count chambres", formatError(error));
    else if (count === 23) pass("Test 2 — count chambres", `23 lignes (attendu 23)`);
    else fail("Test 2 — count chambres", `${count} lignes (attendu 23)`);
  }

  // ─── Test 3 : SELECT Briottières par slug ────────────────────────────────
  {
    const { data, error } = await supabase
      .from("chateaux")
      .select("id, nom, slug, est_la_une, prop_nom")
      .eq("slug", "les-briottieres");
    if (error) fail("Test 3 — Briottières par slug", formatError(error));
    else if (Array.isArray(data) && data.length === 1) {
      const c = data[0];
      const ok = c.est_la_une === true && c.prop_nom === "Arnaud & Madeleine de Valbray";
      if (ok) pass("Test 3 — Briottières par slug", `1 ligne, est_la_une=true, prop_nom OK`);
      else fail("Test 3 — Briottières par slug", `1 ligne mais est_la_une=${c.est_la_une} prop_nom="${c.prop_nom}"`);
    } else fail("Test 3 — Briottières par slug", `${data?.length ?? 0} ligne(s) (attendu 1)`);
  }

  // ─── Test 4 : count chateau_modules_public (vue cachant la commission) ───
  {
    const { count, error } = await supabase
      .from("chateau_modules_public")
      .select("*", { count: "exact", head: true });
    if (error) fail("Test 4 — count chateau_modules_public", formatError(error));
    else if (count === 12) pass("Test 4 — count chateau_modules_public", `12 lignes (attendu 12 = A×8 + B×2 + C×2)`);
    else fail("Test 4 — count chateau_modules_public", `${count} lignes (attendu 12)`);
  }

  // ─── Test 5 : INSERT reservations en anon → DOIT échouer (RLS) ───────────
  {
    const fakeUuid = "00000000-0000-0000-0000-000000000001";
    const { data, error } = await supabase
      .from("reservations")
      .insert({
        user_id: fakeUuid,
        chambre_id: fakeUuid,
        module_id: fakeUuid,
        date_arrivee: "2026-12-01",
        date_depart:  "2026-12-03",
        prix_total_cents: 50000,
      })
      .select();
    if (error) {
      // Échec attendu → test passe
      pass("Test 5 — INSERT reservations en anon DOIT échouer", `bloqué (${error.code || error.message.substring(0, 60)}...)`);
    } else {
      fail("Test 5 — INSERT reservations en anon DOIT échouer", `INSERT a réussi (faille RLS) — id=${data?.[0]?.id}`);
    }
  }

  // ─── Récap ───────────────────────────────────────────────────────────────
  console.log("");
  console.log(`═══ Récap : ${passed}/${passed + failed} passés ═══`);
  if (failed === 0) {
    console.log("✓ Tous les tests OK — connexion Supabase + RLS opérationnels.");
    process.exit(0);
  } else {
    console.log(`✗ ${failed} test(s) échoué(s) — voir détail ci-dessus.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
