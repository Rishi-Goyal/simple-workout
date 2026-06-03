export type SeedExercise = {
  name: string;
  category: "push" | "pull" | "legs";
  primary_muscle: string;
  secondary_muscles: string[];
  equipment: string;
  rep_scheme: "compound" | "isolation";
  upper_body: boolean;
  description: string;
  how_to: string;
};

export const SEED_EXERCISES: SeedExercise[] = [
  // ---- Push ----
  {
    name: "Bench Press", category: "push", primary_muscle: "chest",
    secondary_muscles: ["triceps", "front_delts"], equipment: "barbell",
    rep_scheme: "compound", upper_body: true,
    description: "Flat barbell press from the chest — the classic upper-body strength lift.",
    how_to: [
      "Lie flat on the bench, eyes under the bar, feet planted.",
      "Grip slightly wider than shoulders, wrists stacked over elbows.",
      "Unrack, lower the bar to mid-chest with elbows ~45° (not flared).",
      "Press back up in a slight arc toward your face. Lock out without bouncing."
    ].join("\n")
  },
  {
    name: "Overhead Press", category: "push", primary_muscle: "front_delts",
    secondary_muscles: ["triceps", "chest"], equipment: "barbell",
    rep_scheme: "compound", upper_body: true,
    description: "Standing barbell press from the shoulders — builds shoulder and tricep strength.",
    how_to: [
      "Bar in the front rack, just above collarbone, elbows under the bar.",
      "Brace core and glutes, tuck ribs down.",
      "Press straight up; move your head back slightly so the bar travels vertically past your face.",
      "Once past your forehead, push your head through and lock out overhead."
    ].join("\n")
  },
  {
    name: "Incline DB Press", category: "push", primary_muscle: "chest",
    secondary_muscles: ["front_delts", "triceps"], equipment: "dumbbell",
    rep_scheme: "compound", upper_body: true,
    description: "Dumbbell press on an inclined bench — emphasises the upper chest.",
    how_to: [
      "Set bench to 30–45°. Sit, dumbbells on knees.",
      "Kick the bells up one at a time as you lie back.",
      "Lower until elbows are slightly below shoulder level; wrists stacked over elbows.",
      "Press up and slightly in. Don't clang the bells at the top."
    ].join("\n")
  },
  {
    name: "Dips", category: "push", primary_muscle: "chest",
    secondary_muscles: ["triceps", "front_delts"], equipment: "bodyweight",
    rep_scheme: "compound", upper_body: true,
    description: "Bodyweight press on parallel bars — heavy stimulus for chest and triceps.",
    how_to: [
      "Support yourself on parallel bars, arms straight, shoulders down.",
      "Lean forward ~30° for chest emphasis (stay upright for more triceps).",
      "Lower until shoulders are at elbow height (no deeper if shoulders complain).",
      "Press back up; squeeze the chest at the top. Add weight via belt when easy."
    ].join("\n")
  },
  {
    name: "Tricep Pushdown", category: "push", primary_muscle: "triceps",
    secondary_muscles: [], equipment: "cable",
    rep_scheme: "isolation", upper_body: true,
    description: "Cable tricep extension — isolation for the back of the arm.",
    how_to: [
      "Stand at a cable machine, rope or straight bar at upper-chest height.",
      "Elbows pinned to your sides, slight forward lean.",
      "Push the handle down until arms are fully straight; squeeze the triceps.",
      "Return under control to elbow ~90°. Don't let the elbows drift forward."
    ].join("\n")
  },
  {
    name: "Lateral Raise", category: "push", primary_muscle: "side_delts",
    secondary_muscles: [], equipment: "dumbbell",
    rep_scheme: "isolation", upper_body: true,
    description: "Dumbbell raise to the side — isolation for the side of the shoulder.",
    how_to: [
      "Stand with light dumbbells at your sides, slight bend in elbows.",
      "Raise the bells out to the sides, leading with your elbows.",
      "Stop at shoulder height; pinky slightly higher than thumb.",
      "Lower slowly. Use lighter than you think — form > load here."
    ].join("\n")
  },

  // ---- Pull ----
  {
    name: "Pull-Ups", category: "pull", primary_muscle: "lats",
    secondary_muscles: ["biceps", "upper_back"], equipment: "bodyweight",
    rep_scheme: "compound", upper_body: true,
    description: "Bodyweight pull to the bar — the king of back exercises.",
    how_to: [
      "Hang from the bar with an overhand grip, slightly wider than shoulders.",
      "Set the shoulders down and back (no shrugging).",
      "Pull your chest toward the bar, driving elbows down and back.",
      "Top: chin over bar, chest near bar. Lower under control to a full hang."
    ].join("\n")
  },
  {
    name: "Barbell Row", category: "pull", primary_muscle: "upper_back",
    secondary_muscles: ["lats", "biceps"], equipment: "barbell",
    rep_scheme: "compound", upper_body: true,
    description: "Bent-over row with a barbell — heavy mid-back builder.",
    how_to: [
      "Bar over mid-foot. Hinge at hips until torso is ~45°, knees slightly bent.",
      "Brace core. Pull the bar to your lower ribs / upper abdomen.",
      "Elbows track at ~45°. Squeeze shoulder blades together at the top.",
      "Lower under control. Keep torso angle steady — no yo-yoing."
    ].join("\n")
  },
  {
    name: "Lat Pulldown", category: "pull", primary_muscle: "lats",
    secondary_muscles: ["biceps"], equipment: "cable",
    rep_scheme: "compound", upper_body: true,
    description: "Cable pulldown — pull-up substitute, scalable from light to heavy.",
    how_to: [
      "Sit, thighs locked under the pad. Grip the bar wider than shoulders.",
      "Lean back ~15°. Pull the bar toward your upper chest.",
      "Drive elbows down and slightly back; squeeze the lats.",
      "Return the bar all the way up to full stretch on each rep."
    ].join("\n")
  },
  {
    name: "Face Pull", category: "pull", primary_muscle: "rear_delts",
    secondary_muscles: ["upper_back"], equipment: "cable",
    rep_scheme: "isolation", upper_body: true,
    description: "High-cable rope pull to the face — rear-delt and shoulder-health work.",
    how_to: [
      "Cable at upper-chest/face height, rope attachment.",
      "Step back, arms straight, palms facing each other.",
      "Pull the rope toward your forehead, hands flaring out — like a double bicep pose.",
      "Squeeze rear delts and upper back. Go light, high reps (12–20)."
    ].join("\n")
  },
  {
    name: "Barbell Curl", category: "pull", primary_muscle: "biceps",
    secondary_muscles: [], equipment: "barbell",
    rep_scheme: "isolation", upper_body: true,
    description: "Standing barbell curl — staple bicep mass builder.",
    how_to: [
      "Stand with feet hip-width, bar in front, shoulder-width grip, palms up.",
      "Elbows pinned at your sides, ribs down.",
      "Curl the bar up by flexing the biceps; don't swing.",
      "Lower fully. A little body english at the end is fine, not at the start."
    ].join("\n")
  },
  {
    name: "Hammer Curl", category: "pull", primary_muscle: "biceps",
    secondary_muscles: ["forearms"], equipment: "dumbbell",
    rep_scheme: "isolation", upper_body: true,
    description: "Neutral-grip dumbbell curl — hits the brachialis and forearms.",
    how_to: [
      "Stand with dumbbells at your sides, palms facing in (thumbs up).",
      "Curl one or both up while keeping wrists neutral (don't rotate).",
      "Squeeze at the top, elbows stay still.",
      "Lower under control."
    ].join("\n")
  },

  // ---- Legs ----
  {
    name: "Back Squat", category: "legs", primary_muscle: "quads",
    secondary_muscles: ["glutes", "hamstrings"], equipment: "barbell",
    rep_scheme: "compound", upper_body: false,
    description: "Barbell squat with the bar across the upper back — the foundational lower-body lift.",
    how_to: [
      "Set the bar in a rack at upper-chest height. Step under and place it across the meaty part of your upper back (not on your neck).",
      "Grip the bar tight, elbows down, chest up. Unrack and take 2–3 steps back.",
      "Stance about shoulder-width, toes slightly out. Brace your core.",
      "Sit down and back — knees track over toes — until thighs are at least parallel to the floor.",
      "Drive through the whole foot to stand up. Keep your chest up; don't let your knees cave in."
    ].join("\n")
  },
  {
    name: "Deadlift", category: "legs", primary_muscle: "hamstrings",
    secondary_muscles: ["glutes", "upper_back"], equipment: "barbell",
    rep_scheme: "compound", upper_body: false,
    description: "Pull a loaded barbell from the floor to a standing position — full posterior chain.",
    how_to: [
      "Bar over mid-foot. Stance hip-width, toes forward.",
      "Hinge at the hips and grip the bar just outside your knees.",
      "Squeeze chest up so the back is flat; engage lats (think 'protect your armpits').",
      "Push the floor away — bar drags up your shins. Stand tall, locking hips and knees together.",
      "Lower by pushing the hips back first, then bending the knees once the bar passes them."
    ].join("\n")
  },
  {
    name: "Romanian Deadlift", category: "legs", primary_muscle: "hamstrings",
    secondary_muscles: ["glutes"], equipment: "barbell",
    rep_scheme: "compound", upper_body: false,
    description: "Top-down hip hinge — targets hamstrings and glutes without the floor reset.",
    how_to: [
      "Start standing with the bar at hip height. Soft bend in the knees, knees stay there.",
      "Push your hips back, sliding the bar down your thighs.",
      "Go until you feel a deep hamstring stretch (usually just below the knees).",
      "Stand back up by driving the hips forward, squeezing glutes at the top.",
      "Back stays flat the whole time — no rounding."
    ].join("\n")
  },
  {
    name: "Leg Press", category: "legs", primary_muscle: "quads",
    secondary_muscles: ["glutes"], equipment: "machine",
    rep_scheme: "compound", upper_body: false,
    description: "Seated machine press for the legs — heavy quad/glute work with low spinal load.",
    how_to: [
      "Sit, back flat against the pad. Feet shoulder-width, mid-platform.",
      "Unlock the safeties. Lower under control until knees are ~90°.",
      "Press through the whole foot to extend — don't lock the knees out hard.",
      "Higher foot position = more glutes/hams; lower = more quads."
    ].join("\n")
  },
  {
    name: "Leg Curl", category: "legs", primary_muscle: "hamstrings",
    secondary_muscles: [], equipment: "machine",
    rep_scheme: "isolation", upper_body: false,
    description: "Machine hamstring curl — isolation for the back of the legs.",
    how_to: [
      "Seated or lying — adjust the pad above your heels.",
      "Curl the heels toward your butt, squeezing hamstrings.",
      "Pause briefly, return slowly to a long stretch.",
      "Don't slam the stack on the way down."
    ].join("\n")
  },
  {
    name: "Standing Calf Raise", category: "legs", primary_muscle: "calves",
    secondary_muscles: [], equipment: "machine",
    rep_scheme: "isolation", upper_body: false,
    description: "Calf raise with weight — straight-knee version emphasises the gastrocnemius.",
    how_to: [
      "Balls of feet on the platform, heels free to drop.",
      "Drop into a deep stretch at the bottom.",
      "Press up onto your toes as high as possible; pause at the top.",
      "Slow controlled tempo — calves respond to time under tension."
    ].join("\n")
  }
];
