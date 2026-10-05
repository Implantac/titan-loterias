import { describe, it, expect } from "vitest";
import { buildLotofacilProfile, distStats, structuralFit } from "./profile";
import { createXorshift32 } from "@/ai/core/rng";

function fakeDraws(count: number, seed = 1) {
  const rng = createXorshift32(seed);
  return Array.from({ length: count }, (_, i) => {
    const pool = Array.from({ length: 25 }, (_, k) => k + 1);
    for (let j = pool.length - 1; j > 0; j--) { const r = Math.floor(rng.next() * (j + 1)); [pool[j], pool[r]] = [pool[r], pool[j]]; }
    return { concurso: count - i, date: "", numbers: pool.slice(0, 15).sort((a, b) => a - b) };
  });
}

describe("lotofacil profile", () => {
  it("is deterministic", () => {
    const d = fakeDraws(120);
    expect(JSON.stringify(buildLotofacilProfile(d))).toBe(JSON.stringify(buildLotofacilProfile(d)));
  });
  it("produces coherent distributions", () => {
    const p = buildLotofacilProfile(fakeDraws(200));
    expect(p.sampleSize).toBe(200);
    expect(Object.values(p.parity).reduce((a, b) => a + b, 0)).toBe(200);
    expect(p.sum.p10).toBeLessThanOrEqual(p.sum.p90);
    expect(p.numbers.reduce((a, n) => a + n.historicalFrequency, 0)).toBeCloseTo(15, 5);
    expect(p.repeat.mean).toBeGreaterThan(6);
  });
  it("percentiles", () => {
    expect(distStats([1, 2, 3, 4, 5]).median).toBe(3);
  });
  it("structural fit exposes components", () => {
    const d = fakeDraws(100);
    const p = buildLotofacilProfile(d);
    const r = structuralFit(d[0].numbers, p, d[1].numbers);
    expect(r.components).toHaveProperty("sumInBand");
    expect(r.repeat).not.toBeNull();
  });
});
