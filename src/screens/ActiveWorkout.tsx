import { useEffect, useMemo, useState } from "react";
import { HowTo } from "../components/HowTo";
import { Link, useNavigate } from "react-router-dom";
import {
  countWarmupCompletions,
  deleteSet,
  exercisesForWorkout,
  finishWorkout,
  getExercise,
  getWorkout,
  logSet,
  setsForExerciseInWorkout,
  updateSet,
  type WorkoutSet
} from "../db/queries";
import { recommendFor } from "../lib/recommend";
import { recordStrengthFromSet } from "../lib/strength";
import { useSession } from "../state/session";
import { useDbVersion } from "../db/client";

export function ActiveWorkout() {
  const navigate = useNavigate();
  const { workoutId, exerciseIds, setActive, clear } = useSession();
  useDbVersion();

  const workout = workoutId != null ? getWorkout(workoutId) : undefined;

  // Self-heal a restored session: drop it if the workout row is gone or
  // already finished; re-derive the exercise plan from the DB if missing.
  useEffect(() => {
    if (workoutId == null) return;
    if (!workout || workout.finished_at) {
      clear();
    } else if (exerciseIds.length === 0) {
      setActive(workoutId, exercisesForWorkout(workoutId));
    }
  }, [workoutId, workout?.finished_at, exerciseIds.length]);

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

  if (!workout) {
    return <div className="text-slate-400">Workout not found.</div>;
  }

  const warmupCount = countWarmupCompletions(workoutId);

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold capitalize">{workout.day_type} day</h1>
          <p className="text-sm text-slate-400">
            {workout.date}
            {warmupCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs text-emerald-300">
                Warmup ✓ {warmupCount}
              </span>
            )}
          </p>
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

function LoggedSetRow({ set }: { set: WorkoutSet }) {
  const [editing, setEditing] = useState(false);
  const [weight, setWeight] = useState<string>(String(set.weight_kg));
  const [reps, setReps] = useState<string>(String(set.reps));

  if (!editing) {
    return (
      <li className="flex justify-between text-slate-300">
        <span>Set {set.set_number}</span>
        <span className="flex items-center gap-3">
          <span>
            {set.weight_kg} kg × {set.reps}
          </span>
          <button
            onClick={() => {
              setWeight(String(set.weight_kg));
              setReps(String(set.reps));
              setEditing(true);
            }}
            className="text-xs text-blue-400"
            aria-label={`Edit set ${set.set_number}`}
          >
            edit
          </button>
        </span>
      </li>
    );
  }

  function onSave() {
    const w = Number(weight);
    const r = Number(reps);
    if (!Number.isFinite(w) || !Number.isFinite(r) || r <= 0) return;
    updateSet({ set_id: set.id, weight_kg: w, reps: r });
    setEditing(false);
  }

  function onDelete() {
    if (!confirm(`Delete set ${set.set_number}?`)) return;
    deleteSet(set.id);
  }

  return (
    <li className="flex items-center gap-2 text-slate-300">
      <span className="shrink-0">Set {set.set_number}</span>
      <input
        inputMode="decimal"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        className="w-16 rounded bg-slate-900 px-2 py-1 text-sm"
        aria-label="Weight (kg)"
      />
      <span className="text-xs text-slate-500">kg ×</span>
      <input
        inputMode="numeric"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        className="w-12 rounded bg-slate-900 px-2 py-1 text-sm"
        aria-label="Reps"
      />
      <button onClick={onSave} className="rounded bg-blue-600 px-2 py-1 text-xs">
        Save
      </button>
      <button
        onClick={() => setEditing(false)}
        className="rounded bg-slate-700 px-2 py-1 text-xs"
      >
        Cancel
      </button>
      <button
        onClick={onDelete}
        className="ml-auto rounded bg-red-900/60 px-2 py-1 text-xs text-red-200"
      >
        Delete
      </button>
    </li>
  );
}

function ExerciseCard({ workoutId, exerciseId }: { workoutId: number; exerciseId: number }) {
  const ex = getExercise(exerciseId);
  const sets = setsForExerciseInWorkout(workoutId, exerciseId);
  const rec = useMemo(() => (ex ? recommendFor(ex, workoutId) : null), [ex, workoutId, sets.length]);
  const [weight, setWeight] = useState<string | null>(null);
  const [reps, setReps] = useState<string | null>(null);

  if (!ex || !rec) return null;

  const wForInput = weight === null ? String(rec.weight_kg) : weight;
  const rForInput = reps === null ? String(rec.target_reps) : reps;

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
    setWeight(null);
    setReps(null);
  }

  return (
    <section className="rounded-2xl bg-slate-800 p-4 shadow">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{ex.name}</h2>
        <span className="text-xs uppercase tracking-wide text-slate-400">
          {ex.primary_muscle.replace("_", " ")}
        </span>
      </div>

      {ex.description && (
        <p className="mt-1 text-xs text-slate-400">{ex.description}</p>
      )}

      <div className="mt-2 text-sm text-slate-300">
        <span className="font-medium text-slate-100">
          {rec.target_sets} × {rec.target_reps} @ {rec.weight_kg} kg
        </span>{" "}
        <span className="text-slate-400">— {rec.reason}</span>
      </div>

      {ex.how_to && <HowTo text={ex.how_to} />}

      {sets.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {sets.map((s) => (
            <LoggedSetRow key={s.id} set={s} />
          ))}
        </ul>
      )}

      <div className="mt-3 flex gap-2 items-end">
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
