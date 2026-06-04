import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HowTo } from "../components/HowTo";
import {
  getExercise,
  getWarmup,
  getWorkout,
  logWarmupCompletion,
  type Warmup
} from "../db/queries";
import { selectWarmupsFor, swapWarmup } from "../lib/selectWarmup";
import { useSession } from "../state/session";
import { useDbVersion } from "../db/client";

const DEFAULT_COUNT = 3;

export function WarmupScreen() {
  const navigate = useNavigate();
  const { workoutId, exerciseIds, warmupIds, warmupDone, setWarmups, toggleWarmupDone, clear } =
    useSession();
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

  // Pick warmups once when the screen mounts for this workout.
  useEffect(() => {
    if (workout && warmupIds.length === 0) {
      const picks = selectWarmupsFor(workout.day_type, DEFAULT_COUNT);
      setWarmups(picks.map((w) => w.id));
    }
  }, [workout?.day_type, warmupIds.length]);

  if (!workout) {
    return <div className="text-slate-400">Workout not found.</div>;
  }

  const warmups = warmupIds
    .map((id) => getWarmup(id))
    .filter((w): w is Warmup => !!w);

  const mainLifts = exerciseIds
    .map((id) => getExercise(id))
    .filter((e): e is NonNullable<ReturnType<typeof getExercise>> => !!e);

  function onSwap(currentId: number) {
    if (!workout) return;
    const next = swapWarmup(workout.day_type, currentId, warmupIds);
    if (!next) return;
    setWarmups(warmupIds.map((id) => (id === currentId ? next.id : id)));
  }

  function onShuffleAll() {
    if (!workout) return;
    const picks = selectWarmupsFor(workout.day_type, DEFAULT_COUNT, warmupIds);
    if (picks.length === 0) return;
    setWarmups(picks.map((w) => w.id));
  }

  function flushAndStart() {
    for (const id of warmupIds) {
      if (warmupDone[id]) logWarmupCompletion(workoutId!, id);
    }
    navigate("/workout/active");
  }

  function onSkip() {
    navigate("/workout/active");
  }

  function onCancel() {
    clear();
    navigate("/");
  }

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold capitalize">{workout.day_type} warmup</h1>
          <p className="text-sm text-slate-400">{workout.date}</p>
        </div>
        <button onClick={onCancel} className="rounded-lg bg-slate-700 px-3 py-2 text-sm">
          Cancel
        </button>
      </header>

      {mainLifts.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">Today's lifts</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {mainLifts.map((ex) => (
              <span
                key={ex.id}
                className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200"
              >
                {ex.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {warmups.map((w) => {
          const done = !!warmupDone[w.id];
          return (
            <section
              key={w.id}
              className={`rounded-2xl p-4 shadow transition ${
                done ? "bg-slate-800/60 ring-1 ring-emerald-600/40" : "bg-slate-800"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">{w.name}</h2>
                  {w.description && (
                    <p className="mt-1 text-xs text-slate-400">{w.description}</p>
                  )}
                </div>
                <button
                  onClick={() => onSwap(w.id)}
                  aria-label="Swap"
                  title="Swap"
                  className="rounded-lg bg-slate-700 px-2 py-1 text-base"
                >
                  ↻
                </button>
              </div>

              {w.how_to && <HowTo text={w.how_to} />}

              <button
                onClick={() => toggleWarmupDone(w.id)}
                className={`mt-3 w-full rounded-lg px-4 py-2 text-sm font-medium ${
                  done ? "bg-emerald-700" : "bg-slate-700"
                }`}
              >
                {done ? "✓ Done" : "Mark done"}
              </button>
            </section>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <button
          onClick={flushAndStart}
          className="rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold"
        >
          Start workout
        </button>
        <div className="flex gap-2">
          <button
            onClick={onShuffleAll}
            className="flex-1 rounded-lg bg-slate-700 px-4 py-2 text-sm"
          >
            Shuffle all
          </button>
          <button
            onClick={onSkip}
            className="flex-1 rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300"
          >
            Skip warmup
          </button>
        </div>
      </div>
    </div>
  );
}
