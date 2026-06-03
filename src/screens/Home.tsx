import { useNavigate } from "react-router-dom";
import { createWorkout, lastWorkoutOfType, type DayType } from "../db/queries";
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
  useDbVersion(); // re-render after writes

  const lastByType = Object.fromEntries(
    DAYS.map((d) => [d.type, lastWorkoutOfType(d.type)])
  );

  function start(type: DayType) {
    const picks = selectExercisesFor(type);
    if (picks.length === 0) {
      alert(`No ${type} exercises in the catalog yet — add some on the Exercises tab.`);
      return;
    }
    const workoutId = createWorkout(type);
    setActive(workoutId, picks.map((e) => e.id));
    navigate("/workout/active");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-sm text-slate-400">Pick a day type to start a workout.</p>
      </header>

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
