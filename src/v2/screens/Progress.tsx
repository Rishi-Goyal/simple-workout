import { useDbVersion } from "../../db/client";
import { LADDERS } from "../ladders";
import { maxRung } from "../engine";
import { getLevels, recentPromotions } from "../queries";
import { Icon, LightNav, SectionLabel } from "../ui";

export function ProgressV2() {
  useDbVersion();
  const levels = getLevels();
  const promoted = recentPromotions();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 0" }}>
        <div style={{ height: 48, display: "flex", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500 }}>Progress</span>
        </div>
        <div style={{ marginTop: 16, fontSize: 16, lineHeight: "24px", color: "var(--color-grey-700)" }}>
          Each movement is a ladder. You climb a rung when you hit the top of the rep range twice.
        </div>
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          {LADDERS.map((L) => {
            const rung = levels[L.pattern];
            const total = maxRung(L.pattern);
            const current = L.rungs.find((r) => r.rung === rung && r.canonical) ?? L.rungs.find((r) => r.rung === rung);
            const next = L.rungs.find((r) => r.rung === rung + 1 && r.canonical) ?? L.rungs.find((r) => r.rung === rung + 1);
            const isNew = promoted.has(L.pattern);
            return (
              <div key={L.pattern} style={{ border: "1px solid var(--color-grey-300)", borderRadius: 16, padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <SectionLabel>{L.label}</SectionLabel>
                  <span style={{ fontSize: 14, color: "var(--color-grey-700)", whiteSpace: "nowrap" }}>
                    Rung {rung} of {total}
                  </span>
                </div>
                <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 22, lineHeight: "28px" }}>{current?.name}</span>
                  {isNew && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        height: 24,
                        padding: "0 8px",
                        borderRadius: 999,
                        background: "var(--color-green-50)",
                        color: "var(--color-green-800)",
                        fontSize: 12,
                        fontWeight: 500,
                        whiteSpace: "nowrap"
                      }}
                    >
                      <Icon name="arrow_upward" size={14} />
                      New
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 12, display: "flex", gap: 4 }}>
                  {Array.from({ length: total }, (_, i) => (
                    <span
                      key={i}
                      style={{
                        flex: 1,
                        height: 8,
                        borderRadius: 4,
                        background:
                          i < rung
                            ? isNew && i === rung - 1
                              ? "var(--color-green-500)"
                              : "var(--color-blue-600)"
                            : "var(--color-grey-200)"
                      }}
                    />
                  ))}
                </div>
                <div style={{ marginTop: 8, fontSize: 14, color: "var(--color-grey-700)" }}>
                  {next ? `Next: ${next.name}` : "Top of the ladder — progress by weight"}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ height: 24 }} />
      </div>
      <LightNav active="/progress" />
    </div>
  );
}
