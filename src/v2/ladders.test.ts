import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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
  const mediaDir = join(__dirname, "media");
  const manifestPath = join(mediaDir, "manifest.json");
  type Entry = { verified: boolean; frames: unknown[] };
  const manifest = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, "utf8")) as { entries: Record<string, Entry> })
    : { entries: {} as Record<string, Entry> };
  const files = existsSync(mediaDir) ? readdirSync(mediaDir).filter((f) => f.endsWith(".webp")) : [];

  it("mediaRef is set only for verified entries whose frames are bundled", () => {
    for (const ex of LADDERS.flatMap((l) => l.rungs)) {
      const entry = manifest.entries[ex.id];
      if (ex.mediaRef) {
        expect(ex.mediaRef, `${ex.id}: mediaRef must equal the exercise id`).toBe(ex.id);
        expect(entry?.verified, `${ex.id}: mediaRef set but manifest entry not verified`).toBe(true);
        for (let i = 0; i < (entry?.frames.length ?? 0); i++) {
          expect(files, `${ex.id}: missing frame ${i}`).toContain(`${ex.id}-${i}.webp`);
        }
      } else {
        expect(entry?.verified ?? false, `${ex.id}: verified in manifest but mediaRef is null`).toBe(false);
        expect(files.filter((f) => f.startsWith(ex.id + "-")), `${ex.id}: bundled frames without mediaRef`).toEqual([]);
      }
    }
  });

  it("every bundled frame belongs to a catalog exercise", () => {
    const ids = new Set(LADDERS.flatMap((l) => l.rungs.map((r) => r.id)));
    for (const f of files) {
      const id = f.replace(/-\d+\.webp$/, "");
      expect(ids.has(id), `${f}: no exercise with id ${id}`).toBe(true);
    }
  });
});
