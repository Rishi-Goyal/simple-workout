/**
 * v2 progression engine — pure functions only (no DB, no React).
 * prescribe: (day, levels, equipment) -> today's plan
 * graduation/demotion rules per exercise come from the seed (ladders.ts).
 */
import {
  DAY_TEMPLATES,
  LADDERS,
  ROTATION,
  type DayType,
  type Equipment,
  type Implement,
  type Ladder,
  type LadderExercise,
  type PatternId,
  type Target
} from "./ladders";

export type EquipTier = "nothing" | "dumbbells" | "full_gym";

export const EQUIP_TIER_LABELS: Record<EquipTier, string> = {
  nothing: "Nothing",
  dumbbells: "Dumbbells",
  full_gym: "Full gym"
};

/** What each answer to "what do you have to train with?" makes available. */
const TIER_EQUIPMENT: Record<EquipTier, Equipment[]> = {
  nothing: ["none", "box"],
  dumbbells: ["none", "box", "dumbbell", "band", "pullup_bar"],
  full_gym: ["none", "box", "dumbbell", "band", "pullup_bar", "barbell", "bench", "machine"]
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  none: "nothing",
  box: "a box or chair",
  band: "a band",
  pullup_bar: "a pull-up bar",
  dumbbell: "dumbbells",
  barbell: "a barbell",
  bench: "a bench",
  machine: "a machine"
};

/** Every listed item is required (AND semantics). */
export function usable(ex: LadderExercise, tier: EquipTier): boolean {
  const have = TIER_EQUIPMENT[tier];
  return ex.equipment.every((e) => have.includes(e));
}

/** The equipment this exercise needs that the tier doesn't provide. */
export function missingEquipment(ex: LadderExercise, tier: EquipTier): Equipment[] {
  const have = TIER_EQUIPMENT[tier];
  return ex.equipment.filter((e) => !have.includes(e));
}

const ladderByPattern = new Map<PatternId, Ladder>(LADDERS.map((l) => [l.pattern, l]));
const exerciseIndex = new Map<string, { ex: LadderExercise; ladder: Ladder }>();
for (const ladder of LADDERS) {
  for (const ex of ladder.rungs) exerciseIndex.set(ex.id, { ex, ladder });
}

export function getLadder(pattern: PatternId): Ladder {
  return ladderByPattern.get(pattern)!;
}

export function getExerciseV2(id: string): LadderExercise | undefined {
  return exerciseIndex.get(id)?.ex;
}

export function ladderOf(id: string): Ladder | undefined {
  return exerciseIndex.get(id)?.ladder;
}

export function maxRung(pattern: PatternId): number {
  return Math.max(...getLadder(pattern).rungs.map((r) => r.rung));
}

/** Highest rung the tier can actually do; 0 when the whole ladder is blocked. */
export function maxUsableRung(pattern: PatternId, tier: EquipTier): number {
  return Math.max(0, ...getLadder(pattern).rungs.filter((r) => usable(r, tier)).map((r) => r.rung));
}

/**
 * The exercise a session prescribes for (pattern, level, equipment): the
 * canonical exercise at the level's rung, or an alternate there that the
 * equipment allows, else the nearest usable rung below (never above — missing
 * equipment must not push someone into a harder movement). The stored level
 * is untouched; only the session sees the substitution. `undefined` when no
 * rung of the ladder is usable at all (e.g. vertical pull with no bar).
 */
export function resolveExercise(pattern: PatternId, level: number, tier: EquipTier): LadderExercise | undefined {
  const ladder = getLadder(pattern);
  for (let rung = Math.min(level, maxRung(pattern)); rung >= 1; rung--) {
    const atRung = ladder.rungs.filter((r) => r.rung === rung);
    const pick =
      atRung.find((r) => r.canonical && usable(r, tier)) ?? atRung.find((r) => usable(r, tier));
    if (pick) return pick;
  }
  return undefined;
}

export type PlannedExercise = {
  pattern: PatternId;
  patternLabel: string;
  exercise: LadderExercise;
  rung: number; // the exercise's own rung (may sit below the stored level)
  totalRungs: number;
};

/** Today's plan; patterns with no usable rung for the tier are left out. */
export function planFor(day: DayType, levels: Record<PatternId, number>, tier: EquipTier): PlannedExercise[] {
  const out: PlannedExercise[] = [];
  for (const pattern of DAY_TEMPLATES[day]) {
    const exercise = resolveExercise(pattern, levels[pattern], tier);
    if (!exercise) continue;
    out.push({
      pattern,
      patternLabel: getLadder(pattern).label,
      exercise,
      rung: exercise.rung,
      totalRungs: maxRung(pattern)
    });
  }
  return out;
}

export type UnavailablePattern = { pattern: PatternId; label: string; missing: Equipment[] };

/** Patterns on this day the tier can't do at any rung, with what they'd need. */
export function unavailablePatterns(day: DayType, tier: EquipTier): UnavailablePattern[] {
  const out: UnavailablePattern[] = [];
  for (const pattern of DAY_TEMPLATES[day]) {
    if (maxUsableRung(pattern, tier) > 0) continue;
    const ladder = getLadder(pattern);
    const easiest = ladder.rungs.find((r) => r.rung === 1 && r.canonical) ?? ladder.rungs[0];
    out.push({ pattern, label: ladder.label, missing: missingEquipment(easiest, tier) });
  }
  return out;
}

/** "a pull-up bar", "dumbbells and a bench". */
export function equipmentList(items: Equipment[]): string {
  const names = items.map((e) => EQUIPMENT_LABELS[e]);
  if (names.length <= 1) return names[0] ?? "";
  return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
}

/**
 * "Too hard" target: the exercise the tier can do at the nearest rung below
 * — the same walk prescription uses, so a demotion never lands on something
 * the user has no equipment for.
 */
export function easierExercise(ex: LadderExercise, tier: EquipTier): LadderExercise | undefined {
  const ladder = ladderOf(ex.id);
  if (!ladder || ex.rung <= 1) return undefined;
  return resolveExercise(ladder.pattern, ex.rung - 1, tier);
}

function canonicalAt(ladder: Ladder, rung: number): LadderExercise | undefined {
  return ladder.rungs.find((r) => r.rung === rung && r.canonical) ?? ladder.rungs.find((r) => r.rung === rung);
}

/**
 * Where a graduation from `ex` lands, or `undefined` at the top of the ladder.
 *
 * Levels are earned one rung at a time, including rungs the current equipment
 * cannot do: the stored level climbs past them (the session keeps substituting
 * down) until it reaches the next rung the tier can perform. When `ex` is such
 * a substitution — below the stored level — the climb continues from the
 * stored level, never from `ex`, so a level already held is never re-awarded.
 */
export function graduationTarget(ex: LadderExercise, storedLevel: number, _tier: EquipTier): LadderExercise | undefined {
  const ladder = ladderOf(ex.id);
  if (!ladder) return undefined;
  const from = Math.max(ex.rung, storedLevel);
  if (from >= maxRung(ladder.pattern)) return undefined;
  return canonicalAt(ladder, from + 1);
}

export function nextDay(lastDay: DayType | null): DayType {
  if (!lastDay) return ROTATION[0];
  return ROTATION[(ROTATION.indexOf(lastDay) + 1) % ROTATION.length];
}

// ---------- labels ----------

export function aimValue(t: Target): number {
  // The aim IS the top of the range: one-tap "Done" logs the value that
  // graduation rules check (seed: "hit sets × high in N sessions"). A
  // mid-range aim would make rung-ups unreachable from the one-tap flow.
  return t.high;
}

export function valueLabel(t: Target, v: number): string {
  return t.unit === "seconds" ? `${v} s` : String(v);
}

export function aimLabel(t: Target): string {
  return valueLabel(t, aimValue(t)) + (t.perSide ? " / side" : "");
}

export function targetLabel(t: Target): string {
  const range = t.low === t.high ? String(t.low) : `${t.low}–${t.high}`;
  return `${t.sets} × ${range}${t.unit === "seconds" ? " s" : ""}${t.perSide ? " / side" : ""}`;
}

/** "Got fewer?" chips: three descending options below the aim. */
export function chipValues(t: Target): number[] {
  const aim = aimValue(t);
  const step = t.unit === "seconds" ? 5 : 1;
  return [aim - 3 * step, aim - 2 * step, aim - step].filter((v) => v > 0);
}

// ---------- weights ----------

/** Smallest sensible jump per implement (kg). Dumbbells come in 2 kg steps. */
export const INCREMENT_KG: Record<Implement, number> = {
  dumbbell: 2,
  barbell: 2.5,
  machine: 5,
  added: 2.5
};

export function incrementKg(ex: LadderExercise): number {
  return INCREMENT_KG[ex.implement ?? "barbell"];
}

/** "12 kg", or for added load "+2.5 kg" / "bodyweight". */
export function weightLabel(ex: LadderExercise, kg: number): string {
  if (ex.implement === "added") return kg > 0 ? `+${kg} kg` : "bodyweight";
  return `${kg} kg`;
}

// ---------- graduation / weight progression ----------

export type SessionSetLog = { value: number; weightKg: number | null };

/** Did this session's sets hit the top of the range on every set? */
export function hitTopOfRange(ex: LadderExercise, sets: SessionSetLog[]): boolean {
  return sets.length >= ex.target.sets && sets.every((s) => s.value >= ex.target.high);
}

/**
 * Graduation decision for one completed exercise.
 * - top_of_range(N): needs N sessions (this one + N-1 previous) at the top.
 * - load_threshold: this session at the top with every set at/above threshold.
 * - terminal / maintain: never graduates.
 */
export function shouldGraduate(
  ex: LadderExercise,
  sets: SessionSetLog[],
  previousTopStreak: number
): boolean {
  if (!hitTopOfRange(ex, sets)) return false;
  switch (ex.graduate.kind) {
    case "top_of_range":
      return previousTopStreak + 1 >= ex.graduate.sessions;
    case "load_threshold": {
      const w = Math.min(...sets.map((s) => s.weightKg ?? 0));
      return w >= ex.graduate.weightKg;
    }
    case "terminal":
    case "maintain":
      return false;
  }
}

/**
 * Double progression for loaded rungs: top of range every set -> one
 * increment next time. The result snaps DOWN to the implement's grid, so a
 * legacy off-grid value moves to the first grid point above it and never
 * further (14.5 kg dumbbells -> 16, 17 -> 18, 62.5 kg machine -> 65).
 */
export function nextWeight(ex: LadderExercise, sets: SessionSetLog[], currentKg: number): number {
  if (ex.load !== "loaded") return currentKg;
  if (!hitTopOfRange(ex, sets)) return currentKg;
  const inc = incrementKg(ex);
  return Math.floor((currentKg + inc) / inc + 1e-9) * inc;
}

// ---------- streaks ----------

/**
 * A streak survives a gap of up to MAX_GAP_DAYS between consecutive session
 * dates ("come back in a day or two and it becomes a streak").
 */
const MAX_GAP_DAYS = 3;

function dayNumber(iso: string): number {
  return Math.floor(new Date(iso + "T00:00:00").getTime() / 86_400_000);
}

/** dates: local "YYYY-MM-DD" of finished sessions, any order. */
export function computeStreaks(dates: string[], todayIso: string): { current: number; best: number } {
  const days = [...new Set(dates.map(dayNumber))].sort((a, b) => a - b);
  if (days.length === 0) return { current: 0, best: 0 };
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i] - days[i - 1] <= MAX_GAP_DAYS ? run + 1 : 1;
    best = Math.max(best, run);
  }
  // current streak counts only if the last session is still "alive"
  const current = dayNumber(todayIso) - days[days.length - 1] <= MAX_GAP_DAYS ? run : 0;
  return { current, best };
}
