/**
 * Simple Workout v2 — Phase 0 seed: movement ladders.
 *
 * This file IS the product. Six movement patterns (plus a core slot), each an
 * ordered ladder of exercises from easiest to hardest. The app tracks the
 * user's current rung per pattern; "too hard" demotes one rung mid-workout,
 * graduation rules promote between sessions, and exercises sharing the same
 * (pattern, rung) are sideways-swap alternates.
 *
 * No runtime media lookups: `mediaRef` is a pinned asset filename committed to
 * the repo, filled in during the one-time illustration review gate (assets
 * sourced from free-exercise-db, public domain). Null until verified.
 */

export type PatternId =
  | "squat"
  | "hinge"
  | "h_push"
  | "v_push"
  | "h_pull"
  | "v_pull"
  | "core";

export type DayType = "push" | "pull" | "legs";

export type Equipment =
  | "none"
  | "box" // sturdy chair/box/step
  | "band"
  | "pullup_bar"
  | "dumbbell"
  | "barbell"
  | "bench"
  | "machine";

export type Target = {
  sets: number;
  unit: "reps" | "seconds";
  low: number;
  high: number;
  /** true = target applies per side (e.g. one-arm rows) */
  perSide?: boolean;
};

export type GraduateRule =
  /** Hit sets × high (top of range) in N consecutive sessions → rung up. */
  | { kind: "top_of_range"; sessions: number }
  /** Loaded rung: hit sets × high at or above this weight → rung up. */
  | { kind: "load_threshold"; weightKg: number }
  /** Top of the ladder: progress by load forever (v1 double-progression logic). */
  | { kind: "terminal" };

export type LadderExercise = {
  id: string;
  name: string;
  /** 1 = easiest. Exercises sharing (pattern, rung) are swap alternates. */
  rung: number;
  /** The default prescription for the rung; alternates surface only via Swap. */
  canonical: boolean;
  equipment: Equipment[];
  load: "bodyweight" | "loaded";
  /** For loaded moves: suggested first working weight (per implement for DBs). */
  startWeightKg?: number;
  target: Target;
  graduate: GraduateRule;
  howTo: string[];
  /** One-line form cue shown on the workout screen. */
  cue: string;
  /** Pinned illustration filename (repo-committed); null until human-verified. */
  mediaRef: string | null;
};

export type Ladder = {
  pattern: PatternId;
  label: string;
  /** Rung prescribed for a brand-new user (low-middle; "too easy" calibrates up). */
  startRung: number;
  rungs: LadderExercise[];
};

export type Warmup = {
  id: string;
  name: string;
  day: DayType;
  target: Target;
  howTo: string[];
};

/** Which pattern slots each rotation day prescribes, in order. */
export const DAY_TEMPLATES: Record<DayType, PatternId[]> = {
  push: ["h_push", "v_push", "core"],
  pull: ["h_pull", "v_pull", "core"],
  legs: ["squat", "hinge", "core"],
};

/** The rotation the app manages; the user never picks a day. */
export const ROTATION: DayType[] = ["push", "pull", "legs"];

// ---------------------------------------------------------------------------
// Squat
// ---------------------------------------------------------------------------

const SQUAT: Ladder = {
  pattern: "squat",
  label: "Squat",
  startRung: 2,
  rungs: [
    {
      id: "sq1_box_sit_to_stand",
      name: "Box Sit-to-Stand",
      rung: 1,
      canonical: true,
      equipment: ["box"],
      load: "bodyweight",
      target: { sets: 3, unit: "reps", low: 8, high: 12 },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "Sit on a sturdy chair or box, feet flat, shoulder-width.",
        "Lean slightly forward and stand up without using your hands.",
        "Sit back down slowly — 2–3 seconds on the way down.",
      ],
      cue: "Slow on the way down; no hands.",
      mediaRef: null,
    },
    {
      id: "sq2_bodyweight_squat",
      name: "Bodyweight Squat",
      rung: 2,
      canonical: true,
      equipment: ["none"],
      load: "bodyweight",
      target: { sets: 3, unit: "reps", low: 10, high: 15 },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "Feet shoulder-width, toes slightly out, arms forward for balance.",
        "Sit down and back until thighs are at least parallel.",
        "Drive through the whole foot to stand; knees track over toes.",
      ],
      cue: "Chest up, knees out, full depth.",
      mediaRef: null,
    },
    {
      id: "sq3_goblet_squat",
      name: "Goblet Squat",
      rung: 3,
      canonical: true,
      equipment: ["dumbbell"],
      load: "loaded",
      startWeightKg: 12,
      target: { sets: 3, unit: "reps", low: 8, high: 12 },
      graduate: { kind: "load_threshold", weightKg: 24 },
      howTo: [
        "Hold one dumbbell vertically against your chest, elbows down.",
        "Squat between your knees to full depth, torso tall.",
        "Stand up without letting the weight pull you forward.",
      ],
      cue: "Elbows inside the knees at the bottom.",
      mediaRef: null,
    },
    {
      id: "sq4_db_front_squat",
      name: "DB Front Squat",
      rung: 4,
      canonical: true,
      equipment: ["dumbbell"],
      load: "loaded",
      startWeightKg: 12,
      target: { sets: 3, unit: "reps", low: 8, high: 12 },
      graduate: { kind: "load_threshold", weightKg: 20 },
      howTo: [
        "One dumbbell on each shoulder, elbows high.",
        "Squat to full depth keeping the torso upright.",
        "Stand tall; don't let the elbows drop as you fatigue.",
      ],
      cue: "Elbows up keeps the chest up.",
      mediaRef: null,
    },
    {
      id: "sq4_alt_leg_press",
      name: "Leg Press",
      rung: 4,
      canonical: false,
      equipment: ["machine"],
      load: "loaded",
      startWeightKg: 60,
      target: { sets: 3, unit: "reps", low: 10, high: 12 },
      graduate: { kind: "load_threshold", weightKg: 120 },
      howTo: [
        "Back flat on the pad, feet mid-platform, shoulder-width.",
        "Lower under control until knees reach ~90°.",
        "Press through the whole foot; don't slam the lockout.",
      ],
      cue: "Lower back stays glued to the pad.",
      mediaRef: null,
    },
    {
      id: "sq5_back_squat",
      name: "Barbell Back Squat",
      rung: 5,
      canonical: true,
      equipment: ["barbell"],
      load: "loaded",
      startWeightKg: 40,
      target: { sets: 3, unit: "reps", low: 5, high: 8 },
      graduate: { kind: "terminal" },
      howTo: [
        "Bar across the upper back (not the neck); grip tight, elbows down.",
        "Unrack, two steps back, stance shoulder-width, toes slightly out.",
        "Brace, sit down and back to at least parallel, drive back up.",
      ],
      cue: "Big breath, brace, knees out.",
      mediaRef: null,
    },
  ],
};

// ---------------------------------------------------------------------------
// Hinge
// ---------------------------------------------------------------------------

const HINGE: Ladder = {
  pattern: "hinge",
  label: "Hinge",
  startRung: 2,
  rungs: [
    {
      id: "hg1_glute_bridge",
      name: "Glute Bridge",
      rung: 1,
      canonical: true,
      equipment: ["none"],
      load: "bodyweight",
      target: { sets: 3, unit: "reps", low: 10, high: 15 },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "Lie on your back, knees bent, feet flat near your hips.",
        "Drive through the heels and lift hips until body is a straight line.",
        "Squeeze glutes at the top for a second; lower slowly.",
      ],
      cue: "Squeeze at the top, don't arch the lower back.",
      mediaRef: null,
    },
    {
      id: "hg2_single_leg_glute_bridge",
      name: "Single-Leg Glute Bridge",
      rung: 2,
      canonical: true,
      equipment: ["none"],
      load: "bodyweight",
      target: { sets: 3, unit: "reps", low: 8, high: 12, perSide: true },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "Glute bridge position, one foot on the floor, other leg extended.",
        "Drive up through the planted heel; hips stay level.",
        "Lower slowly; finish all reps on one side before switching.",
      ],
      cue: "Hips level — don't let one side sag.",
      mediaRef: null,
    },
    {
      id: "hg3_db_rdl",
      name: "DB Romanian Deadlift",
      rung: 3,
      canonical: true,
      equipment: ["dumbbell"],
      load: "loaded",
      startWeightKg: 14,
      target: { sets: 3, unit: "reps", low: 10, high: 12 },
      graduate: { kind: "load_threshold", weightKg: 22 },
      howTo: [
        "Dumbbells in front of thighs, soft knees.",
        "Push hips back, sliding the weights down your legs.",
        "Stop at a deep hamstring stretch; drive hips forward to stand.",
      ],
      cue: "Hips back, flat back, weights close to the legs.",
      mediaRef: null,
    },
    {
      id: "hg4_barbell_rdl",
      name: "Barbell Romanian Deadlift",
      rung: 4,
      canonical: true,
      equipment: ["barbell"],
      load: "loaded",
      startWeightKg: 40,
      target: { sets: 3, unit: "reps", low: 8, high: 10 },
      graduate: { kind: "load_threshold", weightKg: 60 },
      howTo: [
        "Start standing, bar at hip height, soft knees that stay put.",
        "Push hips back until you feel a deep hamstring stretch.",
        "Stand by driving hips forward; squeeze glutes at the top.",
      ],
      cue: "The bar drags up and down your thighs.",
      mediaRef: null,
    },
    {
      id: "hg5_deadlift",
      name: "Deadlift",
      rung: 5,
      canonical: true,
      equipment: ["barbell"],
      load: "loaded",
      startWeightKg: 60,
      target: { sets: 3, unit: "reps", low: 3, high: 5 },
      graduate: { kind: "terminal" },
      howTo: [
        "Bar over mid-foot, hip-width stance, grip just outside the knees.",
        "Chest up, back flat, lats engaged.",
        "Push the floor away; stand tall, then hips back first to lower.",
      ],
      cue: "Slack out of the bar before it leaves the floor.",
      mediaRef: null,
    },
  ],
};

// ---------------------------------------------------------------------------
// Horizontal push
// ---------------------------------------------------------------------------

const H_PUSH: Ladder = {
  pattern: "h_push",
  label: "Horizontal Push",
  startRung: 3,
  rungs: [
    {
      id: "hp1_wall_pushup",
      name: "Wall Push-Up",
      rung: 1,
      canonical: true,
      equipment: ["none"],
      load: "bodyweight",
      target: { sets: 3, unit: "reps", low: 10, high: 15 },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "Hands on a wall at shoulder height, feet a big step back.",
        "Body straight, lower your chest toward the wall.",
        "Push back to straight arms without shrugging.",
      ],
      cue: "Body moves as one plank.",
      mediaRef: null,
    },
    {
      id: "hp2_incline_pushup",
      name: "Incline Push-Up",
      rung: 2,
      canonical: true,
      equipment: ["box"],
      load: "bodyweight",
      target: { sets: 3, unit: "reps", low: 8, high: 12 },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "Hands on a bench, table, or box; body in one straight line.",
        "Lower chest to the edge with elbows ~45° from the body.",
        "Press back up; the lower the surface, the harder it gets.",
      ],
      cue: "Squeeze glutes so the hips don't sag.",
      mediaRef: null,
    },
    {
      id: "hp3_knee_pushup",
      name: "Knee Push-Up",
      rung: 3,
      canonical: true,
      equipment: ["none"],
      load: "bodyweight",
      target: { sets: 3, unit: "reps", low: 8, high: 12 },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "Push-up position from the knees; straight line knees→shoulders.",
        "Lower chest to the floor with elbows ~45°.",
        "Press up fully; keep the neck long, eyes down.",
      ],
      cue: "Chest touches first — not the hips.",
      mediaRef: null,
    },
    {
      id: "hp4_pushup",
      name: "Push-Up",
      rung: 4,
      canonical: true,
      equipment: ["none"],
      load: "bodyweight",
      target: { sets: 3, unit: "reps", low: 5, high: 12 },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "Plank position, hands under shoulders, body rigid.",
        "Lower until your chest is a fist-height from the floor.",
        "Press back up in one line — hips neither sag nor pike.",
      ],
      cue: "Rigid plank, elbows ~45°.",
      mediaRef: null,
    },
    {
      id: "hp5_db_bench_press",
      name: "DB Bench Press",
      rung: 5,
      canonical: true,
      equipment: ["dumbbell", "bench"],
      load: "loaded",
      startWeightKg: 12,
      target: { sets: 3, unit: "reps", low: 8, high: 12 },
      graduate: { kind: "load_threshold", weightKg: 22 },
      howTo: [
        "Lie on a flat bench, a dumbbell in each hand at chest level.",
        "Press up and slightly in until arms are straight.",
        "Lower until elbows dip just below the bench line.",
      ],
      cue: "Wrists stacked over elbows the whole rep.",
      mediaRef: null,
    },
    {
      id: "hp5_alt_decline_pushup",
      name: "Decline Push-Up",
      rung: 5,
      canonical: false,
      equipment: ["box"],
      load: "bodyweight",
      target: { sets: 3, unit: "reps", low: 8, high: 12 },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "Push-up position with feet elevated on a box or bench.",
        "Lower under control; the higher the feet, the harder it is.",
        "Press up keeping the body in one line.",
      ],
      cue: "Don't let the hips drop as you fatigue.",
      mediaRef: null,
    },
    {
      id: "hp6_bench_press",
      name: "Barbell Bench Press",
      rung: 6,
      canonical: true,
      equipment: ["barbell", "bench"],
      load: "loaded",
      startWeightKg: 40,
      target: { sets: 3, unit: "reps", low: 5, high: 8 },
      graduate: { kind: "terminal" },
      howTo: [
        "Lie with eyes under the bar, feet planted, slight arch.",
        "Grip a bit wider than shoulders; unrack to over the chest.",
        "Lower to mid-chest, elbows ~45°; press back without bouncing.",
      ],
      cue: "Bar path: chest to over the shoulders, slight arc.",
      mediaRef: null,
    },
    {
      id: "hp6_alt_dips",
      name: "Dips",
      rung: 6,
      canonical: false,
      equipment: ["machine"],
      load: "bodyweight",
      target: { sets: 3, unit: "reps", low: 5, high: 10 },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "Support on parallel bars, arms straight, slight forward lean.",
        "Lower until shoulders reach elbow height — no deeper if they complain.",
        "Press back up and squeeze the chest at the top.",
      ],
      cue: "Shoulders down and back, lean forward for chest.",
      mediaRef: null,
    },
    {
      id: "hp6_alt_incline_db_press",
      name: "Incline DB Press",
      rung: 6,
      canonical: false,
      equipment: ["dumbbell", "bench"],
      load: "loaded",
      startWeightKg: 12,
      target: { sets: 3, unit: "reps", low: 8, high: 12 },
      graduate: { kind: "terminal" },
      howTo: [
        "Bench at 30–45°; kick the dumbbells up as you lie back.",
        "Lower until elbows are slightly below shoulder level.",
        "Press up and slightly in; don't clang the bells.",
      ],
      cue: "Upper chest does the work — keep the arch modest.",
      mediaRef: null,
    },
  ],
};

// ---------------------------------------------------------------------------
// Vertical push
// ---------------------------------------------------------------------------

const V_PUSH: Ladder = {
  pattern: "v_push",
  label: "Vertical Push",
  startRung: 2,
  rungs: [
    {
      id: "vp1_wall_pike_press",
      name: "Wall Pike Press",
      rung: 1,
      canonical: true,
      equipment: ["none"],
      load: "bodyweight",
      target: { sets: 3, unit: "reps", low: 8, high: 12 },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "Hands on the floor, feet walked up a wall or hips piked high.",
        "Bend the elbows to lower the top of your head toward the floor.",
        "Press back up until arms are straight.",
      ],
      cue: "Head travels down between the hands.",
      mediaRef: null,
    },
    {
      id: "vp2_pike_pushup",
      name: "Pike Push-Up",
      rung: 2,
      canonical: true,
      equipment: ["none"],
      load: "bodyweight",
      target: { sets: 3, unit: "reps", low: 5, high: 10 },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "Downward-dog position: hips high, legs as straight as comfortable.",
        "Lower the crown of your head toward the floor between your hands.",
        "Press back to straight arms; keep the hips high throughout.",
      ],
      cue: "It's a shoulder press, not a push-up — hips stay up.",
      mediaRef: null,
    },
    {
      id: "vp3_elevated_pike_pushup",
      name: "Elevated Pike Push-Up",
      rung: 3,
      canonical: true,
      equipment: ["box"],
      load: "bodyweight",
      target: { sets: 3, unit: "reps", low: 5, high: 8 },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "Pike position with feet on a box or bench, hips over shoulders.",
        "Lower head to the floor under control.",
        "Press out fully; more foot height = closer to a handstand press.",
      ],
      cue: "Stack hips over shoulders over hands.",
      mediaRef: null,
    },
    {
      id: "vp4_db_shoulder_press",
      name: "DB Shoulder Press",
      rung: 4,
      canonical: true,
      equipment: ["dumbbell"],
      load: "loaded",
      startWeightKg: 8,
      target: { sets: 3, unit: "reps", low: 8, high: 12 },
      graduate: { kind: "load_threshold", weightKg: 16 },
      howTo: [
        "Standing or seated, dumbbells at shoulder height, palms forward.",
        "Press straight up until arms lock out overhead.",
        "Lower to ear height under control; don't lean back.",
      ],
      cue: "Ribs down — press with shoulders, not lower back.",
      mediaRef: null,
    },
    {
      id: "vp4_alt_machine_shoulder_press",
      name: "Machine Shoulder Press",
      rung: 4,
      canonical: false,
      equipment: ["machine"],
      load: "loaded",
      startWeightKg: 20,
      target: { sets: 3, unit: "reps", low: 8, high: 12 },
      graduate: { kind: "load_threshold", weightKg: 40 },
      howTo: [
        "Adjust the seat so handles start at shoulder height.",
        "Press to lockout without shrugging.",
        "Lower under control to the start.",
      ],
      cue: "Back stays on the pad.",
      mediaRef: null,
    },
    {
      id: "vp5_barbell_ohp",
      name: "Barbell Overhead Press",
      rung: 5,
      canonical: true,
      equipment: ["barbell"],
      load: "loaded",
      startWeightKg: 30,
      target: { sets: 3, unit: "reps", low: 5, high: 8 },
      graduate: { kind: "terminal" },
      howTo: [
        "Bar in the front rack just above the collarbone, elbows under it.",
        "Brace core and glutes; press straight up past your face.",
        "Push your head through once the bar clears; lock out overhead.",
      ],
      cue: "Squeeze glutes so the lower back can't arch.",
      mediaRef: null,
    },
  ],
};

// ---------------------------------------------------------------------------
// Horizontal pull
// ---------------------------------------------------------------------------

const H_PULL: Ladder = {
  pattern: "h_pull",
  label: "Horizontal Pull",
  startRung: 2,
  rungs: [
    {
      id: "hpu1_doorway_row",
      name: "Doorway Row",
      rung: 1,
      canonical: true,
      equipment: ["none"],
      load: "bodyweight",
      target: { sets: 3, unit: "reps", low: 10, high: 15 },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "Hold both sides of a doorframe (or a towel around a post), lean back.",
        "Arms straight, body in one line, heels planted.",
        "Pull your chest to your hands, squeezing shoulder blades together.",
      ],
      cue: "Walk the feet forward to make it harder.",
      mediaRef: null,
    },
    {
      id: "hpu2_band_row",
      name: "Band Row",
      rung: 2,
      canonical: true,
      equipment: ["band"],
      load: "bodyweight",
      target: { sets: 3, unit: "reps", low: 10, high: 15 },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "Band anchored at chest height (or around your feet, seated).",
        "Pull the handles to your lower ribs, elbows close to the body.",
        "Squeeze the shoulder blades; return slowly to full stretch.",
      ],
      cue: "Shoulders stay down — no shrugging into the pull.",
      mediaRef: null,
    },
    {
      id: "hpu3_inverted_row",
      name: "Inverted Row",
      rung: 3,
      canonical: true,
      equipment: ["barbell", "machine"],
      load: "bodyweight",
      target: { sets: 3, unit: "reps", low: 5, high: 10 },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "Bar in a rack at waist height; hang underneath, body straight.",
        "Heels on the floor, pull your chest to the bar.",
        "Lower to straight arms; the flatter your body, the harder it is.",
      ],
      cue: "Plank rules apply — hips locked in line.",
      mediaRef: null,
    },
    {
      id: "hpu4_one_arm_db_row",
      name: "One-Arm DB Row",
      rung: 4,
      canonical: true,
      equipment: ["dumbbell", "bench"],
      load: "loaded",
      startWeightKg: 12,
      target: { sets: 3, unit: "reps", low: 8, high: 12, perSide: true },
      graduate: { kind: "load_threshold", weightKg: 24 },
      howTo: [
        "One hand and knee on a bench, back flat, dumbbell hanging.",
        "Row the weight to your hip, elbow tracking close to the body.",
        "Lower to a full stretch without rotating the torso.",
      ],
      cue: "Pull with the elbow, not the hand.",
      mediaRef: null,
    },
    {
      id: "hpu5_barbell_row",
      name: "Barbell Row",
      rung: 5,
      canonical: true,
      equipment: ["barbell"],
      load: "loaded",
      startWeightKg: 40,
      target: { sets: 3, unit: "reps", low: 5, high: 8 },
      graduate: { kind: "terminal" },
      howTo: [
        "Hinge to ~45°, bar hanging at arm's length, back flat.",
        "Pull the bar to your lower ribs; squeeze the blades together.",
        "Lower under control; torso angle stays fixed — no heaving.",
      ],
      cue: "If the torso bounces, the weight is too heavy.",
      mediaRef: null,
    },
    {
      id: "hpu5_alt_seated_cable_row",
      name: "Seated Cable Row",
      rung: 5,
      canonical: false,
      equipment: ["machine"],
      load: "loaded",
      startWeightKg: 35,
      target: { sets: 3, unit: "reps", low: 8, high: 12 },
      graduate: { kind: "terminal" },
      howTo: [
        "Sit tall, feet braced, handle at arm's length.",
        "Pull to your lower ribs, chest proud.",
        "Return slowly to a full stretch without slumping forward.",
      ],
      cue: "Torso stays near-vertical both ways.",
      mediaRef: null,
    },
  ],
};

// ---------------------------------------------------------------------------
// Vertical pull
// ---------------------------------------------------------------------------

const V_PULL: Ladder = {
  pattern: "v_pull",
  label: "Vertical Pull",
  startRung: 2,
  rungs: [
    {
      id: "vpu1_dead_hang",
      name: "Dead Hang",
      rung: 1,
      canonical: true,
      equipment: ["pullup_bar"],
      load: "bodyweight",
      target: { sets: 3, unit: "seconds", low: 20, high: 30 },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "Grip the bar overhand, slightly wider than shoulders.",
        "Hang with straight arms, feet off the floor.",
        "Keep shoulders active — pulled slightly down, not up by your ears.",
      ],
      cue: "Breathe. Grip strength is the workout.",
      mediaRef: null,
    },
    {
      id: "vpu2_scapular_pulls",
      name: "Scapular Pulls",
      rung: 2,
      canonical: true,
      equipment: ["pullup_bar"],
      load: "bodyweight",
      target: { sets: 3, unit: "reps", low: 5, high: 8 },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "Dead hang with straight arms.",
        "Without bending the elbows, pull your shoulder blades down and back — your body rises a few centimetres.",
        "Lower back to a full hang with control.",
      ],
      cue: "Arms stay straight; the shoulder blades do everything.",
      mediaRef: null,
    },
    {
      id: "vpu3_band_assisted_pullup",
      name: "Band-Assisted Pull-Up",
      rung: 3,
      canonical: true,
      equipment: ["pullup_bar", "band"],
      load: "bodyweight",
      target: { sets: 3, unit: "reps", low: 3, high: 8 },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "Loop a band over the bar; put one foot or knee in the loop.",
        "Pull your chin over the bar, driving elbows down and back.",
        "Lower to a full hang each rep. Thinner band = harder.",
      ],
      cue: "Full hang at the bottom — no half reps.",
      mediaRef: null,
    },
    {
      id: "vpu3_alt_lat_pulldown",
      name: "Lat Pulldown",
      rung: 3,
      canonical: false,
      equipment: ["machine"],
      load: "loaded",
      startWeightKg: 30,
      target: { sets: 3, unit: "reps", low: 8, high: 12 },
      graduate: { kind: "load_threshold", weightKg: 50 },
      howTo: [
        "Thighs under the pad, grip wider than shoulders.",
        "Lean back ~15°; pull the bar to your upper chest.",
        "Return all the way up to a full stretch each rep.",
      ],
      cue: "Elbows down and back, not hands to chin.",
      mediaRef: null,
    },
    {
      id: "vpu4_negative_pullups",
      name: "Negative Pull-Ups",
      rung: 4,
      canonical: true,
      equipment: ["pullup_bar", "box"],
      load: "bodyweight",
      target: { sets: 3, unit: "reps", low: 3, high: 5 },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "Jump or step from a box to the top position, chin over the bar.",
        "Lower yourself as slowly as you can — aim for 3–5 seconds.",
        "Step back up and repeat. The descent is the whole exercise.",
      ],
      cue: "Fight gravity the entire way down.",
      mediaRef: null,
    },
    {
      id: "vpu5_pull_up",
      name: "Pull-Up",
      rung: 5,
      canonical: true,
      equipment: ["pullup_bar"],
      load: "bodyweight",
      target: { sets: 3, unit: "reps", low: 3, high: 8 },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "Full hang, overhand grip slightly wider than shoulders.",
        "Pull your chest toward the bar, elbows driving down and back.",
        "Chin over the bar at the top; lower to a full hang.",
      ],
      cue: "Start each rep from a dead stop.",
      mediaRef: null,
    },
    {
      id: "vpu6_weighted_pullup",
      name: "Weighted Pull-Up",
      rung: 6,
      canonical: true,
      equipment: ["pullup_bar", "dumbbell"],
      load: "loaded",
      startWeightKg: 2.5,
      target: { sets: 3, unit: "reps", low: 3, high: 6 },
      graduate: { kind: "terminal" },
      howTo: [
        "Add weight with a dip belt or a dumbbell between the feet.",
        "Same standard: dead hang to chin over bar, every rep.",
        "Add load only when all sets hit the top of the range.",
      ],
      cue: "Quality first — the standard never loosens.",
      mediaRef: null,
    },
  ],
};

// ---------------------------------------------------------------------------
// Core (third slot on every day)
// ---------------------------------------------------------------------------

const CORE: Ladder = {
  pattern: "core",
  label: "Core",
  startRung: 2,
  rungs: [
    {
      id: "co1_dead_bug",
      name: "Dead Bug",
      rung: 1,
      canonical: true,
      equipment: ["none"],
      load: "bodyweight",
      target: { sets: 3, unit: "reps", low: 8, high: 12, perSide: true },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "On your back, arms up, knees bent 90° over hips.",
        "Lower one arm and the opposite leg toward the floor.",
        "Return and switch sides; lower back stays pressed into the floor.",
      ],
      cue: "If the lower back arches, shorten the reach.",
      mediaRef: null,
    },
    {
      id: "co2_plank",
      name: "Plank",
      rung: 2,
      canonical: true,
      equipment: ["none"],
      load: "bodyweight",
      target: { sets: 3, unit: "seconds", low: 30, high: 60 },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "Forearms down, elbows under shoulders, body in one line.",
        "Squeeze glutes and brace as if about to be poked in the stomach.",
        "Hold. Stop the set when the hips start to sag.",
      ],
      cue: "A short perfect plank beats a long saggy one.",
      mediaRef: null,
    },
    {
      id: "co3_side_plank",
      name: "Side Plank",
      rung: 3,
      canonical: true,
      equipment: ["none"],
      load: "bodyweight",
      target: { sets: 3, unit: "seconds", low: 20, high: 40, perSide: true },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "On one forearm, elbow under shoulder, feet stacked.",
        "Lift hips until the body is one straight line.",
        "Hold, then switch sides.",
      ],
      cue: "Push the floor away — don't hang on the shoulder.",
      mediaRef: null,
    },
    {
      id: "co4_hollow_hold",
      name: "Hollow Hold",
      rung: 4,
      canonical: true,
      equipment: ["none"],
      load: "bodyweight",
      target: { sets: 3, unit: "seconds", low: 20, high: 40 },
      graduate: { kind: "top_of_range", sessions: 2 },
      howTo: [
        "On your back, press the lower back into the floor.",
        "Lift shoulders and legs a few centimetres off the ground, arms by your ears.",
        "Hold the banana shape; bend knees to make it easier.",
      ],
      cue: "Lower back glued to the floor is the whole point.",
      mediaRef: null,
    },
    {
      id: "co5_hanging_knee_raise",
      name: "Hanging Knee Raise",
      rung: 5,
      canonical: true,
      equipment: ["pullup_bar"],
      load: "bodyweight",
      target: { sets: 3, unit: "reps", low: 6, high: 12 },
      graduate: { kind: "terminal" },
      howTo: [
        "Dead hang from the bar, shoulders active.",
        "Lift your knees to hip height or higher without swinging.",
        "Lower slowly; straighten the legs over time to progress.",
      ],
      cue: "Slow down before you swing.",
      mediaRef: null,
    },
  ],
};

export const LADDERS: Ladder[] = [SQUAT, HINGE, H_PUSH, V_PUSH, H_PULL, V_PULL, CORE];

// ---------------------------------------------------------------------------
// Warmups — step 0 of the session stepper, two per day
// ---------------------------------------------------------------------------

export const WARMUPS: Warmup[] = [
  {
    id: "wu_push_arm_circles",
    name: "Arm Circles",
    day: "push",
    target: { sets: 2, unit: "reps", low: 10, high: 10, perSide: true },
    howTo: ["Big slow circles forward, then backward.", "Grow the circles as the shoulders loosen."],
  },
  {
    id: "wu_push_scap_pushups",
    name: "Scap Push-Ups",
    day: "push",
    target: { sets: 2, unit: "reps", low: 10, high: 10 },
    howTo: [
      "Plank position, arms straight the whole time.",
      "Pinch the shoulder blades together, then push the floor away to spread them.",
    ],
  },
  {
    id: "wu_pull_band_pullaparts",
    name: "Band Pull-Aparts",
    day: "pull",
    target: { sets: 2, unit: "reps", low: 15, high: 15 },
    howTo: [
      "Hold a band at shoulder height, arms straight.",
      "Pull it apart until it touches your chest; return slowly.",
    ],
  },
  {
    id: "wu_pull_cat_cow",
    name: "Cat-Cow",
    day: "pull",
    target: { sets: 2, unit: "reps", low: 8, high: 8 },
    howTo: [
      "On all fours, alternate arching and rounding the spine slowly.",
      "Move with your breath — exhale as you round.",
    ],
  },
  {
    id: "wu_legs_bw_squats",
    name: "Easy Bodyweight Squats",
    day: "legs",
    target: { sets: 2, unit: "reps", low: 10, high: 10 },
    howTo: ["Slow, comfortable squats to warm the knees and hips.", "Deeper each rep as things loosen up."],
  },
  {
    id: "wu_legs_leg_swings",
    name: "Leg Swings",
    day: "legs",
    target: { sets: 2, unit: "reps", low: 10, high: 10, perSide: true },
    howTo: ["Hold a wall; swing one leg forward and back, relaxed.", "Then side to side. Switch legs."],
  },
];

// ---------------------------------------------------------------------------
// v1 → v2 import name map
// ---------------------------------------------------------------------------

/**
 * Maps v1 exercise names (src/db/seed.ts) to v2 exercise ids for the history
 * importer. `null` = no v2 equivalent: imported as a history-only row —
 * visible in History, never prescribed.
 */
export const V1_NAME_MAP: Record<string, string | null> = {
  "Bench Press": "hp6_bench_press",
  "Overhead Press": "vp5_barbell_ohp",
  "Incline DB Press": "hp6_alt_incline_db_press",
  "Dips": "hp6_alt_dips",
  "Tricep Pushdown": null,
  "Lateral Raise": null,
  "Pull-Ups": "vpu5_pull_up",
  "Barbell Row": "hpu5_barbell_row",
  "Lat Pulldown": "vpu3_alt_lat_pulldown",
  "Face Pull": null,
  "Barbell Curl": null,
  "Hammer Curl": null,
  "Back Squat": "sq5_back_squat",
  "Deadlift": "hg5_deadlift",
  "Romanian Deadlift": "hg4_barbell_rdl",
  "Leg Press": "sq4_alt_leg_press",
  "Leg Curl": null,
  "Standing Calf Raise": null,
};
