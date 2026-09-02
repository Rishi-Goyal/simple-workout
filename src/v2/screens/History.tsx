import { useNavigate } from "react-router-dom";
import { useDbVersion } from "../../db/client";
import { localDateIso } from "../../lib/dates";
import type { DayType } from "../ladders";
import { historyEntries, streaks } from "../queries";
import { Icon, LightNav, Pill, SectionLabel } from "../ui";

const DAY_CHIP: Record<DayType, { bg: string; fg: string }> = {
  push: { bg: "var(--color-red-50)", fg: "var(--color-red-700)" },
  pull: { bg: "var(--color-blue-50)", fg: "var(--color-blue-700)" },
  legs: { bg: "var(--color-green-50)", fg: "var(--color-green-800)" }
};

function whenLabel(dateIso: string): string {
  const today = new Date(localDateIso() + "T00:00:00");
  const d = new Date(dateIso + "T00:00:00");
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString("en-GB", { weekday: "long" });
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function weekBucket(dateIso: string): string {
  const today = new Date(localDateIso() + "T00:00:00");
  const d = new Date(dateIso + "T00:00:00");
  // ISO-ish week bucketing relative to today (Monday start)
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  if (d >= monday) return "This week";
  const lastMonday = new Date(monday);
  lastMonday.setDate(monday.getDate() - 7);
  if (d >= lastMonday) return "Last week";
  return "Earlier";
}

export function HistoryV2() {
  const navigate = useNavigate();
  useDbVersion();
  const entries = historyEntries();
  const { best } = streaks();
  const avg = entries.length ? Math.round(entries.reduce((a, e) => a + e.minutes, 0) / entries.length) : 0;

  const groups: { title: string; items: typeof entries }[] = [];
  for (const e of entries) {
    const title = weekBucket(e.date);
    const g = groups.find((x) => x.title === title);
    if (g) g.items.push(e);
    else groups.push({ title, items: [e] });
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 0" }}>
        <div style={{ height: 48, display: "flex", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500 }}>History</span>
        </div>

        {entries.length > 0 ? (
          <>
            <div className="anim-fade-up" style={{ marginTop: 24, display: "flex", gap: 12 }}>
              {[
                { big: entries.length, label: entries.length === 1 ? "workout" : "workouts" },
                { big: best, label: "best streak" },
                { big: avg, label: "avg min" }
              ].map((s, i) => (
                <div key={i} style={{ flex: 1, border: "1px solid var(--color-grey-300)", borderRadius: 16, padding: 16 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 32, lineHeight: "36px" }}>{s.big}</div>
                  <div style={{ marginTop: 4, fontSize: 14, color: "var(--color-grey-700)" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {groups.map((g) => (
              <div key={g.title} className="anim-fade-up anim-d1">
                <SectionLabel style={{ marginTop: 28 }}>{g.title}</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {g.items.map((h) => (
                    <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--color-grey-200)" }}>
                      <span
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          background: DAY_CHIP[h.day].bg,
                          color: DAY_CHIP[h.day].fg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          fontWeight: 500,
                          flexShrink: 0
                        }}
                      >
                        {h.day[0].toUpperCase() + h.day.slice(1)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 16 }}>
                          {whenLabel(h.date)} · {h.minutes} min
                        </div>
                        <div style={{ fontSize: 14, color: "var(--color-grey-700)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {h.names}
                        </div>
                      </div>
                      {h.leveledUp && <Icon name="arrow_upward" size={20} color="var(--color-green-700)" />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ height: 24 }} />
          </>
        ) : (
          <div className="anim-fade-up" style={{ marginTop: 120, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
            <Icon name="history" size={48} color="var(--color-grey-400)" />
            <div style={{ fontFamily: "var(--font-display)", fontSize: 24 }}>Nothing here yet</div>
            <div style={{ fontSize: 16, lineHeight: "24px", color: "var(--color-grey-700)", maxWidth: 260 }}>
              Your first workout shows up here the moment you finish it.
            </div>
            <Pill onClick={() => navigate("/")} background="var(--color-blue-600)" color="#fff" height={40} fontSize={14} style={{ width: "auto", marginTop: 12 }}>
              Go to today
            </Pill>
          </div>
        )}
      </div>
      <LightNav active="/history" />
    </div>
  );
}
