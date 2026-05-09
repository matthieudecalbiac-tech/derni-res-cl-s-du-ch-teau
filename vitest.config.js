// ═══════════════════════════════════════════════════════════════════════════
// Vitest config — Sprint S1-δ Phase 4.3
// ═══════════════════════════════════════════════════════════════════════════
// Configure Vitest pour les tests unitaires JS/JSX du projet LCC.
//
// - environment: 'node' suffit pour le mapper Phase 4.3 (logique pure).
//   À basculer en 'jsdom' quand on testera des composants React.
// - exclude tests/ pour ne pas piétiner sur le périmètre Playwright E2E.
// - globals: false pour favoriser les imports explicites (clarté).
// ═══════════════════════════════════════════════════════════════════════════

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.test.js", "src/**/*.test.jsx"],
    exclude: ["node_modules/**", "tests/**", "dist/**", ".vercel/**"],
    reporters: ["default"],
  },
});
