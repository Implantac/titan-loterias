import { describe, expect, it } from "vitest";
import { runMonteCarlo } from "./MonteCarloEngine";

const input = { games: [[1, 2, 3], [2, 3, 4]], totalNumbers: 8, drawSize: 3, trials: 1000, targetHits: 2 };

describe("Monte Carlo auditável", () => {
  it("produz as mesmas contagens e intervalo para a mesma semente", () => {
    const a = runMonteCarlo({ ...input, seed: 2026 });
    const b = runMonteCarlo({ ...input, seed: 2026 });
    expect(b.distribution).toEqual(a.distribution);
    expect(b.hitRateCI95).toEqual(a.hitRateCI95);
    expect(b.convergence).toEqual(a.convergence);
    expect(Object.values(a.distribution).reduce((sum, count) => sum + count, 0)).toBe(input.trials);
  });
  it("rejeita parâmetros inválidos em vez de retornar NaN ou resultado falso", () => {
    for (const bad of [
      { trials: 0 }, { trials: -1 }, { drawSize: 9 },
      { games: [[1, 1, 3]] }, { games: [] }, { targetHits: 4 },
    ]) {
      expect(() => runMonteCarlo({ ...input, ...bad })).toThrow(/Parâmetros inválidos/);
    }
  });
});
