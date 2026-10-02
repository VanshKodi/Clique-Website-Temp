# Team Roulette — Build Decisions Log

Host: CLIQUE website repo. App lives entirely under the `/hidden` route.
Brief: `team-roulette-brief.md` (repo root). Decisions recorded here whenever the brief is silent or the host repo forces a deviation.

## Plan

1. Scaffold: deps + Tailwind (theme+utilities only) + route nesting under `/hidden`.
2. Engine + store + vitest unit tests green before any UI.
3. Setup page.
4. Draw shell + Slots to full polish.
5. Remaining modes one at a time (Card Pack → Wheel → Lottery → Horse Race → Spotlight Grid per build order; tab order per brief §8).
6. Finish screen, presentation mode, roster drawer.
7. Playwright e2e, screenshots, README section.

`RUN_MODE = FULL`.

## Decisions

- **D1 — Host integration, not standalone.** The brief assumes a standalone app with `HashRouter`. Here the app is nested under the site's `BrowserRouter`: route `/hidden` = Setup, `/hidden/draw/:mode` = Draw, `/hidden/draw` and unknown modes redirect to `/hidden/draw/slots`. HashRouter would fight the site's URL scheme and is dropped.
- **D2 — `base: './'` not adopted.** The site's `vite.config.ts` must keep `base: '/'` (relative base breaks React Router basename — see comment in that file). The brief's standalone-host requirement does not apply to this integrated deploy.
- **D3 — React 19, not 18.** Host repo pins `react@^19`. No React-18-only APIs used; contract unchanged.
- **D4 — Tailwind without preflight.** Host site styles elements globally (inline styles + `index.css`); Tailwind preflight would reset headings/buttons site-wide. Import only Tailwind's `theme` + `utilities` layers (no preflight). A small scoped reset inside the Team Roulette shell covers the brief's expectations.
- **D5 — Router-visible chrome suppressed.** The site nav/header/footer are not rendered on `/hidden` (the existing `HiddenPage` placeholder is superseded by the Team Roulette app) so the app owns the full viewport, as a projector-first app should.
- **D6 — Tests: vitest (jsdom) now, Playwright e2e in Phase 6.** `npm test` = `vitest run`. Engine tests are pure TS; jsdom covers the persisted store tests (localStorage). Playwright browsers are a large download — the `npx playwright install chromium` step is handed to the user if slow.
- **D7 — `?seed=N` gating.** Seeded PRNG is accepted only when `import.meta.env.VITE_E2E === '1'` (vite env var, build-time). `?fast=1` honored in any build, per brief §11.
- **D8 — Fonts via @fontsource** (`@fontsource/bungee` display + `@fontsource/space-grotesk` body), self-hosted, imported only from the Team Roulette app so files download only when that route renders (Vite bundles CSS; browsers fetch fonts on use).
- **D9 — Store persist key** `team-roulette:v1`, `version: 1` with an identity `migrate` stub; `animating` excluded from persistence (transient), per brief §4.
- **D10 — Scope flag.** Site-wide `?seed`/`?fast` are read only inside Team Roulette code; main site unaffected.
