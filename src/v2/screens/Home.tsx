import { useNavigate } from "react-router-dom";
import { useDbVersion } from "../../db/client";
import { nextDay, planFor, targetLabel } from "../engine";
import {
  createSession,
  discardSession,
  getEquipTier,
  getLevels,
  getPref,
  lastFinishedSession,
  sessionItems,
  setCount,
  streaks,
  unfinishedSession
} from "../queries";
import { useV2Session } from "../sessionStore";
import { viewTransition } from "../motion";
import { HomeNav, Icon, Pill } from "../ui";
import { InstallPrompt } from "../../components/InstallPrompt";

function todayShort(): string {
  return new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function HomeV2() {
  const navigate = useNavigate();
  useDbVersion();
  const session = useV2Session();

  const levels = getLevels();
  const tier = getEquipTier();
  const last = lastFinishedSession();
  const day = session.dayOverride ?? nextDay(last?.day_type ?? null);
  const plan = planFor(day, levels, tier);
  const { current: streak } = streaks();
  const firstEver = !last;
  const unfinished = unfinishedSession();
  const unfinishedSets = unfinished ? setCount(unfinished.id) : 0;
  const dayWord = day[0].toUpperCase() + day.slice(1);
  const warmupFirst = getPref("warmup_first") === "1";

  function start() {
    if (unfinished) discardSession(unfinished.id);
    const id = createSession(day, plan.map((p) => p.exercise.id));
    viewTransition(() => {
      session.begin(id, warmupFirst);
      navigate("/session");
    });
  }

  function resume() {
    if (!unfinished) return;
    viewTransition(() => {
      if (session.sessionId !== unfinished.id) {
        // Session was started elsewhere (or local state lost) — resume at the
        // first exercise that still has sets missing.
        const items = sessionItems(unfinished.id);
        session.begin(unfinished.id, false);
        const idx = items.findIndex((i) => i.outcome === "pending");
        session.setExIdx(Math.max(0, idx));
      } else {
        session.setPhase(session.phase === "rest" ? "rest" : "exercise");
      }
      navigate("/session");
    });
  }

  function discard() {
    if (!unfinished) return;
    if (!confirm(`Discard the unfinished ${unfinished.day_type} day and its sets?`)) return;
    discardSession(unfinished.id);
    if (session.sessionId === unfinished.id) session.clear();
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        color: "#fff",
        background: "var(--color-blue-600)"
      }}
    >
      <div style={{ position: "absolute", right: -140, top: 120, width: 420, height: 420, borderRadius: "50%", background: "rgba(255,255,255,.14)" }} />
      <div style={{ position: "absolute", right: -60, top: 300, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,.14)" }} />
      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", padding: "16px 24px 0", minHeight: 0, overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 48, flexShrink: 0 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500 }}>Simple Workout</span>
          <span style={{ fontSize: 14, color: "rgba(255,255,255,.85)" }}>{todayShort()}</span>
        </div>

        <InstallPrompt />

        <div
          className="anim-fade-up"
          style={{
            marginTop: 48,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            alignSelf: "flex-start",
            height: 32,
            padding: "0 12px",
            borderRadius: 999,
            background: streak > 0 ? "var(--color-yellow-400)" : "rgba(255,255,255,.2)",
            color: streak > 0 ? "var(--color-grey-900)" : "#fff",
            fontSize: 14,
            fontWeight: 500
          }}
        >
          {streak > 0 && <Icon name="local_fire_department" size={18} fill />}
          {streak > 0 ? `${streak} in a row` : "First workout"}
        </div>

        <div className="anim-fade-up anim-d1" style={{ marginTop: 20, fontFamily: "var(--font-display)", fontSize: 64, lineHeight: "64px", fontWeight: 500, letterSpacing: -2 }}>
          {dayWord}
          <br />
          day.
        </div>
        <div className="anim-fade-up anim-d2" style={{ marginTop: 16, fontSize: 18, lineHeight: "26px", color: "rgba(255,255,255,.9)", maxWidth: 300 }}>
          {firstEver
            ? "Three easy exercises to find your level. About 25 minutes."
            : `Three exercises. About ${day === "legs" ? 40 : 35} minutes. Everything’s picked.`}
        </div>

        <div style={{ flex: 1, minHeight: 24 }} />

        {unfinished && (
          <div
            style={{
              marginBottom: 16,
              borderRadius: 16,
              background: "#fff",
              color: "var(--color-grey-900)",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: 12
            }}
          >
            <Icon name="pause_circle" size={24} color="var(--color-grey-700)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 500 }}>Unfinished {unfinished.day_type} day</div>
              <div style={{ fontSize: 14, color: "var(--color-grey-700)" }}>
                {unfinishedSets} set{unfinishedSets === 1 ? "" : "s"} logged
              </div>
            </div>
            <Pill onClick={resume} background="var(--color-blue-600)" color="#fff" height={40} fontSize={14} style={{ width: "auto", padding: "0 16px" }}>
              Resume
            </Pill>
            <span className="tap" style={{ padding: 8, cursor: "pointer" }} onClick={discard} aria-label="Discard unfinished workout">
              <Icon name="close" size={22} color="var(--color-grey-600)" />
            </span>
          </div>
        )}

        <div className="anim-fade-up anim-d2" style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24, fontSize: 15, lineHeight: "22px", color: "rgba(255,255,255,.9)" }}>
          {plan.map((p) => (
            <div key={p.pattern} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.exercise.name}</span>
              <span style={{ color: "rgba(255,255,255,.7)", whiteSpace: "nowrap" }}>
                {targetLabel(p.exercise.target)}
              </span>
            </div>
          ))}
        </div>

        <Pill onClick={start} background="#fff" color="var(--color-blue-700)" height={64} fontSize={18} style={{ animation: "v2-fade-up .24s ease-out .12s both" }}>
          <Icon name="play_arrow" size={26} fill />
          {unfinished ? "Start over" : "Start"}
        </Pill>
        <div
          className="tap"
          onClick={() => session.setDayOverride(nextDay(day))}
          style={{ textAlign: "center", padding: "14px 0 12px", fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,.85)", flexShrink: 0, cursor: "pointer" }}
        >
          Not today — switch day
        </div>
      </div>
      <HomeNav />
    </div>
  );
}
