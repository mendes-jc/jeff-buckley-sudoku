# 🎵 Jeff Buckley Sudoku

> *"So Hallelujah... row, column, and box."*

A sudoku game that fills in numbers **and** the air. Every time you finish a line, the man himself sighs his approval. Solve the whole grid and you earn a full-on finale. It's a perfectly good sudoku app wearing a Jeff Buckley T-shirt, and it runs offline in your pocket.

---

## ✨ What you get

- **🧩 Four difficulties** — `easy`, `medium`, `hard`, `expert`. Every puzzle is generated with a guaranteed-unique solution, so there's always exactly one way home.
- **📅 A daily puzzle** — the same medium board for everyone, every day, seeded from the date. Race your friends. Lose gracefully.
- **✏️ Pencil notes** — jot the maybes in the corners before you commit.
- **🔴 Honest conflicts** — put a number where it breaks the rules and it lights up red.
- **🟠 Gentle nudges** — on easy & medium, a number that's *legal but wrong* goes amber instead of red. Not an error. Just Jeff raising an eyebrow.
- **🎧 Jeff reacts** — complete a row, column, or box and you get a moan. Finish two at once? **One** sound, not a pile-up. Solve the puzzle and the `-end` clips play you out.
- **🖼️ Real portraits** — randomized Jeff Buckley photo backdrops behind the grid.
- **📊 Stats** — wins, streaks, best times, tracked per difficulty.
- **🌗 Light / dark / system** themes.
- **⏸️ Pause & resume** — the timer stops when you look away; your game is saved to `localStorage` so you can close the tab mid-solve.
- **📴 Fully offline** — PWA service worker on the web, and a real installable Android APK via Capacitor.

---

## 🚀 Run it

```bash
npm install
npm run dev        # dev server at http://localhost:5173
```

Other scripts:

```bash
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
npm test           # run the Vitest suite
```

---

## 📱 Put it on your phone

The app is wrapped with [Capacitor](https://capacitorjs.com/) into a native Android shell around the built `dist/`.

```bash
npm run build                        # build the web app
npx cap sync android                 # copy dist/ into the Android project
cd android && ./gradlew assembleDebug
```

The debug APK lands in `android/app/build/outputs/apk/debug/`. A ready-to-install copy is kept at **`dist-apk/JeffBuckleySudoku.apk`** — sideload it, open it, enjoy a game that works on a plane.

> On Android, audio players are released as soon as each clip finishes — WebView caps how many can exist at once, so without cleanup the grand finale would lose its voice. It doesn't. ✅

---

## 🛠️ Built with

**React 18** + **TypeScript** + **Vite**, tested with **Vitest** + **Testing Library**, packaged as a PWA (`vite-plugin-pwa`) and an Android app (**Capacitor**). All dependencies pinned to exact versions, because surprises belong in the music, not the lockfile.

```
src/
  core/    pure sudoku engine — generator, solver, grader, conflicts, daily, RNG
  game/    game state reducer, persistence, stats
  media/   asset manifest + the audio controller that makes Jeff sing
  ui/      React screens, components, hooks, themes
```

The `core/` engine is pure and framework-free — you could lift it out and drop it into anything.

---

Made with ❤️ for **thatazini laranxinha da silva gonzalez**.
