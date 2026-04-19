/**
 * Audit Lighthouse · LCC
 *
 * Lance Lighthouse sur la home et les 2 vitrines, stocke les scores.
 * Résultats consommés par le dashboard.
 *
 * Utilisation : node scripts/lighthouse.cjs
 * Prérequis : npm i -D lighthouse chrome-launcher
 */
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.QA_TARGET === 'prod'
  ? (process.env.QA_PROD_URL || 'https://derni-res-cl-s-du-ch-teau.vercel.app')
  : 'http://localhost:5174';

const PAGES = [
  { nom: 'Home', url: BASE_URL },
  // Les vitrines ne sont pas des URLs — elles s'ouvrent en overlay React.
  // On audite la home uniquement tant qu'il n'y a pas de routing.
];

async function run() {
  const lighthouse = (await import('lighthouse')).default;
  const chromeLauncher = await import('chrome-launcher');

  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const results = [];

  for (const page of PAGES) {
    console.log(`🔍 Audit Lighthouse : ${page.nom} (${page.url})`);
    try {
      const { lhr } = await lighthouse(page.url, {
        port: chrome.port,
        output: 'json',
        logLevel: 'error',
      });

      results.push({
        nom: page.nom,
        url: page.url,
        timestamp: new Date().toISOString(),
        scores: {
          performance: Math.round(lhr.categories.performance.score * 100),
          accessibility: Math.round(lhr.categories.accessibility.score * 100),
          bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
          seo: Math.round(lhr.categories.seo.score * 100),
        },
        metriques: {
          fcp: lhr.audits['first-contentful-paint'].displayValue,
          lcp: lhr.audits['largest-contentful-paint'].displayValue,
          tbt: lhr.audits['total-blocking-time'].displayValue,
          cls: lhr.audits['cumulative-layout-shift'].displayValue,
        },
      });
    } catch (err) {
      console.error(`❌ Erreur sur ${page.nom}:`, err.message);
      results.push({ nom: page.nom, url: page.url, erreur: err.message });
    }
  }

  await chrome.kill();

  const outputPath = path.join(__dirname, '..', 'lighthouse-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Résultats enregistrés dans ${outputPath}`);

  // Résumé console
  results.forEach((r) => {
    if (r.erreur) return;
    console.log(`\n${r.nom} — ${r.url}`);
    console.log(`  Perf: ${r.scores.performance}  ·  A11y: ${r.scores.accessibility}  ·  SEO: ${r.scores.seo}  ·  BP: ${r.scores.bestPractices}`);
  });
}

run().catch((err) => {
  console.error('❌ Lighthouse a échoué:', err);
  process.exit(1);
});
