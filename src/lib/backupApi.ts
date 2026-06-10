import { exportBackup, type BackupPayloadV1 } from "../db/backup";

// The backup server is pre-filled so you only ever enter username + password.
const DEFAULT_URL = "https://simple-workout-backup.simple-workout.workers.dev";

const URL_KEY = "backup.url";
const USER_KEY = "backup.user";
const PASSWORD_KEY = "backup.password";
const LAST_BACKUP_KEY = "backup.lastBackupAt";

export interface BackupConfig {
  url: string;
  user: string;
  password: string;
}

export function getBackupConfig(): BackupConfig {
  return {
    url: localStorage.getItem(URL_KEY) ?? DEFAULT_URL,
    user: localStorage.getItem(USER_KEY) ?? "",
    password: localStorage.getItem(PASSWORD_KEY) ?? ""
  };
}

export function saveBackupConfig(config: BackupConfig): void {
  localStorage.setItem(URL_KEY, config.url.trim().replace(/\/+$/, ""));
  localStorage.setItem(USER_KEY, config.user.trim());
  localStorage.setItem(PASSWORD_KEY, config.password);
}

export function getLastBackupAt(): string | null {
  return localStorage.getItem(LAST_BACKUP_KEY);
}

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

export async function uploadBackup(payload: BackupPayloadV1): Promise<void> {
  const config = requireConfig();
  const res = await fetch(`${config.url}/backups`, {
    method: "POST",
    headers: {
      Authorization: authHeader(config),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Wrong username or password.");
    if (res.status === 413) throw new Error("Backup too large for the server.");
    throw new Error(`Backup failed (HTTP ${res.status}).`);
  }
  localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
}

export async function downloadLatestBackup(): Promise<BackupPayloadV1> {
  const config = requireConfig();
  const res = await fetch(`${config.url}/backups/latest`, {
    headers: { Authorization: authHeader(config) }
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Wrong username or password.");
    if (res.status === 404) throw new Error("No backups found on the server.");
    throw new Error(`Restore failed (HTTP ${res.status}).`);
  }
  return (await res.json()) as BackupPayloadV1;
}

// Fire-and-forget backup after finishing a workout. Silent on failure —
// being offline is the normal case for an installed PWA.
export function maybeAutoBackup(): void {
  const { url, user, password } = getBackupConfig();
  if (!url || !user || !password) return;
  void uploadBackup(exportBackup()).catch(() => {});
}
