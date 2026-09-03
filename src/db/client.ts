import { useSyncExternalStore } from "react";
import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import { SCHEMA_SQL } from "./schema";
import { SCHEMA_V2_SQL } from "./schemaV2";
import { SEED_EXERCISES } from "./seed";
import { SEED_WARMUPS } from "./warmupSeed";

// ---------- types ----------

export type SqlValue = string | number | null;
export type Row = Record<string, SqlValue>;

interface DbHandle {
  exec(opts: { sql: string; bind?: SqlValue[]; returnValue?: "resultRows"; rowMode?: "object" }): Row[] | void;
  exec(sql: string): void;
}

// ---------- module-level db ----------

let db: DbHandle | null = null;
let sqlite3Api: any = null;
let initPromise: Promise<void> | null = null;
const readyListeners = new Set<() => void>();
let ready = false;

export type StorageMode = "opfs" | "idb" | "local" | "memory";
let storageMode: StorageMode = "memory";

function notifyReady() {
  ready = true;
  for (const fn of readyListeners) fn();
}

// ---------- IndexedDB snapshot persistence ----------
//
// The DB runs in memory and its full image is snapshotted into IndexedDB
// (debounced after every write, flushed when the tab hides). IndexedDB is
// namespaced to this app — unlike localStorage/kvvfs it can't collide with
// the other apps sharing the rishi-goyal.github.io origin — and has far more
// headroom than localStorage's ~5MB.

const IDB_NAME = "simple-workout";
const IDB_STORE = "sqlite-snapshot";
const IDB_KEY = "main";

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbLoadSnapshot(): Promise<Uint8Array | null> {
  const idb = await idbOpen();
  try {
    return await new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, "readonly");
      const get = tx.objectStore(IDB_STORE).get(IDB_KEY);
      get.onsuccess = () => {
        const v = get.result as { bytes?: Uint8Array } | undefined;
        resolve(v?.bytes instanceof Uint8Array && v.bytes.length > 0 ? v.bytes : null);
      };
      get.onerror = () => reject(get.error);
    });
  } finally {
    idb.close();
  }
}

async function idbSaveSnapshot(bytes: Uint8Array): Promise<void> {
  const idb = await idbOpen();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put({ bytes, savedAt: new Date().toISOString() }, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    idb.close();
  }
}

/** Load bytes into an (empty) memory DB via sqlite3_deserialize. */
function deserializeInto(memDb: any, bytes: Uint8Array): void {
  const p = sqlite3Api.wasm.allocFromTypedArray(bytes);
  // flags: SQLITE_DESERIALIZE_FREEONCLOSE (1) | SQLITE_DESERIALIZE_RESIZEABLE (2)
  const rc = sqlite3Api.capi.sqlite3_deserialize(memDb.pointer, "main", p, bytes.length, bytes.length, 3);
  if (rc) {
    sqlite3Api.wasm.dealloc?.(p);
    throw new Error(`sqlite3_deserialize failed (rc=${rc})`);
  }
}

/** One-time migration: pull the DB image out of the old kvvfs localStorage VFS. */
let pendingKvvfsClear = false;
function exportKvvfsImage(): Uint8Array | null {
  try {
    if (!Object.keys(localStorage).some((k) => k.startsWith("kvvfs-local"))) return null;
    const kdb = new sqlite3Api.oo1.JsStorageDb("local");
    try {
      const bytes = sqlite3Api.capi.sqlite3_js_db_export(kdb.pointer) as Uint8Array;
      return bytes.length > 0 ? bytes : null;
    } finally {
      kdb.close();
    }
  } catch {
    return null;
  }
}

let persistTimer: number | null = null;
let lastSavedAt: string | null = null;

async function persistNow(): Promise<void> {
  persistTimer = null;
  if (storageMode !== "idb" || !db) return;
  try {
    const bytes = sqlite3Api.capi.sqlite3_js_db_export((db as any).pointer) as Uint8Array;
    await idbSaveSnapshot(bytes);
    lastSavedAt = new Date().toISOString();
    if (pendingKvvfsClear) {
      // The image is safely in IndexedDB — free the shared-origin localStorage.
      try { sqlite3Api.capi.sqlite3_js_kvvfs_clear("local"); } catch { /* best effort */ }
      pendingKvvfsClear = false;
    }
  } catch (err) {
    console.warn("[db] snapshot save failed", err);
  }
}

/** Debounced snapshot; called from run() after every mutating statement. */
function schedulePersist(): void {
  if (storageMode !== "idb") return;
  if (persistTimer != null) clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => void persistNow(), 400);
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && persistTimer != null) {
      clearTimeout(persistTimer);
      void persistNow();
    }
  });
}

async function initDb(): Promise<void> {
  const sqlite3: any = await sqlite3InitModule({
    print: (..._args: any[]) => {},
    printErr: console.error
  });
  sqlite3Api = sqlite3;

  // Ask the browser not to evict this origin's storage under pressure.
  try { void navigator.storage?.persist?.(); } catch { /* optional */ }

  // Storage fallback chain:
  // 1. OPFS SAH Pool VFS — the ideal, but FileSystemSyncAccessHandle only
  //    exists in Worker threads, and this DB runs on the main thread, so it
  //    fails everywhere today. Kept first for a future move into a worker.
  // 2. Memory DB + IndexedDB snapshots — app-namespaced, roomy, and immune
  //    to anything the other apps on this shared origin do to localStorage.
  //    Migrates the previous kvvfs (localStorage) image on first run.
  // 3. kvvfs ("local") — only if IndexedDB itself is unavailable.
  // 4. In-memory — last resort; the shell shows a data-loss banner.
  try {
    const pool = await sqlite3.installOpfsSAHPoolVfs({ name: "workout-pool" });
    db = new pool.OpfsSAHPoolDb("/workout.db") as DbHandle;
    storageMode = "opfs";
    console.info("[db] using OPFS SAH Pool VFS");
  } catch (opfsErr) {
    try {
      const snapshot = await idbLoadSnapshot();
      const mem = new sqlite3.oo1.DB(":memory:", "c");
      if (snapshot) {
        deserializeInto(mem, snapshot);
      } else {
        const kvImage = exportKvvfsImage();
        if (kvImage) {
          deserializeInto(mem, kvImage);
          pendingKvvfsClear = true;
        }
      }
      db = mem as DbHandle;
      storageMode = "idb";
      console.info("[db] using memory DB with IndexedDB snapshots", opfsErr);
    } catch (idbErr) {
      try {
        db = new sqlite3.oo1.JsStorageDb("local") as DbHandle;
        storageMode = "local";
        console.info("[db] IndexedDB unavailable, using localStorage VFS (kvvfs)", idbErr);
      } catch (kvErr) {
        console.warn("[db] no persistent storage available, using in-memory DB", opfsErr, idbErr, kvErr);
        db = new sqlite3.oo1.DB(":memory:", "c") as DbHandle;
        storageMode = "memory";
      }
    }
  }

  // FKs are off by default in SQLite; required for the ON DELETE CASCADEs.
  db!.exec("PRAGMA foreign_keys = ON;");
  db!.exec(SCHEMA_SQL);
  db!.exec(SCHEMA_V2_SQL);
  migrate();
  seedIfEmpty();
  seedWarmupsIfEmpty();
  refreshSeedDescriptions();
  // Capture the freshly-seeded (or just-migrated) image right away.
  schedulePersist();
  notifyReady();
}

// Additive migrations for older DB files that pre-date a column.
// SQLite has no IF NOT EXISTS for ADD COLUMN, so we wrap and ignore.
function migrate() {
  const additions = [
    "ALTER TABLE exercises ADD COLUMN description TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE exercises ADD COLUMN how_to TEXT NOT NULL DEFAULT ''"
  ];
  for (const sql of additions) {
    try { db!.exec(sql); } catch { /* column already exists */ }
  }
}

// Keeps seed instructions in sync when we ship updated copy.
function refreshSeedDescriptions() {
  for (const e of SEED_EXERCISES) {
    db!.exec({
      sql: `UPDATE exercises
              SET description = ?, how_to = ?
            WHERE name = ? AND is_custom = 0
              AND (description = '' OR how_to = '')`,
      bind: [e.description, e.how_to, e.name]
    });
  }
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
               equipment, rep_scheme, is_compound, upper_body, is_custom,
               description, how_to)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      bind: [
        e.name,
        e.category,
        e.primary_muscle,
        JSON.stringify(e.secondary_muscles),
        e.equipment,
        e.rep_scheme,
        e.rep_scheme === "compound" ? 1 : 0,
        e.upper_body ? 1 : 0,
        e.description,
        e.how_to
      ]
    });
  }
}

function seedWarmupsIfEmpty() {
  const rows = (db!.exec({
    sql: "SELECT COUNT(*) AS n FROM warmups",
    returnValue: "resultRows",
    rowMode: "object"
  }) as Row[]) ?? [];
  const n = Number(rows[0]?.n ?? 0);
  if (n > 0) return;

  for (const w of SEED_WARMUPS) {
    db!.exec({
      sql: `INSERT INTO warmups (name, day_type, description, how_to)
            VALUES (?, ?, ?, ?)`,
      bind: [w.name, w.day_type, w.description, w.how_to]
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
  // Every mutation refreshes the IndexedDB snapshot (debounced).
  schedulePersist();
}

export function lastInsertId(): number {
  const r = one<{ id: number }>("SELECT last_insert_rowid() AS id");
  return Number(r?.id ?? 0);
}

// True when the DB is backed by durable storage (OPFS or localStorage);
// false means the in-memory fallback is active and nothing survives a
// reload. Stable once the DB is ready.
export function dbIsPersistent(): boolean {
  return storageMode !== "memory";
}

export function dbStorageMode(): StorageMode {
  return storageMode;
}

/** ISO timestamp of the last successful IndexedDB snapshot (null before one). */
export function dbLastSavedAt(): string | null {
  return lastSavedAt;
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
