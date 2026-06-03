import { useSyncExternalStore } from "react";
import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import { SCHEMA_SQL } from "./schema";
import { SEED_EXERCISES } from "./seed";

// ---------- types ----------

export type SqlValue = string | number | null;
export type Row = Record<string, SqlValue>;

interface DbHandle {
  exec(opts: { sql: string; bind?: SqlValue[]; returnValue?: "resultRows"; rowMode?: "object" }): Row[] | void;
  exec(sql: string): void;
}

// ---------- module-level db ----------

let db: DbHandle | null = null;
let initPromise: Promise<void> | null = null;
const readyListeners = new Set<() => void>();
let ready = false;

function notifyReady() {
  ready = true;
  for (const fn of readyListeners) fn();
}

async function initDb(): Promise<void> {
  const sqlite3: any = await sqlite3InitModule({
    print: (..._args: any[]) => {},
    printErr: console.error
  });

  // Prefer OPFS SAH Pool VFS — works without COOP/COEP headers.
  try {
    const pool = await sqlite3.installOpfsSAHPoolVfs({ name: "workout-pool" });
    db = new pool.OpfsSAHPoolDb("/workout.db") as DbHandle;
    console.info("[db] using OPFS SAH Pool VFS");
  } catch (err) {
    console.warn("[db] OPFS unavailable, using in-memory DB", err);
    db = new sqlite3.oo1.DB(":memory:", "c") as DbHandle;
  }

  db!.exec(SCHEMA_SQL);
  seedIfEmpty();
  notifyReady();
}

function seedIfEmpty() {
  const rows = (db!.exec({
    sql: "SELECT COUNT(*) AS n FROM exercises",
    returnValue: "resultRows",
    rowMode: "object"
  }) as Row[]) ?? [];
  const n = Number(rows[0]?.n ?? 0);
  if (n > 0) return;

  for (const e of SEED_EXERCISES) {
    db!.exec({
      sql: `INSERT INTO exercises
              (name, category, primary_muscle, secondary_muscles_json,
               equipment, rep_scheme, is_compound, upper_body, is_custom)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      bind: [
        e.name,
        e.category,
        e.primary_muscle,
        JSON.stringify(e.secondary_muscles),
        e.equipment,
        e.rep_scheme,
        e.rep_scheme === "compound" ? 1 : 0,
        e.upper_body ? 1 : 0
      ]
    });
  }
}

export function ensureDb(): Promise<void> {
  if (!initPromise) initPromise = initDb();
  return initPromise;
}

// Fire init eagerly so the loading screen is short.
void ensureDb();

// ---------- query helpers ----------

export function all<T extends Row = Row>(sql: string, params: SqlValue[] = []): T[] {
  if (!db) throw new Error("db not ready");
  return (db.exec({
    sql,
    bind: params,
    returnValue: "resultRows",
    rowMode: "object"
  }) as T[]) ?? [];
}

export function one<T extends Row = Row>(sql: string, params: SqlValue[] = []): T | undefined {
  return all<T>(sql, params)[0];
}

export function run(sql: string, params: SqlValue[] = []): void {
  if (!db) throw new Error("db not ready");
  db.exec({ sql, bind: params });
}

export function lastInsertId(): number {
  const r = one<{ id: number }>("SELECT last_insert_rowid() AS id");
  return Number(r?.id ?? 0);
}

// ---------- react hook ----------

export function useDbReady(): boolean {
  return useSyncExternalStore(
    (cb) => {
      readyListeners.add(cb);
      return () => readyListeners.delete(cb);
    },
    () => ready,
    () => false
  );
}

// ---------- simple change-bus so screens re-fetch after writes ----------

const changeListeners = new Set<() => void>();
let changeVersion = 0;

export function notifyChange() {
  changeVersion++;
  for (const fn of changeListeners) fn();
}

export function useDbVersion(): number {
  return useSyncExternalStore(
    (cb) => {
      changeListeners.add(cb);
      return () => changeListeners.delete(cb);
    },
    () => changeVersion,
    () => 0
  );
}
