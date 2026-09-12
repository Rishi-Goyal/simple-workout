/**
 * Finish-screen card for the Pocket Lab hourglasses a session earned, plus the
 * offline claim code. Also reused (compact) in Settings > Pocket Lab.
 */
import { useEffect, useState } from "react";
import { useDbVersion } from "../../db/client";
import { useHourglassSync, type SyncStatus } from "../../lib/hourglassApi";
import { getReward } from "../queries";
import { canClaimCodesHere, makeClaimCode, type RewardLine } from "../rewards";
import { Icon } from "../ui";

const STATUS_TEXT: Record<SyncStatus, { icon: string; text: string }> = {
  idle: { icon: "cloud_upload", text: "Sending to Pocket Lab…" },
  sending: { icon: "cloud_upload", text: "Sending to Pocket Lab…" },
  sent: { icon: "cloud_done", text: "Sent to Pocket Lab" },
  nothing: { icon: "cloud_upload", text: "Sending to Pocket Lab…" },
  not_signed_in: { icon: "cloud_off", text: "Not signed in — type the code below into Pocket Lab" },
  offline: { icon: "cloud_off", text: "Will send when online" },
  failed: { icon: "cloud_off", text: "Couldn't reach the server — will retry next launch" }
};

function parseLines(json: string): RewardLine[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as RewardLine[]) : [];
  } catch {
    return [];
  }
}

export function HourglassCard({ sessionId }: { sessionId: number }) {
  useDbVersion();
  const sync = useHourglassSync();
  const reward = getReward(sessionId);
  if (!reward) return null;
  const lines = parseLines(reward.breakdown_json);
  const status = reward.synced_at ? STATUS_TEXT.sent : STATUS_TEXT[sync.status];

  return (
    <div className="anim-fade-up anim-d2" style={{ marginTop: 12, padding: "16px 20px", borderRadius: 16, background: "var(--color-blue-50)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Icon name="hourglass_top" size={28} fill color="var(--color-blue-700)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 500 }}>+{reward.hourglasses} hourglasses</div>
          <div style={{ fontSize: 14, color: "var(--color-grey-700)" }}>
            {lines.map((l) => `${l.label} ${l.amount}`).join(" · ")}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-grey-700)" }}>
        <Icon name={status.icon} size={16} color="var(--color-grey-600)" />
        <span>{status.text}</span>
      </div>
      <ClaimCode grantKey={reward.grant_key} hourglasses={reward.hourglasses} />
    </div>
  );
}

export function ClaimCode({ grantKey, hourglasses, compact = false }: { grantKey: string; hourglasses: number; compact?: boolean }) {
  const [code, setCode] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCode(null);
    if (!canClaimCodesHere()) {
      setUnavailable(true);
      return;
    }
    setUnavailable(false);
    makeClaimCode(grantKey, hourglasses)
      .then((c) => {
        if (!cancelled) setCode(c);
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      });
    return () => {
      cancelled = true;
    };
  }, [grantKey, hourglasses]);

  const canCopy = typeof navigator !== "undefined" && Boolean(navigator.clipboard);

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* select-all styling on the code is the fallback */
    }
  }

  if (unavailable) {
    return <div style={{ marginTop: 8, fontSize: 12, color: "var(--color-grey-600)" }}>Claim codes need a secure (https) page.</div>;
  }

  return (
    <div style={{ marginTop: compact ? 6 : 10, display: "flex", alignItems: "center", gap: 10 }}>
      <code
        style={{
          flex: 1,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontSize: compact ? 13 : 15,
          letterSpacing: 1,
          userSelect: "all",
          color: code ? "var(--color-grey-900)" : "var(--color-grey-600)"
        }}
      >
        {code ?? "Generating code…"}
      </code>
      {code && canCopy && (
        <button
          className="tap"
          onClick={copy}
          style={{
            height: 32,
            padding: "0 14px",
            borderRadius: 999,
            border: "none",
            background: "var(--color-blue-700)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "var(--font-body)",
            cursor: "pointer",
            flexShrink: 0
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      )}
    </div>
  );
}
