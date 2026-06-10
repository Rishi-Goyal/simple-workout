import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  createWorkout,
  discardWorkout,
  exercisesForWorkout,
  getWorkout,
  lastWorkoutOfType,
  setsForWorkout,
  unfinishedWorkouts,
  type DayType,
  type Workout
} from "../db/queries";
import { InstallPrompt } from "../components/InstallPrompt";
import { selectExercisesFor } from "../lib/selectWorkout";
import { useSession } from "../state/session";
import { useDbVersion } from "../db/client";

const DAYS: { type: DayType; label: string; color: string }[] = [
  { type: "push", label: "Push", color: "bg-push" },
  { type: "pull", label: "Pull", color: "bg-pull" },
  { type: "legs", label: "Legs", color: "bg-legs" }
];

export function Home() {
  const navigate = useNavigate();
  const setActive = useSession((s) => s.setActive);
  const sessionWorkoutId = useSession((s) => s.workoutId);
  const clear = useSession((s) => s.clear);
  useDbVersion(); // re-render after writes

  // Drop a persisted session whose workout was finished or deleted elsewhere.
  useEffect(() => {
    if (sessionWorkoutId == null) return;
    const w = getWorkout(sessionWorkoutId);
    if (!w || w.finished_at) clear();
  }, [sessionWorkoutId]);

  const unfinished = unfinishedWorkouts();

  const lastByType = Object.fromEntries(
    DAYS.map((d) => [d.type, lastWorkoutOfType(d.type)])
  );

  function start(type: DayType) {
    const picks = selectExercisesFor(type);
    if (picks.length === 0) {
      alert(`No ${type} exercises in the catalog yet — add some on the Exercises tab.`);
      return;
    }
    const workoutId = createWorkout(type, picks.map((e) => e.id));
    setActive(workoutId, picks.map((e) => e.id));
    navigate("/workout/warmup");
  }

  function resume(w: Workout) {
    setActive(w.id, exercisesForWorkout(w.id));
    navigate("/workout/active");
  }

  function discard(w: Workout) {
    if (!confirm(`Discard the unfinished ${w.day_type} workout and its sets?`)) return;
    discardWorkout(w.id);
    if (sessionWorkoutId === w.id) clear();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-sm text-slate-400">Pick a day type to start a workout.</p>
      </header>

      <InstallPrompt />

      {unfinished.length > 0 && (
        <div className="space-y-3">
          {unfinished.map((w) => {
            const setCount = setsForWorkout(w.id).length;
            return (
              <div
                key={w.id}
                className="rounded-2xl bg-slate-800 p-4 shadow ring-1 ring-blue-600/40"
              >
                <div className="text-sm text-slate-400">Unfinished workout</div>
                <div className="mt-0.5 font-semibold">
                  <span className="capitalize">{w.day_type}</span> day — {formatDate(w.date)}
                  <span className="ml-2 text-sm font-normal text-slate-400">
                    {setCount} set{setCount === 1 ? "" : "s"} logged
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => resume(w)}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => discard(w)}
                    className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-300"
                  >
                    Discard
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-3">
        {DAYS.map((d) => {
          const last = lastByType[d.type];
          return (
            <button
              key={d.type}
              onClick={() => start(d.type)}
              className={`${d.color} rounded-2xl p-6 text-left shadow-lg active:scale-[0.99] transition`}
            >
              <div className="text-2xl font-bold">{d.label}</div>
              <div className="mt-1 text-sm opacity-90">
                {last
                  ? `Last ${d.label.toLowerCase()}: ${formatDate(last.date)}`
                  : "No previous session."}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const todayIso = new Date().toISOString().slice(0, 10);
  if (iso === todayIso) return "today";
  const d = new Date(iso + "T00:00:00");
  const today = new Date(todayIso + "T00:00:00");
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 1) return "yesterday";
  if (diff > 0 && diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString();
}
