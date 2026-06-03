import { bestEst1RM, insertStrengthSnapshot, getExercise } from "../db/queries";

// Epley 1RM formula: weight * (1 + reps / 30)
export function epley1RM(weight_kg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight_kg;
  return weight_kg * (1 + reps / 30);
}

// On each completed set, attribute 1RM to muscles and snapshot if it's
// a new rolling best. Primary muscle: 100%. Secondary: 50%.
export function recordStrengthFromSet(input: {
  exercise_id: number;
  set_id: number;
  weight_kg: number;
  reps: number;
}) {
  const ex = getExercise(input.exercise_id);
  if (!ex) return;

  const oneRm = epley1RM(input.weight_kg, input.reps);
  if (oneRm <= 0) return;

  const updates: { muscle: string; value: number }[] = [
    { muscle: ex.primary_muscle, value: oneRm },
    ...ex.secondary_muscles.map((m) => ({ muscle: m, value: oneRm * 0.5 }))
  ];

  for (const u of updates) {
    const prevBest = bestEst1RM(u.muscle);
    if (u.value > prevBest) {
      insertStrengthSnapshot({
        muscle: u.muscle,
        est_1rm_kg: round1(u.value),
        source_set_id: input.set_id
      });
    }
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
