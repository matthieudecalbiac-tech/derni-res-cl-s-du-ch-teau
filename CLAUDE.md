# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Les Dernières Clés du Château** — a French-language single-page marketing site offering last-minute stays in châteaux within ~3h of Paris. UI, component names, comments, and content are in French; preserve that when editing or adding strings.

### Editorial voice (non-negotiable)
- Tone is **patrimonial / editorial**, never promotional. Avoid marketing-speak, superlatives, urgency tropes, and emoji in copy.
- When referring to the Fondation du Patrimoine contribution, always phrase it as **"une partie de nos recettes"**. Never cite a fixed percentage, even if the user gives one conversationally — it must stay vague in the UI.

## Commands

Vite + React 19. No test runner and no linter are configured.

- `npm run dev` — start the Vite dev server
- `npm run build` — production build
- `npm run preview` — serve the built output

`package-lock.json` is the lockfile in use; npm is wired up via scripts. (`pnpm-lock.yaml` was removed in commit ede6b25 on April 25, 2026 to resolve a Vercel deployment desync.)

## Architecture

### Single-component shell with overlay state in `App.jsx`
`src/App.jsx` is the entire router. The page renders `Header` + `Hero` + a few landing sections, and every other "page" (château detail, map explorer, auth, account, club flow, à-propos, etc.) is a full-screen overlay component mounted conditionally based on a `useState` boolean in `App`. Navigation callbacks (`onOuvrirX`) are drilled from `App` down through `Header`, `Hero`, `Footer`, and others to toggle those booleans. When adding a new page/overlay, follow the same pattern: add a `xxxOuvert` state in `App.jsx`, mount the component conditionally at the bottom, and drill an `onOuvrirXxx` prop to whichever triggers open it.

### Two kinds of château detail pages
Clicking a château goes through `ouvrirChateau()` which sets `transitionChateau`, plays `TransitionPorte`, then opens a detail overlay. The overlay type is chosen by id:

```jsx
(chateau.id === 8 || chateau.id === 7)
  ? <VitrineChateau ... />   // premium editorial layout
  : <ChateauModal ... />     // standard modal
```

`VitrineChateau.jsx` is a richer, one-off "vitrine" experience (scroll progress, time-of-day theming, cursor tracking, météo, etc.). Only two châteaux are wired to it today:
- **id 7 — Les Briottières**
- **id 8 — Le Blanc Buisson**

`ChateauModal.jsx` is the default for everything else. If you promote more châteaux to the vitrine layout, update that id check in `App.jsx`.

### Data
All château content is hardcoded in `src/data/chateaux.js` as a single exported array. There is no backend — prices, availability ("J-7", "chambresRestantes"), images, history, timeline, and coordinates all live in this file. Auth, reservations, and club membership are UI-only flows with no persistence.

### Styles
- One CSS file per component under `src/styles/`, imported directly from the component.
- `src/styles/global.css` owns the design tokens (CSS custom properties on `:root`, spacing and shadow scales). Reuse these tokens rather than introducing new colors or fonts.
- Fonts and Leaflet CSS/JS are loaded via CDN in `index.html` (not npm imports).

#### Brand palette (canonical values)
- **Navy** `#07101E`
- **Or** `#C09840`
- **Crème** `#F7F2E8`

#### Typographies (canonical stack)
- **Playfair Display** — display / titres
- **Crimson Pro** — texte éditorial
- **Cormorant Garamond** — sérif secondaire / accents

If a token in `global.css` drifts from these canonical values, the canonical values above win — update the token, don't introduce a parallel one.

#### Vitrines — class-name convention
CSS classes inside vitrine components (`VitrineChateau`, `VitrinePermanente`, `VitrineClub`, `VitrineDernieresCle`, and their CSS files) must use the **`vc3-`** prefix. Do not mix bare class names into vitrine markup or CSS — scope everything under `vc3-` to keep the vitrine styles isolated from the rest of the site.

### Maps
`react-leaflet` is used in `CarteExplorer` / `CarteFrance`, but Leaflet itself is loaded from the unpkg CDN in `index.html` rather than bundled.

### Animations
`src/hooks/useScrollAnimation.js` is a small `IntersectionObserver` hook (`const [ref, visible] = useScrollAnimation()`) used to trigger fade-ins on scroll. Prefer it over ad-hoc observer logic.

## Repo hygiene notes

- `fix.cjs`…`fix9.cjs` at the repo root are one-shot Node scripts that previously rewrote image URLs in `src/data/chateaux.js` and `src/components/VitrineChateau.jsx`. They are not part of the build — do not import or extend them; write a new `fixN.cjs` only if you need a similar one-off migration.
- For any bulk find/replace or codemod on project files, always write a **`.cjs` script** and run it with `node`. Never use `python -c '...'` inline one-liners, and never use `sed`/`awk` for multi-line JSX/CSS rewrites — the `.cjs` pattern is what has been used historically and what the user expects to review.
- `*-knowledge.txt` files at the repo root and `Header.jsx.bak` are reference snapshots, not live code. Don't modify them unless asked.
- `lcc-backup*.bundle` are git bundles kept as backups.
