/**
 * Baseline Benchmark Engine
 * Compara um lote grande de jogos gerados contra baselines históricas reais,
 * apresentando métricas de coverage, paridade e dispersão.
 */

import type { DrawResult, LotteryConfig } from "@/data/lotteries";
import { getLotteryRules } from "@/ai/knowledge/lotteriesKnowledge";

export function generateRandomGames(config: LotteryConfig, count: number, rng?: { next(): number }): number[][] {
  const rnd = rng ?? { next: () => Math.random() };
  const games: number[][] = [];
  for (let i = 0; i < count; i++) {
    const game: number[] = [];
    while (game.length < config.pick) {
      const n = Math.floor(rnd.next() * config.numbers) + 1;
      if (!game.includes(n)) game.push(n);
    }
    games.push(game.sort((a, b) => a - b));
  }
  return games;
}

export interface GameMetrics {
  parityEven: number;
  parityOdd: number;
  sum: number;
  spread: number;          // max - min
  stdev: number;           // dispersão (desvio padrão)
  decadeMax: number;       // maior concentração numa década
  decadeUsed: number;      // décadas distintas
  consecutivePairs: number;
}

export interface BaselineMetrics {
  avgEven: number;
  avgSum: number;
  avgSpread: number;
  avgStdev: number;
  avgDecadeMax: number;
  avgDecadeUsed: number;
  avgConsecutive: number;
  sumMin: number;
  sumMax: number;
  parityMin: number;
  parityMax: number;
  numberFrequency: Map<number, number>; // frequência relativa (0-1)
}

export interface BenchmarkReport {
  totalGames: number;
  totalDraws: number;
  generated: {
    metrics: BaselineMetrics;
    coverage: {
      numbersCovered: number;
      totalNumbers: number;
      coveragePct: number;
      mostUsed: { number: number; count: number }[];
      leastUsed: { number: number; count: number }[];
      giniCoefficient: number; // 0=perfeitamente uniforme, 1=concentrado
    };
    parityDistribution: Record<number, number>; // even count -> # games
    sumDistribution: { bucket: string; count: number }[];
    decadeDistribution: number[]; // soma de dezenas por década
  };
  baseline: {
    metrics: BaselineMetrics;
    coverage: {
      numbersCovered: number;
      totalNumbers: number;
      coveragePct: number;
      giniCoefficient: number;
    };
    parityDistribution: Record<number, number>;
    sumDistribution: { bucket: string; count: number }[];
    decadeDistribution: number[];
  };
  comparison: {
    parityDeltaPct: number;    // |gen - base| / base * 100
    sumDeltaPct: number;
    spreadDeltaPct: number;
    stdevDeltaPct: number;
    coverageDeltaPct: number;
    alignmentScore: number;    // 0-100: quão próximo da baseline
  };
}

function computeGameMetrics(game: number[], totalNumbers: number): GameMetrics {
  const sorted = [...game].sort((a, b) => a - b);
  const even = game.filter(n => n % 2 === 0).length;
  const sum = game.reduce((a, b) => a + b, 0);
  const mean = sum / game.length;
  const variance = game.reduce((s, n) => s + (n - mean) ** 2, 0) / game.length;
  const stdev = Math.sqrt(variance);
  const decadeBuckets = Math.max(2, Math.ceil(totalNumbers / 10));
  const decadeCounts = new Array(decadeBuckets).fill(0);
  for (const n of game) decadeCounts[Math.min(Math.floor((n - 1) / 10), decadeBuckets - 1)]++;
  let consecutive = 0;
  for (let i = 1; i < sorted.length; i++) if (sorted[i] === sorted[i - 1] + 1) consecutive++;
  return {
    parityEven: even,
    parityOdd: game.length - even,
    sum,
    spread: sorted[sorted.length - 1] - sorted[0],
    stdev,
    decadeMax: Math.max(...decadeCounts),
    decadeUsed: decadeCounts.filter(c => c > 0).length,
    consecutivePairs: consecutive,
  };
}

function aggregateMetrics(games: number[][], totalNumbers: number): BaselineMetrics {
  const n = games.length || 1;
  const metrics = games.map(g => computeGameMetrics(g, totalNumbers));
  const freq = new Map<number, number>();
  for (const g of games) for (const num of g) freq.set(num, (freq.get(num) ?? 0) + 1);
  const totalPicks = games.reduce((s, g) => s + g.length, 0) || 1;
  const relFreq = new Map<number, number>();
  for (const [k, v] of freq) relFreq.set(k, v / totalPicks);
  const sums = metrics.map(m => m.sum);
  const evens = metrics.map(m => m.parityEven);
  return {
    avgEven: evens.reduce((a, b) => a + b, 0) / n,
    avgSum: sums.reduce((a, b) => a + b, 0) / n,
    avgSpread: metrics.reduce((s, m) => s + m.spread, 0) / n,
    avgStdev: metrics.reduce((s, m) => s + m.stdev, 0) / n,
    avgDecadeMax: metrics.reduce((s, m) => s + m.decadeMax, 0) / n,
    avgDecadeUsed: metrics.reduce((s, m) => s + m.decadeUsed, 0) / n,
    avgConsecutive: metrics.reduce((s, m) => s + m.consecutivePairs, 0) / n,
    sumMin: Math.min(...sums),
    sumMax: Math.max(...sums),
    parityMin: Math.min(...evens),
    parityMax: Math.max(...evens),
    numberFrequency: relFreq,
  };
}

function giniCoefficient(freqMap: Map<number, number>, totalNumbers: number): number {
  const values: number[] = [];
  for (let i = 1; i <= totalNumbers; i++) values.push(freqMap.get(i) ?? 0);
  values.sort((a, b) => a - b);
  const n = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;
  let cum = 0;
  for (let i = 0; i < n; i++) cum += (i + 1) * values[i];
  return (2 * cum) / (n * sum) - (n + 1) / n;
}

function coverageBlock(games: number[][], totalNumbers: number) {
  const freq = new Map<number, number>();
  for (const g of games) for (const n of g) freq.set(n, (freq.get(n) ?? 0) + 1);
  const sorted = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
  const all: { number: number; count: number }[] = [];
  for (let i = 1; i <= totalNumbers; i++) all.push({ number: i, count: freq.get(i) ?? 0 });
  all.sort((a, b) => b.count - a.count);
  return {
    numbersCovered: freq.size,
    totalNumbers,
    coveragePct: (freq.size / totalNumbers) * 100,
    mostUsed: all.slice(0, 8),
    leastUsed: [...all].sort((a, b) => a.count - b.count).slice(0, 8),
    giniCoefficient: giniCoefficient(freq, totalNumbers),
  };
}

function parityDist(games: number[][]): Record<number, number> {
  const out: Record<number, number> = {};
  for (const g of games) {
    const even = g.filter(n => n % 2 === 0).length;
    out[even] = (out[even] ?? 0) + 1;
  }
  return out;
}

function sumDist(games: number[][], buckets = 10): { bucket: string; count: number }[] {
  const sums = games.map(g => g.reduce((a, b) => a + b, 0));
  if (sums.length === 0) return [];
  const min = Math.min(...sums), max = Math.max(...sums);
  const step = Math.max(1, (max - min) / buckets);
  const out: { bucket: string; count: number }[] = [];
  for (let i = 0; i < buckets; i++) {
    const lo = Math.round(min + i * step);
    const hi = Math.round(min + (i + 1) * step);
    const count = sums.filter(s => s >= lo && (i === buckets - 1 ? s <= hi : s < hi)).length;
    out.push({ bucket: `${lo}-${hi}`, count });
  }
  return out;
}

function decadeDist(games: number[][], totalNumbers: number): number[] {
  const buckets = Math.max(2, Math.ceil(totalNumbers / 10));
  const out = new Array(buckets).fill(0);
  for (const g of games) for (const n of g) {
    out[Math.min(Math.floor((n - 1) / 10), buckets - 1)]++;
  }
  return out;
}

/** Cria a benchmark report comparando jogos gerados vs baseline histórica */
export function buildBenchmarkReport(
  generated: number[][],
  draws: DrawResult[],
  lotteryId: string,
  baselineWindow = 200,
): BenchmarkReport {
  const rules = getLotteryRules(lotteryId);
  const baselineDraws = draws.slice(0, baselineWindow).map(d => d.numbers);
  const total = rules.totalNumbers;

  const genMetrics = aggregateMetrics(generated, total);
  const baseMetrics = aggregateMetrics(baselineDraws, total);

  const genCov = coverageBlock(generated, total);
  const baseCov = coverageBlock(baselineDraws, total);

  const pct = (a: number, b: number) => (b === 0 ? 0 : (Math.abs(a - b) / b) * 100);

  const parityDelta = pct(genMetrics.avgEven, baseMetrics.avgEven);
  const sumDelta = pct(genMetrics.avgSum, baseMetrics.avgSum);
  const spreadDelta = pct(genMetrics.avgSpread, baseMetrics.avgSpread);
  const stdevDelta = pct(genMetrics.avgStdev, baseMetrics.avgStdev);
  const coverageDelta = pct(genCov.coveragePct, baseCov.coveragePct);

  // alignment: média invertida dos deltas, normalizada
  const avgDelta = (parityDelta + sumDelta + spreadDelta + stdevDelta + coverageDelta) / 5;
  const alignmentScore = Math.max(0, Math.min(100, Math.round(100 - avgDelta)));

  return {
    totalGames: generated.length,
    totalDraws: baselineDraws.length,
    generated: {
      metrics: genMetrics,
      coverage: genCov,
      parityDistribution: parityDist(generated),
      sumDistribution: sumDist(generated),
      decadeDistribution: decadeDist(generated, total),
    },
    baseline: {
      metrics: baseMetrics,
      coverage: {
        numbersCovered: baseCov.numbersCovered,
        totalNumbers: baseCov.totalNumbers,
        coveragePct: baseCov.coveragePct,
        giniCoefficient: baseCov.giniCoefficient,
      },
      parityDistribution: parityDist(baselineDraws),
      sumDistribution: sumDist(baselineDraws),
      decadeDistribution: decadeDist(baselineDraws, total),
    },
    comparison: {
      parityDeltaPct: parityDelta,
      sumDeltaPct: sumDelta,
      spreadDeltaPct: spreadDelta,
      stdevDeltaPct: stdevDelta,
      coverageDeltaPct: coverageDelta,
      alignmentScore,
    },
  };
}
