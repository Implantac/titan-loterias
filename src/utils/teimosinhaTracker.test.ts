import { describe, it, expect } from "vitest";
import {
  getCaixaTeimosinhaOptions,
  calculateTeimosinhaCycleCost,
  auditTeimosinhaCycle,
} from "./teimosinhaTracker";

describe("teimosinhaTracker", () => {
  it("returns official Caixa Teimosinha options for Mega-Sena and Lotofácil", () => {
    expect(getCaixaTeimosinhaOptions("megasena")).toEqual([2, 4, 8, 12]);
    expect(getCaixaTeimosinhaOptions("lotofacil")).toEqual([2, 4, 8, 12, 18, 24]);
    expect(getCaixaTeimosinhaOptions("quina")).toEqual([3, 6, 12, 18, 24]);
  });

  it("calculates accurate cycle costs based on official ticket prices", () => {
    // Mega-Sena = R$ 6,00 por aposta simples
    const megaCost = calculateTeimosinhaCycleCost("megasena", 3, 8);
    expect(megaCost.costPerSingleBet).toBe(6.0);
    expect(megaCost.costPerDraw).toBe(18.0);
    expect(megaCost.totalCycleCost).toBe(144.0);

    // Lotofácil = R$ 3,50 por aposta simples
    const lotoCost = calculateTeimosinhaCycleCost("lotofacil", 2, 4);
    expect(lotoCost.costPerSingleBet).toBe(3.5);
    expect(lotoCost.costPerDraw).toBe(7.0);
    expect(lotoCost.totalCycleCost).toBe(28.0);
  });

  it("correctly audits a teimosinha cycle with hits, prizes, and break-even detection", () => {
    const games = [
      [1, 2, 3, 4, 5, 6],
      [10, 20, 30, 40, 50, 60],
    ];

    const mockDraws = [
      { concurso: 2801, numbers: [1, 2, 3, 4, 15, 25] }, // Game 1 hits 4 (Quadra = R$ 950)
      { concurso: 2800, numbers: [11, 22, 33, 44, 55, 59] }, // 0 hits
    ];

    const report = auditTeimosinhaCycle(games, mockDraws, 2, "megasena");

    expect(report.totalGames).toBe(2);
    expect(report.cycleLength).toBe(2);
    expect(report.costPerDraw).toBe(12.0); // 2 games * R$ 6.00
    expect(report.totalCycleCost).toBe(24.0); // 2 draws * R$ 12.00
    expect(report.drawsAnalyzed).toBe(2);
    expect(report.totalPrizeGross).toBe(950);
    expect(report.isBreakEvenAchieved).toBe(true);
    expect(report.netProfit).toBeGreaterThan(0);
    expect(report.overallRoiPercent).toBeGreaterThan(100);
  });
});
