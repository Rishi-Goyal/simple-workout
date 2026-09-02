import { useState } from "react";
import { EQUIP_TIER_LABELS, type EquipTier } from "../engine";
import { setPref } from "../queries";
import { viewTransition } from "../motion";
import { Icon, Pill } from "../ui";

const OPTIONS: { tier: EquipTier; sub: string; icon: string }[] = [
  { tier: "nothing", sub: "Bodyweight, a wall, a chair", icon: "accessibility_new" },
  { tier: "dumbbells", sub: "Plus a band or pull-up bar if you have one", icon: "fitness_center" },
  { tier: "full_gym", sub: "Barbells, benches, machines", icon: "storefront" }
];

export function OnboardV2({ onDone }: { onDone: () => void }) {
  const [tier, setTier] = useState<EquipTier>("nothing");

  function finish() {
    viewTransition(() => {
      setPref("equipment", tier);
      setPref("onboarded", "1");
      onDone();
    });
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 24px 24px", overflowY: "auto" }}>
      <div style={{ height: 48, display: "flex", alignItems: "center", flexShrink: 0 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500 }}>Simple Workout</span>
      </div>
      <div style={{ marginTop: 72, fontFamily: "var(--font-display)", fontSize: 36, lineHeight: "44px" }}>
        What do you
        <br />
        have to train with?
      </div>
      <div style={{ marginTop: 12, fontSize: 16, lineHeight: "24px", color: "var(--color-grey-700)", maxWidth: 300 }}>
        This just trims the exercise list. You can change it any time.
      </div>
      <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 12 }}>
        {OPTIONS.map((o) => {
          const on = tier === o.tier;
          return (
            <div
              key={o.tier}
              className="tap"
              onClick={() => setTier(o.tier)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "16px 20px",
                borderRadius: 16,
                // constant-width border so the card doesn't jump on select
                border: on ? "2px solid var(--color-blue-600)" : "2px solid var(--color-grey-300)",
                background: on ? "var(--color-blue-50)" : "#fff",
                transition: "border-color .2s, background .2s",
                cursor: "pointer"
              }}
            >
              <Icon name={o.icon} size={28} color={on ? "var(--color-blue-700)" : "var(--color-grey-700)"} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{EQUIP_TIER_LABELS[o.tier]}</div>
                <div style={{ fontSize: 14, color: "var(--color-grey-700)" }}>{o.sub}</div>
              </div>
              {on && <Icon name="check_circle" size={24} fill color="var(--color-blue-700)" />}
            </div>
          );
        })}
      </div>
      <div style={{ flex: 1, minHeight: 24 }} />
      <div style={{ fontSize: 14, lineHeight: "20px", color: "var(--color-grey-700)", textAlign: "center", marginBottom: 16 }}>
        No questionnaire. Your first workout starts easy — tap “too easy” and it adjusts.
      </div>
      <Pill onClick={finish} background="var(--color-blue-600)" color="#fff">
        Start first workout
      </Pill>
    </div>
  );
}
