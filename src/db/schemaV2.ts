/**
 * v2 tables — movement-ladder model (OVERHAUL_PLAN.md). They live in the same
 * SQLite file as the v1 tables so the one-time history importer can read the
 * old rows in place; nothing here touches v1.
 *
 * Exercise ids are the stable string ids from src/v2/ladders.ts (the seed is
 * the catalog — there is no exercises table in v2).
 */
export const SCHEMA_V2_SQL = `
CREATE TABLE IF NOT EXISTS v2_levels (
  pattern TEXT PRIMARY KEY,
  rung INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS v2_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,              -- local calendar day
  day_type TEXT NOT NULL CHECK (day_type IN ('push','pull','legs')),
  started_at TEXT,
  finished_at TEXT,
  duration_min INTEGER,
  level_ups_json TEXT NOT NULL DEFAULT '[]',  -- [{pattern, fromName, toName}]
  source TEXT NOT NULL DEFAULT 'v2'           -- 'v2' | 'v1' (imported)
);

CREATE TABLE IF NOT EXISTS v2_session_items (
  session_id INTEGER NOT NULL REFERENCES v2_sessions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  exercise_id TEXT NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'pending',  -- pending | done | swapped_down | skipped
  PRIMARY KEY (session_id, position)
);

CREATE TABLE IF NOT EXISTS v2_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES v2_sessions(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  value INTEGER NOT NULL,          -- reps, or seconds for timed holds
  weight_kg REAL,                  -- NULL for bodyweight rungs
  completed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_v2_sets_session ON v2_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_v2_sets_exercise ON v2_sets(exercise_id, completed_at);

CREATE TABLE IF NOT EXISTS v2_prefs (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS v2_weights (
  exercise_id TEXT PRIMARY KEY,    -- current working weight for loaded rungs
  weight_kg REAL NOT NULL,
  updated_at TEXT NOT NULL
);
`;
