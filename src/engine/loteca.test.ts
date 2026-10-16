import { describe, it, expect } from "vitest";
import { lotecaCombos, lotecaHits, type LotecaPick } from "./loteca";

describe("loteca", () => {
  it("simple bet costs R$ 4", () => {
    const p: LotecaPick[][] = Array.from({ length: 14 }, () => ["1"]);
    expect(lotecaCombos(p)).toMatchObject({ apostas: 1, custo: 4 });
  });
  it("1 double + 1 triple = 6 bets", () => {
    const p: LotecaPick[][] = Array.from({ length: 14 }, () => ["1"]);
    p[0] = ["1", "X"]; p[1] = ["1", "X", "2"];
    expect(lotecaCombos(p)).toMatchObject({ duplos: 1, triplos: 1, apostas: 6, custo: 24 });
  });
  it("counts hits", () => {
    expect(lotecaHits([["1"], ["X", "2"], ["2"]], ["1", "2", "1"])).toBe(2);
  });
});
