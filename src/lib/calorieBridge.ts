import { one } from "../db/client";
import { getWorkout } from "../db/queries";

/**
 * Publishes a summary of a finished workout into the shared same-origin
 * IndexedDB database `fitness-bridge` (store `workouts`). The calorie counter
 * PWA (rishi-goyal.github.io/my-calorie-counter) reads this database and
 * credits the workout as exercise toward that day's calorie budget.
 *
 * Record shape consumed by the calorie counter:
 *   { id, date: 'YYYY-MM-DD', endedAt: epoch-ms, type: 'strength', minutes }
 *
 * Fire-and-forget: any failure is swallowed — the bridge must never affect
 * the workout flow.
 */

const BRIDGE_DB = "fitness-bridge";
const BRIDGE_STORE = "workouts";
const FALLBACK_MINUTES = 45;

function firstActivityAt(workoutId: number): string | null {
  const row = one<{ first_at: string | null }>(
    `SELECT MIN(first_at) AS first_at FROM (
       SELECT MIN(completed_at) AS first_at FROM workout_sets WHERE workout_id = ?
       UNION ALL
       SELECT MIN(completed_at) AS first_at FROM warmup_completions WHERE workout_id = ?
     )`,
    [workoutId, workoutId]
  );
  return row?.first_at ?? null;
}

function putRecord(record: {
  id: number;
  date: string;
  endedAt: number;
  type: string;
  minutes: number;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BRIDGE_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(BRIDGE_STORE)) {
        req.result.createObjectStore(BRIDGE_STORE, { keyPath: "id" });
      }
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(BRIDGE_STORE, "readwrite");
      tx.objectStore(BRIDGE_STORE).put(record);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
  });
}

export async function publishWorkoutToBridge(workoutId: number): Promise<void> {
  try {
    const workout = getWorkout(workoutId);
    if (!workout || !workout.finished_at) return;

    const endedAt = new Date(workout.finished_at).getTime();
    const startedAtIso = firstActivityAt(workoutId);
    let minutes = FALLBACK_MINUTES;
    if (startedAtIso) {
      const elapsed = Math.round((endedAt - new Date(startedAtIso).getTime()) / 60000);
      if (elapsed >= 5 && elapsed <= 300) minutes = elapsed;
    }

    await putRecord({
      id: workout.id,
      date: workout.date,
      endedAt,
      type: "strength",
      minutes,
    });
  } catch {
    // never let bridge issues surface in the workout flow
  }
}
