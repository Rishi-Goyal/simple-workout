import { listWarmups, daysSinceLastWarmup, type DayType, type Warmup } from "../db/queries";

const DEFAULT_TARGET_COUNT = 3;

function scoreOf(w: Warmup): number {
  const days = daysSinceLastWarmup(w.id) ?? 30;
  // Jitter breaks ties so back-to-back sessions don't pick identically.
  const jitter = Math.random() * 0.9;
  return days + 1 + jitter;
}

export function selectWarmupsFor(
  day_type: DayType,
  target = DEFAULT_TARGET_COUNT,
  exclude: number[] = []
): Warmup[] {
  const pool = listWarmups(day_type).filter((w) => !exclude.includes(w.id));
  if (pool.length === 0) return [];

  const scored = pool.map((w) => ({ w, score: scoreOf(w) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, target).map((s) => s.w);
}

export function swapWarmup(
  day_type: DayType,
  currentId: number,
  alsoExclude: number[] = []
): Warmup | null {
  const exclude = [currentId, ...alsoExclude];
  const next = selectWarmupsFor(day_type, 1, exclude);
  return next[0] ?? null;
}
