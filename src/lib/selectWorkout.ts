import { listExercises, daysSinceLastPerformed, type DayType, type Exercise } from "../db/queries";

const DEFAULT_TARGET_COUNT = 6;

export function selectExercisesFor(day_type: DayType, target = DEFAULT_TARGET_COUNT): Exercise[] {
  const pool = listExercises(day_type);
  if (pool.length === 0) return [];

  // Score = priority * recency. Compounds get priority 2, isolation 1.
  // Recency = days since last performed (null treated as 30).
  const scored = pool.map((ex) => {
    const priority = ex.is_compound ? 2 : 1;
    const days = daysSinceLastPerformed(ex.id) ?? 30;
    const score = priority * (days + 1);
    return { ex, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Greedy pick that ensures each primary muscle in the pool is covered
  // at least once before adding extras.
  const picked: Exercise[] = [];
  const muscles = new Set<string>();
  for (const { ex } of scored) {
    if (picked.length >= target) break;
    if (!muscles.has(ex.primary_muscle)) {
      picked.push(ex);
      muscles.add(ex.primary_muscle);
    }
  }
  // Fill remaining slots with the next highest-scored exercises.
  for (const { ex } of scored) {
    if (picked.length >= target) break;
    if (!picked.includes(ex)) picked.push(ex);
  }

  // Sort final list: compounds first, then isolation.
  picked.sort((a, b) => b.is_compound - a.is_compound);
  return picked;
}
