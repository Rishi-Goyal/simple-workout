import { describe, expect, it } from "vitest";
import { LADDERS, type LadderExercise, type PatternId } from "./ladders";
import {
  chipValues,
  computeStreaks,
  easierExercise,
  getExerciseV2,
  graduationTarget,
  nextWeight,
  planFor,
  resolveExercise,
  shouldGraduate,
  usable,
  weightLabel,
  type SessionSetLog
} from "./engine";

const ex = (id: string): LadderExercise => {
  const e = getExerciseV2(id);
  if (!e) throw new Error("unknown exercise " + id);
  return e;
};
const defaults = Object.fromEntries(LADDERS.map((l) => [l.pattern, l.startRung])) as Record<PatternId, number>;
const top = (e: LadderExercise, weightKg: number | null = null): SessionSetLog[] =>
  Array.from({ length: e.target.sets }, () => ({ value: e.target.high, weightKg }));

describe("usable", () => {
  it("requires every listed item (AND semantics)", () => {
    expect(usable(ex("hp5_db_bench_press"), "dumbbells")).toBe(false); // dumbbell + bench
    expect(usable(ex("hp5_db_bench_press"), "full_gym")).toBe(true);
    expect(usable(ex("vpu3_band_assisted_pullup"), "dumbbells")).toBe(true); // bar + band
    expect(usable(ex("vpu3_band_assisted_pullup"), "nothing")).toBe(false);
  });
});

describe("resolveExercise", () => {
  it("walks down to the nearest usable rung, never up", () => {
    expect(resolveExercise("squat", 5, "nothing")?.id).toBe("sq2_bodyweight_squat");
    expect(resolveExercise("squat", 5, "dumbbells")?.id).toBe("sq4_db_front_squat");
    expect(resolveExercise("squat", 5, "full_gym")?.id).toBe("sq5_back_squat");
  });
  it("prefers a usable alternate at the same rung over dropping a rung", () => {
    expect(resolveExercise("h_push", 5, "dumbbells")?.id).toBe("hp5_alt_db_floor_press");
    expect(resolveExercise("h_push", 5, "nothing")?.id).toBe("hp5_alt_decline_pushup");
    expect(resolveExercise("h_push", 6, "dumbbells")?.id).toBe("hp5_alt_db_floor_press");
  });
  it("returns undefined when nothing on the ladder is usable", () => {
    for (let level = 1; level <= 6; level++) expect(resolveExercise("v_pull", level, "nothing")).toBeUndefined();
  });
  it("reaches the one-arm row with dumbbells only", () => {
    expect(resolveExercise("h_pull", 4, "dumbbells")?.id).toBe("hpu4_one_arm_db_row");
  });
});

describe("planFor", () => {
  it("drops patterns the tier cannot do at all", () => {
    const pull = planFor("pull", defaults, "nothing");
    expect(pull.map((p) => p.pattern)).toEqual(["h_pull", "core"]);
    expect(planFor("pull", defaults, "dumbbells").map((p) => p.pattern)).toEqual(["h_pull", "v_pull", "core"]);
  });
});

describe("graduationTarget", () => {
  it("awards the next rung when it is usable", () => {
    expect(graduationTarget(ex("sq2_bodyweight_squat"), 2, "full_gym")?.id).toBe("sq3_goblet_squat");
  });
  it("climbs through a rung the tier cannot do, one level per graduation", () => {
    // dumbbells: band row (2) -> inverted row (3, needs a barbell) -> one-arm DB row (4)
    expect(graduationTarget(ex("hpu2_band_row"), 2, "dumbbells")?.id).toBe("hpu3_inverted_row");
    // next session still prescribes the band row (a substitution below stored level 3)...
    expect(resolveExercise("h_pull", 3, "dumbbells")?.id).toBe("hpu2_band_row");
    // ...and the climb continues from the stored level, reaching the doable rung
    expect(graduationTarget(ex("hpu2_band_row"), 3, "dumbbells")?.id).toBe("hpu4_one_arm_db_row");
  });
  it("never re-awards a level already held when the exercise is a substitution", () => {
    // stored level 3 (goblet squat) but doing bodyweight squat: the next award is 4, not 3
    expect(graduationTarget(ex("sq2_bodyweight_squat"), 3, "full_gym")?.id).toBe("sq4_db_front_squat");
  });
  it("has nothing above the top rung", () => {
    expect(graduationTarget(ex("sq5_back_squat"), 5, "full_gym")).toBeUndefined();
    // substitution while the stored level is already the top
    expect(graduationTarget(ex("sq2_bodyweight_squat"), 5, "nothing")).toBeUndefined();
  });
});

describe("easierExercise", () => {
  it("skips rungs the tier cannot do", () => {
    // full gym: barbell row -> one-arm row
    expect(easierExercise(ex("hpu5_barbell_row"), "full_gym")?.id).toBe("hpu4_one_arm_db_row");
    // dumbbells at pull-up: negatives need a box (available) -> rung 4
    expect(easierExercise(ex("vpu5_pull_up"), "dumbbells")?.id).toBe("vpu4_negative_pullups");
    // dumbbells doing DB front squat: goblet squat is fine
    expect(easierExercise(ex("sq4_db_front_squat"), "dumbbells")?.id).toBe("sq3_goblet_squat");
    // nothing at goblet squat (shouldn't happen, but walk down past it): bodyweight squat
    expect(easierExercise(ex("sq4_db_front_squat"), "nothing")?.id).toBe("sq2_bodyweight_squat");
  });
  it("is undefined on the easiest rung", () => {
    expect(easierExercise(ex("sq1_box_sit_to_stand"), "full_gym")).toBeUndefined();
  });
});

describe("shouldGraduate", () => {
  const bw = ex("sq2_bodyweight_squat"); // top_of_range, 2 sessions
  it("needs the streak for top_of_range", () => {
    expect(shouldGraduate(bw, top(bw), 0)).toBe(false);
    expect(shouldGraduate(bw, top(bw), 1)).toBe(true);
  });
  it("needs every set at the top", () => {
    const sets = top(bw);
    sets[1] = { value: bw.target.high - 1, weightKg: null };
    expect(shouldGraduate(bw, sets, 5)).toBe(false);
  });
  it("checks the threshold against the lightest set", () => {
    const g = ex("sq3_goblet_squat"); // threshold 24
    expect(shouldGraduate(g, top(g, 24), 0)).toBe(true);
    expect(shouldGraduate(g, top(g, 22), 0)).toBe(false);
    const mixed = top(g, 24);
    mixed[2] = { value: g.target.high, weightKg: 20 };
    expect(shouldGraduate(g, mixed, 0)).toBe(false);
  });
  it("never graduates terminal or maintain rungs", () => {
    const t = ex("sq5_back_squat");
    expect(shouldGraduate(t, top(t, 200), 9)).toBe(false);
    const m = ex("co5_hanging_knee_raise");
    expect(shouldGraduate(m, top(m), 9)).toBe(false);
  });
});

describe("nextWeight", () => {
  it("steps by the implement's increment", () => {
    const db = ex("sq3_goblet_squat");
    expect(nextWeight(db, top(db, 12), 12)).toBe(14);
    const bar = ex("sq5_back_squat");
    expect(nextWeight(bar, top(bar, 40), 40)).toBe(42.5);
    const machine = ex("sq4_alt_leg_press");
    expect(nextWeight(machine, top(machine, 60), 60)).toBe(65);
    const added = ex("vpu6_weighted_pullup");
    expect(nextWeight(added, top(added, 2.5), 2.5)).toBe(5);
  });
  it("snaps legacy off-grid weights onto the grid without overshooting", () => {
    const db = ex("sq3_goblet_squat");
    expect(nextWeight(db, top(db, 14.5), 14.5)).toBe(16);
    expect(nextWeight(db, top(db, 17), 17)).toBe(18);
    const machine = ex("sq4_alt_leg_press");
    expect(nextWeight(machine, top(machine, 62.5), 62.5)).toBe(65);
  });
  it("holds when the top of the range was missed, and ignores bodyweight rungs", () => {
    const db = ex("sq3_goblet_squat");
    const sets = top(db, 12);
    sets[0] = { value: db.target.high - 1, weightKg: 12 };
    expect(nextWeight(db, sets, 12)).toBe(12);
    const bw = ex("sq2_bodyweight_squat");
    expect(nextWeight(bw, top(bw), 0)).toBe(0);
  });
});

describe("weightLabel", () => {
  it("shows added load as +kg or bodyweight", () => {
    expect(weightLabel(ex("hp6_alt_dips"), 0)).toBe("bodyweight");
    expect(weightLabel(ex("vpu6_weighted_pullup"), 2.5)).toBe("+2.5 kg");
    expect(weightLabel(ex("sq3_goblet_squat"), 12)).toBe("12 kg");
  });
});

describe("chipValues", () => {
  it("offers three values below the aim, filtered to positives", () => {
    expect(chipValues({ sets: 3, unit: "reps", low: 8, high: 12 })).toEqual([9, 10, 11]);
    expect(chipValues({ sets: 3, unit: "seconds", low: 20, high: 30 })).toEqual([15, 20, 25]);
    expect(chipValues({ sets: 3, unit: "reps", low: 1, high: 2 })).toEqual([1]);
  });
});

describe("computeStreaks", () => {
  it("survives a gap of up to three days and dies after", () => {
    expect(computeStreaks(["2026-09-01", "2026-09-03", "2026-09-06"], "2026-09-07")).toEqual({ current: 3, best: 3 });
    expect(computeStreaks(["2026-09-01", "2026-09-06"], "2026-09-07")).toEqual({ current: 1, best: 1 });
    expect(computeStreaks(["2026-09-01", "2026-09-02"], "2026-09-09")).toEqual({ current: 0, best: 2 });
    expect(computeStreaks([], "2026-09-09")).toEqual({ current: 0, best: 0 });
  });
});
