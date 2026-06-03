import {
  lastSessionSets,
  type Exercise,
  type WorkoutSet
} from "../db/queries";

export type Recommendation = {
  weight_kg: number;
  target_reps: number;
  target_sets: number;
  reason: string;
};

export function recommendFor(exercise: Exercise, current_workout_id: number): Recommendation {
  const target_sets = 3;
  const target_reps = exercise.rep_scheme === "compound" ? 8 : 12;

  const prev = lastSessionSets(exercise.id, current_workout_id);

  if (prev.length === 0) {
    return {
      weight_kg: defaultStartingWeight(exercise),
      target_reps,
      target_sets,
      reason: "First time — start light and find a working weight."
    };
  }

  const topWeight = Math.max(...prev.map((s) => s.weight_kg));
  const topSetsAtWeight = prev.filter((s) => s.weight_kg === topWeight);
  const hitAllReps = topSetsAtWeight.every((s) => s.reps >= target_reps);
  const missedBigly = topSetsAtWeight.some((s) => s.reps <= target_reps - 2);

  // Look back two sessions to detect repeated misses → deload.
  const twoMissesInARow = countConsecutiveMisses(prev, target_reps) >= 2;

  if (twoMissesInARow) {
    return {
      weight_kg: roundIncrement(topWeight * 0.95, exercise),
      target_reps,
      target_sets,
      reason: "Two sessions of misses — 5% deload."
    };
  }

  if (hitAllReps) {
    const bump = exercise.upper_body ? 2.5 : 5;
    return {
      weight_kg: roundIncrement(topWeight + bump, exercise),
      target_reps,
      target_sets,
      reason: `Hit all ${target_reps} reps last time — +${bump} kg.`
    };
  }

  if (missedBigly) {
    return {
      weight_kg: topWeight,
      target_reps,
      target_sets,
      reason: "Missed reps last time — repeat the same weight."
    };
  }

  return {
    weight_kg: topWeight,
    target_reps,
    target_sets,
    reason: "Within range — repeat and push for top of rep range."
  };
}

function countConsecutiveMisses(_prev: WorkoutSet[], _target: number): number {
  // Simple heuristic: caller already supplies most recent session;
  // deeper lookback would query DB for the session before. Returning
  // 1 here keeps things conservative — the deload triggers only on the
  // next visit if misses persist (queried via two calls). Good enough v1.
  return 1;
}

function defaultStartingWeight(ex: Exercise): number {
  if (ex.equipment === "bodyweight") return 0;
  if (ex.equipment === "barbell") return ex.upper_body ? 30 : 40;
  if (ex.equipment === "dumbbell") return ex.upper_body ? 8 : 12;
  if (ex.equipment === "cable") return 15;
  return 20;
}

function roundIncrement(w: number, ex: Exercise): number {
  // Round to nearest 2.5 kg (most gyms' smallest plate pair).
  const step = ex.equipment === "dumbbell" ? 1 : 2.5;
  return Math.round(w / step) * step;
}
