import { all, notifyChange, run, type Row, type SqlValue } from "./client";

// 1: original tables · 2: + v2_* tables · 3: + v2_rewards
export const BACKUP_VERSION = 3;

// Parents first so restore inserts satisfy FKs; deletes run in reverse.
const TABLE_ORDER = [
  "exercises",
  "warmups",
  "workouts",
  "workout_exercises",
  "workout_sets",
  "muscle_strength_snapshot",
  "warmup_completions",
  // v2 (movement-ladder model) — absent from version-1 backups
  "v2_levels",
  "v2_sessions",
  "v2_session_items",
  "v2_sets",
  "v2_prefs",
  "v2_weights",
  "v2_rewards"
] as const;

/** Tables a version-1 payload doesn't have; restored as empty. */
const V2_TABLES = new Set<string>([
  "v2_levels",
  "v2_sessions",
  "v2_session_items",
  "v2_sets",
  "v2_prefs",
  "v2_weights",
  "v2_rewards"
]);

/** Backup version each late-added table first appeared in; older payloads lack it. */
const TABLE_SINCE_VERSION: Partial<Record<string, number>> = { v2_rewards: 3 };

type TableName = (typeof TABLE_ORDER)[number];

// Deterministic export order per table. The v2 tables keyed by natural keys
// have no `id` column — SQLite does not alias it to rowid, so `ORDER BY id`
// fails at prepare time and every export used to throw.
const TABLE_ORDER_BY: Record<TableName, string> = {
  exercises: "id",
  warmups: "id",
  workouts: "id",
  workout_exercises: "id",
  workout_sets: "id",
  muscle_strength_snapshot: "id",
  warmup_completions: "id",
  v2_levels: "pattern",
  v2_sessions: "id",
  v2_session_items: "session_id, position",
  v2_sets: "id",
  v2_prefs: "key",
  v2_weights: "exercise_id",
  v2_rewards: "session_id"
};

// Known columns per table (mirrors schema.ts). Backups from a newer app
// version may carry extra columns — those are dropped on import.
const TABLE_COLUMNS: Record<TableName, string[]> = {
  exercises: [
    "id", "name", "category", "primary_muscle", "secondary_muscles_json",
    "equipment", "rep_scheme", "is_compound", "upper_body", "is_custom",
    "archived", "description", "how_to"
  ],
  warmups: ["id", "name", "day_type", "description", "how_to", "archived"],
  workouts: ["id", "date", "day_type", "notes", "finished_at"],
  workout_exercises: ["id", "workout_id", "exercise_id", "position"],
  workout_sets: [
    "id", "workout_id", "exercise_id", "set_number", "weight_kg",
    "reps", "rpe", "completed_at"
  ],
  muscle_strength_snapshot: [
    "id", "muscle", "est_1rm_kg", "source_set_id", "recorded_at"
  ],
  warmup_completions: ["id", "workout_id", "warmup_id", "completed_at"],
  v2_levels: ["pattern", "rung", "updated_at"],
  v2_sessions: [
    "id", "date", "day_type", "started_at", "finished_at", "duration_min",
    "level_ups_json", "source"
  ],
  v2_session_items: ["session_id", "position", "exercise_id", "outcome"],
  v2_sets: [
    "id", "session_id", "exercise_id", "set_number", "value", "weight_kg",
    "completed_at"
  ],
  v2_prefs: ["key", "value"],
  v2_weights: ["exercise_id", "weight_kg", "updated_at"],
  v2_rewards: [
    "session_id", "grant_key", "hourglasses", "breakdown_json", "created_at",
    "synced_at"
  ]
};

export interface BackupPayloadV1 {
  version: 1 | 2 | 3;
  exported_at: string;
  tables: Record<TableName, Row[]>;
}

export function exportBackup(): BackupPayloadV1 {
  const tables = {} as Record<TableName, Row[]>;
  for (const table of TABLE_ORDER) {
    tables[table] = all(`SELECT * FROM ${table} ORDER BY ${TABLE_ORDER_BY[table]}`);
  }
  return {
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    tables
  };
}

// Replaces ALL local data with the backup. Rows keep their original ids, so
// FK references survive intact; sqlite_sequence auto-bumps past explicit ids,
// so later inserts can't collide.
export function importBackup(payload: BackupPayloadV1): void {
  if (payload?.version !== 1 && payload?.version !== 2 && payload?.version !== 3) {
    throw new Error("Unsupported backup format (expected version 1, 2 or 3).");
  }
  for (const table of TABLE_ORDER) {
    if (!Array.isArray(payload.tables?.[table])) {
      // Older payloads predate some tables — treat those as empty. A payload
      // new enough to contain the table must actually contain it.
      const since = TABLE_SINCE_VERSION[table] ?? (V2_TABLES.has(table) ? 2 : 1);
      if (payload.version < since) {
        payload.tables[table] = [];
        continue;
      }
      throw new Error(`Backup is missing table "${table}".`);
    }
  }

  run("BEGIN");
  try {
    for (const table of [...TABLE_ORDER].reverse()) {
      run(`DELETE FROM ${table}`);
    }
    for (const table of TABLE_ORDER) {
      const allowed = TABLE_COLUMNS[table];
      for (const row of payload.tables[table]) {
        const cols = allowed.filter((c) => c in row);
        if (cols.length === 0) continue;
        const placeholders = cols.map(() => "?").join(", ");
        const values: SqlValue[] = cols.map((c) => row[c] ?? null);
        run(
          `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`,
          values
        );
      }
    }
    run("COMMIT");
  } catch (err) {
    run("ROLLBACK");
    throw err;
  }
  notifyChange();
}
