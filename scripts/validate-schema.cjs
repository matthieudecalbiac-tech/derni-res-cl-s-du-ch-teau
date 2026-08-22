#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// LCC — Garde-fou anti-dérive de `supabase/schema.sql`
// ═══════════════════════════════════════════════════════════════════════════
//
// QUOI — compare la liste des tables créées par les MIGRATIONS à celle déclarée
// dans `schema.sql`. Toute table créée par migration et absente du schéma fait
// ROUGIR (exit 1).
//
// POURQUOI — sous-audit D du 22 août 2026. `schema.sql` déclarait 21 tables,
// la base en avait 23 : `messages` et `paliers` manquaient. Sept autres tables
// créées par migration avaient bien été rétro-portées — la convention était donc
// TENUE SEPT FOIS SUR NEUF, et c'est précisément ce qui rendait la dérive
// dangereuse : un fichier tenu à 91 % n'est ni mort ni manifestement faux, il
// est CRU. `paliers` est requêtée par `clubService.js:18` et n'était pas dans la
// référence.
//
// ⚠⚠ CE QUE CE GARDE-FOU NE VOIT PAS — À LIRE AVANT DE S'Y FIER
//
// Il compare des NOMS DE TABLES, pas des STRUCTURES. Une colonne ajoutée par
// `ALTER TABLE` sans être reportée dans `schema.sql`, un index, une contrainte,
// une policy : tout cela passera au VERT.
//
// C'est un filet contre la dérive GROSSIÈRE — celle qu'on vient de subir — pas
// contre la dérive fine. Ne pas en conclure « schema.sql est à jour » : en
// conclure seulement « aucune table entière ne manque ».
//
// ── POURQUOI LES MIGRATIONS, ET PAS LA BASE ─────────────────────────────────
//
// La CI n'a pas les identifiants de production, et lui en donner pour un
// contrôle d'hygiène serait un mauvais échange. La comparaison se fait donc
// fichier à fichier, sans réseau.
//
// ── POURQUOI LA COMPARAISON EST UNIDIRECTIONNELLE ───────────────────────────
//
//   table dans une migration ET absente de schema.sql   ->  ROUGE
//   table dans schema.sql    ET absente des migrations  ->  NORMAL
//
// Le second cas est légitime : les 21 tables d'origine ont été créées par
// `schema.sql` lui-même, sans passer par une migration. Un contrôle
// bidirectionnel rougirait sur les 21 dès le premier run.
//
// ── POURQUOI ON SOUSTRAIT LES `DROP TABLE` ──────────────────────────────────
//
// Une table créée par une migration puis supprimée par une autre n'a rien à
// faire dans `schema.sql`. On rejoue donc les fichiers dans l'ordre
// CHRONOLOGIQUE (leur nom commence par la date) et on tient un ensemble vivant.
// ═══════════════════════════════════════════════════════════════════════════

const fs = require("fs");
const path = require("path");

const RACINE = path.resolve(__dirname, "..");
const SCHEMA = path.join(RACINE, "supabase", "schema.sql");
const MIGRATIONS = path.join(RACINE, "supabase", "migrations");

// `CREATE TABLE [IF NOT EXISTS] [public.]<nom>` — on ignore les tables TEMP,
// qui ne vivent que le temps d'une session de test et n'ont rien à faire dans
// le schéma (cf. `tests-rls.sql`, `tests-garde-club.sql`).
const RE_CREATE = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi;
const RE_CREATE_TEMP = /CREATE\s+(?:TEMP|TEMPORARY)\s+TABLE/i;
const RE_DROP = /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi;

// Un `CREATE TABLE` en commentaire ne crée rien. On retire donc les commentaires
// de ligne avant de lire — sans quoi la prose pédagogique de ce dépôt, qui cite
// abondamment du SQL, produirait des faux positifs.
function sansCommentaires(sql) {
  return sql
    .split(/\r?\n/)
    .filter((l) => !/^\s*--/.test(l))
    .join("\n");
}

function tablesCreees(sql) {
  const noms = new Set();
  for (const m of sansCommentaires(sql).matchAll(RE_CREATE)) noms.add(m[1].toLowerCase());
  return noms;
}

function tablesSupprimees(sql) {
  const noms = new Set();
  for (const m of sansCommentaires(sql).matchAll(RE_DROP)) noms.add(m[1].toLowerCase());
  return noms;
}

function principal() {
  if (!fs.existsSync(SCHEMA)) {
    console.error(`✗ schema.sql introuvable : ${SCHEMA}`);
    process.exit(1);
  }
  if (!fs.existsSync(MIGRATIONS)) {
    console.error(`✗ dossier de migrations introuvable : ${MIGRATIONS}`);
    process.exit(1);
  }

  const declarees = tablesCreees(fs.readFileSync(SCHEMA, "utf8"));

  // Ordre CHRONOLOGIQUE : les noms de fichiers commencent par AAAA-MM-JJ, donc
  // le tri lexicographique est le tri chronologique.
  const fichiers = fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();

  const vivantes = new Map(); // nom -> fichier qui l'a créée en dernier
  for (const f of fichiers) {
    const sql = fs.readFileSync(path.join(MIGRATIONS, f), "utf8");
    if (RE_CREATE_TEMP.test(sql)) {
      // Un fichier peut mêler TEMP et permanent : on ne saute pas le fichier,
      // le filtre porte sur chaque occurrence via la regex principale, qui
      // n'admet pas le mot TEMP entre CREATE et TABLE.
    }
    for (const nom of tablesCreees(sql)) vivantes.set(nom, f);
    for (const nom of tablesSupprimees(sql)) vivantes.delete(nom);
  }

  const manquantes = [...vivantes.keys()].filter((n) => !declarees.has(n)).sort();

  console.log("⚜  Hygiène du schéma");
  console.log(`   schema.sql          : ${declarees.size} table(s) déclarée(s)`);
  console.log(`   migrations          : ${vivantes.size} table(s) créée(s) et non supprimée(s)`);
  console.log(`   fichiers parcourus  : ${fichiers.length}`);

  if (manquantes.length === 0) {
    console.log("\n✓ Aucune dérive : toute table créée par migration est déclarée dans schema.sql.");
    console.log("  ⚠ Rappel : ce contrôle porte sur les NOMS de tables, pas sur leur structure.");
    process.exit(0);
  }

  console.error(`\n✗ DÉRIVE — ${manquantes.length} table(s) créée(s) par migration et ABSENTE(S) de schema.sql :\n`);
  for (const nom of manquantes) {
    console.error(`   · ${nom.padEnd(24)} créée par ${vivantes.get(nom)}`);
  }
  console.error(`
  schema.sql est la référence du projet : incomplet, il est CRU sur parole et
  induit en erreur. Rétro-porter ces tables depuis l'ÉTAT RÉEL EN BASE — pas
  depuis la migration, qui peut avoir été modifiée par un ALTER ultérieur.

  ⚠ NE PAS régénérer schema.sql par un dump : cela détruirait les COMMENT
  rédigés à la main, qui portent une part du raisonnement du projet.
`);
  process.exit(1);
}

principal();
