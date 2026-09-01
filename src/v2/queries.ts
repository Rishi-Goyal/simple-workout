/**
 * v2 DB access — thin typed wrappers over the v2_* tables.
 * All logic lives in engine.ts; this file only reads and writes rows.
 */
import { all, lastInsertId, notifyChange, one, run } from "../db/client";
import { localDateIso } from "../lib/dates";
import { LADDERS, type DayType, type PatternId } from "./ladders";
import {
  computeStreaks,
  getExerciseV2,
  hitTopOfRange,
  type EquipTier,
  type SessionSetLog
} from "./engine";

// ---------- prefs ----------

const PREF_DEFAULTS = {
  onboarded: "0",
  equipment: "nothing" as EquipTier,
  rest_seconds: "90",
  warmup_first: "1",
  vibrate: "1"
};
type PrefKey = keyof typeof PREF_DEFAULTS;

export function getPref(key: PrefKey): string {
  const row = one<{ value: string }>("SELECT value FROM v2_prefs WHERE key = ?", [key]);
  return row?.value ?? PREF_DEFAULTS[key];
}

export function setPref(key: PrefKey, value: string): void {
  run("INSERT INTO v2_prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, value]);
  notifyChange();
}

export function getEquipTier(): EquipTier {
  const v = getPref("equipment");
  return v === "dumbbells" || v === "full_gym" ? v : "nothing";
}

// ---------- ladder levels ----------

export function getLevels(): Record<PatternId, number> {
  const rows = all<{ pattern: PatternId; rung: number }>("SELECT pattern, rung FROM v2_levels");
  const levels = Object.fromEntries(LADDERS.map((l) => [l.pattern, l.startRung])) as Record<PatternId, number>;
  for (const r of rows) levels[r.pattern] = r.rung;
  return levels;
}

export function setLevel(pattern: PatternId, rung: number): void {
  run(
    `INSERT INTO v2_levels (pattern, rung, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(pattern) DO UPDATE SET rung = excluded.rung, updated_at = excluded.updated_at`,
    [pattern, rung, new Date().toISOString()]
  );
  notifyChange();
}

// ---------- working weights (loaded rungs) ----------

export function getWeight(exerciseId: string): number | null {
  const ex = getExerciseV2(exerciseId);
  if (!ex || ex.load !== "loaded") return null;
  const row = one<{ weight_kg: number }>("SELECT weight_kg FROM v2_weights WHERE exercise_id = ?", [exerciseId]);
  return row?.weight_kg ?? ex.startWeightKg ?? 10;
}

export function setWeight(exerciseId: string, weightKg: number): void {
  run(
    `INSERT INTO v2_weights (exercise_id, weight_kg, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(exercise_id) DO UPDATE SET weight_kg = excluded.weight_kg, updated_at = excluded.updated_at`,
    [exerciseId, weightKg, new Date().toISOString()]
  );
}

// ---------- sessions ----------

export type SessionRow = {
  id: number;
  date: string;
  day_type: DayType;
  started_at: string | null;
  finished_at: string | null;
  duration_min: number | null;
  level_ups_json: string;
  source: string;
};

export type SessionItemRow = {
  session_id: number;
  position: number;
  exercise_id: string;
  outcome: string;
};

export function createSession(day: DayType, exerciseIds: string[]): number {
  run("INSERT INTO v2_sessions (date, day_type, started_at) VALUES (?, ?, ?)", [
    localDateIso(),
    day,
    new Date().toISOString()
  ]);
  const id = lastInsertId();
  exerciseIds.forEach((eid, i) => {
    run("INSERT INTO v2_session_items (session_id, position, exercise_id) VALUES (?, ?, ?)", [id, i, eid]);
  });
  notifyChange();
  return id;
}

export function getSession(id: number): SessionRow | undefined {
  return one<SessionRow>("SELECT * FROM v2_sessions WHERE id = ?", [id]);
}

export function sessionItems(sessionId: number): SessionItemRow[] {
  return all<SessionItemRow>(
    "SELECT * FROM v2_session_items WHERE session_id = ? ORDER BY position",
    [sessionId]
  );
}

export function setItemExercise(sessionId: number, position: number, exerciseId: string, outcome: string): void {
  run("UPDATE v2_session_items SET exercise_id = ?, outcome = ? WHERE session_id = ? AND position = ?", [
    exerciseId,
    outcome,
    sessionId,
    position
  ]);
  notifyChange();
}

export function setItemOutcome(sessionId: number, position: number, outcome: string): void {
  run("UPDATE v2_session_items SET outcome = ? WHERE session_id = ? AND position = ?", [outcome, sessionId, position]);
  notifyChange();
}

export function logSetV2(sessionId: number, exerciseId: string, setNumber: number, value: number, weightKg: number | null): void {
  run(
    "INSERT INTO v2_sets (session_id, exercise_id, set_number, value, weight_kg, completed_at) VALUES (?, ?, ?, ?, ?, ?)",
    [sessionId, exerciseId, setNumber, value, weightKg, new Date().toISOString()]
  );
  notifyChange();
}

export function clearSetsFor(sessionId: number, exerciseId: string): void {
  run("DELETE FROM v2_sets WHERE session_id = ? AND exercise_id = ?", [sessionId, exerciseId]);
  notifyChange();
}

export function setsFor(sessionId: number, exerciseId: string): SessionSetLog[] {
  return all<{ value: number; weight_kg: number | null }>(
    "SELECT value, weight_kg FROM v2_sets WHERE session_id = ? AND exercise_id = ? ORDER BY set_number",
    [sessionId, exerciseId]
  ).map((r) => ({ value: r.value, weightKg: r.weight_kg }));
}

export function setCount(sessionId: number): number {
  const r = one<{ n: number }>("SELECT COUNT(*) AS n FROM v2_sets WHERE session_id = ?", [sessionId]);
  return Number(r?.n ?? 0);
}

export function finishSession(id: number, durationMin: number, levelUps: { pattern: PatternId; fromName: string; toName: string }[]): void {
  run("UPDATE v2_sessions SET finished_at = ?, duration_min = ?, level_ups_json = ? WHERE id = ?", [
    new Date().toISOString(),
    durationMin,
    JSON.stringify(levelUps),
    id
  ]);
  notifyChange();
}

export function discardSession(id: number): void {
  run("DELETE FROM v2_sessions WHERE id = ?", [id]);
  notifyChange();
}

export function unfinishedSession(): SessionRow | undefined {
  return one<SessionRow>(
    "SELECT * FROM v2_sessions WHERE finished_at IS NULL ORDER BY id DESC LIMIT 1"
  );
}

export function finishedSessions(): SessionRow[] {
  return all<SessionRow>("SELECT * FROM v2_sessions WHERE finished_at IS NOT NULL ORDER BY date DESC, id DESC");
}

export function lastFinishedSession(): SessionRow | undefined {
  return finishedSessions()[0];
}

// ---------- derived ----------

export function streaks(): { current: number; best: number } {
  return computeStreaks(finishedSessions().map((s) => s.date), localDateIso());
}

/**
 * How many consecutive finished sessions immediately before this one hit the
 * top of the range for `exerciseId` (for top_of_range(N) graduation).
 */
export function previousTopStreak(exerciseId: string, beforeSessionId: number): number {
  const ex = getExerciseV2(exerciseId);
  if (!ex) return 0;
  const sessions = all<{ id: number }>(
    `SELECT DISTINCT s.id FROM v2_sessions s
       JOIN v2_sets t ON t.session_id = s.id AND t.exercise_id = ?
      WHERE s.finished_at IS NOT NULL AND s.id < ?
      ORDER BY s.id DESC`,
    [exerciseId, beforeSessionId]
  );
  let streak = 0;
  for (const s of sessions) {
    if (hitTopOfRange(ex, setsFor(s.id, exerciseId))) streak++;
    else break;
  }
  return streak;
}

export type HistoryEntry = {
  id: number;
  date: string;
  day: DayType;
  minutes: number;
  names: string;
  leveledUp: boolean;
};

export function historyEntries(): HistoryEntry[] {
  return finishedSessions().map((s) => {
    const items = sessionItems(s.id);
    const names = items
      .filter((i) => i.outcome !== "skipped")
      .map((i) => getExerciseV2(i.exercise_id)?.name ?? i.exercise_id)
      .join(", ");
    return {
      id: s.id,
      date: s.date,
      day: s.day_type,
      minutes: s.duration_min ?? 0,
      names,
      leveledUp: JSON.parse(s.level_ups_json || "[]").length > 0
    };
  });
}

/** Patterns promoted in the most recent finished session (Progress "New" badge). */
export function recentPromotions(): Set<PatternId> {
  const last = lastFinishedSession();
  if (!last) return new Set();
  const ups = JSON.parse(last.level_ups_json || "[]") as { pattern: PatternId }[];
  return new Set(ups.map((u) => u.pattern));
}
