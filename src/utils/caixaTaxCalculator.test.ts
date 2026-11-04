import { describe, it, expect } from "vitest";
import {
  calculateNetPrize,
  calculateBolaoShareSplit,
  getCaixaRedemptionGuidance,
  CAIXA_TAX_RULES,
} from "./caixaTaxCalculator";

describe("caixaTaxCalculator", () => {
  it("keeps prizes below exemption threshold 100% exempt from IRRF", () => {
    const calc = calculateNetPrize(1500);
    expect(calc.isExempt).toBe(true);
    expect(calc.taxWithheld).toBe(0);
    expect(calc.netAmount).toBe(1500);
    expect(calc.effectiveTaxRatePercent).toBe(0);
  });

  it("calculates 30% withholding tax correctly on amounts above exemption", () => {
    const gross = 10000;
    const calc = calculateNetPrize(gross);

    const expectedTaxableBase = 10000 - CAIXA_TAX_RULES.EXEMPTION_THRESHOLD; // 7571.20
    const expectedTax = expectedTaxableBase * 0.3; // 2271.36
    const expectedNet = gross - expectedTax; // 7728.64

    expect(calc.isExempt).toBe(false);
    expect(calc.taxWithheld).toBeCloseTo(expectedTax, 2);
    expect(calc.netAmount).toBeCloseTo(expectedNet, 2);
    expect(calc.effectiveTaxRatePercent).toBeCloseTo((expectedTax / gross) * 100, 2);
  });

  it("correctly splits gross and net amounts across bolão quotas", () => {
    const split = calculateBolaoShareSplit(50000, 10);
    expect(split.totalShares).toBe(10);
    expect(split.grossPerShare).toBe(5000);
    expect(split.netPerShare).toBeCloseTo(split.totalNetAmount / 10, 2);
    expect(split.taxWithheldPerShare).toBeCloseTo(split.totalTaxWithheld / 10, 2);
  });

  it("returns proper branch requirements and D+2 delay for large prizes", () => {
    const smallGuide = getCaixaRedemptionGuidance(500);
    expect(smallGuide.channel).toBe("Loterica ou Agencia");

    const largeGuide = getCaixaRedemptionGuidance(50000);
    expect(largeGuide.channel).toBe("Agencia Caixa Exclusiva");
    expect(largeGuide.timeframe).toContain("D+2");
  });
});
