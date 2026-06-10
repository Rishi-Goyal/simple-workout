import { useState } from "react";
import { exportBackup, importBackup } from "../db/backup";
import {
  downloadLatestBackup,
  getBackupConfig,
  getLastBackupAt,
  saveBackupConfig,
  uploadBackup
} from "../lib/backupApi";

type Status = { kind: "ok" | "error"; text: string } | null;

export function Settings() {
  const [config, setConfig] = useState(getBackupConfig());
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [lastBackupAt, setLastBackupAt] = useState(getLastBackupAt());

  function save() {
    saveBackupConfig(config);
    setConfig(getBackupConfig());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function backupNow() {
    setBusy(true);
    setStatus(null);
    try {
      await uploadBackup(exportBackup());
      setLastBackupAt(getLastBackupAt());
      setStatus({ kind: "ok", text: "Backup uploaded." });
    } catch (err) {
      setStatus({ kind: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    const sure = window.confirm(
      "This will replace ALL local data with the latest server backup. Continue?"
    );
    if (!sure) return;
    setBusy(true);
    setStatus(null);
    try {
      const payload = await downloadLatestBackup();
      importBackup(payload);
      setStatus({ kind: "ok", text: "Restore complete." });
    } catch (err) {
      setStatus({ kind: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>

      <section className="rounded-2xl bg-slate-800 p-4 space-y-3">
        <h2 className="font-semibold">Backup server</h2>
        <Field label="Server URL">
          <input
            value={config.url}
            onChange={(e) => setConfig({ ...config, url: e.target.value })}
            placeholder="https://simple-workout-backup.you.workers.dev"
            className="w-full rounded bg-slate-900 px-2 py-2"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </Field>
        <Field label="Access token">
          <input
            type="password"
            value={config.token}
            onChange={(e) => setConfig({ ...config, token: e.target.value })}
            className="w-full rounded bg-slate-900 px-2 py-2"
          />
        </Field>
        <button onClick={save} className="w-full rounded-lg bg-blue-600 py-2 font-medium">
          {saved ? "Saved" : "Save"}
        </button>
      </section>

      <section className="rounded-2xl bg-slate-800 p-4 space-y-3">
        <h2 className="font-semibold">Backup</h2>
        <p className="text-xs text-slate-400">
          {lastBackupAt
            ? `Last backup: ${new Date(lastBackupAt).toLocaleString()}`
            : "No backup made from this device yet."}
        </p>
        <button
          onClick={backupNow}
          disabled={busy}
          className="w-full rounded-lg bg-green-600 py-2 font-medium disabled:opacity-50"
        >
          {busy ? "Working…" : "Back up now"}
        </button>
        <p className="text-xs text-slate-400">
          A backup is also uploaded automatically each time you finish a workout.
        </p>
      </section>

      <section className="rounded-2xl bg-slate-800 p-4 space-y-3">
        <h2 className="font-semibold">Restore</h2>
        <p className="text-xs text-slate-400">
          Replaces everything on this device with the latest server backup.
        </p>
        <button
          onClick={restore}
          disabled={busy}
          className="w-full rounded-lg bg-red-600 py-2 font-medium disabled:opacity-50"
        >
          {busy ? "Working…" : "Restore from server"}
        </button>
      </section>

      {status && (
        <p
          className={`text-sm ${status.kind === "ok" ? "text-green-400" : "text-red-400"}`}
        >
          {status.text}
        </p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-slate-400">{label}</div>
      {children}
    </label>
  );
}
