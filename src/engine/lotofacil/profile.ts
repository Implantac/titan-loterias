/**
 * Lotofácil Profile Engine — descriptive statistics only (no prediction).
 * Deterministic: same draws in => same profile out. Draws must be ordered
 * newest-first (draws[0] = latest contest). Never pass future draws.
 */
import type { DrawResult } from "@/data/lotteries";

const WINDOWS = [10, 20, 30, 50, 100, 200] as const;

export interface DistStats { mean: number; median: number; stdDev: number; p10: number; p25: number; p50: number; p75: number; p90: number; }

export interface NumberProfile {
  number: number;
  historicalFrequency: number; // share of draws containing number
  recentFrequency: Record<number, number>; // window -> share
  frequencyTrend: number; // recent(20) - historical
  frequencyStability: number; // stdDev of share across windows (lower = stabler)
  currentDelay: number;
  meanDelay: number;
  maxDelay: number;
  delayStdDev: number;
}

export interface PairStat { a: number; b: number; observed: number; expected: number; lift: number; stability: number; }

export interface LotofacilProfile {
  sampleSize: number;
  numbers: NumberProfile[];
  repeat: DistStats & { distribution: Record<number, number> };
  sum: DistStats;
  parity: Record<string, number>; // "evens/odds" -> count
  grid: { rows: number[][]; cols: number[][]; frame: Record<number, number>; };
  topPairs: PairStat[];
}

export function distStats(values: number[]): DistStats {
  if (values.length === 0) return { mean: 0, median: 0, stdDev: 0, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 };
  const s = [...values].sort((a, b) => a - b);
  const q = (p: number) => {
    const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
    return s[lo] + (s[hi] - s[lo]) * (i - lo);
  };
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  const sd = Math.sqrt(s.reduce((a, v) => a + (v - mean) ** 2, 0) / s.length);
  return { mean, median: q(0.5), stdDev: sd, p10: q(0.1), p25: q(0.25), p50: q(0.5), p75: q(0.75), p90: q(0.9) };
}

const FRAME = new Set([1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25]);

export function buildLotofacilProfile(draws: DrawResult[], topPairsCount = 20, N = 25, PICK = 15): LotofacilProfile {
  const valid = draws.filter(d => Array.isArray(d.numbers) && d.numbers.length === PICK);
  const T = valid.length;
  const sets = valid.map(d => new Set(d.numbers));

  const numbers: NumberProfile[] = [];
  for (let n = 1; n <= N; n++) {
    const hitIdx: number[] = [];
    sets.forEach((s, i) => { if (s.has(n)) hitIdx.push(i); });
    const hist = T ? hitIdx.length / T : 0;
    const recentFrequency: Record<number, number> = {};
    for (const w of WINDOWS) {
      const k = Math.min(w, T);
      recentFrequency[w] = k ? hitIdx.filter(i => i < k).length / k : 0;
    }
    const gaps: number[] = [];
    for (let j = 1; j < hitIdx.length; j++) gaps.push(hitIdx[j] - hitIdx[j - 1] - 1);
    const g = distStats(gaps);
    const shares = WINDOWS.map(w => recentFrequency[w]);
    numbers.push({
      number: n,
      historicalFrequency: hist,
      recentFrequency,
      frequencyTrend: recentFrequency[20] - hist,
      frequencyStability: distStats(shares).stdDev,
      currentDelay: hitIdx.length ? hitIdx[0] : T,
      meanDelay: g.mean,
      maxDelay: gaps.length ? Math.max(...gaps) : T,
      delayStdDev: g.stdDev,
    });
  }

  const repeats: number[] = [];
  const repDist: Record<number, number> = {};
  for (let i = 0; i + 1 < T; i++) {
    const r = valid[i].numbers.filter(x => sets[i + 1].has(x)).length;
    repeats.push(r);
    repDist[r] = (repDist[r] ?? 0) + 1;
  }

  const sums = valid.map(d => d.numbers.reduce((a, b) => a + b, 0));
  const parity: Record<string, number> = {};
  const rows = valid.map(() => [0, 0, 0, 0, 0]);
  const cols = valid.map(() => [0, 0, 0, 0, 0]);
  const frame: Record<number, number> = {};
  const pair = new Map<number, number[]>(); // key a*(N+1)+b -> hit indices
  valid.forEach((d, i) => {
    const ev = d.numbers.filter(x => x % 2 === 0).length;
    const key = `${ev}/${PICK - ev}`;
    parity[key] = (parity[key] ?? 0) + 1;
    let f = 0;
    for (const x of d.numbers) { if (N === 25) { rows[i][Math.floor((x - 1) / 5)]++; cols[i][(x - 1) % 5]++; } if (FRAME.has(x)) f++; }
    frame[f] = (frame[f] ?? 0) + 1;
    const s = [...d.numbers].sort((a, b) => a - b);
    for (let a = 0; a < s.length; a++) for (let b = a + 1; b < s.length; b++) {
      const k = s[a] * (N + 1) + s[b];
      const arr = pair.get(k); if (arr) arr.push(i); else pair.set(k, [i]);
    }
  });

  const freq = numbers.map(p => p.historicalFrequency);
  const half = Math.floor(T / 2);
  const pairs: PairStat[] = [];
  pair.forEach((idx, k) => {
    const a = Math.floor(k / (N + 1)), b = k % (N + 1);
    const expected = freq[a - 1] * freq[b - 1] * T;
    const recent = idx.filter(i => i < half).length / Math.max(half, 1);
    const older = idx.filter(i => i >= half).length / Math.max(T - half, 1);
    pairs.push({ a, b, observed: idx.length, expected, lift: expected ? idx.length / expected : 0, stability: 1 - Math.abs(recent - older) });
  });
  pairs.sort((x, y) => y.lift - x.lift || x.a - y.a || x.b - y.b);

  return {
    sampleSize: T,
    numbers,
    repeat: { ...distStats(repeats), distribution: repDist },
    sum: distStats(sums),
    parity,
    grid: { rows, cols, frame },
    topPairs: pairs.slice(0, topPairsCount),
  };
}

/** Structural plausibility check using empirical P10–P90 bands (not a prediction). */
export function structuralFit(game: number[], profile: LotofacilProfile, previous?: number[]) {
  const sum = game.reduce((a, b) => a + b, 0);
  const evens = game.filter(x => x % 2 === 0).length;
  const parityShare = (profile.parity[`${evens}/${game.length - evens}`] ?? 0) / Math.max(profile.sampleSize, 1);
  const repeat = previous ? game.filter(x => previous.includes(x)).length : null;
  const components = {
    sumInBand: sum >= profile.sum.p10 && sum <= profile.sum.p90,
    parityShare,
    repeatInBand: repeat === null ? null : repeat >= profile.repeat.p10 && repeat <= profile.repeat.p90,
  };
  return { sum, evens, repeat, components };
}
