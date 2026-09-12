import { describe, expect, it } from "vitest";
import {
  GRANT_KEY_ALPHABET,
  claimSignature,
  computeReward,
  encodeBase32Crockford,
  makeClaimCode,
  newGrantKey,
  parseClaimCode,
  verifyClaimCode
} from "./rewards";

describe("computeReward", () => {
  const sum = (r: ReturnType<typeof computeReward>) => r.breakdown.reduce((s, l) => s + l.amount, 0);

  it("flat 12 for a plain workout", () => {
    const r = computeReward({ levelUps: 0, streak: 1 });
    expect(r.total).toBe(12);
    expect(r.breakdown.map((l) => l.kind)).toEqual(["workout"]);
  });

  it("adds 6 per level-up", () => {
    const r = computeReward({ levelUps: 2, streak: 3 });
    expect(r.total).toBe(24);
    expect(r.breakdown.map((l) => l.kind)).toEqual(["workout", "level_ups"]);
    expect(r.breakdown[1].label).toBe("Level-ups ×2");
    expect(computeReward({ levelUps: 1, streak: 3 }).breakdown[1].label).toBe("Level-up");
  });

  it("adds a streak bonus on multiples of 7", () => {
    expect(computeReward({ levelUps: 0, streak: 7 }).total).toBe(24);
    expect(computeReward({ levelUps: 1, streak: 14 }).total).toBe(30);
    expect(computeReward({ levelUps: 0, streak: 8 }).total).toBe(12);
    expect(computeReward({ levelUps: 0, streak: 0 }).total).toBe(12);
  });

  it("skips the streak bonus for a second session on the same day", () => {
    const r = computeReward({ levelUps: 0, streak: 7, firstSessionOfDay: false });
    expect(r.total).toBe(12);
    expect(r.breakdown.some((l) => l.kind === "streak")).toBe(false);
  });

  it("total always equals the breakdown sum for realistic inputs", () => {
    for (const levelUps of [0, 1, 2, 3, 4])
      for (const streak of [0, 1, 6, 7, 13, 14, 21])
        for (const first of [true, false]) {
          const r = computeReward({ levelUps, streak, firstSessionOfDay: first });
          expect(r.total).toBe(sum(r));
          expect(r.total).toBeLessThanOrEqual(200);
        }
  });

  it("clamps garbage inputs to zero", () => {
    expect(computeReward({ levelUps: -3, streak: NaN }).total).toBe(12);
    expect(computeReward({ levelUps: 1.9, streak: 7.5 }).total).toBe(30); // floors to 1 level-up + 7-streak bonus;
  });
});

describe("newGrantKey", () => {
  it("is 8 chars from the Crockford alphabet and unique", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const k = newGrantKey();
      expect(k).toHaveLength(8);
      for (const c of k) expect(GRANT_KEY_ALPHABET).toContain(c);
      seen.add(k);
    }
    expect(seen.size).toBe(1000);
  });

  it("is deterministic under an injected source and rejects biased bytes", () => {
    expect(newGrantKey((n) => new Uint8Array(n))).toBe("00000000");
    let calls = 0;
    const rand = (n: number) => new Uint8Array(n).fill(calls++ === 0 ? 255 : 31);
    expect(newGrantKey(rand)).toBe("ZZZZZZZZ");
  });
});

describe("encodeBase32Crockford", () => {
  it("matches the shared vectors", () => {
    expect(encodeBase32Crockford(new TextEncoder().encode("abc"))).toBe("C5H66");
    expect(encodeBase32Crockford(new Uint8Array([255, 255, 255, 255, 255]))).toBe("ZZZZZZZZ");
    expect(encodeBase32Crockford(new Uint8Array([0, 0, 0, 0, 0]))).toBe("00000000");
  });
});

describe("claim codes", () => {
  it("signs the shared test vectors", async () => {
    expect(await makeClaimCode("ABCDEFGH", 12, "test-secret")).toBe("HG-ABCDEFGH-12-SJ35CC");
    expect(await makeClaimCode("K7M3XQ2A", 30, "test-secret")).toBe("HG-K7M3XQ2A-30-Z9Y96H");
    expect(await makeClaimCode("00000000", 1, "test-secret")).toBe("HG-00000000-1-26D3MH");
    expect(await claimSignature("ABCDEFGH", 12)).toBe("7TR5DE");
  });

  it("is deterministic", async () => {
    const a = await makeClaimCode("K7M3XQ2A", 30);
    const b = await makeClaimCode("K7M3XQ2A", 30);
    expect(a).toBe(b);
  });

  it("verifies round-trips and rejects tampering", async () => {
    expect(await verifyClaimCode("HG-ABCDEFGH-12-SJ35CC", "test-secret")).toEqual({ grantKey: "ABCDEFGH", hourglasses: 12 });
    expect(await verifyClaimCode("HG-ABCDEFGH-13-SJ35CC", "test-secret")).toBeNull();
    expect(await verifyClaimCode("HG-ABCDEFGH-12-SJ35CD", "test-secret")).toBeNull();
    expect(await verifyClaimCode("HG-ABCDEFGH-12-SJ35CC")).toBeNull(); // wrong secret
    expect(await verifyClaimCode("nonsense")).toBeNull();
  });

  it("accepts lowercase, whitespace and confusable glyphs", async () => {
    expect(await verifyClaimCode(" hg-abcdefgh-12-sj35cc ", "test-secret")).toEqual({ grantKey: "ABCDEFGH", hourglasses: 12 });
    expect(await verifyClaimCode("HG-00000000-1-26D3MH", "test-secret")).not.toBeNull();
    expect(await verifyClaimCode("HG-OOOOOOOO-1-26D3MH", "test-secret")).toEqual({ grantKey: "00000000", hourglasses: 1 });
    expect(parseClaimCode("HG-OILUOILU-5-OILUOI")).toEqual({ grantKey: "011V011V", hourglasses: 5, sig: "011V01" });
  });

  it("rejects out-of-range counts", () => {
    expect(parseClaimCode("HG-ABCDEFGH-0-SJ35CC")).toBeNull();
    expect(parseClaimCode("HG-ABCDEFGH-201-SJ35CC")).toBeNull();
    expect(parseClaimCode("HG-ABCDEFG-12-SJ35CC")).toBeNull();
  });
});
