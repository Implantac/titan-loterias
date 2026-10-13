import { describe, it, expect } from "vitest";
import { countPopularPatterns, generateWithSplitAvoidance, generateByStrategy } from "./strategies";
import { computeFrequencyStats } from "./stats/statistics";
import type { DrawResult, LotteryConfig } from "@/data/lotteries";

const cfg = { id: "lotofacil", name: "Lotofácil", numbers: 25, pick: 15, price: 3 } as unknown as LotteryConfig;
function md(c: number): DrawResult[] {
  let s = 42; const r = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  return Array.from({ length: c }, (_, i) => {
    const p = Array.from({ length: 25 }, (_, n) => n + 1); const n: number[] = [];
    while (n.length < 15) n.push(p.splice(Math.floor(r() * p.length), 1)[0]);
    return { concurso: 1000 + i, date: "x", numbers: n.sort((a, b) => a - b) };
  });
}
const stats = computeFrequencyStats(md(150), 25);

describe("countPopularPatterns", () => {
  it("detecta sequência consecutiva longa", () => {
    expect(countPopularPatterns([1,2,3,4,5,6,8,10,12,14,17,19,21,23,25])).toBeGreaterThan(0);
  });
  it("detecta progressão aritmética", () => {
    expect(countPopularPatterns([1,3,5,7,9,11,13,15,17,19,21,23,25,2,4])).toBeGreaterThan(0);
  });
  it("detecta concentração em uma metade", () => {
    expect(countPopularPatterns([1,2,3,4,5,6,7,8,9,10,11,14,17,20,24])).toBeGreaterThan(0);
  });
  it("detecta múltiplos de 5", () => {
    expect(countPopularPatterns([5,10,15,20,25,1,2,3,4,6,7,8,9,11,12])).toBeGreaterThan(0);
  });
  it("detecta espelho do último sorteio", () => {
    const last = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
    expect(countPopularPatterns(last, last)).toBeGreaterThan(0);
  });
  it("jogo diversificado não aciona nenhum padrão", () => {
    expect(countPopularPatterns([2,5,7,9,12,14,16,18,19,21,22,24,25,11,13])).toBe(0);
  });
});

describe("generateWithSplitAvoidance", () => {
  it("produz jogo válido", () => {
    const { bet } = generateWithSplitAvoidance("hot", stats, cfg, { seed: 7 });
    expect(bet).toHaveLength(15);
    expect(new Set(bet).size).toBe(15);
    bet.forEach((n) => { expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(25); });
  });

  it("é reproduzível com o mesmo seed", () => {
    const a = generateWithSplitAvoidance("hot", stats, cfg, { seed: 99 });
    const b = generateWithSplitAvoidance("hot", stats, cfg, { seed: 99 });
    expect(a.bet).toEqual(b.bet);
  });

  it("reduz padrões populares sem degradar a taxa de acerto", () => {
    const draws = md(400);
    const TEST = 120, start = draws.length - TEST;
    let plainHits = 0, avoidHits = 0, plainFlags = 0, avoidFlags = 0;
    for (let i = start; i < draws.length; i++) {
      const st = computeFrequencyStats(draws.slice(i - 100, i), 25);
      const plain = generateByStrategy("hot", st, cfg, undefined, { seed: i });
      const avoid = generateWithSplitAvoidance("hot", st, cfg, { seed: i, lastDraw: draws[i-1].numbers });
      plainHits += plain.filter((n) => draws[i].numbers.includes(n)).length;
      avoidHits += avoid.bet.filter((n) => draws[i].numbers.includes(n)).length;
      plainFlags += countPopularPatterns(plain, draws[i-1].numbers);
      avoidFlags += countPopularPatterns(avoid.bet, draws[i-1].numbers);
    }
    const pa = plainHits / TEST, aa = avoidHits / TEST;
    console.log(`  acertos: direto ${pa.toFixed(3)} · com filtro ${aa.toFixed(3)} (acaso 9.000)`);
    console.log(`  padrões: direto ${plainFlags} · com filtro ${avoidFlags}`);
    expect(avoidFlags).toBeLessThan(plainFlags);
    // o filtro não pode piorar o acerto além do ruído (~0.07 de erro padrão)
    expect(Math.abs(aa - pa)).toBeLessThan(0.35);
    expect(aa).toBeGreaterThan(8.6);
  });
});
