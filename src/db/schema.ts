export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('push','pull','legs')),
  primary_muscle TEXT NOT NULL,
  secondary_muscles_json TEXT NOT NULL DEFAULT '[]',
  equipment TEXT NOT NULL DEFAULT 'barbell',
  rep_scheme TEXT NOT NULL DEFAULT 'compound', -- compound | isolation
  is_compound INTEGER NOT NULL DEFAULT 1,
  upper_body INTEGER NOT NULL DEFAULT 1,
  is_custom INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  how_to TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  day_type TEXT NOT NULL CHECK (day_type IN ('push','pull','legs')),
  notes TEXT,
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS workout_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  set_number INTEGER NOT NULL,
  weight_kg REAL NOT NULL,
  reps INTEGER NOT NULL,
  rpe REAL,
  completed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sets_exercise ON workout_sets(exercise_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_sets_workout  ON workout_sets(workout_id);

CREATE TABLE IF NOT EXISTS muscle_strength_snapshot (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  muscle TEXT NOT NULL,
  est_1rm_kg REAL NOT NULL,
  source_set_id INTEGER NOT NULL REFERENCES workout_sets(id) ON DELETE CASCADE,
  recorded_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_strength_muscle ON muscle_strength_snapshot(muscle, recorded_at);
`;
