import { describe, expect, it } from "vitest";
import { hasExactShareAmount } from "./bolaoShares";

describe("valor fixo por cota em centavos", () => {
  it("só permite valor exato e positivo", () => {
    expect(hasExactShareAmount(12, 4)).toBe(true);
    expect(hasExactShareAmount(10, 3)).toBe(false);
    expect(hasExactShareAmount(0.01, 2)).toBe(false);
    expect(hasExactShareAmount(0.03, 3)).toBe(true);
    expect(hasExactShareAmount(0, 2)).toBe(false);
    expect(hasExactShareAmount(NaN, 2)).toBe(false);
    expect(hasExactShareAmount(10, 0)).toBe(false);
    expect(hasExactShareAmount(10.005, 2)).toBe(false);
  });
});
