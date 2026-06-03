export type SeedExercise = {
  name: string;
  category: "push" | "pull" | "legs";
  primary_muscle: string;
  secondary_muscles: string[];
  equipment: string;
  rep_scheme: "compound" | "isolation";
  upper_body: boolean;
};

export const SEED_EXERCISES: SeedExercise[] = [
  // ---- Push ----
  { name: "Bench Press",         category: "push", primary_muscle: "chest",       secondary_muscles: ["triceps", "front_delts"], equipment: "barbell", rep_scheme: "compound",  upper_body: true },
  { name: "Overhead Press",      category: "push", primary_muscle: "front_delts", secondary_muscles: ["triceps", "chest"],       equipment: "barbell", rep_scheme: "compound",  upper_body: true },
  { name: "Incline DB Press",    category: "push", primary_muscle: "chest",       secondary_muscles: ["front_delts", "triceps"], equipment: "dumbbell", rep_scheme: "compound", upper_body: true },
  { name: "Dips",                category: "push", primary_muscle: "chest",       secondary_muscles: ["triceps", "front_delts"], equipment: "bodyweight", rep_scheme: "compound", upper_body: true },
  { name: "Tricep Pushdown",     category: "push", primary_muscle: "triceps",     secondary_muscles: [],                          equipment: "cable",   rep_scheme: "isolation", upper_body: true },
  { name: "Lateral Raise",       category: "push", primary_muscle: "side_delts",  secondary_muscles: [],                          equipment: "dumbbell", rep_scheme: "isolation", upper_body: true },

  // ---- Pull ----
  { name: "Pull-Ups",            category: "pull", primary_muscle: "lats",        secondary_muscles: ["biceps", "upper_back"],   equipment: "bodyweight", rep_scheme: "compound", upper_body: true },
  { name: "Barbell Row",         category: "pull", primary_muscle: "upper_back",  secondary_muscles: ["lats", "biceps"],          equipment: "barbell", rep_scheme: "compound",  upper_body: true },
  { name: "Lat Pulldown",        category: "pull", primary_muscle: "lats",        secondary_muscles: ["biceps"],                  equipment: "cable",   rep_scheme: "compound",  upper_body: true },
  { name: "Face Pull",           category: "pull", primary_muscle: "rear_delts",  secondary_muscles: ["upper_back"],              equipment: "cable",   rep_scheme: "isolation", upper_body: true },
  { name: "Barbell Curl",        category: "pull", primary_muscle: "biceps",      secondary_muscles: [],                          equipment: "barbell", rep_scheme: "isolation", upper_body: true },
  { name: "Hammer Curl",         category: "pull", primary_muscle: "biceps",      secondary_muscles: ["forearms"],                equipment: "dumbbell", rep_scheme: "isolation", upper_body: true },

  // ---- Legs ----
  { name: "Back Squat",          category: "legs", primary_muscle: "quads",       secondary_muscles: ["glutes", "hamstrings"],   equipment: "barbell", rep_scheme: "compound",  upper_body: false },
  { name: "Deadlift",            category: "legs", primary_muscle: "hamstrings",  secondary_muscles: ["glutes", "upper_back"],   equipment: "barbell", rep_scheme: "compound",  upper_body: false },
  { name: "Romanian Deadlift",   category: "legs", primary_muscle: "hamstrings",  secondary_muscles: ["glutes"],                  equipment: "barbell", rep_scheme: "compound",  upper_body: false },
  { name: "Leg Press",           category: "legs", primary_muscle: "quads",       secondary_muscles: ["glutes"],                  equipment: "machine", rep_scheme: "compound",  upper_body: false },
  { name: "Leg Curl",            category: "legs", primary_muscle: "hamstrings",  secondary_muscles: [],                          equipment: "machine", rep_scheme: "isolation", upper_body: false },
  { name: "Standing Calf Raise", category: "legs", primary_muscle: "calves",      secondary_muscles: [],                          equipment: "machine", rep_scheme: "isolation", upper_body: false }
];
