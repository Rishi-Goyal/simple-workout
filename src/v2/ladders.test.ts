import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { LADDERS, V1_NAME_MAP, WARMUPS, type PatternId } from "./ladders";
import { maxUsableRung, type EquipTier } from "./engine";
import { validateLadders } from "./ladderValidation";

describe("ladder catalog", () => {
  it("passes every structural rule", () => {
    expect(validateLadders(LADDERS, WARMUPS, V1_NAME_MAP)).toEqual([]);
  });

  it("has the expected number of exercises", () => {
    expect(LADDERS.flatMap((l) => l.rungs)).toHaveLength(45);
  });

  // Highest rung each tier can reach. A change here must be a deliberate
  // product decision, not a side effect of an equipment edit.
  it("keeps the tier reachability table", () => {
    const table: Record<EquipTier, Record<PatternId, number>> = {
      nothing: { squat: 2, hinge: 2, h_push: 5, v_push: 3, h_pull: 1, v_pull: 0, core: 4 },
      dumbbells: { squat: 4, hinge: 3, h_push: 5, v_push: 4, h_pull: 4, v_pull: 6, core: 5 },
      full_gym: { squat: 5, hinge: 5, h_push: 6, v_push: 5, h_pull: 5, v_pull: 6, core: 5 }
    };
    for (const tier of Object.keys(table) as EquipTier[]) {
      for (const L of LADDERS) {
        expect({ tier, pattern: L.pattern, max: maxUsableRung(L.pattern, tier) }).toEqual({
          tier,
          pattern: L.pattern,
          max: table[tier][L.pattern]
        });
      }
    }
  });
});

describe("exercise media", () => {
  // Runs the exact gate that `npm run build` runs (media:check) so a manifest
  // or bundle problem fails here first instead of in the Pages deploy job. The
  // script is executed rather than imported: its shebang line is fine for Node
  // but not for the test transformer.
  it("passes the media pipeline check", () => {
    const script = join(__dirname, "..", "..", "scripts", "import-exercise-media.mjs");
    try {
      execFileSync(process.execPath, [script, "check"], { stdio: "pipe" });
    } catch (e) {
      throw new Error(String((e as { stderr?: Buffer }).stderr ?? e));
    }
  });
});
