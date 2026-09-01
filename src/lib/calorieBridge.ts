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

// Opens the bridge DB at whatever version it currently has (the calorie
// counter may bump it independently); if the store is missing, reopens one
// version higher to create it.
function openBridge(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BRIDGE_DB);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(BRIDGE_STORE, { keyPath: "id" });
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      if (db.objectStoreNames.contains(BRIDGE_STORE)) {
        resolve(db);
        return;
      }
      const nextVersion = db.version + 1;
      db.close();
      const upgrade = indexedDB.open(BRIDGE_DB, nextVersion);
      upgrade.onupgradeneeded = () => {
        if (!upgrade.result.objectStoreNames.contains(BRIDGE_STORE)) {
          upgrade.result.createObjectStore(BRIDGE_STORE, { keyPath: "id" });
        }
      };
      upgrade.onerror = () => reject(upgrade.error);
      upgrade.onsuccess = () => resolve(upgrade.result);
    };
  });
}

async function putRecord(record: {
  id: number;
  date: string;
  endedAt: number;
  type: string;
  minutes: number;
}): Promise<void> {
  const db = await openBridge();
  return new Promise((resolve, reject) => {
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
  });
}

/**
 * v2 sessions publish the same record shape. Ids are offset so they can never
 * collide with (and overwrite) v1 workout records already in the store.
 */
const V2_ID_OFFSET = 1_000_000;

export async function publishSessionToBridge(session: {
  id: number;
  date: string;
  started_at: string | null;
  finished_at: string | null;
}): Promise<void> {
  try {
    if (!session.finished_at) return;
    const endedAt = new Date(session.finished_at).getTime();
    let minutes = FALLBACK_MINUTES;
    if (session.started_at) {
      const elapsed = Math.round((endedAt - new Date(session.started_at).getTime()) / 60000);
      if (elapsed >= 5 && elapsed <= 300) minutes = elapsed;
    }
    await putRecord({
      id: V2_ID_OFFSET + session.id,
      date: session.date,
      endedAt,
      type: "strength",
      minutes
    });
  } catch {
    // never let bridge issues surface in the workout flow
  }
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
