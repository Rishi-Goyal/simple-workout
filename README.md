# Simple Workout

**👉 Try it now: [rishi-goyal.github.io/simple-workout](https://rishi-goyal.github.io/simple-workout/)**

Open the link on your phone, then tap **Install app** (Android Chrome) or **Share → Add to Home Screen** (iOS Safari). Works offline once installed.

A mobile-first PWA for Push / Pull / Legs training. Picks today's exercises, recommends weights from your prior sessions, and tracks per-muscle strength progress over time. Fully offline — SQLite runs in the browser via WASM with OPFS persistence.

## Stack
- Vite + React + TypeScript
- Tailwind CSS
- `@sqlite.org/sqlite-wasm` (OPFS SAH Pool VFS — no cross-origin headers required)
- `vite-plugin-pwa` for installable PWA + service worker
- Zustand for the active-session store
- Recharts for the strength progress chart

## Development

```bash
npm install
npm run dev
```

Open the printed `http://<your-LAN-IP>:5173/simple-workout/` URL on your phone to test.

```bash
npm test
```

Runs the catalog validator (`src/v2/ladderValidation.ts`), the progression-engine tests and the media check under vitest. CI runs it before every build.

### Exercise illustrations

Exercise photos are pinned, committed files — the app never fetches media at runtime. `src/v2/media/manifest.json` records every exercise's source (free-exercise-db at a fixed commit, wger by image sha256, or a drawing in `assets/media-src/`), its license and whether a human has verified the pairing.

```bash
npm run media:import    # download + resize frames into .media-review/ (unverified) or src/v2/media/ (verified)
npm run media:review    # build .media-review/index.html — check each picture against the name and how-to
npm run media:verify -- id1,id2   # promote reviewed frames into the bundle and set mediaRef in ladders.ts
npm run media:check     # what the build runs: nothing unverified can ship
```

To add an exercise: add it to `src/v2/ladders.ts` with `mediaRef: null`, add a manifest entry, import, review, verify. Credits are generated into `src/v2/media/CREDITS.md` and shown in Settings → About.

## Deployment

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`.

One-time setup after creating the GitHub repo:
1. **Settings → Pages → Source: GitHub Actions**.
2. Push to `main`. The workflow builds and publishes to <https://rishi-goyal.github.io/simple-workout/>.

## Releases

Tag a commit (`git tag v0.1.0 && git push --tags`) to trigger `.github/workflows/release.yml`, which builds the app, zips `dist/`, and attaches it to an auto-generated GitHub Release.

## Install on your phone
1. Open the GitHub Pages URL.
2. Tap "Install app" (Android Chrome) or "Add to Home Screen" (iOS Safari).
3. Launch from the home-screen icon — the app works offline and your data stays in OPFS.

## Data model
- `exercises` — catalog (seed + custom)
- `workouts` — one row per session
- `workout_sets` — every logged set
- `muscle_strength_snapshot` — rolling-best estimated 1RM per muscle (Epley)
