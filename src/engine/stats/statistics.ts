import { DrawResult, LotteryConfig } from "@/data/lotteries";

export interface NumberStats {
  number: number;
  frequency: number;
  percentage: number;
  lastSeen: number; // draws ago
  recentFreq: number; // last 30 draws
  status: "hot" | "cold" | "normal";
  // Advanced metrics
  avgGap: number; // average gap between appearances
  maxGap: number; // longest streak without appearing
  stdDev: number; // standard deviation of gaps
  trend: number; // positive = trending up, negative = trending down
  momentum: number; // acceleration of frequency change
  consecutivePairs: number; // how often appears with neighbor ±1
  cycleScore: number; // how "due" the number is based on its cycle
  expectedAppearance: number; // calculated next expected concurso (relative)
  hotStreak: number; // current consecutive appearances
}


export function computeFrequencyStats(draws: DrawResult[], totalNumbers: number): NumberStats[] {
  const freq = new Array(totalNumbers + 1).fill(0);
  const lastSeen = new Array(totalNumbers + 1).fill(draws.length);
  const recentFreq = new Array(totalNumbers + 1).fill(0);
  const recent = 30;

  // Track all appearance positions for gap analysis
  const appearances: number[][] = Array.from({ length: totalNumbers + 1 }, () => []);

  // Track frequency in windows for trend analysis
  const window1Freq = new Array(totalNumbers + 1).fill(0); // last 10
  const window2Freq = new Array(totalNumbers + 1).fill(0); // 11-30
  const window3Freq = new Array(totalNumbers + 1).fill(0); // 31-60

  // Consecutive pair tracking
  const consecutivePairCount = new Array(totalNumbers + 1).fill(0);

  const streak = new Array(totalNumbers + 1).fill(0);
  const lastDrawNumbers = draws[0]?.numbers || [];
  
  const filterDraws = draws.filter(d => d && Array.isArray(d.numbers));
  const filterCount = filterDraws.length;
  
  for (let i = 0; i < filterCount; i++) {
    const draw = filterDraws[i];
    const numSet = new Set(draw.numbers);
    const drawNumbers = draw.numbers;
    const drawNumbersLen = drawNumbers.length;
    
    for (let j = 0; j < drawNumbersLen; j++) {
      const n = drawNumbers[j];
      if (n < 1 || n > totalNumbers) continue;
      freq[n]++;
      if (i < lastSeen[n]) lastSeen[n] = i;
      if (i < recent) recentFreq[n]++;
      appearances[n].push(i);

      if (i < 10) window1Freq[n]++;
      else if (i < 30) window2Freq[n]++;
      else if (i < 60) window3Freq[n]++;

      if (numSet.has(n - 1) || numSet.has(n + 1)) {
        consecutivePairCount[n]++;
      }
    }
  }

  const total = draws.length;
  const avgFreq = total > 0 ? draws[0].numbers.length / totalNumbers : 0;

  const stats: NumberStats[] = [];
  for (let n = 1; n <= totalNumbers; n++) {
    const pct = total > 0 ? (freq[n] / total) * 100 : 0;
    const avgPct = avgFreq * 100;
    let status: "hot" | "cold" | "normal" = "normal";
    if (pct > avgPct * 1.15) status = "hot";
    else if (pct < avgPct * 0.85) status = "cold";

    // Gap analysis
    const gaps: number[] = [];
    const sorted = appearances[n].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(sorted[i] - sorted[i - 1]);
    }
    if (sorted.length > 0) {
      gaps.unshift(sorted[0]); // gap from start
    }

    const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : total;
    const maxGap = gaps.length > 0 ? Math.max(...gaps) : total;
    const mean = avgGap;
    const stdDev = gaps.length > 1
      ? Math.sqrt(gaps.reduce((sum, g) => sum + (g - mean) ** 2, 0) / gaps.length)
      : 0;

    // Trend: compare recent windows (positive = heating up)
    const w1Rate = window1Freq[n] / 10;
    const w2Rate = window2Freq[n] / 20;
    const w3Rate = window3Freq[n] / 30;
    const trend = (w1Rate - w2Rate) * 50;
    const momentum = (w1Rate - w2Rate) - (w2Rate - w3Rate); // acceleration

    // Cycle score: how overdue is this number?
    const expectedGap = freq[n] > 0 ? total / freq[n] : total;
    const cycleScore = expectedGap > 0 ? lastSeen[n] / expectedGap : 0;

    stats.push({
      number: n,
      frequency: freq[n],
      percentage: pct,
      lastSeen: lastSeen[n],
      recentFreq: recentFreq[n],
      status,
      avgGap,
      maxGap,
      stdDev,
      trend,
      momentum: momentum * 100,
      consecutivePairs: consecutivePairCount[n],
      cycleScore,
      expectedAppearance: Math.round(avgGap - lastSeen[n]),
      hotStreak: draws.slice(0, 5).filter(d => d.numbers.includes(n)).length,
    });
  }

  return stats;
}

export interface PairStats {
  even: number;
  odd: number;
}

export function computeParityDistribution(draws: DrawResult[]): PairStats[] {
  return draws.slice(0, 50).map(d => ({
    even: d.numbers.filter(n => n % 2 === 0).length,
    odd: d.numbers.filter(n => n % 2 !== 0).length,
  }));
}

export function computeSumDistribution(draws: DrawResult[]): { concurso: number; sum: number }[] {
  return draws.slice(0, 50).map(d => ({
    concurso: d.concurso,
    sum: d.numbers.reduce((a, b) => a + b, 0),
  }));
}

export function generateSmartBet(stats: NumberStats[], pick: number): number[] {
  const weighted = stats.map(s => ({
    number: s.number,
    weight:
      (s.status === "hot" ? 3 : s.status === "cold" ? 1 : 2) +
      s.trend * 0.5 +
      s.cycleScore * 2 +
      (s.momentum > 0 ? s.momentum * 0.3 : 0),
  })).map(w => ({ ...w, weight: Math.max(0.1, w.weight) }));

  const selected: number[] = [];
  const pool = [...weighted];

  while (selected.length < pick && pool.length > 0) {
    const totalWeight = pool.reduce((a, b) => a + b.weight, 0);
    let r = Math.random() * totalWeight;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].weight;
      if (r <= 0) {
        selected.push(pool[i].number);
        pool.splice(i, 1);
        break;
      }
    }
  }

  return selected.sort((a, b) => a - b);
}

export function runMonteCarloSimulation(
  config: LotteryConfig,
  stats: NumberStats[],
  iterations: number = 10000
): { number: number; wins: number }[] {
  const winCount = new Array(config.numbers + 1).fill(0);

  for (let i = 0; i < iterations; i++) {
    const bet = generateSmartBet(stats, config.pick);
    const draw: number[] = [];
    while (draw.length < config.pick) {
      const n = Math.floor(Math.random() * config.numbers) + 1;
      if (!draw.includes(n)) draw.push(n);
    }
    bet.forEach(n => {
      if (draw.includes(n)) winCount[n]++;
    });
  }

  return Array.from({ length: config.numbers }, (_, i) => ({
    number: i + 1,
    wins: winCount[i + 1],
  })).sort((a, b) => b.wins - a.wins);
}
