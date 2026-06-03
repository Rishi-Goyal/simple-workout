import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  finishWorkout,
  getExercise,
  getWorkout,
  logSet,
  setsForExerciseInWorkout
} from "../db/queries";
import { recommendFor } from "../lib/recommend";
import { recordStrengthFromSet } from "../lib/strength";
import { useSession } from "../state/session";
import { useDbVersion } from "../db/client";

export function ActiveWorkout() {
  const navigate = useNavigate();
  const { workoutId, exerciseIds, clear } = useSession();
  useDbVersion();

  if (workoutId == null) {
    return (
      <div className="text-center text-slate-400 mt-8">
        No active workout.{" "}
        <Link to="/" className="text-blue-400 underline">
          Start one
        </Link>
        .
      </div>
    );
  }

  const workout = getWorkout(workoutId);
  if (!workout) {
    return <div className="text-slate-400">Workout not found.</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold capitalize">{workout.day_type} day</h1>
          <p className="text-sm text-slate-400">{workout.date}</p>
        </div>
        <button
          onClick={() => {
            finishWorkout(workoutId);
            clear();
            navigate("/history");
          }}
          className="rounded-lg bg-slate-700 px-3 py-2 text-sm"
        >
          Finish
        </button>
      </header>

      <div className="space-y-4">
        {exerciseIds.map((eid) => (
          <ExerciseCard key={eid} workoutId={workoutId} exerciseId={eid} />
        ))}
      </div>
    </div>
  );
}

function ExerciseCard({ workoutId, exerciseId }: { workoutId: number; exerciseId: number }) {
  const ex = getExercise(exerciseId);
  const sets = setsForExerciseInWorkout(workoutId, exerciseId);
  const rec = useMemo(() => (ex ? recommendFor(ex, workoutId) : null), [ex, workoutId, sets.length]);
  const [weight, setWeight] = useState<string>("");
  const [reps, setReps] = useState<string>("");

  if (!ex || !rec) return null;

  const wForInput = weight === "" ? String(rec.weight_kg) : weight;
  const rForInput = reps === "" ? String(rec.target_reps) : reps;

  function onLog() {
    const w = Number(wForInput);
    const r = Number(rForInput);
    if (!Number.isFinite(w) || !Number.isFinite(r) || r <= 0) return;
    const setId = logSet({
      workout_id: workoutId,
      exercise_id: exerciseId,
      set_number: sets.length + 1,
      weight_kg: w,
      reps: r
    });
    recordStrengthFromSet({ exercise_id: exerciseId, set_id: setId, weight_kg: w, reps: r });
    setWeight("");
    setReps("");
  }

  return (
    <section className="rounded-2xl bg-slate-800 p-4 shadow">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{ex.name}</h2>
        <span className="text-xs uppercase tracking-wide text-slate-400">
          {ex.primary_muscle.replace("_", " ")}
        </span>
      </div>

      <div className="mt-2 text-sm text-slate-300">
        <span className="font-medium text-slate-100">
          {rec.target_sets} × {rec.target_reps} @ {rec.weight_kg} kg
        </span>{" "}
        <span className="text-slate-400">— {rec.reason}</span>
      </div>

      {sets.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {sets.map((s) => (
            <li key={s.id} className="flex justify-between text-slate-300">
              <span>Set {s.set_number}</span>
              <span>
                {s.weight_kg} kg × {s.reps}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        <label className="flex-1">
          <div className="text-xs text-slate-400">Weight (kg)</div>
          <input
            inputMode="decimal"
            value={wForInput}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full rounded bg-slate-900 px-2 py-2 text-base"
          />
        </label>
        <label className="flex-1">
          <div className="text-xs text-slate-400">Reps</div>
          <input
            inputMode="numeric"
            value={rForInput}
            onChange={(e) => setReps(e.target.value)}
            className="w-full rounded bg-slate-900 px-2 py-2 text-base"
          />
        </label>
        <button
          onClick={onLog}
          className="self-end rounded-lg bg-blue-600 px-4 py-2 text-base font-medium"
        >
          Log
        </button>
      </div>
    </section>
  );
}
