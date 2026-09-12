import { useState, type ReactNode } from "react";
import { dbStorageMode, useDbVersion } from "../../db/client";
import { checkForUpdates } from "../../lib/appUpdate";
import { exportBackup, importBackup } from "../../db/backup";
import {
  downloadLatestBackup,
  getBackupConfig,
  getLastBackupAt,
  saveBackupConfig,
  uploadBackup
} from "../../lib/backupApi";
import { fetchHourglassSummary, syncPendingRewards } from "../../lib/hourglassApi";
import { EQUIP_TIER_LABELS, getExerciseV2, type EquipTier } from "../engine";
import { getEquipTier, getPref, recentRewards, rewardTotals, setPref } from "../queries";
import { HOURGLASSES_PER_PACK } from "../rewards";
import { FilterChip, Icon, LightNav, SectionLabel, Switch } from "../ui";
import { ClaimCode } from "./HourglassCard";

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
  const totals = rewardTotals();
  const packs = Math.floor(totals.earned / HOURGLASSES_PER_PACK);
  const [codesOpen, setCodesOpen] = useState(false);
  const [hgMessage, setHgMessage] = useState<string | null>(null);
  const recent = codesOpen ? recentRewards(5) : [];
  const [creditsOpen, setCreditsOpen] = useState(false);
  const credits = __MEDIA_CREDITS__;
  const [updateState, setUpdateState] = useState<"idle" | "checking" | "reloading" | "up-to-date" | "failed" | "unavailable">("idle");

  async function onCheckUpdates() {
    if (updateState === "checking" || updateState === "reloading") return;
    setUpdateState("checking");
    const result = await checkForUpdates();
    setUpdateState(result === "reloading" ? "reloading" : result);
    // "reloading" resolves itself when the new worker takes over.
  }

  const updateTitle = {
    idle: "Check for updates",
    checking: "Checking…",
    reloading: "Updating — reloading in a moment…",
    "up-to-date": "You're on the latest version",
    failed: "Couldn't check — are you online?",
    unavailable: "Updates apply automatically here"
  }[updateState];

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

  async function sendPending() {
    setBusy("hourglass");
    setHgMessage(null);
    try {
      const r = await syncPendingRewards();
      if (r.status === "failed") {
        setHgMessage("Couldn't reach the server — check your connection or password.");
        return;
      }
      if (r.status === "offline") {
        setHgMessage("You're offline — pending hourglasses will send when you're back online.");
        return;
      }
      const sent = r.sent > 0 ? `Sent ${r.sent}. ` : "Nothing new to send. ";
      try {
        const summary = await fetchHourglassSummary();
        setHgMessage(`${sent}Pocket Lab has ${summary.pending} hourglass${summary.pending === 1 ? "" : "es"} waiting to be claimed.`);
      } catch {
        setHgMessage(sent.trim());
      }
    } catch (e) {
      setHgMessage(String((e as Error).message ?? e));
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

        <SectionLabel style={{ marginTop: 28 }}>Pocket Lab</SectionLabel>
        <Row>
          <Icon name="hourglass_top" size={24} fill color="var(--color-blue-700)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16 }}>
              {totals.earned} hourglass{totals.earned === 1 ? "" : "es"} earned
            </div>
            <div style={{ fontSize: 14, color: "var(--color-grey-700)" }}>
              {totals.count === 0
                ? "Finish a workout to earn 12 — one Pocket Lab pack"
                : signedIn
                  ? `≈ ${packs} pack${packs === 1 ? "" : "s"} · ${totals.unsynced === 0 ? "all sent to Pocket Lab" : `${totals.unsynced} not sent yet`}`
                  : "Sign in above to send automatically, or use the claim codes"}
            </div>
          </div>
        </Row>
        {signedIn && totals.count > 0 && (
          <Row>
            <Icon name="send" size={24} color="var(--color-grey-700)" />
            <div className="tap" style={{ flex: 1, fontSize: 16, cursor: "pointer" }} onClick={sendPending}>
              {busy === "hourglass" ? "Sending…" : "Send pending now"}
            </div>
          </Row>
        )}
        {totals.count > 0 && (
          <>
            <Row>
              <Icon name="qr_code_2" size={24} color="var(--color-grey-700)" />
              <div className="tap" style={{ flex: 1, cursor: "pointer" }} onClick={() => setCodesOpen((v) => !v)}>
                <div style={{ fontSize: 16 }}>Recent claim codes</div>
                <div style={{ fontSize: 14, color: "var(--color-grey-700)" }}>Type one into Pocket Lab if it didn't arrive on its own</div>
              </div>
              <span className="tap" style={{ cursor: "pointer" }} onClick={() => setCodesOpen((v) => !v)} aria-label="Recent claim codes">
                <Icon name={codesOpen ? "expand_less" : "chevron_right"} size={24} color="var(--color-grey-500)" />
              </span>
            </Row>
            {codesOpen && (
              <div style={{ padding: "6px 0 10px", borderBottom: "1px solid var(--color-grey-200)" }}>
                {recent.map((r) => (
                  <div key={r.grant_key} style={{ padding: "8px 0" }}>
                    <div style={{ fontSize: 14, color: "var(--color-grey-700)" }}>
                      {new Date(r.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · +{r.hourglasses}
                      {r.synced_at ? " · sent" : ""}
                    </div>
                    <ClaimCode grantKey={r.grant_key} hourglasses={r.hourglasses} compact />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {hgMessage && <div style={{ padding: "10px 0", fontSize: 14, color: "var(--color-grey-700)" }}>{hgMessage}</div>}

        <SectionLabel style={{ marginTop: 28 }}>App</SectionLabel>
        <Row>
          <Icon
            name={updateState === "up-to-date" ? "check_circle" : "system_update"}
            size={24}
            color={updateState === "up-to-date" ? "var(--color-green-700)" : "var(--color-grey-700)"}
          />
          <div className="tap" style={{ flex: 1, cursor: "pointer" }} onClick={onCheckUpdates}>
            <div style={{ fontSize: 16 }}>{updateTitle}</div>
            <div style={{ fontSize: 14, color: "var(--color-grey-700)" }}>
              Version {__APP_VERSION__} · built{" "}
              {new Date(__BUILD_TIME__).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
          <Icon name="refresh" size={24} color="var(--color-grey-500)" />
        </Row>

        <SectionLabel style={{ marginTop: 28 }}>About</SectionLabel>
        <div style={{ padding: "14px 0 0", fontSize: 14, lineHeight: "20px", color: "var(--color-grey-700)" }}>
          Simple Workout {__APP_VERSION__}.
          <br />
          {credits.fed ? (
            <>
              Exercise photos: {credits.fed.count} from{" "}
              <a href={`${credits.fed.url}/tree/${credits.fed.commit}`} target="_blank" rel="noopener" style={{ color: "var(--color-blue-700)" }}>
                free-exercise-db
              </a>{" "}
              (public domain).
            </>
          ) : (
            "Exercise photos: none bundled yet."
          )}
          {credits.local > 0 && ` ${credits.local} drawn for this app.`}
        </div>
        {credits.wger.length > 0 && (
          <>
            <Row>
              <Icon name="palette" size={24} color="var(--color-grey-700)" />
              <div className="tap" style={{ flex: 1, cursor: "pointer" }} onClick={() => setCreditsOpen((v) => !v)}>
                <div style={{ fontSize: 16 }}>Illustrations from wger.de</div>
                <div style={{ fontSize: 14, color: "var(--color-grey-700)" }}>
                  {credits.wger.length} image{credits.wger.length === 1 ? "" : "s"} · CC-BY-SA / CC0 · tap for credits
                </div>
              </div>
              <span className="tap" style={{ cursor: "pointer" }} onClick={() => setCreditsOpen((v) => !v)} aria-label="Illustration credits">
                <Icon name={creditsOpen ? "expand_less" : "chevron_right"} size={24} color="var(--color-grey-500)" />
              </span>
            </Row>
            {creditsOpen && (
              <div style={{ padding: "10px 0 14px", fontSize: 14, lineHeight: "20px", color: "var(--color-grey-700)", borderBottom: "1px solid var(--color-grey-200)" }}>
                {credits.wger.map((c) => (
                  <div key={c.exerciseId} style={{ padding: "4px 0" }}>
                    {getExerciseV2(c.exerciseId)?.name ?? c.exerciseId} — {c.author ?? "unknown author"},{" "}
                    {c.licenseUrl ? (
                      <a href={c.licenseUrl} target="_blank" rel="noopener" style={{ color: "var(--color-blue-700)" }}>
                        {c.license}
                      </a>
                    ) : (
                      c.license
                    )}
                    {c.sourceUrl && (
                      <>
                        {" · "}
                        <a href={c.sourceUrl} target="_blank" rel="noopener" style={{ color: "var(--color-blue-700)" }}>
                          source
                        </a>
                      </>
                    )}
                  </div>
                ))}
                <div style={{ paddingTop: 6, fontSize: 12, color: "var(--color-grey-600)" }}>
                  Images were resized, flattened onto white and converted to WebP. CC-BY-SA derivatives remain CC-BY-SA.
                </div>
              </div>
            )}
          </>
        )}
        <div style={{ padding: "10px 0 24px", fontSize: 14, lineHeight: "20px", color: "var(--color-grey-700)" }}>
          Storage:{" "}
          {{
            opfs: "on-device file (OPFS)",
            idb: "on-device (IndexedDB)",
            local: "on-device (localStorage)",
            memory: "in-memory — not persistent"
          }[dbStorageMode()]}
        </div>
        </div>
      </div>
      <LightNav active="/settings" />
    </div>
  );
}
