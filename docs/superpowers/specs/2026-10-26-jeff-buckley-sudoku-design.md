# Jeff Buckley Sudoku — Design Spec

**Date:** 2026-10-26
**Status:** Approved for planning

## Purpose

A Sudoku game that runs on Web, iOS, and Android as a single installable
Progressive Web App (PWA). Standard quality-Sudoku play with a Jeff Buckley
theme: a different Jeff Buckley photo behind the grid on every new game, and a
random Jeff Buckley "moan" clip played whenever a row, column, or 3×3 box is
completed — for fun.

Success = a polished, offline-capable Sudoku PWA that is fully playable today
with placeholder media, and that accepts real Jeff Buckley photos/audio later
with zero code changes.

## Constraints & Decisions

- **Platform:** Web-first PWA (one responsive codebase), installable to the
  home screen on iOS/Android, playable in any browser, offline-capable. No app
  stores, no native shell.
- **Stack:** React + Vite + TypeScript. PWA via `vite-plugin-pwa`.
- **No backend.** All state is local (`localStorage`).
- **Media is user-supplied.** Real Jeff Buckley photos and audio are
  copyrighted and are **not** bundled. The app reads an assets manifest; the
  owner drops in real files later. Placeholder media ships so the app is fully
  playable immediately.
- **Difficulty:** fixed tiers the player picks before each game — Easy, Medium,
  Hard, Expert.
- **Assist features excluded** (no hints, no mistake-check/limit, no
  auto-remove-notes). Live conflict highlighting is still present (part of core
  play).

## Architecture

The trickiest, most bug-prone logic is isolated in a **pure,
framework-agnostic TypeScript core** with no DOM/React dependency. React is a
thin view over it.

### Modules

1. **`sudoku-core`** (pure, no DOM/React)
   - Board model (9×9, cells with value + pencil notes).
   - Backtracking solver.
   - Puzzle generator with a **guaranteed unique solution**.
   - Difficulty grader.
   - Conflict detection (duplicate in row/col/box).
   - Completion detection for rows, columns, and 3×3 boxes.
   - Fully unit-testable in isolation.

2. **`game-state`**
   - Reducer managing the active game: board, pencil notes, selected cell,
     timer, undo/redo stack, mistake tracking (for stats, not a limit).
   - Owns persistence (save/restore).

3. **`media`**
   - Reads `assets/manifest.json`.
   - Picks a random photo per new game for the grid background.
   - Preloads moan clips; plays a random one on a completion event.
   - Mute toggle + volume; handles rapid successive plays gracefully.

4. **`ui`** (React)
   - Grid, Cell, NumberPad (the footer), Controls (undo/redo, erase, notes,
     pause), Header (timer, difficulty), DifficultyPicker, StatsScreen,
     WinModal, Settings.

5. **`pwa`**
   - Web manifest, icons, splash, offline service worker.

## Game Mechanics

### Puzzle generation (correctness-critical)

1. Generate a full valid solved grid via randomized backtracking.
2. Remove cells one at a time; after each removal, run the solver to confirm
   the puzzle still has **exactly one** solution. If a removal creates
   ambiguity, restore the cell.
3. Stop when the target difficulty/clue profile for the chosen tier is reached.

Every generated puzzle is solvable by logic alone and has a unique solution.

### Difficulty grading

Grading combines **clue count** with **which solving techniques the solver
needed** (clue count alone is a weak signal). The generator retries until a
puzzle grades into the requested tier.

- Easy — many clues, simple techniques (naked/hidden singles).
- Medium — fewer clues.
- Hard — fewer still, more scanning.
- Expert — minimal clues.

### Input model

- Select a cell, then tap a digit in the **footer number pad** to fill it.
  Keyboard 1–9 is a convenience alias on web/desktop.
- The footer is the **primary input** and part of gameplay. Each digit shows
  how many are still placeable; a digit becomes unavailable/greyed once all
  nine of it are correctly placed.
- **Notes mode** toggles the same footer taps to write pencil marks instead of
  values.
- Erase clears the selected cell. Undo/Redo walk the move stack.

### Peer highlighting

- On cell select, highlight the cell's **row and column**, its **3×3 box**, and
  **same-value** cells.
- **Disabled on Expert** (added challenge). On by default for Easy/Medium/Hard.

### Completion & moan trigger

- A row, column, or 3×3 box is "completed" the moment all 9 of its cells are
  filled **and valid** (no duplicates) — the transition from incomplete →
  correctly-complete.
- On that transition, `media` plays **one random moan clip**.
- Each unit (row/col/box) is tracked so it fires **once** per completion; it
  will not re-fire while it stays complete, but will fire again if broken and
  re-completed.
- Completing the whole puzzle triggers the win celebration. A hook is left for
  an optional special "finale" moan (not built now).

### Conflict highlighting

Entering a value that duplicates within its row, column, or box highlights the
conflict live. This is the only form of mistake feedback (no mistake limit).

## Assets & Media

- **Layout:** `public/assets/photos/` (grid backgrounds), `public/assets/moans/`
  (audio clips), and `public/assets/manifest.json` listing available files.
- **Per-game background:** random photo from the manifest rendered behind the
  grid, with a scrim/overlay so cells and numbers stay readable over any image.
- **Moans:** all clips preloaded; one chosen at random per completion event.
- **Placeholders shipped:** a few generated placeholder background images and
  short placeholder audio tones, plus a `README` documenting exact
  format/naming so real files drop in with zero code changes.
- Mute toggle + volume in Settings.

## Persistence (local, no backend)

`localStorage` via a small wrapper (every read/write in try/catch; the app
works if storage is blocked). Stored:

- **In-progress game** — resume exactly where left off (board, notes, timer,
  undo stack, selected cell).
- **Settings** — theme, sound on/off, volume.
- **Stats** — best time per tier, games completed, win streak.

## PWA & Theme

- `vite-plugin-pwa` generates the service worker and web manifest. App shell +
  assets cached for **offline play**. Installable to the home screen on
  iOS/Android with icons and splash. No network needed once loaded.
- Light/dark theme respecting OS preference, with a manual override in Settings.

## Testing

- **Vitest** for the pure core:
  - Generator always yields a puzzle with a **unique** solution.
  - Solver correctness.
  - Difficulty grading stays within tier bounds.
  - Completion detection fires once per row/col/box on filled-and-valid, and
    re-fires after break/re-complete.
  - Conflict detection correctness.
- **React Testing Library** for key UI flows:
  - Select cell → place number; footer availability updates.
  - Notes toggle writes pencil marks.
  - Peer highlight on/off by tier (off on Expert).
  - Undo/redo; erase.
- **TDD:** core-logic tests are written before their implementation.

## Out of Scope (now)

- Hints, mistake-check, mistake limit, auto-remove notes.
- Native app-store builds / native shell.
- Backend, accounts, cloud sync, leaderboards.
- Daily puzzle (can be added later; not in this build).
- Adaptive/unlocking difficulty (fixed player-picked tiers only).
- Finale moan on full solve (hook left, not built).
