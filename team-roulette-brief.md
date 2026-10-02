# Team Roulette: Agent Build Package

**How to use:** open an empty project folder in a coding agent (Claude Code, Cursor, etc.), attach this file and say: *"Follow the brief in team-roulette-brief.md."*
Everything down to **Follow-up prompts** is addressed to the agent. The follow-ups at the bottom are for you to paste later.

**Run mode** (edit this line before sending):

```
RUN_MODE = FULL
```

- `FULL`: build everything and finish.
- `SLOTS_FIRST`: stop after Phase 3 (Slots fully polished), report with screenshots, and wait for my go-ahead.

---

# 1. Mission

You are building **Team Roulette**, a visually spectacular random team-formation app for a live event. Build it end to end, run it, test it, and do not finish until the acceptance checks in section 12 pass.

**Situation**
- About 12 people attend; some may not show, others may arrive late.
- I have a photo of each person.
- The host runs everything from **one laptop on a projector** while everyone watches. This is not multiplayer: no accounts, no realtime sync, no backend.
- Flow: Setup page (roster, attendance, team-size settings) -> press **START DRAW** -> Draw page with one **tab per animation mode**. Each tab draws the next team in a different style. The first tab is a casino slot machine where person photos flutter up and down like reels and wherever they rest becomes the team. Pressing **Next Team** removes those people from the pool.

## 1.1 Core principle: decide first, animate second

When Next Team is pressed:
1. The app picks the team with an unbiased crypto-random shuffle.
2. It **commits** that team to the store immediately.
3. The active tab plays an animation that must end exactly on the committed team.

Consequences you must preserve: a refresh mid-animation cannot change who is on a team; no mode can produce duplicates or glitches; tabs share state, so drawing Team 1 in Slots and Team 2 in Wheel just works.

## 1.2 Non-goals for v1

No backend, no multiplayer or phone voting, no accounts, no analytics, no network calls at runtime. "These two can't be on the same team" constraints are **out of scope**, but keep `drawTeam` structured so a `constraints` argument could be added later.

## 1.3 Quality bar

No placeholder copy, no lorem ipsum, no TODOs left in code. Family-friendly text everywhere (team names, race commentary). If you cannot run a browser or Playwright in your environment, say so clearly instead of claiming the checks passed.

---

# 2. Stack and constraints

- **React 18 + Vite + TypeScript (strict)**, **Tailwind CSS**, **Framer Motion**, **Zustand** with `persist` (localStorage, `version: 1` plus a stub `migrate`), **react-router** using `HashRouter`, **canvas-confetti**, **html-to-image**, **Vitest**, **Playwright**.
- Vite `base: './'` so `dist/` works from any static host. Note that `file://` will not work with ES modules; do not promise it.
- Pick the right animation tool per mode: Framer Motion for springs, layout and flips; a small deterministic **time-based** `requestAnimationFrame` hook (`useTween`) wherever a mode must land at an exact position (reels, wheel); `matter-js` only for the lottery tumble.
- **100% offline after `npm install`.** Self-host fonts with `@fontsource/*`, synthesize all sounds with the Web Audio API (no audio files), no CDNs, no remote images, no network calls.
- **16:9 projector first** (1920x1080), fully usable on a laptop. The Setup page must also be usable on a phone.
- Respect `prefers-reduced-motion`: replace motion with simple fades, but keep the same logic and the same result.
- Animate only `transform` and `opacity` on the stage. Drive rAF animation through refs or Framer motion values, not React state, so there are no per-frame re-renders.
- Preload and `decode()` all photos for a draw before its animation starts, so there is no pop-in.

---

# 3. Routes

| Route | Page |
|---|---|
| `/` | Setup |
| `/draw/:mode` | Draw page; `mode` is a registry id. `/draw` redirects to `/draw/slots`. Unknown ids redirect to `/draw/slots`. |

Tabs are routes, so a refresh keeps the tab. All state lives in the store, so switching tabs loses nothing. Tabs are **locked while a draw is animating**.

---

# 4. Data model and state rules

```ts
interface Person   { id: string; name: string; photo: string /* 256px square JPEG data URL */; present: boolean }
interface Settings { by: 'size' | 'count'; size: number; count: number; remainder: 'balanced' | 'fillLast' | 'bench' }
interface Team     { id: string; index: number; name: string; color: string;
                     memberIds: string[]   /* reveal order */; kind: 'team' | 'bench' }

// persisted:  people[], settings, teams[], mute
// transient (NOT persisted): animating: { teamId: string; revealedIds: string[] } | null
```

**Rules (single source of truth: derive, never duplicate):**
- `pool = people.filter(p => p.present && !onAnyTeam(p))`. The pool is **derived only**, never stored.
- A person is on **at most one team**. The store enforces this.
- `commitNextTeam()` is one **synchronous** store action: compute next size from the live pool, draw, create the Team (auto name and colour), push it, set `animating`. It is guarded by the `animating` flag and ignores key-repeat, so a double press can never double draw.
- Other actions: `undoLastTeam()` (members return to the pool automatically), `resetDraw()`, `togglePresent(id)`, `addPeople()`, `updatePerson()`, `removePerson()` (also removes them from any team; the team keeps its other members), `setSettings()`, `renameTeam()`, `finishReveal(id)`.
- Team chips and results show a member **only after** the mode calls `onReveal`. After a reload nothing is animating, so everything simply shows as revealed.
- **Visible pool** for the left rail = `pool` plus members of the currently animating team that are not yet in `revealedIds`. That is how faces "fly out" at the moment of reveal.
- A person marked absent **after** being drawn stays on their team (history is history) and gets a small "absent" badge on the team chip. Undo is the fix.
- Roster edits during an animation are locked; edits made between draws apply to the next draw. A mode's `pool` prop is a **snapshot** taken at draw start, so a strip never changes mid-spin.
- Team names: adjective + noun from two 24-word family-friendly lists, never repeating within an event, editable inline. Colours: a fixed 8-colour palette that reads well on the dark background.

---

# 5. Engine (pure TypeScript in `src/engine`, no React, fully unit-tested)

## 5.1 Planning

```ts
type Plan = { sizes: number[]; bench: number; warnings: 'single-person-team'[] };
function planSizes(poolCount: number, teamsDrawn: number, s: Settings): Plan
```

`poolCount` is the **live** pool size; `sizes` describes the **remaining** teams and `sizes[0]` is the next team. It is recomputed before every draw, so late arrivals and absences just work.

| Mode | Rule |
|---|---|
| `by: 'size'`, `balanced` (default) | `t = ceil(n / size)` teams, spread evenly, larger teams first. Size is a **maximum**. |
| `by: 'size'`, `fillLast` | `floor(n / size)` full teams, then one smaller team if there is a remainder. |
| `by: 'size'`, `bench` | `floor(n / size)` full teams; leftovers become `bench` (substitutes). |
| `by: 'count'` | `remaining = clamp(max(1, count - teamsDrawn), 1, n)` teams, split evenly. `bench = 0`. A late arrival after the planned count simply forms one extra team. |

Also: `n = 0` gives `sizes: [], bench: 0`. Never emit a size of 0. Add the `single-person-team` warning if any size is 1 (the UI must show it). When `sizes` is empty and `bench > 0`, the **next draw is the Substitutes draw** (`kind: 'bench'`, size = bench), shown as "Substitutes" with a neutral colour.

**Fixtures (use as unit tests):**

| Present | Setting | Result |
|---|---|---|
| 12 | size 4, balanced | 4 / 4 / 4 |
| 12 | size 5, balanced | 4 / 4 / 4 |
| 12 | size 5, fillLast | 5 / 5 / 2 |
| 12 | size 5, bench | 5 / 5 + 2 substitutes |
| 10 | size 4, balanced | 4 / 3 / 3 |
| 10 | size 4, fillLast | 4 / 4 / 2 |
| 11 | size 3, balanced | 3 / 3 / 3 / 2 |
| 7 | size 3, fillLast | 3 / 3 / 1 (warning) |
| 12 | count 5 | 3 / 3 / 2 / 2 / 2 |
| 12 | count 3 | 4 / 4 / 4 |

Re-planning must be stable: for balanced mode, planning once and then re-planning after each draw yields the same sequence (e.g. 10, size 4 -> 4 then re-plan on 6 -> 3 / 3).

## 5.2 Drawing

```ts
function drawTeam(pool: Person[], size: number, rng: Rng = cryptoRng): Person[]
```

- Unbiased Fisher-Yates over `crypto.getRandomValues`. Use **rejection sampling** for the integer helper (no modulo bias).
- Returns people in random order; that order **is the reveal order**.
- `rng` is injectable. `?seed=N` swaps in a seeded PRNG **only in builds made with `VITE_E2E=1`**; it must be impossible to enable in a normal build.
- If `size >= pool.length`, return the whole pool shuffled.

## 5.3 Required unit tests

- No duplicates within a team; correct sizes for **every n in 2..30 x every strategy x both `by` modes**.
- Every present person is drawn **exactly once** across a full run.
- Re-plan after a late arrival and after an absence mid-run.
- Pool smaller than size; last team equals the whole pool.
- Undo returns members to the pool and the plan recomputes.
- A 10,000-run uniformity sanity check (each person's position/inclusion frequency within a loose tolerance).
- Store invariants: double `commitNextTeam()` while animating is a no-op.

---

# 6. Mode contract (what makes tabs cheap)

```ts
interface ModeProps {
  team: Person[];          // already decided; reveal in this order
  pool: Person[];          // snapshot of everyone eligible at draw time, INCLUDING team
  teamLabel: string;       // e.g. "Team 2" or "Substitutes"
  speed: number;           // 1 normally; 4 under ?fast=1 (tests)
  reducedMotion: boolean;
  onReveal(p: Person, i: number): void;  // call as each member is revealed
  onDone(): void;                        // exactly once, when all are revealed
}
interface ModeHandle { skip(): void }    // REQUIRED
// registry entry: { id, label, icon, Component: forwardRef<ModeHandle, ModeProps> }
```

Every mode must:
- end **exactly** on `team`;
- have a good **idle state** before the first draw (never a blank stage);
- support `skip()`: jump to the final state, call `onReveal` for any remaining members in order, then `onDone()`; idempotent;
- never mutate the store;
- use the shared `sfx` service (`tick`, `clunk`, `whoosh`, `pop`, `flip`, `win`), which respects mute and unlocks the `AudioContext` on the first user gesture;
- handle small pools gracefully (e.g. last team equals the whole pool, or a pool of 1 to 3): repeat faces in strips, auto-land a one-wedge wheel, and so on;
- announce reveals politely to screen readers (`aria-live`), e.g. "Team 2: Ana, Ben, Chloe, Dev".

Adding a mode = **one folder in `src/modes/<id>/` + one line in the registry**. Document this in the README. Registry order = tab order.

---

# 7. Pages

## 7.1 Setup (`/`)

- **Roster grid** of big photo cards. **One tap toggles present/absent** (absent = desaturated and dimmed); this is the most-used action on the day. Header badge: "10 / 12 here". Per card: edit name, replace photo, delete.
- **Add single or BULK**: drop many images at once. Name from filename (`john_smith (2).jpg` -> "John Smith"), editable inline right away.
- **Photo pipeline:** `createImageBitmap(file, { imageOrientation: 'from-image' })` (phone photos are often rotated) -> **top-biased square crop** (for portraits, start 15% of the slack from the top, because faces sit high; landscape centred) -> optional pan/zoom adjust modal (1x to 3x, drag) -> 256x256 canvas -> JPEG quality about 0.82 data URL. Show all photos with `object-position: 50% 20%`.
- Catch localStorage quota errors with a clear on-screen message, and call `navigator.storage.persist()` when available.
- **Seed 12 demo people** with locally generated gradient/initial avatars so the app is demoable immediately, plus a **Clear demo people** button.
- **Settings:** segmented control "Team size 3 | 4 | 5 | custom" **or** "Number of teams - n +". Remainder strategy selector (default `balanced`) with a one-line explanation of each, using the 12-people / size-5 example.
- **Live preview** straight from the engine: "10 here -> 3 teams: 4 / 3 / 3" with small face dots; visible warning for 1-person teams.
- Roster **export/import as JSON** (backup for event day).
- Big neon **START DRAW** (`data-testid="start-draw"`), disabled when fewer than 2 people are present. If a draw is already in progress, show **Resume** or **Start new** (confirm).

## 7.2 Draw (`/draw/:mode`)

- **Top tab bar:** one tab per mode (icon + label + number key).
- **Left rail:** the visible pool (faces fly out when revealed; late arrivals drop in).
- **Centre:** the stage (the active mode).
- **Right rail:** team chips filling as members are revealed, with team colour and editable name.
- **Control bar:**
  - **NEXT TEAM**; label shows "Team 2 . 4 people" (or "Reveal substitutes")
  - **Skip** (only while animating)
  - **Undo last team** (confirm)
  - **Reveal remaining**: commit and reveal all remaining teams instantly with a short staggered cascade, no mode animation
  - **Roster drawer**: toggle present/absent, add a late arrival, for no-shows and late arrivals
  - Sound toggle, Fullscreen, Presentation mode
- **Keys:** `Space` / `Enter` / `ArrowRight` / `PageDown` = Next Team, or Skip while animating (works with presenter clickers); `1`-`9` switch tabs; `F` fullscreen; `M` mute; `H` hide/show chrome. Ignore key-repeat; ignore keys while typing in an input.
- **Presentation mode:** hides tabs, controls and rails (stage plus team strip only); `H` or a hover hotspot in a corner brings the chrome back.
- **Finish screen** when the pool is empty: a poster of all teams (and substitutes), **Copy as text**, **Download PNG** (html-to-image), **Start over**.
- **Stretch:** a "Surprise me" pseudo-tab that picks a random mode per draw; "Replace member" (a drawn person left: draw a replacement from the pool into the same slot).

---

# 8. Modes

**Build order:** Slots -> Spotlight Grid (cheap, proves the contract) -> Card Pack -> Wheel -> Horse Race -> Lottery. **Tab order:** Slots, Card Pack, Wheel, Lottery, Horse Race, Spotlight Grid. Polish each mode before starting the next; commit after each.

## 8.1 SLOTS (flagship: highest polish)

**Cabinet:** one vertical reel per team member (3 to 6), inside a casino cabinet drawn in SVG/CSS: chasing marquee bulbs while spinning, a payline, glass glare. The window shows three cells per reel (above, **payline**, below). Cells above and below the payline are dimmed so only the payline row reads as the result.

**Motion has two phases per reel:**

- **(a) Spin.** A small backward wobble, a ramp to full speed (~0.5 s), then loop a shuffled strip of pool faces (no identical adjacent cells; strip at least 24 cells) with vertical motion blur. Quantize the blur to three levels (about 0, 2, 5 px) via an SVG `feGaussianBlur stdDeviation="0 N"` (or a streak overlay) instead of updating the filter every frame.
- **(b) Settle.** At the stop time, **splice the target in ahead of the reel**: current visible cells + at least 8 filler cells (pool faces other than the target) + the target + one filler below. Then tween `translateY` to the target with `easeOutCubic` over duration `D` (0.8 to 1.4 s). **Match velocity to avoid a jolt:** choose `D`, then distance `S = v * D / 3` (for `easeOutCubic` the initial velocity is `3S/D`), and add enough filler cells to cover `S`. Finish with a short spring overshoot of about 0.3 cell.

**Timing at `speed = 1` (divide by `speed`):** reel `i` (0-based) begins settling at `1.4 + 0.55 * i` s, so reels stop **left to right**. The **last reel gets an anticipation crawl**: it slows early, creeps past a near-miss neighbour face, and clicks in about 1.1 s later than it otherwise would. Total for 4 reels is roughly 5 to 7 s.

**On each stop:** `clunk`, a brief flash, and the nameplate drops in under the reel (fire `onReveal`).
**When all stopped:** the payline lights, bulbs flash, banner **"TEAM LOCKED: {teamName}"**, `canvas-confetti` from the reel base, `win` sound, `onDone()`.
Reels never show absent or already-drawn people.
**Idle:** slow attract-mode with faces gently drifting and bulbs pulsing.

## 8.2 SPOTLIGHT GRID

A grid of all pool faces. A spotlight hops across it, decelerating, and **locks onto each chosen person in turn** (others dim, the locked face scales up and slides to the tray). Cheap and reliable; the safety net for slow machines. Idle: a slow sweeping light.

## 8.3 CARD PACK

A glowing pack shakes, tears open, N face-down cards fan out and **flip one by one** (CSS 3D `rotateY`) with a light sweep. The shimmer is decorative and **uniform**: no "common/rare" labels, since these are real friends. Idle: the pack floats and glows.

## 8.4 WHEEL

SVG wheel with one photo per wedge, **pool members only** (it shrinks as people are drawn). **One spin per member.** A ticker flicks on every peg crossing (detect `Math.floor(angle / wedge)` changes) with a click sound. The final angle lands the chosen wedge under the pointer with random in-wedge jitter (within about +/-35% of the wedge width) after 4 to 7 turns of ease-out. The winner pops out to the team tray; later spins are a bit faster. If only one wedge remains, auto-land without spinning.

## 8.5 HORSE RACE

The **whole pool** races on lanes with a commentary ticker. Pre-script it:
1. Assign finish times so the chosen N finish top N **in reveal order**, with the gaps between top finishers small (photo finish, 0.15 to 0.3 s) and everyone else clearly behind.
2. Build each racer's progress curve with monotone cubic interpolation through random waypoints, reaching 1.0 at their finish time. Jitter the waypoints so the lead changes a few times.
3. Generate commentary from the computed positions ("Ben takes the lead!", "Photo finish!"). Family-friendly.

Lanes compress for larger pools. Idle: racers at the gate, bobbing.

## 8.6 LOTTERY BALLS

Face balls tumble in a glass drum. The tumble is real physics (`matter-js` with air-blow forces); the **pick is scripted**: remove the chosen ball from the physics world and tween it up the tube with a `pop`, one at a time, so it can never land on the wrong person. Build this last. If it risks the schedule, ship a lighter canvas version with the same contract.

**Stretch (only after all of the above is green):** Claw machine, Plinko, Captain Draft.

---

# 9. Visual direction, sound, accessibility

- **Theme:** dark casino-neon. Background `#0b0618`, violet `#7c3aed`, magenta `#ff2bd6`, gold `#ffc83d`, cyan accent `#22d3ee`. Vignette, glossy gold borders on photo cards, glow on interactive elements.
- **Type:** one self-hosted display font for headings and banners (e.g. Bungee or Monoton from `@fontsource`; verify the package exists) plus one clean body font. Stage text at least 24 px at 1080p; names at least 28 px. High contrast (WCAG AA for text).
- **Graphics:** all drawn in SVG/CSS. No copyrighted imagery or trademarks.
- **Sound:** synthesized with Web Audio (oscillators and noise buffers) with a master gain. Mute persisted. Needs only a click to unlock, which START DRAW provides.
- **Accessibility:** visible focus rings, `aria-live` reveals, buttons are real buttons, reduced-motion path for every mode.
- **Performance:** target 60 fps on a mid-range laptop; no layout thrash; no per-frame React renders.

---

# 10. Process

Commit after every phase.

0. Read this brief fully. Write `docs/DECISIONS.md` with a short plan and any decision you make where this brief is silent. Keep appending to it.
1. **Scaffold. Engine + store + unit tests, all green before any UI.**
2. **Setup page.**
3. **Draw shell** (tabs, pool rail, team rail, control bar, keyboard) **+ SLOTS to full polish.** Screenshot mid-spin and at lock, critique against section 8.1, and iterate **once**.
   - If `RUN_MODE = SLOTS_FIRST`: stop here, summarize what you built and the decisions you made, attach the screenshots, and wait for my go-ahead.
4. Remaining modes one at a time in the build order of section 8, each with its own Playwright coverage, committing after each.
5. Finish screen, presentation mode, fullscreen, roster drawer polish.
6. Playwright e2e using `?seed=1&fast=1` and the test hooks below. Verify the app works with the network disabled.
7. Screenshots of Setup and every tab (idle + revealed) into `/screenshots`.
8. README (section 13).

---

# 11. Test hooks (`data-testid`)

`start-draw`, `next-team`, `skip`, `undo`, `reveal-remaining`, `tab-<modeId>`, `person-card-<personId>`, `present-toggle-<personId>`, `pool-face-<personId>`, `team-chip-<teamId>`, `team-member-<teamId>-<personId>`, `preview-line`, `finish-screen`, `copy-results`, `download-png`.

Query flags honoured only when appropriate: `?fast=1` (speed = 4) in any build; `?seed=N` only in `VITE_E2E=1` builds.

---

# 12. Acceptance checks (all must pass before you finish)

- [ ] `npm test` and `npm run build` pass; no console errors or warnings in any tab.
- [ ] E2E: 12 present, size 4 -> 3 teams, everyone drawn exactly once.
- [ ] E2E: 12 present, size 5 under each strategy -> `balanced` 4/4/4, `fillLast` 5/5/2, `bench` 5/5 + 2 substitutes.
- [ ] E2E: mid-draw, mark someone absent, add a late arrival, undo the last team, **reload the page** -> state intact, no duplicates, correct next team size.
- [ ] Every mode completes a draw, **ends exactly on the committed team**, `skip()` works, `onDone` fires exactly once, reduced-motion works.
- [ ] One run mixes different modes across teams (e.g. Slots, then Wheel, then Card Pack).
- [ ] Slots: transform-only animation, last reel visibly slower, no velocity jolt at the settle handoff, no duplicate landings.
- [ ] Works with the network disabled (Playwright `context.setOffline(true)` after load, and a fresh load of the built app).
- [ ] Bulk photo import of 12 images works, including a rotated phone photo.
- [ ] Screenshots of Setup and every tab (idle + revealed) are saved in `/screenshots`.

---

# 13. README requirements

- Install, dev, test, build, preview. Preview/serve on a **fixed port** (`--port 4173 --strictPort`), because localStorage is per origin and a changing port would hide the roster.
- **Event-day checklist:** use the same browser profile and port every time; load photos the day before; export a roster JSON backup; clear demo people; set the fullscreen and sound level; do one dry-run draw then Start over; keep a plain list as a last-resort fallback.
- **How to add a new mode** (folder + registry line + contract summary + test).
- Keyboard shortcuts table, the query flags, and the decisions log summary.

---

# Follow-up prompts (for you to paste later; not part of the first run)

**Add a new mode**

```text
Add a new draw mode "<name>" to Team Roulette following the Mode contract in the
README: new folder src/modes/<id>/, implement ModeProps/ModeHandle (end exactly
on `team`, support skip(), idle state, reduced motion, small-pool handling,
shared sfx), register it, add Playwright coverage for a full draw, and
screenshot idle / mid / final. Concept: <describe it>.
```

**Slots polish pass**

```text
Review the Slots mode against section 8.1 of team-roulette-brief.md. Record a
mid-spin and a lock-moment screenshot, list every gap (motion feel, blur,
timing, stagger, near-miss crawl, glare, bulbs, banner, confetti, nameplates),
then fix them. Do not change the Mode contract or the engine.
```

**Add "can't be on the same team" constraints**

```text
Add optional pair constraints to Team Roulette. Setup page: a small "Keep apart"
list of pairs. Engine: extend drawTeam with a `constraints` argument that
rejection-samples until no pair shares a team, with a retry cap and a clear
fallback message if the constraints cannot be satisfied for the remaining pool.
Add unit tests (including an unsatisfiable case) and a Playwright test.
```

**Replace a member who left after the draw**

```text
Add "Replace member" to Team Roulette: on a team chip, choose a member, mark
them absent, and draw a replacement from the current pool into the same slot.
Engine function + unit tests; store action; a short reveal animation in the
active mode (or a simple spotlight if the mode cannot do a single-slot reveal).
```
