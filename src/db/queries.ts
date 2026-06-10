import { all, one, run, lastInsertId, notifyChange, type Row } from "./client";

export type DayType = "push" | "pull" | "legs";

export type Exercise = {
  id: number;
  name: string;
  category: DayType;
  primary_muscle: string;
  secondary_muscles: string[];
  equipment: string;
  rep_scheme: "compound" | "isolation";
  is_compound: number;
  upper_body: number;
  is_custom: number;
  archived: number;
  description: string;
  how_to: string;
};

function hydrateExercise(r: Row): Exercise {
  return {
    ...(r as any),
    secondary_muscles: JSON.parse((r.secondary_muscles_json as string) ?? "[]")
  };
}

export function listExercises(category?: DayType): Exercise[] {
  const rows = category
    ? all("SELECT * FROM exercises WHERE archived = 0 AND category = ? ORDER BY name", [category])
    : all("SELECT * FROM exercises WHERE archived = 0 ORDER BY category, name");
  return rows.map(hydrateExercise);
}

export function getExercise(id: number): Exercise | undefined {
  const r = one("SELECT * FROM exercises WHERE id = ?", [id]);
  return r ? hydrateExercise(r) : undefined;
}

export function addCustomExercise(input: {
  name: string;
  category: DayType;
  primary_muscle: string;
  secondary_muscles: string[];
  equipment: string;
  rep_scheme: "compound" | "isolation";
  upper_body: boolean;
  description?: string;
  how_to?: string;
}): number {
  run(
    `INSERT INTO exercises
      (name, category, primary_muscle, secondary_muscles_json,
       equipment, rep_scheme, is_compound, upper_body, is_custom,
       description, how_to)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      input.name,
      input.category,
      input.primary_muscle,
      JSON.stringify(input.secondary_muscles),
      input.equipment,
      input.rep_scheme,
      input.rep_scheme === "compound" ? 1 : 0,
      input.upper_body ? 1 : 0,
      input.description ?? "",
      input.how_to ?? ""
    ]
  );
  const id = lastInsertId();
  notifyChange();
  return id;
}

export function archiveExercise(id: number) {
  run("UPDATE exercises SET archived = 1 WHERE id = ?", [id]);
  notifyChange();
}

// ---------- workouts ----------

export type Workout = {
  id: number;
  date: string;
  day_type: DayType;
  notes: string | null;
  finished_at: string | null;
};

export function createWorkout(day_type: DayType, exerciseIds: number[]): number {
  const today = new Date().toISOString().slice(0, 10);
  run("INSERT INTO workouts (date, day_type) VALUES (?, ?)", [today, day_type]);
  const id = lastInsertId();
  exerciseIds.forEach((eid, i) => {
    run(
      "INSERT INTO workout_exercises (workout_id, exercise_id, position) VALUES (?, ?, ?)",
      [id, eid, i]
    );
  });
  notifyChange();
  return id;
}

export function exercisesForWorkout(workout_id: number): number[] {
  return all<{ exercise_id: number }>(
    "SELECT exercise_id FROM workout_exercises WHERE workout_id = ? ORDER BY position",
    [workout_id]
  ).map((r) => r.exercise_id);
}

export function unfinishedWorkouts(): Workout[] {
  return all<Workout>(
    "SELECT * FROM workouts WHERE finished_at IS NULL ORDER BY id DESC"
  );
}

export function discardWorkout(id: number) {
  // workout_exercises, workout_sets and warmup_completions cascade away.
  run("DELETE FROM workouts WHERE id = ?", [id]);
  notifyChange();
}

export function getWorkout(id: number): Workout | undefined {
  return one<Workout>("SELECT * FROM workouts WHERE id = ?", [id]);
}

export function finishWorkout(id: number) {
  run("UPDATE workouts SET finished_at = ? WHERE id = ?", [new Date().toISOString(), id]);
  notifyChange();
}

export function listWorkouts(limit = 50): Workout[] {
  return all<Workout>("SELECT * FROM workouts ORDER BY date DESC, id DESC LIMIT ?", [limit]);
}

export function lastWorkoutOfType(day_type: DayType): Workout | undefined {
  return one<Workout>(
    "SELECT * FROM workouts WHERE day_type = ? ORDER BY date DESC, id DESC LIMIT 1",
    [day_type]
  );
}

// ---------- sets ----------

export type WorkoutSet = {
  id: number;
  workout_id: number;
  exercise_id: number;
  set_number: number;
  weight_kg: number;
  reps: number;
  rpe: number | null;
  completed_at: string;
};

export function logSet(input: {
  workout_id: number;
  exercise_id: number;
  set_number: number;
  weight_kg: number;
  reps: number;
  rpe?: number | null;
}): number {
  run(
    `INSERT INTO workout_sets
      (workout_id, exercise_id, set_number, weight_kg, reps, rpe, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.workout_id,
      input.exercise_id,
      input.set_number,
      input.weight_kg,
      input.reps,
      input.rpe ?? null,
      new Date().toISOString()
    ]
  );
  const id = lastInsertId();
  notifyChange();
  return id;
}

export function updateSet(input: {
  set_id: number;
  weight_kg: number;
  reps: number;
}) {
  run(
    "UPDATE workout_sets SET weight_kg = ?, reps = ? WHERE id = ?",
    [input.weight_kg, input.reps, input.set_id]
  );
  notifyChange();
}

export function deleteSet(set_id: number) {
  // Strength snapshots referencing this set cascade away via FK ON DELETE CASCADE.
  run("DELETE FROM workout_sets WHERE id = ?", [set_id]);
  notifyChange();
}

export function setsForWorkout(workout_id: number): WorkoutSet[] {
  return all<WorkoutSet>(
    "SELECT * FROM workout_sets WHERE workout_id = ? ORDER BY set_number, id",
    [workout_id]
  );
}

export function setsForExerciseInWorkout(workout_id: number, exercise_id: number): WorkoutSet[] {
  return all<WorkoutSet>(
    "SELECT * FROM workout_sets WHERE workout_id = ? AND exercise_id = ? ORDER BY set_number, id",
    [workout_id, exercise_id]
  );
}

export function lastSessionSets(exercise_id: number, before_workout_id: number): WorkoutSet[] {
  // Most recent workout (other than the current one) that contained this exercise.
  const prev = one<{ workout_id: number }>(
    `SELECT workout_id FROM workout_sets
       WHERE exercise_id = ? AND workout_id <> ?
       ORDER BY completed_at DESC LIMIT 1`,
    [exercise_id, before_workout_id]
  );
  if (!prev) return [];
  return all<WorkoutSet>(
    `SELECT * FROM workout_sets
       WHERE exercise_id = ? AND workout_id = ?
       ORDER BY set_number, id`,
    [exercise_id, prev.workout_id]
  );
}

export function daysSinceLastPerformed(exercise_id: number): number | null {
  const r = one<{ last_at: string }>(
    "SELECT MAX(completed_at) AS last_at FROM workout_sets WHERE exercise_id = ?",
    [exercise_id]
  );
  if (!r?.last_at) return null;
  const diffMs = Date.now() - new Date(r.last_at).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ---------- strength snapshots ----------

export type StrengthSnapshot = {
  id: number;
  muscle: string;
  est_1rm_kg: number;
  source_set_id: number;
  recorded_at: string;
};

export function bestEst1RM(muscle: string): number {
  const r = one<{ best: number }>(
    "SELECT MAX(est_1rm_kg) AS best FROM muscle_strength_snapshot WHERE muscle = ?",
    [muscle]
  );
  return Number(r?.best ?? 0);
}

export function insertStrengthSnapshot(input: {
  muscle: string;
  est_1rm_kg: number;
  source_set_id: number;
}) {
  run(
    `INSERT INTO muscle_strength_snapshot (muscle, est_1rm_kg, source_set_id, recorded_at)
     VALUES (?, ?, ?, ?)`,
    [input.muscle, input.est_1rm_kg, input.source_set_id, new Date().toISOString()]
  );
  notifyChange();
}

export function snapshotsForMuscle(muscle: string): StrengthSnapshot[] {
  return all<StrengthSnapshot>(
    "SELECT * FROM muscle_strength_snapshot WHERE muscle = ? ORDER BY recorded_at",
    [muscle]
  );
}

// ---------- warmups ----------

export type Warmup = {
  id: number;
  name: string;
  day_type: DayType;
  description: string;
  how_to: string;
  archived: number;
};

export function listWarmups(day_type: DayType): Warmup[] {
  return all<Warmup>(
    "SELECT * FROM warmups WHERE archived = 0 AND day_type = ? ORDER BY name",
    [day_type]
  );
}

export function getWarmup(id: number): Warmup | undefined {
  return one<Warmup>("SELECT * FROM warmups WHERE id = ?", [id]);
}

export function daysSinceLastWarmup(warmup_id: number): number | null {
  const r = one<{ last_at: string }>(
    "SELECT MAX(completed_at) AS last_at FROM warmup_completions WHERE warmup_id = ?",
    [warmup_id]
  );
  if (!r?.last_at) return null;
  const diffMs = Date.now() - new Date(r.last_at).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function logWarmupCompletion(workout_id: number, warmup_id: number) {
  run(
    "INSERT INTO warmup_completions (workout_id, warmup_id, completed_at) VALUES (?, ?, ?)",
    [workout_id, warmup_id, new Date().toISOString()]
  );
  notifyChange();
}

export function countWarmupCompletions(workout_id: number): number {
  const r = one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM warmup_completions WHERE workout_id = ?",
    [workout_id]
  );
  return Number(r?.n ?? 0);
}

export function allCurrentBests(): { muscle: string; est_1rm_kg: number; recorded_at: string }[] {
  return all(
    `SELECT muscle, MAX(est_1rm_kg) AS est_1rm_kg, MAX(recorded_at) AS recorded_at
       FROM muscle_strength_snapshot GROUP BY muscle ORDER BY muscle`
  ) as any;
}
