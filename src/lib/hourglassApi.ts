// Pocket Lab hourglass ledger client. Same worker and credentials as the
// backup API; grants are pushed best-effort and re-tried on the next launch.
import { useSyncExternalStore } from "react";
import { authHeader, requireBackupConfig, getBackupConfig } from "./backupApi";
import { markRewardsSynced, unsyncedRewards } from "../v2/queries";
import { parseRewardLines, type RewardLine } from "../v2/rewards";

export type GrantPayload = {
  grant_key: string;
  session_date: string;
  hourglasses: number;
  breakdown: RewardLine[];
};

export type HourglassSummary = { earned: number; claimed: number; pending: number; grants: number };

/**
 * sending        a push is in flight
 * sent           the last push finished (sent = rows acknowledged, may be 0)
 * not_signed_in  no credentials — grants stay local, claim codes still work
 * offline        navigator reports no network; nothing was attempted
 * failed         request or auth error; retried on next launch / online event
 */
export type SyncStatus = "sending" | "sent" | "not_signed_in" | "offline" | "failed";
export type SyncResult = { status: SyncStatus; sent: number; at: string | null };

// Keeps each POST comfortably under the worker's 64 KB body cap; the push
// loops until every unsynced row has been sent.
const PUSH_BATCH = 90;

export async function pushGrants(grants: GrantPayload[]): Promise<{ accepted: string[]; inserted: number }> {
  const config = requireBackupConfig();
  const res = await fetch(`${config.url}/hourglasses/grants`, {
    method: "POST",
    headers: {
      Authorization: authHeader(config),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ grants })
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Wrong username or password.");
    throw new Error(`Sending hourglasses failed (HTTP ${res.status}).`);
  }
  const body = (await res.json()) as { accepted?: unknown; inserted?: unknown };
  const accepted = Array.isArray(body.accepted) ? body.accepted.filter((k): k is string => typeof k === "string") : [];
  return { accepted, inserted: Number(body.inserted ?? 0) };
}

export async function fetchHourglassSummary(): Promise<HourglassSummary> {
  const config = requireBackupConfig();
  const res = await fetch(`${config.url}/hourglasses/summary`, {
    headers: { Authorization: authHeader(config) }
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Wrong username or password.");
    throw new Error(`Couldn't read the hourglass ledger (HTTP ${res.status}).`);
  }
  const b = (await res.json()) as Partial<HourglassSummary>;
  return {
    earned: Number(b.earned ?? 0),
    claimed: Number(b.claimed ?? 0),
    pending: Number(b.pending ?? 0),
    grants: Number(b.grants ?? 0)
  };
}

// ---------------------------------------------------------------------------
// Sync state — a tiny external store so the finish card and Settings can show
// what happened without threading props through the session screen. The
// per-grant truth is always the row's synced_at; this is only the last
// attempt's outcome.
// ---------------------------------------------------------------------------

let lastResult: SyncResult = { status: "sent", sent: 0, at: null };
const listeners = new Set<() => void>();

function setResult(r: SyncResult): void {
  lastResult = r;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

const getSnapshot = () => lastResult;

export function useHourglassSync(): SyncResult {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

let inflight: Promise<SyncResult> | null = null;
let queued: Promise<SyncResult> | null = null;

/**
 * Push every unsynced grant to the worker. Never throws.
 *
 * A call made while a sync is running does not join that run — its snapshot
 * of unsynced rows may predate the caller's own write (finish screen minting
 * a grant while the app-start or `online` sync is still in flight). Instead
 * one follow-up run is queued after the current one; further callers share
 * that queued run, so StrictMode double effects cost at most one extra pass.
 */
export function syncPendingRewards(): Promise<SyncResult> {
  if (!inflight) {
    inflight = doSync().finally(() => {
      inflight = null;
    });
    return inflight;
  }
  if (!queued) {
    const rerun = () => {
      queued = null;
      return syncPendingRewards();
    };
    queued = inflight.then(rerun, rerun);
  }
  return queued;
}

async function doSync(): Promise<SyncResult> {
  const finish = (status: SyncStatus, sent = 0): SyncResult => {
    const r = { status, sent, at: new Date().toISOString() };
    setResult(r);
    return r;
  };
  try {
    const { url, user, password } = getBackupConfig();
    if (!url || !user || !password) return finish("not_signed_in");
    let rows = unsyncedRewards();
    if (rows.length === 0) return finish("sent", 0);
    if (typeof navigator !== "undefined" && navigator.onLine === false) return finish("offline");
    setResult({ status: "sending", sent: 0, at: null });
    let sent = 0;
    while (rows.length > 0) {
      const batch = rows.slice(0, PUSH_BATCH);
      const grants: GrantPayload[] = batch.map((r) => ({
        grant_key: r.grant_key,
        session_date: r.date,
        hourglasses: r.hourglasses,
        breakdown: parseRewardLines(r.breakdown_json)
      }));
      const { accepted } = await pushGrants(grants);
      markRewardsSynced(accepted);
      sent += accepted.length;
      // A batch the server acknowledged nothing from would loop forever.
      if (accepted.length === 0) return finish("failed", sent);
      rows = unsyncedRewards();
    }
    return finish("sent", sent);
  } catch (err) {
    console.warn("Pocket Lab hourglass sync failed", err);
    return finish("failed");
  }
}
