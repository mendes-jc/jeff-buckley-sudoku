# Jeff Buckley Sudoku Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an installable, offline-capable Sudoku PWA with a Jeff Buckley theme — a random photo behind each grid and a random "moan" on every row/column/box completion.

**Architecture:** A pure, framework-agnostic TypeScript core (`src/core`) owns all board logic — generation with a guaranteed unique solution, solving, difficulty grading, conflict and completion detection, and the date-seeded daily puzzle. A reducer (`src/game`) drives the active game and persists to `localStorage`. A `media` layer reads a user-supplied asset manifest. React (`src/ui`) is a thin view over the reducer.

**Tech Stack:** React + Vite + TypeScript, Vitest + React Testing Library, `vite-plugin-pwa`. No backend.

**Spec:** `docs/superpowers/specs/2026-10-26-jeff-buckley-sudoku-design.md`

## Global Constraints

- Single responsive PWA: installable to the home screen on iOS/Android, playable in any browser, offline once loaded. No native shell, no app stores.
- Stack is React + Vite + TypeScript; PWA via `vite-plugin-pwa`. Pin exact dependency versions.
- No backend. All persistence is `localStorage`; **every** read/write wrapped in try/catch and falls back to a default so the app runs when storage is blocked or corrupt.
- Jeff Buckley photos/audio are copyrighted and **never** bundled. Media is read from `public/assets/manifest.json`; placeholder files ship so the app is fully playable.
- Difficulty tiers are exactly `easy | medium | hard | expert`, player-picked.
- No Assist: no hints, no mistake-check, no mistake limit, no auto-remove-notes. Live conflict highlighting only.
- A moan fires when a row, column, OR 3×3 box becomes filled **and** valid (no duplicates): once per completion, re-firing only if the unit is broken and re-completed.
- Peer highlight (row, column, box, and same-value cells) on cell select; **disabled on Expert**.
- Daily puzzle is deterministic from the `YYYY-MM-DD` date seed, fixed Medium difficulty, with a daily streak.
- The grid background photo always sits under a scrim/overlay so cells and numbers stay readable over any image.

## Review Focus

- **localStorage throws / is unavailable (private mode):** app must still start and play; loaders return defaults. → test added to Task 11.
- **Asset manifest missing, empty, or fails to load:** game stays playable — no background (fallback), moans silently skipped. → test added to Task 12.
- **One placement completes two units at once (e.g. a row and a box):** both count as newly completed and fire once; overlapping audio must not throw. → tests added to Task 8 (detection) and Task 12 (audio guard).
- **Corrupt / old-schema saved game in storage:** load validates and falls back to "no saved game" rather than crashing. → test added to Task 11.
- **Generator must never emit a non-unique or unsolvable puzzle for any tier:** every tier yields exactly one solution. → property test added to Task 6.

---

## File Structure

```
src/core/
  types.ts        # shared types: CellValue, Board, Difficulty, Puzzle, Unit
  board.ts        # indexing, row/col/box membership, peers, unit cell lists
  rng.ts          # seeded RNG + shuffle
  solver.ts       # solve(), countSolutions()
  grader.ts       # logicalSolve(), grade(), tier configs
  generator.ts    # generateSolvedGrid(), generatePuzzle()
  conflicts.ts    # findConflicts()
  completion.ts   # completedUnitKeys(), newlyCompleted()
  daily.ts        # dateSeed(), generateDaily()
src/game/
  state.ts        # GameState, actions, reducer
  persistence.ts  # localStorage save/load for game, settings, stats, daily
  stats.ts        # stats + daily-streak update logic
src/media/
  manifest.ts     # AssetManifest type, loadManifest()
  media.ts        # MediaController
src/ui/
  App.tsx
  hooks/useGame.ts, hooks/useTheme.ts
  components/Grid.tsx, Cell.tsx, NumberPad.tsx, Controls.tsx, Header.tsx,
             StartScreen.tsx, WinModal.tsx, StatsScreen.tsx, Settings.tsx
  main.tsx
public/assets/
  manifest.json, README.md, photos/*, moans/*
```

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/ui/App.tsx`
- Create: `src/core/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: a working Vite + React + TS app, `npm test` (Vitest) and `npm run build` both green.

- [ ] **Step 1:** Scaffold with Vite React-TS. Add deps (pinned exact versions): `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `vite-plugin-pwa`. Configure Vitest in `vite.config.ts` with `environment: 'jsdom'` and `globals: true`.
- [ ] **Step 2:** Write `smoke.test.ts`: `test('sanity', () => expect(1 + 1).toBe(2))`.
- [ ] **Step 3:** Run `npm test` — Expected: PASS. Run `npm run build` — Expected: succeeds.
- [ ] **Step 4:** Commit.

---

## Task 2: Core types & board model

**Files:**
- Create: `src/core/types.ts`, `src/core/board.ts`, `src/core/__tests__/board.test.ts`

**Interfaces:**
- Produces:
  - `type CellValue = 0|1|2|3|4|5|6|7|8|9` (0 = empty)
  - `type Board = CellValue[]` (length 81, row-major)
  - `type Difficulty = 'easy'|'medium'|'hard'|'expert'`
  - `interface Puzzle { givens: Board; solution: Board; difficulty: Difficulty }`
  - `type UnitKind = 'row'|'col'|'box'`
  - `interface Unit { kind: UnitKind; index: number }` (index 0–8)
  - `function rowOf(i: number): number`, `colOf(i: number): number`, `boxOf(i: number): number`
  - `function cellsOf(unit: Unit): number[]` (the 9 indices of that unit)
  - `function peers(i: number): number[]` (the 20 cells sharing a row, col, or box, excluding `i`)

- [ ] **Step 1: Write failing tests** in `board.test.ts`:
  - `rowOf(0)===0`, `rowOf(80)===8`, `colOf(9)===0`, `boxOf(0)===0`, `boxOf(80)===8`, `boxOf(20)===0`, `boxOf(30)===4`.
  - `cellsOf({kind:'row',index:0})` equals `[0..8]`; `cellsOf({kind:'col',index:0})` equals `[0,9,...,72]`; `cellsOf({kind:'box',index:0})` equals `[0,1,2,9,10,11,18,19,20]`.
  - `peers(0)` has length 20 and does not include 0; includes 1, 9, 10; excludes 4 across? (4 shares row → included). Assert it equals the known peer set of cell 0.
- [ ] **Step 2:** Run tests — Expected: FAIL (not defined).
- [ ] **Step 3:** Implement the functions in `board.ts`, types in `types.ts`.
- [ ] **Step 4:** Run tests — Expected: PASS.
- [ ] **Step 5:** Commit.

---

## Task 3: Seeded RNG

**Files:**
- Create: `src/core/rng.ts`, `src/core/__tests__/rng.test.ts`

**Interfaces:**
- Produces:
  - `interface RNG { next(): number }` (returns `[0,1)`)
  - `function makeRng(seed: number): RNG`
  - `function shuffle<T>(arr: T[], rng: RNG): T[]` (returns a new shuffled array)

- [ ] **Step 1: Write failing tests:**
  - Determinism: `makeRng(42)` and `makeRng(42)` produce the same first 5 `next()` values; `makeRng(42)` ≠ `makeRng(43)`.
  - `shuffle([1..9], makeRng(1))` is a permutation (same multiset, length 9) and is deterministic for a fixed seed; does not mutate input.
- [ ] **Step 2:** Run — Expected FAIL.
- [ ] **Step 3:** Implement with a small deterministic PRNG (e.g. mulberry32). `shuffle` uses Fisher–Yates driven by `rng.next()`.
- [ ] **Step 4:** Run — Expected PASS.
- [ ] **Step 5:** Commit.

---

## Task 4: Solver

**Files:**
- Create: `src/core/solver.ts`, `src/core/__tests__/solver.test.ts`

**Interfaces:**
- Consumes: `board.ts` (peers/units), `types.ts`.
- Produces:
  - `function solve(board: Board): Board | null` (first solution, or null if none)
  - `function countSolutions(board: Board, limit?: number): number` (stops counting at `limit`, default 2)

- [ ] **Step 1: Write failing tests:**
  - `solve` on a known solvable puzzle returns a board with no empty cells and no conflicts, matching the known solution.
  - `solve` on a contradictory board (two identical givens in a row) returns `null`.
  - `countSolutions` on a known unique puzzle returns `1`; on a near-empty board (single given) returns `2` (hit limit); on the contradictory board returns `0`.
- [ ] **Step 2:** Run — Expected FAIL.
- [ ] **Step 3:** Implement backtracking (choose the empty cell with fewest candidates via peers). `countSolutions` short-circuits once `limit` reached.
- [ ] **Step 4:** Run — Expected PASS.
- [ ] **Step 5:** Commit.

---

## Task 5: Difficulty grader

**Files:**
- Create: `src/core/grader.ts`, `src/core/__tests__/grader.test.ts`

**Interfaces:**
- Consumes: `board.ts`, `types.ts`.
- Produces:
  - `type Technique = 'nakedSingle'|'hiddenSingle'|'lockedCandidate'|'nakedPair'|'advanced'`
  - `function logicalSolve(board: Board): { solved: boolean; hardest: Technique | null }` (applies techniques in ascending order until stuck or solved)
  - `function grade(givens: Board): Difficulty` — maps the hardest technique required (plus clue count as tiebreaker) to a tier: singles-only → `easy`; `lockedCandidate`/`nakedPair` → `medium`; harder logic → `hard`; requires search/guessing (logicalSolve not solved) → `expert`.
  - `const TIER_CLUES: Record<Difficulty, {min:number; max:number}>` — the clue-count envelope per tier (easy ~36–45, medium ~30–35, hard ~26–29, expert ~22–25; exact values the implementer may tune within these ranges).

- [ ] **Step 1: Write failing tests:**
  - `logicalSolve` solves a puzzle solvable by naked singles and reports `hardest: 'nakedSingle'`.
  - `grade` of a clue-rich singles-only puzzle returns `'easy'`.
  - `grade` of a puzzle requiring search (logicalSolve returns `solved:false`) returns `'expert'`.
- [ ] **Step 2:** Run — Expected FAIL.
- [ ] **Step 3:** Implement the technique ladder (naked single, hidden single, locked candidate, naked pair; everything beyond → `advanced`/unsolved). `grade` runs `logicalSolve` and maps the result.
- [ ] **Step 4:** Run — Expected PASS.
- [ ] **Step 5:** Commit.

---

## Task 6: Puzzle generator

**Files:**
- Create: `src/core/generator.ts`, `src/core/__tests__/generator.test.ts`

**Interfaces:**
- Consumes: `rng.ts`, `solver.ts` (`countSolutions`), `grader.ts` (`grade`, `TIER_CLUES`), `board.ts`.
- Produces:
  - `function generateSolvedGrid(rng: RNG): Board` (full valid solution)
  - `function generatePuzzle(rng: RNG, difficulty: Difficulty): Puzzle`

- [ ] **Step 1: Write failing tests:**
  - `generateSolvedGrid(makeRng(1))` has 81 non-empty cells and zero conflicts (every unit holds 1–9 once).
  - For each difficulty, `generatePuzzle(makeRng(s), d)` returns a `Puzzle` whose `givens` satisfy `countSolutions(givens) === 1`, whose `solution` solves the givens, and whose `grade(givens) === d`.
  - **[Review Focus] Property test:** over seeds `1..30` × all four tiers, every generated puzzle has `countSolutions === 1` (never 0, never ≥2).
- [ ] **Step 2:** Run — Expected FAIL.
- [ ] **Step 3:** Implement: fill a solved grid (randomized backtracking); copy it; dig cells in a shuffled order, restoring any cell whose removal makes `countSolutions !== 1`, until clue count enters `TIER_CLUES[difficulty]`; then check `grade`. If grade doesn't match, keep digging (for harder) or restart with a new fill (for easier). Cap attempts and fall back to the closest achieved tier.
- [ ] **Step 4:** Run — Expected PASS.
- [ ] **Step 5:** Commit.

---

## Task 7: Conflict detection

**Files:**
- Create: `src/core/conflicts.ts`, `src/core/__tests__/conflicts.test.ts`

**Interfaces:**
- Consumes: `board.ts`, `types.ts`.
- Produces: `function findConflicts(board: Board): Set<number>` (indices of every cell whose value duplicates another in its row, col, or box; empty cells never conflict).

- [ ] **Step 1: Write failing tests:** a board with two `5`s in row 0 returns both their indices; a valid partial board returns an empty set; empty cells are never included.
- [ ] **Step 2:** Run — Expected FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run — Expected PASS.
- [ ] **Step 5:** Commit.

---

## Task 8: Completion detection

**Files:**
- Create: `src/core/completion.ts`, `src/core/__tests__/completion.test.ts`

**Interfaces:**
- Consumes: `board.ts`, `conflicts.ts`, `types.ts`.
- Produces:
  - `function completedUnitKeys(board: Board): Set<string>` — keys `"row-0".."box-8"` for every unit that is fully filled AND valid (no duplicates).
  - `function newlyCompleted(prev: Set<string>, next: Set<string>): string[]` — keys present in `next` but not `prev`.

- [ ] **Step 1: Write failing tests:**
  - A board with row 0 correctly filled (rest empty) → `completedUnitKeys` contains `"row-0"` and not `"row-1"`.
  - A row filled but containing a duplicate is NOT complete.
  - `newlyCompleted(prev, next)` returns only the added keys; a unit already in `prev` does not re-report.
  - **[Review Focus] Simultaneous completion:** a board where the final placement completes both a row and a box → `newlyCompleted` returns both keys in one call.
- [ ] **Step 2:** Run — Expected FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run — Expected PASS.
- [ ] **Step 5:** Commit.

---

## Task 9: Daily puzzle

**Files:**
- Create: `src/core/daily.ts`, `src/core/__tests__/daily.test.ts`

**Interfaces:**
- Consumes: `rng.ts`, `generator.ts`, `types.ts`.
- Produces:
  - `function dateSeed(isoDate: string): number` (deterministic hash of `"YYYY-MM-DD"`)
  - `function generateDaily(isoDate: string): Puzzle` (difficulty `medium`, built from `makeRng(dateSeed(isoDate))`)

- [ ] **Step 1: Write failing tests:**
  - `dateSeed('2026-10-26')` is stable and differs from `dateSeed('2026-10-27')`.
  - `generateDaily('2026-10-26')` called twice returns identical `givens` and `solution` (determinism), with `difficulty === 'medium'` and `countSolutions(givens) === 1`.
- [ ] **Step 2:** Run — Expected FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run — Expected PASS.
- [ ] **Step 5:** Commit.

---

## Task 10: Game state reducer

**Files:**
- Create: `src/game/state.ts`, `src/game/__tests__/state.test.ts`

**Interfaces:**
- Consumes: `completion.ts`, `conflicts.ts`, `types.ts`.
- Produces:
  - `interface GameCell { value: CellValue; notes: number[]; given: boolean }`
  - `interface GameState { cells: GameCell[]; solution: Board; difficulty: Difficulty; isDaily: boolean; selected: number | null; notesMode: boolean; elapsedMs: number; paused: boolean; status: 'playing'|'won'; completedUnits: string[]; lastCompleted: string[]; undoStack: Snapshot[]; redoStack: Snapshot[] }`
  - `type Action = {type:'newGame'; puzzle: Puzzle; isDaily?: boolean} | {type:'select'; index:number} | {type:'input'; digit:number} | {type:'erase'} | {type:'toggleNotes'} | {type:'undo'} | {type:'redo'} | {type:'togglePause'} | {type:'tick'; ms:number}`
  - `function initGame(puzzle: Puzzle, isDaily?: boolean): GameState`
  - `function reducer(state: GameState, action: Action): GameState`

- [ ] **Step 1: Write failing tests:**
  - `newGame` seeds `given` flags from non-empty givens; given cells have `given:true`.
  - `input` on a selected non-given empty cell (notesMode off) sets the value, clears that cell's notes, pushes an undo snapshot, and sets `lastCompleted` to any unit newly completed by the move.
  - `input` on a given cell is a no-op.
  - `toggleNotes` then `input` toggles a pencil note instead of the value; a second identical `input` removes the note.
  - `erase` clears the selected non-given cell's value and notes.
  - `undo` reverts the last change; `redo` re-applies it; a new `input` clears the redo stack.
  - Completing the final cell with a correct, conflict-free full board sets `status:'won'`.
  - `tick` adds ms only when not paused and not won.
- [ ] **Step 2:** Run — Expected FAIL.
- [ ] **Step 3:** Implement. `lastCompleted` is `newlyCompleted(prevKeys, nextKeys)` computed inside `input`/`erase`; `completedUnits` tracks the current set so breaking and re-completing re-reports.
- [ ] **Step 4:** Run — Expected PASS.
- [ ] **Step 5:** Commit.

---

## Task 11: Persistence & stats

**Files:**
- Create: `src/game/persistence.ts`, `src/game/stats.ts`, `src/game/__tests__/persistence.test.ts`, `src/game/__tests__/stats.test.ts`

**Interfaces:**
- Consumes: `state.ts`, `types.ts`.
- Produces:
  - `interface Settings { theme:'system'|'light'|'dark'; soundOn:boolean; volume:number }`
  - `interface Stats { gamesCompleted:number; bestMsByTier: Partial<Record<Difficulty,number>>; winStreak:number }`
  - `interface DailyRecord { lastCompletedDate?: string; streak: number }`
  - `saveGame(s:GameState)`, `loadGame(): GameState | null`, `clearGame()`
  - `saveSettings`, `loadSettings(): Settings` (defaults), `saveStats`, `loadStats(): Stats`, `saveDaily`, `loadDaily(): DailyRecord`
  - `function recordWin(stats: Stats, difficulty: Difficulty, elapsedMs: number): Stats`
  - `function recordDaily(daily: DailyRecord, isoDate: string): DailyRecord` (increments streak if `isoDate` is the day after `lastCompletedDate`, resets to 1 otherwise, no-op if already recorded today)

- [ ] **Step 1: Write failing tests:**
  - Round-trip: `saveGame`/`loadGame` returns an equivalent `GameState`.
  - `recordWin` increments `gamesCompleted`, updates `bestMsByTier` only when faster, bumps `winStreak`.
  - `recordDaily`: consecutive date → streak+1; gap → reset to 1; same date twice → unchanged.
  - **[Review Focus] Storage blocked:** with `getItem`/`setItem` stubbed to throw, `loadSettings`/`loadStats`/`loadDaily` return defaults and `saveGame` does not throw.
  - **[Review Focus] Corrupt save:** `loadGame` returns `null` when the stored string is malformed JSON or missing required fields.
- [ ] **Step 2:** Run — Expected FAIL.
- [ ] **Step 3:** Implement with a `safeGet`/`safeSet` try/catch wrapper and a shape check in `loadGame`.
- [ ] **Step 4:** Run — Expected PASS.
- [ ] **Step 5:** Commit.

---

## Task 12: Media manifest & controller

**Files:**
- Create: `src/media/manifest.ts`, `src/media/media.ts`, `src/media/__tests__/media.test.ts`

**Interfaces:**
- Consumes: `rng.ts`.
- Produces:
  - `interface AssetManifest { photos: string[]; moans: string[] }`
  - `function loadManifest(url?: string): Promise<AssetManifest>` (returns `{photos:[],moans:[]}` on fetch/parse failure)
  - `class MediaController` with `constructor(manifest: AssetManifest, rng?: RNG)`, `pickBackground(): string | null`, `playMoan(): void`, `setMuted(b:boolean): void`, `setVolume(v:number): void`

- [ ] **Step 1: Write failing tests** (audio via a stubbed `Audio`):
  - `pickBackground` returns one of the manifest photos; with a seeded rng it is deterministic.
  - `playMoan` constructs/plays one of the moan clips; when muted it does not play.
  - **[Review Focus] Empty manifest:** `pickBackground` returns `null` and `playMoan` is a silent no-op (no throw).
  - **[Review Focus] Overlapping plays:** two `playMoan` calls in immediate succession do not throw (each gets its own audio instance / clone).
- [ ] **Step 2:** Run — Expected FAIL.
- [ ] **Step 3:** Implement. `loadManifest` fetches JSON in try/catch. `playMoan` clones the audio element per call so rapid completions overlap cleanly.
- [ ] **Step 4:** Run — Expected PASS.
- [ ] **Step 5:** Commit.

---

## Task 13: Placeholder assets

**Files:**
- Create: `public/assets/manifest.json`, `public/assets/README.md`, `public/assets/photos/placeholder-1..3.svg` (or jpg), `public/assets/moans/placeholder-1..3.*` (short audio)

**Interfaces:**
- Produces: a valid manifest matching `AssetManifest` so `loadManifest()` succeeds at runtime.

- [ ] **Step 1:** Generate 3 placeholder background images (simple distinct gradients) and 3 short placeholder audio clips (brief tones). List them in `manifest.json` as `{ "photos": [...], "moans": [...] }` with web-root-relative paths (`/assets/photos/...`).
- [ ] **Step 2:** Write `README.md` documenting the folder layout, the manifest shape, accepted formats, and how to drop in real Jeff Buckley photos/moans with no code change.
- [ ] **Step 3:** Add a test (or reuse Task 12's) asserting `manifest.json` parses to a non-empty `photos` and `moans`. Run — Expected PASS.
- [ ] **Step 4:** Commit.

---

## Task 14: useGame & useTheme hooks

**Files:**
- Create: `src/ui/hooks/useGame.ts`, `src/ui/hooks/useTheme.ts`, `src/ui/hooks/__tests__/useGame.test.tsx`

**Interfaces:**
- Consumes: `state.ts`, `persistence.ts`, `stats.ts`, `generator.ts`, `daily.ts`, `media.ts`, `completion.ts`.
- Produces:
  - `useGame()` → `{ state, dispatch, startGame(difficulty), startDaily(), conflicts: Set<number> }`. Starts/generates puzzles, runs a 1s timer (dispatch `tick`), auto-saves on change, restores a saved game on mount, plays a moan for each key in `state.lastCompleted`, and on `status:'won'` records stats/daily and clears the saved game.
  - `useTheme()` → `{ theme, setTheme }` applying `system|light|dark` to the document and persisting via settings.

- [ ] **Step 1: Write failing tests** (render hook with RTL, fake timers, stubbed MediaController):
  - `startGame('easy')` populates `state` with a playing game and given cells.
  - Dispatching an `input` that completes a unit triggers exactly one `playMoan` per newly completed key.
  - A winning sequence calls `recordWin` and `clearGame`.
  - On mount with a saved game present, `state` restores it.
- [ ] **Step 2:** Run — Expected FAIL.
- [ ] **Step 3:** Implement. Guard the moan effect on `state.lastCompleted` identity so it fires once per transition.
- [ ] **Step 4:** Run — Expected PASS.
- [ ] **Step 5:** Commit.

---

## Task 15: Play screen — Grid, Cell, NumberPad, Controls, Header

**Files:**
- Create: `src/ui/components/Grid.tsx`, `Cell.tsx`, `NumberPad.tsx`, `Controls.tsx`, `Header.tsx`, `src/ui/components/__tests__/playscreen.test.tsx`
- Modify: `src/ui/App.tsx` (render the play screen from `useGame`)

**Interfaces:**
- Consumes: `useGame`, `conflicts`, `board.ts`.
- Produces presentational components driven by `GameState`:
  - `Grid` renders 81 `Cell`s over the background photo (with a readability scrim); applies peer highlight (row/col/box + same value) to the selection **unless `difficulty==='expert'`**; marks conflict cells.
  - `NumberPad` (the footer) renders digits 1–9, each showing remaining count (9 − correctly-placed), disables a digit at 0 remaining, and dispatches `input`; reflects `notesMode`.
  - `Controls`: undo, redo, erase, notes-toggle, pause. `Header`: timer (mm:ss), difficulty label, pause state.

- [ ] **Step 1: Write failing RTL tests:**
  - Click a cell then a NumberPad digit → that digit shows in the cell.
  - Placing all nine of a digit disables that digit in the NumberPad; its remaining count decrements as placed.
  - Selecting a cell adds the peer-highlight class to its row/col/box peers on a non-Expert game, and does NOT on an Expert game.
  - A duplicate entry gets the conflict class.
  - Notes toggle on → clicking a digit renders a pencil mark, not a value.
  - Undo button reverts the last placement.
- [ ] **Step 2:** Run — Expected FAIL.
- [ ] **Step 3:** Implement the components and wire them in `App.tsx`.
- [ ] **Step 4:** Run — Expected PASS.
- [ ] **Step 5:** Commit.

---

## Task 16: Start screen, win modal, stats, settings

**Files:**
- Create: `src/ui/components/StartScreen.tsx`, `WinModal.tsx`, `StatsScreen.tsx`, `Settings.tsx`, `src/ui/components/__tests__/screens.test.tsx`
- Modify: `src/ui/App.tsx` (route between start / play / stats / settings; show win modal)

**Interfaces:**
- Consumes: `useGame`, `useTheme`, `persistence` (stats/settings).
- Produces:
  - `StartScreen`: four tier buttons + a "Daily" button → `startGame(d)` / `startDaily()`; shows a "Resume" option when a saved game exists.
  - `WinModal`: shown on `status:'won'` with elapsed time and a celebration; buttons to start a new game.
  - `StatsScreen`: best time per tier, games completed, win streak, daily streak.
  - `Settings`: theme selector, sound on/off, volume slider (persisted; applied to the MediaController).

- [ ] **Step 1: Write failing RTL tests:**
  - Clicking a tier button starts a game at that difficulty (play screen shows).
  - Clicking "Daily" starts the daily game.
  - On a won state the WinModal appears with the formatted time.
  - Toggling sound off and back is persisted (reload → same value).
  - StatsScreen renders stored stats.
- [ ] **Step 2:** Run — Expected FAIL.
- [ ] **Step 3:** Implement and wire routing in `App.tsx`.
- [ ] **Step 4:** Run — Expected PASS.
- [ ] **Step 5:** Commit.

---

## Task 17: PWA — manifest, icons, offline

**Files:**
- Modify: `vite.config.ts` (configure `vite-plugin-pwa`), `index.html`
- Create: `public/icons/*` (app icons), PWA web manifest via the plugin

**Interfaces:**
- Produces: an installable, offline-capable build.

- [ ] **Step 1:** Configure `vite-plugin-pwa` with `registerType:'autoUpdate'`, a web manifest (name "Jeff Buckley Sudoku", theme/background colors, icons, `display:'standalone'`), and Workbox precaching of the app shell + `/assets/**`.
- [ ] **Step 2:** Add maskable/any icons (192, 512). Reference the manifest from `index.html`.
- [ ] **Step 3:** Run `npm run build` — Expected: build emits `sw.js` and `manifest.webmanifest`. Verify (preview) the app loads and the service worker registers.
- [ ] **Step 4:** Commit.

---

## Task 18: End-to-end wiring & polish pass

**Files:**
- Modify: `src/ui/App.tsx`, styles
- Create: `src/ui/__tests__/app.e2e.test.tsx`

**Interfaces:**
- Consumes: everything.

- [ ] **Step 1: Write a failing end-to-end RTL test:** from the start screen, start an Easy game, place a value that completes a row → assert a moan was played once; open settings, confirm theme toggle applies; return and confirm the in-progress game resumes after a simulated reload.
- [ ] **Step 2:** Run — Expected FAIL.
- [ ] **Step 3:** Fill gaps and apply visual polish (dark/light theme tokens, win celebration, mobile layout: footer reachable one-handed, no horizontal scroll at phone width, readable scrim over photos).
- [ ] **Step 4:** Run full `npm test` and `npm run build` — Expected: all green.
- [ ] **Step 5:** Commit.
