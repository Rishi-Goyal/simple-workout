import { exportBackup, type BackupPayloadV1 } from "../db/backup";

const URL_KEY = "backup.url";
const TOKEN_KEY = "backup.token";
const LAST_BACKUP_KEY = "backup.lastBackupAt";

export interface BackupConfig {
  url: string;
  token: string;
}

export function getBackupConfig(): BackupConfig {
  return {
    url: localStorage.getItem(URL_KEY) ?? "",
    token: localStorage.getItem(TOKEN_KEY) ?? ""
  };
}

export function saveBackupConfig(config: BackupConfig): void {
  localStorage.setItem(URL_KEY, config.url.trim().replace(/\/+$/, ""));
  localStorage.setItem(TOKEN_KEY, config.token.trim());
}

export function getLastBackupAt(): string | null {
  return localStorage.getItem(LAST_BACKUP_KEY);
}

function requireConfig(): BackupConfig {
  const config = getBackupConfig();
  if (!config.url || !config.token) {
    throw new Error("Set the server URL and token in Settings first.");
  }
  return config;
}

export async function uploadBackup(payload: BackupPayloadV1): Promise<void> {
  const { url, token } = requireConfig();
  const res = await fetch(`${url}/backups`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Server rejected the token.");
    if (res.status === 413) throw new Error("Backup too large for the server.");
    throw new Error(`Backup failed (HTTP ${res.status}).`);
  }
  localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
}

export async function downloadLatestBackup(): Promise<BackupPayloadV1> {
  const { url, token } = requireConfig();
  const res = await fetch(`${url}/backups/latest`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Server rejected the token.");
    if (res.status === 404) throw new Error("No backups found on the server.");
    throw new Error(`Restore failed (HTTP ${res.status}).`);
  }
  return (await res.json()) as BackupPayloadV1;
}

// Fire-and-forget backup after finishing a workout. Silent on failure —
// being offline is the normal case for an installed PWA.
export function maybeAutoBackup(): void {
  const { url, token } = getBackupConfig();
  if (!url || !token) return;
  void uploadBackup(exportBackup()).catch(() => {});
}
