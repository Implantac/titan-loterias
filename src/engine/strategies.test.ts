import { describe, it, expect } from "vitest";
import { generateByStrategy } from "./strategies";
import { computeFrequencyStats } from "@/engine/stats/statistics";
import type { DrawResult, LotteryConfig } from "@/data/lotteries";

const config = { id: "lotofacil", name: "Lotofácil", numbers: 25, pick: 15, price: 3 } as unknown as LotteryConfig;

function makeDraws(count: number): DrawResult[] {
  let seed = 42;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  return Array.from({ length: count }, (_, i) => {
    const pool = Array.from({ length: 25 }, (_, n) => n + 1);
    const numbers: number[] = [];
    while (numbers.length < 15) numbers.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    return { concurso: 1000 + i, date: "01/01/2020", numbers: numbers.sort((a, b) => a - b) };
  });
}

const stats = computeFrequencyStats(makeDraws(150), 25);

describe("generateByStrategy — reprodutibilidade", () => {
  it("o mesmo seed reproduz o mesmo jogo em estratégias diferentes", () => {
    for (const strat of ["hot", "trend", "fibonacci"] as const) {
      const a = generateByStrategy(strat, stats, config, undefined, { seed: 4242 });
      const b = generateByStrategy(strat, stats, config, undefined, { seed: 4242 });
      expect(a, `${strat}: mesmo seed deve dar o mesmo jogo`).toEqual(b);
    }
  });

  it("seeds diferentes produzem jogos diferentes", () => {
    const a = generateByStrategy("hot", stats, config, undefined, { seed: 1 });
    const b = generateByStrategy("hot", stats, config, undefined, { seed: 987654 });
    expect(a).not.toEqual(b);
  });

  it("sem seed continua funcionando (retrocompatibilidade)", () => {
    const g = generateByStrategy("hot", stats, config);
    expect(g).toHaveLength(15);
  });

  it("o jogo respeita pick, intervalo, unicidade e ordenação", () => {
    for (const seed of [1, 2, 3]) {
      const g = generateByStrategy("hot", stats, config, undefined, { seed });
      expect(g).toHaveLength(15);
      expect(new Set(g).size).toBe(15);
      g.forEach((n) => { expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(25); });
      expect(g).toEqual([...g].sort((a, b) => a - b));
    }
  });

  it("modelos com nomes honestos funcionam e são reprodutíveis com seed", () => {
    const honestStrategies = [
      "frequencyTrend",
      "multiFactor",
      "temporalPattern",
      "bayesianScore",
      "transitionScore",
      "multiDimensionalPattern",
    ] as const;

    for (const strat of honestStrategies) {
      const a = generateByStrategy(strat, stats, config, undefined, { seed: 777 });
      const b = generateByStrategy(strat, stats, config, undefined, { seed: 777 });
      expect(a, `${strat} deve ser reprodutível com mesmo seed`).toEqual(b);
      expect(a).toHaveLength(15);
      expect(a).toEqual([...a].sort((x, y) => x - y));
    }
  });

  it("aliases legados continuam mapeando para os mesmos resultados que os nomes honestos", () => {
    const pairs = [
      ["frequencyTrend", "randomForest"],
      ["multiFactor", "xgboost"],
      ["temporalPattern", "lstm"],
      ["bayesianScore", "bayesian"],
      ["transitionScore", "markov_model"],
      ["multiDimensionalPattern", "quantum"],
    ] as const;

    for (const [honest, legacy] of pairs) {
      const a = generateByStrategy(honest, stats, config, undefined, { seed: 1234 });
      const b = generateByStrategy(legacy, stats, config, undefined, { seed: 1234 });
      expect(a, `${honest} e ${legacy} devem produzir o mesmo resultado com mesmo seed`).toEqual(b);
    }
  });
});
