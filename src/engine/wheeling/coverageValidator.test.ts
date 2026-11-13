import { describe, it, expect } from "vitest";
import {
  combinations,
  binomial,
  validateWheelCoverage,
  megaSena8_28,
  megaSena7_7,
  quina6_6,
  quina7_21,
  lotofacil16_16,
} from "./coverageValidator";

describe("coverageValidator", () => {
  it("não valida jogos inválidos nem hipóteses impossíveis como prova", () => {
    for (const result of [
      validateWheelCoverage([[0, 0]], 4, 2, 2),
      validateWheelCoverage([[0, 4]], 4, 2, 2),
      validateWheelCoverage([[0, 1]], 4, 2, 5),
      validateWheelCoverage([], 4, 2, 2),
    ]) {
      expect(result.exhaustive).toBe(false);
      expect(result.testedScenarios).toBe(0);
    }
  });


  it("binomial + combinations coerentes", () => {
    expect(binomial(8, 6)).toBe(28);
    expect(binomial(7, 5)).toBe(21);
    expect(combinations(5, 2).length).toBe(10);
    expect(combinations(6, 6)).toEqual([[0, 1, 2, 3, 4, 5]]);
  });

  it("Mega 8→28: garante 6 acertos quando 6 saem na base", () => {
    const games = megaSena8_28();
    expect(games.length).toBe(28);
    const r = validateWheelCoverage(games, 8, 6, 6, 6);
    expect(r.guaranteedHits).toBe(6);
    expect(r.meetsGoalPercent).toBe(100);
    expect(r.exhaustive).toBe(true);
  });

  it("Mega 8→28: garante ao menos 5 quando 5 saem na base", () => {
    const games = megaSena8_28();
    const r = validateWheelCoverage(games, 8, 6, 5, 5);
    expect(r.guaranteedHits).toBeGreaterThanOrEqual(5);
  });

  it("Mega 7→7: garante 6 se 6 saem na base", () => {
    const games = megaSena7_7();
    expect(games.length).toBe(7);
    const r = validateWheelCoverage(games, 7, 6, 6, 6);
    expect(r.guaranteedHits).toBe(6);
    expect(r.meetsGoalPercent).toBe(100);
  });

  it("Quina 6→6: garante 5 se todos 5 saem na base", () => {
    const games = quina6_6();
    expect(games.length).toBe(6);
    const r = validateWheelCoverage(games, 6, 5, 5, 5);
    expect(r.guaranteedHits).toBe(5);
    expect(r.meetsGoalPercent).toBe(100);
  });

  it("Quina 7→21: garante 5 se 5 saem na base", () => {
    const games = quina7_21();
    expect(games.length).toBe(21);
    const r = validateWheelCoverage(games, 7, 5, 5, 5);
    expect(r.guaranteedHits).toBe(5);
  });

  it("Lotofácil 16→16: garante 14 quando 15 saem na base", () => {
    const games = lotofacil16_16();
    expect(games.length).toBe(16);
    const r = validateWheelCoverage(games, 16, 15, 15, 14);
    // Cada jogo omite 1 dezena; se 15 caem, ao menos um jogo omitirá a que faltou → 14 garantidos.
    expect(r.guaranteedHits).toBeGreaterThanOrEqual(14);
  });
});

describe("amostragem reproduzível", () => {
  it("mesma base e semente geram a mesma amostra", async () => {
    const { sampleCombinations } = await import("./coverageValidator");
    const first = sampleCombinations(25, 12, 100, 2026);
    expect(first).toHaveLength(100);
    expect(sampleCombinations(25, 12, 100, 2026)).toEqual(first);
    expect(sampleCombinations(25, 12, 100, 2027)).not.toEqual(first);
  });
});
