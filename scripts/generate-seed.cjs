/* ═══════════════════════════════════════════════════════════════════════════
 * LES CLÉS DU CHÂTEAU — GÉNÉRATEUR DE SEED SUPABASE (S1-γ)
 * ═══════════════════════════════════════════════════════════════════════════
 * Fichier      : scripts/generate-seed.cjs
 * Output       : supabase/seed.sql (overwrite à chaque run)
 * Source       : src/data/chateaux.js (ESM, 8 châteaux)
 * Usage        : node scripts/generate-seed.cjs
 *
 * IDEMPOTENCE
 *   - UUIDs déterministes (SHA-1 namespace:name → UUID v5-like).
 *   - ON CONFLICT DO UPDATE sur toutes les tables.
 *   - Re-run du générateur produit un seed.sql identique tant que
 *     chateaux.js est inchangé (modulo le timestamp de génération).
 *
 * CONVENTION
 *   - .cjs (CLAUDE.md § Hygiène du repo) avec dynamic import() pour
 *     chateaux.js (ESM).
 *   - Pas de dépendance npm — uniquement node:crypto / fs / path.
 *
 * SECTIONS GÉNÉRÉES (ordre FK)
 *   1. modules            (4 lignes — référentiel A/B/C/D)
 *   2. chateaux           (8 lignes)
 *   3. chambres           (23 lignes)
 *   4. chateau_amenities  (48 lignes — 6 activites par château)
 *   5. chateau_timeline   (48 lignes — 6 entrées par château)
 *   6. chateau_alentours  (36 lignes — variable 4-6 par château)
 *   7. chateau_modules    (12 lignes — A×8 + B×2 + C×2)
 *   8. migrations_log     (1 ligne — trace S1-γ)
 *   TOTAL : 180 INSERT
 * ═══════════════════════════════════════════════════════════════════════════ */

const crypto = require("node:crypto");
const fs     = require("node:fs/promises");
const path   = require("node:path");


// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * UUID v5-like déterministe via SHA-1.
 * Format : 8-4-4-4-12, version=5, variant=8.
 */
function deterministicUUID(namespace, name) {
  const hash = crypto.createHash("sha1").update(`${namespace}:${name}`).digest("hex");
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    "5" + hash.substring(13, 16),  // version 5
    "8" + hash.substring(17, 20),  // variant
    hash.substring(20, 32),
  ].join("-");
}

/**
 * Parse "55 km · 45 min", "85 km · 1h10", "2h15 de Paris", "3h", "2h" → minutes.
 * Retourne null + warning si aucun match.
 */
function parseDistanceParis(str) {
  if (!str || typeof str !== "string") return null;
  const hMatch = str.match(/(\d+)h(\d{0,2})/);
  if (hMatch) {
    const hours = parseInt(hMatch[1], 10);
    const mins  = hMatch[2] ? parseInt(hMatch[2], 10) : 0;
    return hours * 60 + mins;
  }
  const minMatch = str.match(/(\d+)\s*min/);
  if (minMatch) return parseInt(minMatch[1], 10);
  console.warn(`[parseDistanceParis] Aucun match pour : "${str}"`);
  return null;
}

/**
 * Échappement SQL standard.
 * - null/undefined → NULL
 * - bool → true/false
 * - number → numérique
 * - Date → ISO timestamp littéral
 * - string → ' échappé via doublement
 */
function sqlEscape(s) {
  if (s === null || s === undefined) return "NULL";
  if (typeof s === "boolean") return s ? "true" : "false";
  if (typeof s === "number") return String(s);
  if (s instanceof Date) return `'${s.toISOString()}'`;
  return `'${String(s).replace(/'/g, "''")}'`;
}

/**
 * Array Postgres TEXT[].
 * - null/[] → ARRAY[]::text[]
 * - sinon  → ARRAY['a','b']::text[]
 */
function sqlArrayText(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return "ARRAY[]::text[]";
  return `ARRAY[${arr.map((s) => sqlEscape(s)).join(",")}]::text[]`;
}

/** Premier caractère du nom. "Famille de Vogüé" → "F" */
function deriveOwnerInitiale(propNom) {
  if (!propNom) return null;
  return propNom.charAt(0);
}

/** Retire le préfixe "Famille " s'il existe. "Famille de Vogüé" → "de Vogüé" */
function deriveOwnerNomAffiche(propNom) {
  if (!propNom) return null;
  if (propNom.startsWith("Famille ")) return propNom.substring("Famille ".length);
  return propNom;
}


// ─────────────────────────────────────────────────────────────────────────────
// SQL BUILDERS — un par table
// ─────────────────────────────────────────────────────────────────────────────

function buildModulesSQL() {
  const rows = [
    {
      id: deterministicUUID("module", "A"), code: "A", nom: "Vitrine Permanente",
      description: "Présence permanente sur la plateforme — module de base.",
      cMin: 11.00, cMax: 15.00, pol: "flexible", auth: null, actif: true,
    },
    {
      id: deterministicUUID("module", "B"), code: "B", nom: "Les Dernières Clés",
      description: "Offres last-minute pour combler les nuits vacantes (J-7 à J-15).",
      cMin: 7.00, cMax: 10.00, pol: "strict", auth: null, actif: true,
    },
    {
      id: deterministicUUID("module", "C"), code: "C", nom: "Club des Châtelains",
      description: "Offres exclusives réservées aux membres connectés.",
      cMin: 8.00, cMax: 12.00, pol: "flexible", auth: "client", actif: true,
    },
    {
      id: deterministicUUID("module", "D"), code: "D", nom: "Événementiel",
      description: "Privatisation pour mariages, séminaires, événements (slot prévu, inactif au lancement).",
      cMin: null, cMax: null, pol: "strict", auth: null, actif: false,
    },
  ];

  const values = rows.map((r) =>
    `  (${sqlEscape(r.id)}, ${sqlEscape(r.code)}, ${sqlEscape(r.nom)}, ${sqlEscape(r.description)}, ${sqlEscape(r.cMin)}, ${sqlEscape(r.cMax)}, ${sqlEscape(r.pol)}, ${r.auth ? `${sqlEscape(r.auth)}::user_role` : "NULL"}, ${sqlEscape(r.actif)})`
  ).join(",\n");

  return `-- 1. modules (référentiel statique 4 lignes — A/B/C/D)
INSERT INTO public.modules (id, code, nom, description, commission_min_pct, commission_max_pct, politique_annulation_default, requires_auth_role, est_actif) VALUES
${values}
ON CONFLICT (code) DO UPDATE SET
  nom                          = EXCLUDED.nom,
  description                  = EXCLUDED.description,
  commission_min_pct           = EXCLUDED.commission_min_pct,
  commission_max_pct           = EXCLUDED.commission_max_pct,
  politique_annulation_default = EXCLUDED.politique_annulation_default,
  requires_auth_role           = EXCLUDED.requires_auth_role,
  est_actif                    = EXCLUDED.est_actif;`;
}


function buildChateauxSQL(chateaux) {
  const cols = [
    "id", "nom", "slug", "region", "departement", "ville", "accroche", "siecle", "style",
    "distance_paris", "distance_paris_label", "urgence", "coordonnees_lat", "coordonnees_lng",
    "histoire", "description", "region_narrative", "region_histoire", "chiffres_cles",
    "images", "video_background_youtube_id",
    "prop_nom", "prop_depuis", "prop_initiale", "prop_nom_affiche",
    "prop_portrait", "prop_citation", "prop_description",
    "est_la_une", "is_demo_mock",
    "note_sur_5", "nb_avis", "date_disponible",
    "couleur_theme", "accent_theme",
    "petit_dejeuner", "parking", "wifi", "animaux",
  ];

  const values = chateaux.map((c) => {
    const p = c.proprietaires || {};
    const coord = c.coordonnees || {};
    const vals = [
      sqlEscape(deterministicUUID("chateau", c.slug)),
      sqlEscape(c.nom),
      sqlEscape(c.slug),
      sqlEscape(c.region),
      sqlEscape(c.departement),
      sqlEscape(c.ville),
      sqlEscape(c.accroche),
      sqlEscape(c.siecle),
      sqlEscape(c.style),
      sqlEscape(parseDistanceParis(c.distanceParis)),
      sqlEscape(c.distanceParis ?? null),       // label brut éditorial
      sqlEscape(c.urgence),
      sqlEscape(coord.lat ?? null),
      sqlEscape(coord.lng ?? null),
      sqlEscape(c.histoire),
      sqlEscape(c.description),
      sqlEscape(c.regionNarrative ?? null),
      sqlEscape(c.regionHistoire ?? null),
      "NULL",                                    // chiffres_cles (brief : NULL)
      sqlArrayText(c.images),
      sqlEscape(c.videoBackground ?? null),
      sqlEscape(p.nom),
      sqlEscape(p.depuis),
      sqlEscape(deriveOwnerInitiale(p.nom)),
      sqlEscape(deriveOwnerNomAffiche(p.nom)),
      sqlEscape(p.portrait),
      sqlEscape(p.citation),
      sqlEscape(p.description),
      sqlEscape(c.estLaUne ?? false),
      sqlEscape(c.isDemoMock ?? false),
      "NULL",                                    // note_sur_5
      "0",                                       // nb_avis
      "NULL",                                    // date_disponible
      sqlEscape(c.couleurTheme),
      sqlEscape(c.accentTheme),
      sqlEscape(c.petitDejeuner ?? false),
      sqlEscape(c.parking ?? false),
      sqlEscape(c.wifi ?? false),
      sqlEscape(c.animaux ?? false),
    ];
    return `  (${vals.join(", ")})`;
  }).join(",\n");

  // ON CONFLICT DO UPDATE — exclut date_disponible/note_sur_5/nb_avis (admin/computed)
  const updateCols = cols.filter((c) => !["id", "slug", "date_disponible", "note_sur_5", "nb_avis"].includes(c));
  const updateClause = updateCols.map((c) => `  ${c.padEnd(28)} = EXCLUDED.${c}`).join(",\n");

  return `-- 2. chateaux (8 lignes)
INSERT INTO public.chateaux (${cols.join(", ")}) VALUES
${values}
ON CONFLICT (slug) DO UPDATE SET
${updateClause};`;
}


function buildChambresSQL(chateaux) {
  const cols = [
    "id", "chateau_id", "nom", "description", "superficie", "capacite", "prix_cents",
    "image", "equipements",
    "pricing_rules", "min_stay_nights", "max_stay_nights", "cleaning_fee_cents",
    "ordre",
  ];

  const rows = [];
  chateaux.forEach((c) => {
    (c.chambres || []).forEach((ch, i) => {
      rows.push({
        id: deterministicUUID("chambre", `${c.slug}:${ch.nom}`),
        chateau_id: deterministicUUID("chateau", c.slug),
        nom: ch.nom, description: ch.description, superficie: ch.superficie,
        capacite: ch.capacite, prix_cents: (ch.prix || 0) * 100,
        image: ch.image, equipements: ch.equipements,
        ordre: i,
      });
    });
  });

  const values = rows.map((r) => {
    const vals = [
      sqlEscape(r.id), sqlEscape(r.chateau_id), sqlEscape(r.nom), sqlEscape(r.description),
      sqlEscape(r.superficie), sqlEscape(r.capacite), sqlEscape(r.prix_cents),
      sqlEscape(r.image), sqlArrayText(r.equipements),
      "NULL",                  // pricing_rules
      "1",                     // min_stay_nights
      "NULL",                  // max_stay_nights
      "0",                     // cleaning_fee_cents
      sqlEscape(r.ordre),
    ];
    return `  (${vals.join(", ")})`;
  }).join(",\n");

  // UPDATE exclut les champs plugeable (chatelain edits)
  const updateCols = ["nom", "description", "superficie", "capacite", "prix_cents", "image", "equipements", "ordre"];
  const updateClause = updateCols.map((c) => `  ${c.padEnd(20)} = EXCLUDED.${c}`).join(",\n");

  return `-- 3. chambres (${rows.length} lignes)
INSERT INTO public.chambres (${cols.join(", ")}) VALUES
${values}
ON CONFLICT (id) DO UPDATE SET
${updateClause};`;
}


function buildAmenitiesSQL(chateaux) {
  const cols = [
    "id", "chateau_id", "type", "nom", "description", "icone",
    "inclus", "prix_supplement_cents", "duree_minutes", "ordre",
  ];

  const rows = [];
  chateaux.forEach((c) => {
    (c.activites || []).forEach((a, i) => {
      rows.push({
        id: deterministicUUID("amenity", `${c.slug}:${a.nom}`),
        chateau_id: deterministicUUID("chateau", c.slug),
        nom: a.nom, description: a.description, icone: a.icone,
        ordre: i,
      });
    });
  });

  const values = rows.map((r) => {
    const vals = [
      sqlEscape(r.id), sqlEscape(r.chateau_id),
      `'activite'::amenity_type`,
      sqlEscape(r.nom), sqlEscape(r.description), sqlEscape(r.icone),
      "true",                  // inclus
      "NULL",                  // prix_supplement_cents
      "NULL",                  // duree_minutes
      sqlEscape(r.ordre),
    ];
    return `  (${vals.join(", ")})`;
  }).join(",\n");

  // UPDATE exclut les plugeable (inclus / prix_supplement_cents / duree_minutes)
  const updateCols = ["chateau_id", "type", "nom", "description", "icone", "ordre"];
  const updateClause = updateCols.map((c) => `  ${c.padEnd(15)} = EXCLUDED.${c}`).join(",\n");

  return `-- 4. chateau_amenities (${rows.length} lignes — toutes les activités)
INSERT INTO public.chateau_amenities (${cols.join(", ")}) VALUES
${values}
ON CONFLICT (id) DO UPDATE SET
${updateClause};`;
}


function buildTimelineSQL(chateaux) {
  const cols = ["id", "chateau_id", "annee", "evenement", "ordre"];
  const rows = [];
  chateaux.forEach((c) => {
    (c.timeline || []).forEach((t, i) => {
      rows.push({
        id: deterministicUUID("timeline", `${c.slug}:${i}:${t.annee}`),
        chateau_id: deterministicUUID("chateau", c.slug),
        annee: t.annee, evenement: t.evenement, ordre: i,
      });
    });
  });

  const values = rows.map((r) => {
    const vals = [
      sqlEscape(r.id), sqlEscape(r.chateau_id),
      sqlEscape(r.annee), sqlEscape(r.evenement), sqlEscape(r.ordre),
    ];
    return `  (${vals.join(", ")})`;
  }).join(",\n");

  const updateCols = ["chateau_id", "annee", "evenement", "ordre"];
  const updateClause = updateCols.map((c) => `  ${c.padEnd(12)} = EXCLUDED.${c}`).join(",\n");

  return `-- 5. chateau_timeline (${rows.length} lignes)
INSERT INTO public.chateau_timeline (${cols.join(", ")}) VALUES
${values}
ON CONFLICT (id) DO UPDATE SET
${updateClause};`;
}


function buildAlentoursSQL(chateaux) {
  const VALID_TYPES = new Set(["patrimoine", "gastronomie", "nature", "spirituel", "sport", "village", "culture", "histoire"]);
  const cols = ["id", "chateau_id", "nom", "distance", "type", "icone", "description", "ordre"];

  const rows = [];
  let skipped = 0;
  chateaux.forEach((c) => {
    (c.alentours || []).forEach((a, i) => {
      if (!VALID_TYPES.has(a.type)) {
        console.warn(`[alentours] Type hors enum skippé : ${c.slug} :: "${a.nom}" (type="${a.type}")`);
        skipped++;
        return;
      }
      rows.push({
        id: deterministicUUID("alentour", `${c.slug}:${i}:${a.nom}`),
        chateau_id: deterministicUUID("chateau", c.slug),
        nom: a.nom, distance: a.distance, type: a.type,
        icone: a.icone, description: a.description, ordre: i,
      });
    });
  });

  const values = rows.map((r) => {
    const vals = [
      sqlEscape(r.id), sqlEscape(r.chateau_id),
      sqlEscape(r.nom), sqlEscape(r.distance),
      `${sqlEscape(r.type)}::alentour_type`,
      sqlEscape(r.icone), sqlEscape(r.description), sqlEscape(r.ordre),
    ];
    return `  (${vals.join(", ")})`;
  }).join(",\n");

  const updateCols = ["chateau_id", "nom", "distance", "type", "icone", "description", "ordre"];
  const updateClause = updateCols.map((c) => `  ${c.padEnd(12)} = EXCLUDED.${c}`).join(",\n");

  return {
    sql: `-- 6. chateau_alentours (${rows.length} lignes${skipped ? ` — ${skipped} skipped pour type invalide` : ""})
INSERT INTO public.chateau_alentours (${cols.join(", ")}) VALUES
${values}
ON CONFLICT (id) DO UPDATE SET
${updateClause};`,
    count: rows.length,
    skipped,
  };
}


function buildChateauModulesSQL(chateaux) {
  const cols = ["id", "chateau_id", "module_id", "est_actif", "commission_pct_negociee"];

  // Module A sur tous les 8 châteaux, B et C sur les 2 premium uniquement
  const rows = [];
  chateaux.forEach((c) => {
    rows.push({ slug: c.slug, code: "A", commission: 13.00 });
    if (c.estLaUne) {
      rows.push({ slug: c.slug, code: "B", commission: 8.50 });
      rows.push({ slug: c.slug, code: "C", commission: 10.00 });
    }
  });

  const values = rows.map((r) => {
    const vals = [
      sqlEscape(deterministicUUID("chateau_module", `${r.slug}:${r.code}`)),
      sqlEscape(deterministicUUID("chateau", r.slug)),
      sqlEscape(deterministicUUID("module", r.code)),
      "true",
      sqlEscape(r.commission),
    ];
    return `  (${vals.join(", ")})`;
  }).join(",\n");

  return {
    sql: `-- 7. chateau_modules (${rows.length} lignes — A×8 + B×2 + C×2)
INSERT INTO public.chateau_modules (${cols.join(", ")}) VALUES
${values}
ON CONFLICT (chateau_id, module_id) DO UPDATE SET
  est_actif               = EXCLUDED.est_actif,
  commission_pct_negociee = EXCLUDED.commission_pct_negociee;`,
    count: rows.length,
  };
}


function buildMigrationsLogSQL(totalRowsAffected) {
  const id = deterministicUUID("migration", "S1-gamma_seed_initial_2026-05-08");
  const note = "Seed initial 8 châteaux : 4 modules + 8 chateaux + 23 chambres + 48 amenities + 48 timeline + 36 alentours + 12 chateau_modules. Source : src/data/chateaux.js. UUIDs déterministes.";

  return `-- 8. migrations_log (1 ligne — trace S1-γ)
INSERT INTO public.migrations_log (id, nom_migration, rows_affected, notes) VALUES
  (${sqlEscape(id)}, 'S1-gamma_seed_initial_2026-05-08', ${totalRowsAffected}, ${sqlEscape(note)})
ON CONFLICT (nom_migration) DO UPDATE SET
  rows_affected = EXCLUDED.rows_affected,
  notes         = EXCLUDED.notes,
  executed_at   = NOW();`;
}


// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  // Import dynamique de chateaux.js (ESM) depuis ce script .cjs
  const url = `file://${path.resolve(__dirname, "../src/data/chateaux.js").replace(/\\/g, "/")}`;
  const mod = await import(url);
  const chateaux = mod.chateaux;

  console.log("═══ Test parseDistanceParis sur les 8 châteaux ═══");
  chateaux.forEach((c) => {
    const parsed = parseDistanceParis(c.distanceParis);
    console.log(`  id ${c.id} : "${c.distanceParis}" → ${parsed} min`);
  });
  console.log("");

  // Génération section par section
  const modulesSQL    = buildModulesSQL();
  const chateauxSQL   = buildChateauxSQL(chateaux);
  const chambresSQL   = buildChambresSQL(chateaux);
  const amenitiesSQL  = buildAmenitiesSQL(chateaux);
  const timelineSQL   = buildTimelineSQL(chateaux);
  const alentoursRes  = buildAlentoursSQL(chateaux);
  const cmRes         = buildChateauModulesSQL(chateaux);

  // Compteurs réels
  const counts = {
    modules:           4,
    chateaux:          chateaux.length,
    chambres:          chateaux.reduce((s, c) => s + (c.chambres?.length || 0), 0),
    chateau_amenities: chateaux.reduce((s, c) => s + (c.activites?.length || 0), 0),
    chateau_timeline:  chateaux.reduce((s, c) => s + (c.timeline?.length || 0), 0),
    chateau_alentours: alentoursRes.count,
    chateau_modules:   cmRes.count,
    migrations_log:    1,
  };
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const migrationsLogSQL = buildMigrationsLogSQL(total);

  // Header SQL
  const now = new Date().toISOString();
  const header = `-- ═══════════════════════════════════════════════════════════════════════════
-- LES CLÉS DU CHÂTEAU — SEED INITIAL (S1-γ)
-- ═══════════════════════════════════════════════════════════════════════════
-- Fichier généré automatiquement par scripts/generate-seed.cjs
-- Source     : src/data/chateaux.js (8 châteaux : 6 mocks + 2 premium)
-- Date       : ${now}
-- Idempotent : ON CONFLICT DO UPDATE sur toutes les tables
-- Rejouable  : oui — UUIDs déterministes (SHA-1 namespace:name)
-- Pré-requis : schema.sql (S1-α) + policies.sql (S1-β) appliqués
-- ═══════════════════════════════════════════════════════════════════════════`;

  // Pied SQL — récap
  const footer = `-- ═══════════════════════════════════════════════════════════════════════════
-- STATISTIQUES SEED
-- ═══════════════════════════════════════════════════════════════════════════
-- modules            : ${counts.modules} lignes
-- chateaux           : ${counts.chateaux} lignes
-- chambres           : ${counts.chambres} lignes
-- chateau_amenities  : ${counts.chateau_amenities} lignes
-- chateau_timeline   : ${counts.chateau_timeline} lignes
-- chateau_alentours  : ${counts.chateau_alentours} lignes${alentoursRes.skipped ? ` (${alentoursRes.skipped} skipped — type invalide)` : ""}
-- chateau_modules    : ${counts.chateau_modules} lignes
-- migrations_log     : ${counts.migrations_log} ligne
-- TOTAL              : ${total} INSERT (idempotents via ON CONFLICT)
-- ═══════════════════════════════════════════════════════════════════════════`;

  const fullSQL = [
    header,
    "",
    "BEGIN;",
    "",
    modulesSQL,
    "",
    chateauxSQL,
    "",
    chambresSQL,
    "",
    amenitiesSQL,
    "",
    timelineSQL,
    "",
    alentoursRes.sql,
    "",
    cmRes.sql,
    "",
    migrationsLogSQL,
    "",
    "COMMIT;",
    "",
    footer,
    "",
  ].join("\n");

  const outPath = path.resolve(__dirname, "../supabase/seed.sql");
  await fs.writeFile(outPath, fullSQL, "utf8");

  console.log("═══ Compteurs finaux par table ═══");
  Object.entries(counts).forEach(([table, n]) => {
    console.log(`  ${table.padEnd(20)} : ${n} lignes`);
  });
  console.log(`  ${"TOTAL".padEnd(20)} : ${total} INSERT`);
  console.log("");
  console.log(`✓ Seed généré : ${outPath}`);
  console.log(`  Taille : ${fullSQL.length} octets`);
}

main().catch((err) => {
  console.error("Erreur génération seed :", err);
  process.exit(1);
});
