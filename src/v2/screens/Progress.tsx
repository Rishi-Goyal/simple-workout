import { useDbVersion } from "../../db/client";
import { LADDERS } from "../ladders";
import { equipmentList, maxRung, missingEquipment, resolveExercise } from "../engine";
import { getEquipTier, getLevels, recentPromotions } from "../queries";
import { Icon, LightNav, SectionLabel } from "../ui";

export function ProgressV2() {
  useDbVersion();
  const levels = getLevels();
  const tier = getEquipTier();
  const promoted = recentPromotions();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 0" }}>
        <div style={{ height: 48, display: "flex", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500 }}>Progress</span>
        </div>
        <div className="anim-fade-up" style={{ marginTop: 16, fontSize: 16, lineHeight: "24px", color: "var(--color-grey-700)" }}>
          Each movement is a ladder. You climb a rung when you hit the top of the rep range twice.
        </div>
        <div className="anim-fade-up anim-d1" style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          {LADDERS.map((L) => {
            const rung = levels[L.pattern];
            const total = maxRung(L.pattern);
            // What the user actually does today (may sit below the stored rung
            // when equipment blocks it), and what the next rung would need.
            const current = resolveExercise(L.pattern, rung, tier);
            // "Next" is the rung just above what the user actually does — when
            // equipment holds them below the stored rung, that is the honest
            // next step (and what it needs).
            const nextRung = current ? current.rung + 1 : 1;
            const nextCanonical = L.rungs.find((r) => r.rung === nextRung && r.canonical) ?? L.rungs.find((r) => r.rung === nextRung);
            const nextUsable = nextCanonical ? resolveExercise(L.pattern, nextRung, tier) : undefined;
            const nextDoable = nextUsable && nextUsable.rung === nextRung ? nextUsable : undefined;
            const isNew = promoted.has(L.pattern);
            const topRung = current && current.rung === total;
            const nextLine = nextDoable
              ? `Next: ${nextDoable.name}`
              : nextCanonical
                ? `Next: ${nextCanonical.name} — needs ${equipmentList(missingEquipment(nextCanonical, tier))}`
                : topRung && current?.graduate.kind === "maintain"
                  ? "Top of the ladder"
                  : "Top of the ladder — progress by weight";
            return (
              <div key={L.pattern} style={{ border: "1px solid var(--color-grey-300)", borderRadius: 16, padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <SectionLabel>{L.label}</SectionLabel>
                  <span style={{ fontSize: 14, color: "var(--color-grey-700)", whiteSpace: "nowrap" }}>
                    Rung {rung} of {total}
                  </span>
                </div>
                <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 22, lineHeight: "28px" }}>
                    {current?.name ?? `Needs ${equipmentList(missingEquipment(L.rungs[0], tier))}`}
                  </span>
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
                      className={i < rung ? "anim-grow" : undefined}
                      style={{
                        flex: 1,
                        height: 8,
                        borderRadius: 4,
                        // filled segments sweep in left-to-right
                        animationDelay: i < rung ? `${0.08 + i * 0.05}s` : undefined,
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
                  {nextLine}
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
