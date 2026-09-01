# Simple Workout v2 — Overhaul Plan

## Why an overhaul

The current app works, but it optimizes for logging, not for doing. Two problems drive the rebuild:

1. **Workouts are hard to navigate.** The active-workout screen shows all six exercises at once — each card carries a description, how-to text, a recommendation line, a set list with edit/delete, and two free-text inputs plus a Log button. Mid-workout, with sweaty hands, that's a lot of reading and scrolling to answer the only question that matters: *what do I do right now?*
2. **There is no way out of an exercise you can't do.** If Pull-Ups are prescribed and you can't do one, the app has no answer. The recommendation engine only adjusts *weight*; it never swaps the *movement* for an easier variant, and bodyweight exercises have no progression path at all.

The verdict: keep the plumbing (it's genuinely good), scrap the workout model and every screen.

## What v1 got right — carry it forward

| Keep | Why |
|---|---|
| SQLite WASM + OPFS (`src/db/client.ts`) | Fully offline, no server, survives reinstalls. Battle-tested here. |
| PWA setup (vite-plugin-pwa, install prompt, hash router) | Install flow already works on iOS + Android. |
| Cloudflare Worker backup (`server/`, `src/lib/backupApi.ts`) | Multi-user backup/restore with username auth — reuse as-is. |
| **Calorie bridge** (`src/lib/calorieBridge.ts`) | The contract with the calorie counter (`fitness-bridge` IndexedDB, `{id, date, endedAt, type, minutes}`) must survive the rewrite unchanged. Port the module verbatim. |
| Zustand session store with self-healing resume | Resume-after-close already handles the edge cases. |
| Vite + React + TS + Tailwind | No reason to change stacks; the problem is product design, not tech. |

What gets scrapped: the flat `exercises` catalog, the push/pull/legs day-type as the user-facing concept, the exercise-picker scoring, all seven screens, and the schema (fresh `schema_v2`, old tables left readable for a one-time history import).

## The new core concept: movement ladders

Every exercise in v2 belongs to a **movement pattern**, and each pattern is an ordered **ladder** of variants from easiest to hardest:

```
VERTICAL PULL          HORIZONTAL PUSH        SQUAT
1 Dead hang            1 Wall push-up         1 Sit-to-stand (box)
2 Scapular pulls       2 Incline push-up      2 Bodyweight squat
3 Band-assisted        3 Knee push-up         3 Goblet squat
4 Negatives            4 Push-up              4 DB front squat
5 Pull-up              5 Deficit push-up      5 Barbell back squat
6 Weighted pull-up     6 Bench press*         6 …
```

*Ladders can branch into loaded lifts once equipment enters; a loaded rung progresses by weight (the existing recommend logic), a bodyweight rung progresses by reps, and "graduating" a rung moves you up the ladder.*

The app tracks **your current rung per pattern**. This one idea powers everything:

- **"Too hard" button** on every exercise, mid-workout: instantly swaps to the rung below, with sane targets, and remembers the demotion.
- **Automatic level-ups**: hit the graduation criteria (e.g. 3×8 across two sessions) and the next session prescribes the rung above, with a one-line "You've earned Negatives → Pull-Ups" celebration.
- **Onboarding without a questionnaire**: first session starts every pattern at a low-middle rung; two or three "too easy" taps calibrate you within one workout.
- **Progress that means something**: "Rung 4 of 6 on Vertical Pull" reads better to a non-lifter than an Epley 1RM chart.

Six patterns cover the body: **Squat, Hinge, Horizontal Push, Vertical Push, Horizontal Pull, Vertical Pull** (plus an optional Core/Carry slot). The old push/pull/legs split still exists — but as an internal rotation the app manages, not a decision the user makes.

## The new UX: one decision per screen

### Home = one button

```
┌──────────────────────────┐
│  Today: Push day         │
│  ~35 min · 5 exercises   │
│                          │
│  ┌────────────────────┐  │
│  │      START  ▶      │  │
│  └────────────────────┘  │
│                          │
│  Last workout: yesterday │
│  🔥 3-workout streak     │
└──────────────────────────┘
```

The app decides what today is (next in rotation, or full-body if it's been >5 days). No push/pull/legs choice, no exercise list to review. A small "not today → switch" link handles the exception, not the rule.

### Workout = one exercise at a time (focus mode)

Replace the six-card scroll with a stepper. One screen shows exactly one exercise:

```
┌──────────────────────────┐
│ ●●○○○           Exit     │   ← progress dots
│                          │
│   INCLINE PUSH-UP        │
│   [illustration]         │
│   Set 2 of 3 · aim for 8 │
│                          │
│  ┌────────────────────┐  │
│  │    DONE — got 8    │  │   ← one tap logs the target
│  └────────────────────┘  │
│   got fewer? tap a number│   ← 5 6 7 chips, no keyboard
│                          │
│  Too hard? → easier form │   ← the ladder swap
│  ⓘ How to do this        │   ← collapsed by default
└──────────────────────────┘
```

Design rules for this screen:

- **Logging is one tap.** "Done" assumes you hit the target; a row of number chips handles misses. Free-text weight/reps inputs only appear for loaded lifts, pre-filled, stepper buttons (±2.5 kg) instead of a keyboard.
- **Rest timer starts itself** after each set — full-screen countdown with "skip", so the phone tells you when to go again.
- **How-to is collapsed** behind one tap; the screen leads with a picture, not four paragraphs.
- **"Too hard"** swaps the rung down *right now* and re-prescribes; "too easy" flags it for next session.
- Finish screen: summary, streak, then `publishWorkoutToBridge()` + auto-backup exactly as today.

### Everything else shrinks

- **History**: a simple list of past sessions; tap for detail. Unfinished-session resume stays.
- **Progress**: per-pattern ladder position + a rep/weight trend line. Drop the per-muscle 1RM snapshot table entirely.
- **Settings**: backup (as today) + equipment toggles ("I have: nothing / dumbbells / full gym") which prune ladders to available rungs.
- Screens go from 7 to 5: Home, Session (warmup folded in as step 0), History, Progress, Settings.

## New data model (sketch)

```sql
patterns   (id, name, slot)                        -- squat, hinge, h_push, v_push, h_pull, v_pull
exercises  (id, pattern_id, rung, name, equipment,
            load_type,        -- 'bodyweight' | 'loaded'
            target_reps_low, target_reps_high,
            graduate_rule,    -- e.g. '3x8_twice'
            how_to, media_ref)
user_levels(pattern_id, current_rung, updated_at)
sessions   (id, date, plan_type, started_at, finished_at)
session_items(session_id, exercise_id, position,
            outcome)          -- 'done' | 'swapped_down' | 'skipped'
sets       (id, session_id, exercise_id, set_number, reps, weight_kg, completed_at)
```

The recommendation engine becomes two small pure functions:

- `prescribe(pattern, user_level, history) → {exercise, sets, reps, weight}` — resolves the rung, then reuses the v1 double-progression/deload weight logic for loaded rungs.
- `review(session) → level_changes[]` — applies graduation rules and "too hard" demotions after each session.

Both are pure and unit-testable — v1 had zero tests; v2's progression engine gets them first.

## Build plan

**Phase 0 — Content before code.** Write the six ladders (5–7 rungs each) with targets and graduation rules as a typed seed file. This is the product; get it reviewed before any UI exists.

**Phase 1 — New skeleton.** Fresh `src/` alongside the kept modules: schema_v2, seed, Home (one button), Session stepper with tap-to-log and rest timer. Hardcode the rotation. *Usable in the gym at the end of this phase.*

**Phase 2 — The ladder engine.** `prescribe`/`review` with unit tests, "too hard/too easy" wiring, level-up celebrations, equipment filtering.

**Phase 3 — Re-attach the plumbing.** Calorie bridge on finish, auto-backup, history, progress screen, resume-unfinished-session.

**Phase 4 — Cut over.** One-time importer that copies v1 `workouts`/`workout_sets` into v2 history (read-only), deploy to the same GitHub Pages URL so the installed PWA just updates. Delete v1 screens.

## Open questions (defaults chosen, easy to change)

1. **Split**: defaulting to the existing PPL rotation, app-managed. A 3-day full-body alternative is a seed-file change, not a code change.
2. **Old data**: defaulting to *import history read-only, start ladders fresh* — calibration via "too easy" taps beats guessing rungs from old 1RMs.
3. **Warmups**: defaulting to folding 2 warmup moves in as step 0 of the stepper, killing the separate screen.
4. **Illustrations**: rung swaps only feel safe if you can see the easier form. Plan for simple line-art per exercise (static SVG is enough; no video).
