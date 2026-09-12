// Pocket Lab hourglass ledger client. Same worker and credentials as the
// backup API; grants are pushed best-effort and re-tried on the next launch.
import { useSyncExternalStore } from "react";
import { getBackupConfig, type BackupConfig } from "./backupApi";
import { markRewardsSynced, unsyncedRewards } from "../v2/queries";
import type { RewardLine } from "../v2/rewards";

export type GrantPayload = {
  grant_key: string;
  session_date: string;
  hourglasses: number;
  breakdown: RewardLine[];
};

export type HourglassSummary = { earned: number; claimed: number; pending: number; grants: number };

export type SyncStatus = "idle" | "sending" | "sent" | "nothing" | "not_signed_in" | "offline" | "failed";
export type SyncResult = { status: SyncStatus; sent: number; at: string | null };

// The worker caps a single POST; anything beyond is picked up next time.
const MAX_GRANTS_PER_PUSH = 90;

function requireConfig(): BackupConfig {
  const config = getBackupConfig();
  if (!config.url || !config.user || !config.password) {
    throw new Error("Set the username and password in Settings first.");
  }
  return config;
}

function authHeader(config: BackupConfig): string {
  return "Basic " + btoa(`${config.user}:${config.password}`);
}

export async function pushGrants(grants: GrantPayload[]): Promise<{ accepted: string[]; inserted: number }> {
  const config = requireConfig();
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
  const config = requireConfig();
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
// what happened without threading props through the session screen.
// ---------------------------------------------------------------------------

let lastResult: SyncResult = { status: "idle", sent: 0, at: null };
const listeners = new Set<() => void>();

function setResult(r: SyncResult): void {
  lastResult = r;
  listeners.forEach((l) => l());
}

export function useHourglassSync(): SyncResult {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => lastResult
  );
}

function parseLines(json: string): RewardLine[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as RewardLine[]) : [];
  } catch {
    return [];
  }
}

let inflight: Promise<SyncResult> | null = null;

/**
 * Push every unsynced grant to the worker. Never throws. Concurrent callers
 * (app start, session finish, StrictMode double effects) share one request.
 */
export function syncPendingRewards(): Promise<SyncResult> {
  if (inflight) return inflight;
  inflight = doSync().finally(() => {
    inflight = null;
  });
  return inflight;
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
    const rows = unsyncedRewards();
    if (rows.length === 0) return finish("nothing");
    if (typeof navigator !== "undefined" && navigator.onLine === false) return finish("offline");
    setResult({ status: "sending", sent: 0, at: null });
    const grants: GrantPayload[] = rows.slice(0, MAX_GRANTS_PER_PUSH).map((r) => ({
      grant_key: r.grant_key,
      session_date: r.date,
      hourglasses: r.hourglasses,
      breakdown: parseLines(r.breakdown_json)
    }));
    const { accepted } = await pushGrants(grants);
    markRewardsSynced(accepted);
    return finish(accepted.length > 0 ? "sent" : "failed", accepted.length);
  } catch {
    return finish("failed");
  }
}
