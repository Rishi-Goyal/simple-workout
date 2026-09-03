/**
 * Catalog validator — pure, no DB. Run by the test suite so a bad seed edit
 * fails CI before it ships. Every rule here corresponds to an assumption the
 * engine or the screens make about ladders.ts.
 */
import { INCREMENT_KG } from "./engine";
import { DAY_TEMPLATES, type Ladder, type PatternId, type Warmup } from "./ladders";

const ALL_PATTERNS: PatternId[] = ["squat", "hinge", "h_push", "v_push", "h_pull", "v_pull", "core"];

export function validateLadders(
  ladders: Ladder[],
  warmups: Warmup[],
  nameMap: Record<string, string | null>
): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(msg);

  const ids = new Set<string>();
  const names = new Set<string>();
  const patterns = new Set<PatternId>();

  for (const L of ladders) {
    if (patterns.has(L.pattern)) err(`${L.pattern}: ladder listed twice`);
    patterns.add(L.pattern);
    if (L.rungs.length === 0) {
      err(`${L.pattern}: no rungs`);
      continue;
    }
    const max = Math.max(...L.rungs.map((r) => r.rung));
    if (L.startRung < 1 || L.startRung > max) err(`${L.pattern}: startRung ${L.startRung} outside 1..${max}`);

    for (let rung = 1; rung <= max; rung++) {
      const canon = L.rungs.filter((r) => r.rung === rung && r.canonical);
      if (canon.length !== 1) err(`${L.pattern}: rung ${rung} has ${canon.length} canonical exercises (need exactly 1)`);
    }

    for (const ex of L.rungs) {
      const tag = `${L.pattern}/${ex.id}`;
      if (ids.has(ex.id)) err(`${tag}: duplicate id`);
      ids.add(ex.id);
      if (names.has(ex.name)) err(`${tag}: duplicate name "${ex.name}"`);
      names.add(ex.name);

      if (!Number.isInteger(ex.rung) || ex.rung < 1 || ex.rung > max) err(`${tag}: rung ${ex.rung} outside 1..${max}`);

      if (ex.equipment.length === 0) err(`${tag}: equipment is empty`);
      if (ex.equipment.includes("none") && ex.equipment.length > 1) err(`${tag}: "none" must be the only equipment item`);
      if (new Set(ex.equipment).size !== ex.equipment.length) err(`${tag}: duplicate equipment items`);

      if (ex.howTo.length === 0) err(`${tag}: howTo is empty`);
      if (!ex.cue.trim()) err(`${tag}: cue is empty`);

      const t = ex.target;
      if (t.sets < 1) err(`${tag}: target.sets < 1`);
      if (!(t.low < t.high)) err(`${tag}: target.low must be < target.high (${t.low}..${t.high})`);
      if (t.low < 1) err(`${tag}: target.low < 1`);

      const isTop = ex.rung === max;
      if (ex.load === "loaded") {
        if (ex.startWeightKg == null) err(`${tag}: loaded rung without startWeightKg`);
        if (!ex.implement) err(`${tag}: loaded rung without implement`);
      } else {
        if (ex.startWeightKg != null) err(`${tag}: bodyweight rung with startWeightKg`);
        if (ex.implement) err(`${tag}: bodyweight rung with implement`);
      }

      const g = ex.graduate;
      switch (g.kind) {
        case "top_of_range":
          if (g.sessions < 1) err(`${tag}: top_of_range.sessions < 1`);
          if (isTop) err(`${tag}: top rung uses top_of_range — nowhere to graduate to (use maintain or make it loaded)`);
          break;
        case "load_threshold": {
          if (ex.load !== "loaded") err(`${tag}: load_threshold on a bodyweight rung`);
          if (isTop) err(`${tag}: top rung uses load_threshold — nowhere to graduate to (use terminal)`);
          if (ex.startWeightKg != null && ex.implement) {
            if (!(g.weightKg > ex.startWeightKg)) err(`${tag}: load_threshold ${g.weightKg} not above start ${ex.startWeightKg}`);
            const inc = INCREMENT_KG[ex.implement];
            const steps = (g.weightKg - ex.startWeightKg) / inc;
            if (Math.abs(steps - Math.round(steps)) > 1e-9) {
              err(`${tag}: threshold ${g.weightKg} unreachable from ${ex.startWeightKg} in ${inc} kg steps`);
            }
          }
          break;
        }
        case "terminal":
          if (ex.load !== "loaded") err(`${tag}: terminal on a bodyweight rung (use maintain)`);
          if (!isTop) err(`${tag}: terminal below the top rung`);
          break;
        case "maintain":
          if (ex.load !== "bodyweight") err(`${tag}: maintain on a loaded rung (use terminal)`);
          if (!isTop) err(`${tag}: maintain below the top rung`);
          break;
      }
    }
  }

  for (const p of ALL_PATTERNS) {
    if (!patterns.has(p)) err(`pattern ${p} has no ladder`);
    if (!Object.values(DAY_TEMPLATES).some((day) => day.includes(p))) err(`pattern ${p} is on no day template`);
  }
  for (const [day, list] of Object.entries(DAY_TEMPLATES)) {
    for (const p of list) if (!patterns.has(p)) err(`${day} day prescribes unknown pattern ${p}`);
  }

  for (const w of warmups) {
    if (ids.has(w.id)) err(`warmup ${w.id}: id collides with an exercise`);
    ids.add(w.id);
    if (names.has(w.name)) err(`warmup ${w.id}: name collides with an exercise`);
    names.add(w.name);
    if (w.target.sets < 1) err(`warmup ${w.id}: target.sets < 1`);
    if (!(w.target.low <= w.target.high)) err(`warmup ${w.id}: target.low > target.high`);
    if (w.howTo.length === 0) err(`warmup ${w.id}: howTo is empty`);
  }

  for (const [v1, v2] of Object.entries(nameMap)) {
    if (v2 !== null && !ids.has(v2)) err(`V1_NAME_MAP "${v1}" -> unknown id ${v2}`);
  }

  return errors;
}
