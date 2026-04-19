/**
 * Configuration Playwright · LCC QA
 * Cible localhost en dev, prod Vercel en CI.
 *
 * Variables :
 *   QA_TARGET=prod        → teste la prod Vercel
 *   QA_PROD_URL=...       → surcharge l'URL prod
 *   PORT=5175 npm run qa  → aligne Playwright + webServer sur un port précis
 *
 * Par défaut, PORT = 5174 (cohérent avec l'environnement historique du projet).
 */
const { defineConfig, devices } = require('@playwright/test');

const TARGET = process.env.QA_TARGET || 'local';
const PORT = Number(process.env.PORT) || 5174;
const BASE_URL = TARGET === 'prod'
  ? (process.env.QA_PROD_URL || 'https://derni-res-cl-s-du-ch-teau.vercel.app')
  : `http://localhost:${PORT}`;

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  fullyParallel: false, // Tests séquentiels pour stabilité visuelle
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'qa-results.json' }],
    ['list'],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'webkit-desktop', // Safari — critique pour curseur custom + filters CSS
      use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
    },
  ],
  webServer: TARGET === 'local' ? {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60 * 1000,
  } : undefined,
});
