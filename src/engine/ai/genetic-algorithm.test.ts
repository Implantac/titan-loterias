import { describe, it, expect } from "vitest";
import { runGeneticAlgorithm } from "./genetic-algorithm";
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
const opts = { populationSize: 24, generations: 30, tournamentSize: 3 };

describe("runGeneticAlgorithm — reprodutibilidade (AGENTS.md)", () => {
  it("com o mesmo seed produz o mesmo jogo", () => {
    const a = runGeneticAlgorithm(stats, config, [], { ...opts, seed: 12345 });
    const b = runGeneticAlgorithm(stats, config, [], { ...opts, seed: 12345 });
    expect(a.best.numbers).toEqual(b.best.numbers);
    expect(a.best.fitness).toBe(b.best.fitness);
    expect(a.top10.map((g) => g.numbers.join(","))).toEqual(b.top10.map((g) => g.numbers.join(",")));
  });

  it("com seeds diferentes produz resultados diferentes", () => {
    const a = runGeneticAlgorithm(stats, config, [], { ...opts, seed: 1 });
    const b = runGeneticAlgorithm(stats, config, [], { ...opts, seed: 999 });
    // populações iniciais distintas → ao menos o top10 difere
    const ja = a.top10.map((g) => g.numbers.join(",")).join("|");
    const jb = b.top10.map((g) => g.numbers.join(",")).join("|");
    expect(ja).not.toBe(jb);
  });

  it("o jogo retornado respeita o pick e o intervalo da loteria", () => {
    const { best } = runGeneticAlgorithm(stats, config, [], { ...opts, seed: 7 });
    expect(best.numbers).toHaveLength(15);
    expect(new Set(best.numbers).size).toBe(15);
    best.numbers.forEach((n) => { expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(25); });
    expect(best.numbers).toEqual([...best.numbers].sort((a, b) => a - b));
  });
});
