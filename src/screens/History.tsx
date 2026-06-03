import { listWorkouts, setsForWorkout, getExercise } from "../db/queries";
import { useDbVersion } from "../db/client";

export function History() {
  useDbVersion();
  const workouts = listWorkouts();

  if (workouts.length === 0) {
    return <div className="text-slate-400">No workouts logged yet.</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">History</h1>
      <ul className="space-y-3">
        {workouts.map((w) => {
          const sets = setsForWorkout(w.id);
          const byEx = new Map<number, { name: string; sets: typeof sets }>();
          for (const s of sets) {
            const cur = byEx.get(s.exercise_id);
            if (cur) cur.sets.push(s);
            else byEx.set(s.exercise_id, { name: getExercise(s.exercise_id)?.name ?? "?", sets: [s] });
          }
          return (
            <li key={w.id} className="rounded-xl bg-slate-800 p-4">
              <div className="flex justify-between text-sm text-slate-400">
                <span className="capitalize">{w.day_type}</span>
                <span>{w.date}</span>
              </div>
              {byEx.size === 0 ? (
                <div className="mt-1 text-slate-500 text-sm">No sets logged.</div>
              ) : (
                <ul className="mt-2 space-y-1 text-sm">
                  {[...byEx.values()].map((g) => (
                    <li key={g.name}>
                      <span className="font-medium">{g.name}</span>{" "}
                      <span className="text-slate-400">
                        {g.sets.map((s) => `${s.weight_kg}×${s.reps}`).join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
