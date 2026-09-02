import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDbVersion } from "../../db/client";
import { publishSessionToBridge } from "../../lib/calorieBridge";
import { getBackupConfig, maybeAutoBackup } from "../../lib/backupApi";
import { WARMUPS, type PatternId } from "../ladders";
import {
  aimLabel,
  aimValue,
  chipValues,
  getExerciseV2,
  ladderOf,
  nextWeight,
  shouldGraduate,
  targetLabel,
  valueLabel
} from "../engine";
import {
  clearSetsFor,
  finishSession,
  getPref,
  getSession,
  getWeight,
  logSetV2,
  previousTopStreak,
  sessionItems,
  setItemExercise,
  setItemOutcome,
  setLevel,
  setWeight,
  setsFor,
  streaks
} from "../queries";
import { useV2Session } from "../sessionStore";
import { viewTransition } from "../motion";
import { Icon, Pill } from "../ui";

function mmss(sec: number): string {
  const s = Math.max(0, sec);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

export function SessionV2() {
  const navigate = useNavigate();
  useDbVersion();
  const st = useV2Session();
  const sessionRow = st.sessionId != null ? getSession(st.sessionId) : undefined;

  // Self-heal: drop a stale pointer if the session row is gone or finished.
  // The finish phase legitimately shows a just-finished session, so it's exempt.
  const finishing = st.phase === "finish";
  useEffect(() => {
    if (st.sessionId != null && !finishing && (!sessionRow || sessionRow.finished_at)) {
      st.clear();
    }
  }, [st.sessionId, finishing, sessionRow?.finished_at]);

  if (st.sessionId == null || !sessionRow || (sessionRow.finished_at && !finishing)) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-grey-600)", fontSize: 16 }}>
        <span>
          No active workout.{" "}
          <Link to="/" style={{ color: "var(--color-blue-600)", fontWeight: 500 }}>
            Start one
          </Link>
        </span>
      </div>
    );
  }

  if (st.phase === "warmup") return <WarmupStep />;
  if (st.phase === "rest") return <RestStep />;
  if (st.phase === "finish") return <FinishStep />;
  return <ExerciseStep />;
}

// ---------------------------------------------------------------------------
// Step 0 — warm-up (folded into the stepper per OVERHAUL_PLAN)
// ---------------------------------------------------------------------------

function WarmupStep() {
  const navigate = useNavigate();
  const st = useV2Session();
  const session = getSession(st.sessionId!)!;
  const moves = WARMUPS.filter((w) => w.day === session.day_type);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px 24px 24px", minHeight: 0, overflowY: "auto" }}>
      <div style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 14, color: "var(--color-grey-700)" }}>Warm-up · about 4 minutes</span>
        <span
          className="tap"
          style={{ fontSize: 14, fontWeight: 500, color: "var(--color-blue-600)", padding: "8px 4px", cursor: "pointer" }}
          onClick={() => viewTransition(() => { st.clear(); navigate("/"); })}
        >
          Exit
        </span>
      </div>
      <div className="anim-fade-up" style={{ marginTop: 12, fontFamily: "var(--font-display)", fontSize: 32, lineHeight: "40px" }}>
        Loosen up first.
      </div>
      <div style={{ marginTop: 4, fontSize: 16, lineHeight: "24px", color: "var(--color-grey-700)" }}>
        Two easy moves. No timer — just until things feel loose.
      </div>
      <div className="anim-fade-up anim-d1" style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        {moves.map((w) => (
          <div key={w.id} style={{ border: "1px solid var(--color-grey-300)", borderRadius: 16, padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{w.name}</span>
              <span style={{ fontSize: 14, color: "var(--color-grey-700)", whiteSpace: "nowrap" }}>{targetLabel(w.target)}</span>
            </div>
            <ol style={{ margin: "8px 0 0", padding: "0 0 0 20px", fontSize: 14, lineHeight: "20px", color: "var(--color-grey-800)", display: "flex", flexDirection: "column", gap: 4 }}>
              {w.howTo.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 24 }} />
      <Pill
        onClick={() => viewTransition(() => st.setPhase("exercise"))}
        background="var(--color-blue-600)"
        color="#fff"
        height={64}
        fontSize={18}
      >
        <Icon name="check" size={26} />
        Warmed up — start
      </Pill>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The exercise stepper — one exercise, one decision
// ---------------------------------------------------------------------------

function ExerciseStep() {
  const navigate = useNavigate();
  useDbVersion();
  const st = useV2Session();
  const sessionId = st.sessionId!;
  const items = sessionItems(sessionId);
  const exIdx = Math.min(st.exIdx, items.length - 1);
  const item = items[exIdx];
  const ex = getExerciseV2(item.exercise_id)!;
  const ladder = ladderOf(ex.id)!;
  const sets = setsFor(sessionId, ex.id);
  const done = sets.length >= ex.target.sets;
  const last = exIdx >= items.length - 1;
  const weight = getWeight(ex.id);
  const easierEx = ex.rung > 1 ? ladder.rungs.find((r) => r.rung === ex.rung - 1 && r.canonical) ?? ladder.rungs.find((r) => r.rung === ex.rung - 1) : undefined;

  function log(value: number) {
    if (done) return;
    logSetV2(sessionId, ex.id, sets.length + 1, value, weight);
    const willBeDone = sets.length + 1 >= ex.target.sets;
    if (willBeDone) {
      setItemOutcome(sessionId, exIdx, item.outcome === "swapped_down" ? "swapped_down" : "done");
    } else {
      viewTransition(() => st.startRest(Number(getPref("rest_seconds")) || 90));
    }
  }

  function advance() {
    viewTransition(() => {
      if (last) {
        st.setPhase("finish");
      } else {
        st.setExIdx(exIdx + 1);
      }
    });
  }

  function skip() {
    if (!done) setItemOutcome(sessionId, exIdx, "skipped");
    advance();
  }

  function tooHard() {
    if (!easierEx) return;
    // Demote right now: the session swaps to the easier rung and the stored
    // ladder level remembers it (only "too hard" ever demotes).
    clearSetsFor(sessionId, ex.id);
    setItemExercise(sessionId, exIdx, easierEx.id, "swapped_down");
    setLevel(ladder.pattern, easierEx.rung);
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px 24px 24px", minHeight: 0, overflowY: "auto" }}>
      <div style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {items.map((_, i) => (
            <span
              key={i}
              style={{
                height: 6,
                borderRadius: 3,
                width: i === exIdx ? 28 : 8,
                background: i < exIdx ? "var(--color-green-500)" : i === exIdx ? "var(--color-blue-600)" : "var(--color-grey-300)",
                transition: "width .25s, background .25s"
              }}
            />
          ))}
          <span style={{ marginLeft: 8, fontSize: 14, color: "var(--color-grey-700)" }}>
            Exercise {exIdx + 1} of {items.length}
          </span>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span className="tap" style={{ padding: 8, cursor: "pointer" }} onClick={skip} aria-label="Skip exercise">
            <Icon name="skip_next" size={24} color="var(--color-grey-700)" />
          </span>
          <span
            className="tap"
            style={{ fontSize: 14, fontWeight: 500, color: "var(--color-blue-600)", padding: "8px 4px", cursor: "pointer" }}
            onClick={() => viewTransition(() => navigate("/"))}
          >
            Exit
          </span>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          height: 180,
          borderRadius: 16,
          background: "var(--color-grey-100)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          color: "var(--color-grey-600)",
          border: "1px dashed var(--color-grey-300)",
          flexShrink: 0
        }}
      >
        <Icon name="image" size={40} />
        <span style={{ fontSize: 12, letterSpacing: 0.4 }}>
          {ex.mediaRef ? ex.name : `Photo — ${ex.name} (pending verification)`}
        </span>
      </div>

      <div style={{ marginTop: 20, fontSize: 12, fontWeight: 500, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--color-grey-600)" }}>
        {ladder.label} · rung {ex.rung} of {Math.max(...ladder.rungs.map((r) => r.rung))}
      </div>
      <div style={{ marginTop: 4, fontFamily: "var(--font-display)", fontSize: 32, lineHeight: "40px", textWrap: "balance" as never }}>
        {ex.name}
      </div>
      <div style={{ marginTop: 4, fontSize: 16, lineHeight: "24px", color: "var(--color-grey-700)" }}>{ex.cue}</div>

      <div style={{ marginTop: 20, display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 24 }}>
          Set {Math.min(sets.length + 1, ex.target.sets)} of {ex.target.sets}
        </span>
        <span style={{ fontSize: 16, color: "var(--color-grey-700)" }}>
          · aim for {aimLabel(ex.target)}
          {weight != null ? ` · ${weight} kg` : ""}
        </span>
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", minHeight: 32 }}>
        {sets.map((s, i) => (
          <span
            key={i}
            className="anim-pop"
            style={{
              height: 32,
              padding: "0 12px",
              borderRadius: 8,
              background: "var(--color-green-50)",
              color: "var(--color-green-800)",
              fontSize: 14,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 4
            }}
          >
            <Icon name="check" size={16} />
            {valueLabel(ex.target, s.value)}
          </span>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 16 }} />

      {done ? (
        <div className="anim-fade-up" style={{ borderRadius: 16, background: "var(--color-green-50)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <Icon name="task_alt" size={28} fill color="var(--color-green-700)" />
          <div style={{ flex: 1, fontSize: 16 }}>All {ex.target.sets} sets done.</div>
          <Pill onClick={advance} background="var(--color-green-700)" color="#fff" height={40} fontSize={14} style={{ width: "auto", padding: "0 20px", whiteSpace: "nowrap" }}>
            {last ? "Finish workout" : "Next exercise"}
          </Pill>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
            <span style={{ fontSize: 14, color: "var(--color-grey-700)", marginRight: 4 }}>Got fewer?</span>
            {chipValues(ex.target).map((v) => (
              <button
                key={v}
                className="tap"
                onClick={() => log(v)}
                style={{
                  minWidth: 44,
                  height: 44,
                  padding: "0 8px",
                  borderRadius: 22,
                  border: "1px solid var(--color-grey-300)",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 500,
                  fontFamily: "var(--font-body)",
                  cursor: "pointer"
                }}
              >
                {valueLabel(ex.target, v)}
              </button>
            ))}
          </div>
          <Pill onClick={() => log(aimValue(ex.target))} background="var(--color-blue-600)" color="#fff" height={64} fontSize={18}>
            <Icon name="check" size={26} />
            Done — got {aimLabel(ex.target)}
          </Pill>
        </>
      )}

      <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
        {easierEx ? (
          <span
            className="tap"
            onClick={tooHard}
            style={{ fontSize: 14, fontWeight: 500, color: "var(--color-blue-600)", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
          >
            <Icon name="arrow_downward" size={18} />
            Too hard — {easierEx.name.toLowerCase()}
          </span>
        ) : (
          <span style={{ fontSize: 14, color: "var(--color-grey-600)" }}>Easiest rung</span>
        )}
        <span
          className="tap"
          onClick={() => st.toggleHowTo()}
          style={{ fontSize: 14, fontWeight: 500, color: "var(--color-grey-700)", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
        >
          <Icon name="info" size={18} />
          How to
        </span>
      </div>
      {st.howToOpen && (
        <ol className="anim-fade-up" style={{ margin: "12px 0 0", padding: "0 0 0 20px", fontSize: 14, lineHeight: "20px", color: "var(--color-grey-800)", display: "flex", flexDirection: "column", gap: 4 }}>
          {ex.howTo.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rest — dark full-screen countdown
// ---------------------------------------------------------------------------

function RestStep() {
  const navigate = useNavigate();
  const st = useV2Session();
  const sessionId = st.sessionId!;
  const items = sessionItems(sessionId);
  const exIdx = Math.min(st.exIdx, items.length - 1);
  const ex = getExerciseV2(items[exIdx].exercise_id)!;
  const sets = setsFor(sessionId, ex.id);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const left = Math.max(0, Math.ceil(((st.restEndsAt ?? now) - now) / 1000));
  const total = st.restTotalSec || 90;

  useEffect(() => {
    if (left <= 0) {
      if (getPref("vibrate") === "1" && "vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
      viewTransition(() => st.setPhase("exercise"));
    }
  }, [left <= 0]);

  const dashOffset = 804 * (1 - left / total);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 24px 24px", background: "var(--color-grey-900)", color: "#fff", overflowY: "auto" }}>
      <div style={{ height: 48, width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 14, color: "var(--color-grey-400)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {ex.name} · set {sets.length} done
        </span>
        <span
          className="tap"
          style={{ fontSize: 14, fontWeight: 500, color: "var(--color-blue-300)", padding: "8px 4px", cursor: "pointer" }}
          onClick={() => viewTransition(() => navigate("/"))}
        >
          Exit
        </span>
      </div>
      <div className="anim-fade-up" style={{ marginTop: 48, fontSize: 16, letterSpacing: 0.5, color: "var(--color-grey-400)" }}>Rest</div>
      <div className="anim-fade-up anim-d1" style={{ position: "relative", width: 280, height: 280, marginTop: 24, flexShrink: 0 }}>
        <svg viewBox="0 0 280 280" width="280" height="280" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx="140" cy="140" r="128" fill="none" stroke="#3C4043" strokeWidth="10" />
          <circle
            className="ring"
            cx="140"
            cy="140"
            r="128"
            fill="none"
            stroke="#8AB4F8"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="804"
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 88, lineHeight: "88px", letterSpacing: -2 }}>{mmss(left)}</span>
          <span style={{ marginTop: 8, fontSize: 14, color: "var(--color-grey-400)" }}>of {mmss(total)}</span>
        </div>
      </div>
      <div style={{ marginTop: 40, fontSize: 14, color: "var(--color-grey-400)" }}>Up next</div>
      <div style={{ marginTop: 4, fontFamily: "var(--font-display)", fontSize: 24, textAlign: "center" }}>
        Set {Math.min(sets.length + 1, ex.target.sets)} of {ex.target.sets} · aim for {aimLabel(ex.target)}
      </div>
      <div style={{ flex: 1, minHeight: 24 }} />
      <div style={{ display: "flex", gap: 12, width: "100%" }}>
        <Pill onClick={() => st.addRest(30)} background="transparent" color="#fff" border="1px solid var(--color-grey-600)" flex={1}>
          +30 s
        </Pill>
        <Pill onClick={() => viewTransition(() => st.setPhase("exercise"))} background="#fff" color="var(--color-grey-900)" flex={2} gap={8}>
          <Icon name="skip_next" size={22} />
          Skip — go now
        </Pill>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Finish — summary, streak, level-ups, bridge + backup
// ---------------------------------------------------------------------------

function FinishStep() {
  const navigate = useNavigate();
  useDbVersion();
  const st = useV2Session();
  const sessionId = st.sessionId!;

  // Finalize once, in an effect: finishSession/setLevel fire notifyChange,
  // which must not run while other subscribed components are rendering.
  const [finalized, setFinalized] = useState(() => Boolean(getSession(sessionId)?.finished_at));
  useEffect(() => {
    const session = getSession(sessionId);
    if (!session || session.finished_at) return;
    const items = sessionItems(sessionId);
    const levelUps: { pattern: PatternId; fromName: string; toName: string }[] = [];
    for (const item of items) {
      const ex = getExerciseV2(item.exercise_id);
      if (!ex || item.outcome === "skipped" || item.outcome === "swapped_down") continue;
      const sets = setsFor(sessionId, ex.id);
      if (sets.length === 0) continue;
      const ladder = ladderOf(ex.id)!;
      // weight progression for loaded rungs
      if (ex.load === "loaded") {
        const cur = getWeight(ex.id) ?? 0;
        const next = nextWeight(ex, sets, cur);
        if (next !== cur) setWeight(ex.id, next);
      }
      if (shouldGraduate(ex, sets, previousTopStreak(ex.id, sessionId)) && ex.rung < Math.max(...ladder.rungs.map((r) => r.rung))) {
        const to = ladder.rungs.find((r) => r.rung === ex.rung + 1 && r.canonical) ?? ladder.rungs.find((r) => r.rung === ex.rung + 1);
        if (to) {
          setLevel(ladder.pattern, to.rung);
          levelUps.push({ pattern: ladder.pattern, fromName: ex.name, toName: to.name });
        }
      }
    }
    const started = session.started_at ? new Date(session.started_at).getTime() : Date.now();
    const mins = Math.max(1, Math.round((Date.now() - started) / 60000));
    finishSession(sessionId, mins, levelUps);
    void publishSessionToBridge(getSession(sessionId)!);
    maybeAutoBackup();
    setFinalized(true);
  }, [sessionId]);

  const session = getSession(sessionId)!;
  if (!finalized && !session.finished_at) {
    return <div style={{ flex: 1 }} />;
  }
  const levelUps = JSON.parse(session.level_ups_json || "[]") as { pattern: PatternId; fromName: string; toName: string }[];
  const items = sessionItems(sessionId);
  const { current: streak } = streaks();
  const dayWord = session.day_type[0].toUpperCase() + session.day_type.slice(1);
  const rotation = ["push", "pull", "legs"] as const;
  const nextDayWord = rotation[(rotation.indexOf(session.day_type) + 1) % 3];
  const backupOn = (() => {
    const c = getBackupConfig();
    return Boolean(c.url && c.user && c.password);
  })();
  const mins = session.duration_min ?? 1;

  function goHome() {
    viewTransition(() => {
      st.clear();
      navigate("/");
    });
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 24px 24px", overflowY: "auto" }}>
      <div style={{ height: 48, flexShrink: 0 }} />
      <div className="anim-pop" style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--color-green-50)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name="check" size={40} fill color="var(--color-green-700)" />
      </div>
      <div className="anim-fade-up anim-d1" style={{ marginTop: 24, fontFamily: "var(--font-display)", fontSize: 36, lineHeight: "44px" }}>
        Done.
        <br />
        {mins} minute{mins === 1 ? "" : "s"}.
      </div>
      <div className="anim-fade-up anim-d1" style={{ marginTop: 8, fontSize: 16, lineHeight: "24px", color: "var(--color-grey-700)" }}>
        {dayWord} day · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
      </div>

      <div className="anim-fade-up anim-d2" style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderRadius: 16, background: "var(--color-yellow-50)" }}>
        <Icon name="local_fire_department" size={28} fill color="var(--color-yellow-700)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 500 }}>{streak <= 1 ? "First one done" : `${streak} in a row`}</div>
          <div style={{ fontSize: 14, color: "var(--color-grey-700)" }}>
            {streak <= 1
              ? "Come back in a day or two and it becomes a streak."
              : `Next one keeps it going — ${nextDayWord} day, ~30 min.`}
          </div>
        </div>
      </div>

      {levelUps.map((lu) => (
        <div key={lu.pattern} className="anim-fade-up anim-d2" style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderRadius: 16, background: "var(--color-green-50)" }}>
          <Icon name="arrow_upward" size={28} color="var(--color-green-700)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 500 }}>
              Level up: {lu.fromName} → {lu.toName}
            </div>
            <div style={{ fontSize: 14, color: "var(--color-grey-700)" }}>You hit the top of the range every set.</div>
          </div>
        </div>
      ))}

      <div className="anim-fade-up anim-d3" style={{ marginTop: 24, display: "flex", flexDirection: "column" }}>
        {items.map((item) => {
          const ex = getExerciseV2(item.exercise_id)!;
          const sets = setsFor(sessionId, ex.id);
          return (
            <div key={item.position} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "12px 0", borderBottom: "1px solid var(--color-grey-200)", fontSize: 16 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.name}</span>
              <span style={{ color: "var(--color-grey-700)", whiteSpace: "nowrap" }}>
                {sets.length ? sets.map((s) => valueLabel(ex.target, s.value)).join(" · ") : "skipped"}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ flex: 1, minHeight: 24 }} />
      <div style={{ fontSize: 12, letterSpacing: 0.4, color: "var(--color-grey-600)", textAlign: "center", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <Icon name={backupOn ? "cloud_done" : "cloud_off"} size={16} />
        {backupOn ? "Backed up · shared with calorie counter" : "Shared with calorie counter"}
      </div>
      <Pill onClick={goHome} background="var(--color-blue-600)" color="#fff">
        Back to today
      </Pill>
    </div>
  );
}
