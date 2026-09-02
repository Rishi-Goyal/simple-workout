import { useState, type ReactNode } from "react";
import { dbStorageMode, useDbVersion } from "../../db/client";
import { exportBackup, importBackup } from "../../db/backup";
import {
  downloadLatestBackup,
  getBackupConfig,
  getLastBackupAt,
  saveBackupConfig,
  uploadBackup
} from "../../lib/backupApi";
import { EQUIP_TIER_LABELS, type EquipTier } from "../engine";
import { getEquipTier, getPref, setPref } from "../queries";
import { FilterChip, Icon, LightNav, SectionLabel, Switch } from "../ui";

function Row({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--color-grey-200)" }}>
      {children}
    </div>
  );
}

export function SettingsV2() {
  useDbVersion();
  const [, bump] = useState(0);
  const rerender = () => bump((n) => n + 1);
  const tier = getEquipTier();
  const restSec = Number(getPref("rest_seconds")) || 90;
  const warmup = getPref("warmup_first") === "1";
  const vibrate = getPref("vibrate") === "1";

  const config = getBackupConfig();
  const signedIn = Boolean(config.user && config.password);
  const [accountOpen, setAccountOpen] = useState(false);
  const [user, setUser] = useState(config.user);
  const [password, setPassword] = useState(config.password);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const lastBackup = getLastBackupAt();

  async function backupNow() {
    setBusy("backup");
    setMessage(null);
    try {
      await uploadBackup(exportBackup());
      setMessage("Backed up.");
    } catch (e) {
      setMessage(String((e as Error).message ?? e));
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    if (!confirm("Replace everything on this device with the latest server backup?")) return;
    setBusy("restore");
    setMessage(null);
    try {
      importBackup(await downloadLatestBackup());
      setMessage("Restored.");
    } catch (e) {
      setMessage(String((e as Error).message ?? e));
    } finally {
      setBusy(null);
    }
  }

  function exportJson() {
    const payload = exportBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simple-workout-export-${payload.exported_at.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function saveAccount() {
    saveBackupConfig({ url: config.url, user, password });
    setAccountOpen(false);
    rerender();
  }

  function mmss(sec: number): string {
    return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 0" }}>
        <div style={{ height: 48, display: "flex", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500 }}>Settings</span>
        </div>

        <div className="anim-fade-up">
        <SectionLabel style={{ marginTop: 24 }}>I have</SectionLabel>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(Object.keys(EQUIP_TIER_LABELS) as EquipTier[]).map((t) => (
            <FilterChip key={t} label={EQUIP_TIER_LABELS[t]} selected={tier === t} onClick={() => setPref("equipment", t)} />
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 14, lineHeight: "20px", color: "var(--color-grey-700)" }}>
          Trims ladders to rungs you can actually do.
        </div>

        <SectionLabel style={{ marginTop: 28 }}>Workout</SectionLabel>
        <Row>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16 }}>Rest between sets</div>
            <div style={{ fontSize: 14, color: "var(--color-grey-700)" }}>Timer starts on its own</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span className="tap" style={{ padding: 8, cursor: "pointer" }} onClick={() => setPref("rest_seconds", String(Math.max(30, restSec - 15)))} aria-label="Less rest">
              <Icon name="remove" size={22} color="var(--color-grey-700)" />
            </span>
            <span style={{ fontSize: 16, color: "var(--color-blue-700)", fontWeight: 500, minWidth: 40, textAlign: "center" }}>{mmss(restSec)}</span>
            <span className="tap" style={{ padding: 8, cursor: "pointer" }} onClick={() => setPref("rest_seconds", String(Math.min(180, restSec + 15)))} aria-label="More rest">
              <Icon name="add" size={22} color="var(--color-grey-700)" />
            </span>
          </div>
        </Row>
        <Row>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16 }}>Warm-up first</div>
            <div style={{ fontSize: 14, color: "var(--color-grey-700)" }}>Two moves, about 4 minutes</div>
          </div>
          <Switch checked={warmup} onChange={(v) => setPref("warmup_first", v ? "1" : "0")} />
        </Row>
        <Row>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16 }}>Vibrate when rest ends</div>
          </div>
          <Switch checked={vibrate} onChange={(v) => setPref("vibrate", v ? "1" : "0")} />
        </Row>

        <SectionLabel style={{ marginTop: 28 }}>Backup</SectionLabel>
        <Row>
          <Icon name={signedIn ? "cloud_done" : "cloud_off"} size={24} color={signedIn ? "var(--color-green-700)" : "var(--color-grey-600)"} />
          <div style={{ flex: 1, cursor: "pointer" }} className="tap" onClick={() => setAccountOpen((v) => !v)}>
            <div style={{ fontSize: 16 }}>{signedIn ? `Signed in as ${config.user}` : "Not backed up"}</div>
            <div style={{ fontSize: 14, color: "var(--color-grey-700)" }}>
              {signedIn
                ? lastBackup
                  ? `Last backup ${new Date(lastBackup).toLocaleDateString()} · automatic after each workout`
                  : "Automatic after each workout"
                : "Sign in to back up after each workout"}
            </div>
          </div>
          <span className="tap" style={{ cursor: "pointer" }} onClick={() => setAccountOpen((v) => !v)} aria-label="Backup account">
            <Icon name={accountOpen ? "expand_less" : "chevron_right"} size={24} color="var(--color-grey-500)" />
          </span>
        </Row>
        {accountOpen && (
          <div style={{ padding: "14px 0", borderBottom: "1px solid var(--color-grey-200)", display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="Username"
              autoCapitalize="none"
              style={{ height: 44, borderRadius: 8, border: "1px solid var(--color-grey-300)", padding: "0 12px", fontSize: 16, fontFamily: "var(--font-body)" }}
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              style={{ height: 44, borderRadius: 8, border: "1px solid var(--color-grey-300)", padding: "0 12px", fontSize: 16, fontFamily: "var(--font-body)" }}
            />
            <button
              className="tap"
              onClick={saveAccount}
              style={{ height: 44, borderRadius: 999, border: "none", background: "var(--color-blue-600)", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-body)" }}
            >
              Save
            </button>
          </div>
        )}
        {signedIn && (
          <Row>
            <Icon name="cloud_upload" size={24} color="var(--color-grey-700)" />
            <div className="tap" style={{ flex: 1, fontSize: 16, cursor: "pointer" }} onClick={backupNow}>
              {busy === "backup" ? "Backing up…" : "Back up now"}
            </div>
          </Row>
        )}
        <Row>
          <Icon name="cloud_download" size={24} color="var(--color-grey-700)" />
          <div className="tap" style={{ flex: 1, fontSize: 16, cursor: "pointer" }} onClick={restore}>
            {busy === "restore" ? "Restoring…" : "Restore from server"}
          </div>
          <Icon name="chevron_right" size={24} color="var(--color-grey-500)" />
        </Row>
        <Row>
          <Icon name="download" size={24} color="var(--color-grey-700)" />
          <div className="tap" style={{ flex: 1, fontSize: 16, cursor: "pointer" }} onClick={exportJson}>
            Export all data (JSON)
          </div>
          <Icon name="chevron_right" size={24} color="var(--color-grey-500)" />
        </Row>
        {message && <div style={{ padding: "10px 0", fontSize: 14, color: "var(--color-grey-700)" }}>{message}</div>}

        <SectionLabel style={{ marginTop: 28 }}>About</SectionLabel>
        <div style={{ padding: "14px 0 24px", fontSize: 14, lineHeight: "20px", color: "var(--color-grey-700)" }}>
          Exercise photos from free-exercise-db (public domain). Simple Workout 2.0.
          <br />
          Storage:{" "}
          {{ opfs: "on-device file (OPFS)", local: "on-device (localStorage)", memory: "in-memory — not persistent" }[dbStorageMode()]}
        </div>
        </div>
      </div>
      <LightNav active="/settings" />
    </div>
  );
}
