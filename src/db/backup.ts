import { all, notifyChange, run, type Row, type SqlValue } from "./client";

export const BACKUP_VERSION = 1;

// Parents first so restore inserts satisfy FKs; deletes run in reverse.
const TABLE_ORDER = [
  "exercises",
  "warmups",
  "workouts",
  "workout_exercises",
  "workout_sets",
  "muscle_strength_snapshot",
  "warmup_completions"
] as const;

type TableName = (typeof TABLE_ORDER)[number];

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
  warmup_completions: ["id", "workout_id", "warmup_id", "completed_at"]
};

export interface BackupPayloadV1 {
  version: 1;
  exported_at: string;
  tables: Record<TableName, Row[]>;
}

export function exportBackup(): BackupPayloadV1 {
  const tables = {} as Record<TableName, Row[]>;
  for (const table of TABLE_ORDER) {
    tables[table] = all(`SELECT * FROM ${table} ORDER BY id`);
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
  if (payload?.version !== 1) {
    throw new Error("Unsupported backup format (expected version 1).");
  }
  for (const table of TABLE_ORDER) {
    if (!Array.isArray(payload.tables?.[table])) {
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
