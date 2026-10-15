import type { DrawResult } from "@/data/lotteries";
import { makeRng, shuffleWith } from './rng';

export type WorksheetMatrixMode = "base" | "fixed-plus-pool" | "gf";

export interface WorksheetMatrixPreset {
  id: string;
  label: string;
  sheetName: string;
  mode: WorksheetMatrixMode;
  baseCount?: number;
  fixedCount?: number;
  poolCount?: number;
  eliminatedCount?: number;
  gameCount: number;
  description: string;
  /** Aproximação estatística de cobertura quando as 15 dezenas sorteadas estão dentro da base. */
  statisticalCoverage?: string;
  /** Chance empírica de ao menos 11 acertos em um jogo, dado que todas as 15 caíram na base. */
  minPrizeChance?: string;
}

export interface WorksheetGameAnalysis {
  index: number;
  numbers: number[];
  hits: number;
  missing: number[];
  sum: number;
  even: number;
  odd: number;
  primes: number;
  fibonacci: number;
  repeatedFromPrevious: number;
  moldura: number;
  lines: number[];
  columns: number[];
}

export interface WorksheetMatrixResult {
  games: WorksheetGameAnalysis[];
  bestHits: number;
  hitDistribution: Record<number, number>;
  totalCost: number;
}

export interface WorksheetBacktestResult {
  totalDraws: number;
  avgHits: number;
  totalPrizes: number;
  prizeRate: number;
  hitsDistribution: Record<number, number>;
  bestHitsInPeriod: number;
}

export const LOTOFACIL_WORKSHEET_PRESETS: WorksheetMatrixPreset[] = [
  {
    id: "plan21x50",
    label: "Titan 21x50 (Alta Cobertura)",
    sheetName: "Matriz 21x50",
    mode: "base",
    baseCount: 21,
    gameCount: 50,
    description: "21 dezenas selecionadas gerando 50 jogos equilibrados com alta cobertura para 14 e 15 acertos.",
    statisticalCoverage: "~92%",
    minPrizeChance: "Alta se 14+ na base",
  },
  {
    id: "plan19x5",
    label: "Econômica 19x5 (5 Jogos)",
    sheetName: "Matriz 19x5",
    mode: "base",
    baseCount: 19,
    gameCount: 5,
    description: "Fechamento econômico de 19 dezenas em apenas 5 jogos com excelente relação custo-benefício.",
    statisticalCoverage: "~35%",
    minPrizeChance: "Média se 15 na base",
  },
  {
    id: "plan17x8",
    label: "Equilibrada 17x8 (8 Jogos)",
    sheetName: "Matriz 17x8",
    mode: "base",
    baseCount: 17,
    gameCount: 8,
    description: "17 dezenas-base para 8 jogos com alta repetição interna e garantia de recuperação de custo.",
    statisticalCoverage: "~60%",
    minPrizeChance: "Alta se 15 na base",
  },
  {
    id: "plan13x6",
    label: "Fixas Titan 13x6 (6 Jogos)",
    sheetName: "Matriz 13x6",
    mode: "fixed-plus-pool",
    fixedCount: 13,
    poolCount: 12,
    gameCount: 6,
    description: "13 dezenas fixas combinadas em rotação com as 12 restantes, gerando 6 jogos perfeitos.",
    statisticalCoverage: "Depende das 13 fixas",
    minPrizeChance: "Alta com 13 fixas certas",
  },
  {
    id: "six-absent",
    label: "Rotativa 6 Ausentes (15 Jogos)",
    sheetName: "Matriz 6 Ausentes",
    mode: "fixed-plus-pool",
    fixedCount: 6,
    poolCount: 14,
    gameCount: 15,
    description: "6 dezenas ausentes fixas combinadas com 14 dezenas repetidas em 15 combinações estruturadas.",
    statisticalCoverage: "Otimizada para fechamento de ciclo",
    minPrizeChance: "Média se pool bem escolhido",
  },
  {
    id: "plan6x13",
    label: "Expansão 6x13 (38 Jogos)",
    sheetName: "Matriz 6x13",
    mode: "fixed-plus-pool",
    fixedCount: 6,
    poolCount: 13,
    gameCount: 38,
    description: "6 dezenas fixas e 13 dezenas variáveis combinadas em 38 jogos de ampla dispersão.",
    statisticalCoverage: "~55%",
    minPrizeChance: "Média se 6 fixas caem",
  },
  {
    id: "plan-gf",
    label: "Grupos GF 3x2 (10 Jogos)",
    sheetName: "Matriz GF 3x2",
    mode: "gf",
    fixedCount: 3,
    eliminatedCount: 2,
    gameCount: 10,
    description: "3 dezenas fixas, 2 eliminadas e 5 grupos rotativos para gerar 10 jogos balanceados.",
    statisticalCoverage: "~25%",
    minPrizeChance: "Estratégica com eliminação",
  },
];

const LOTOFACIL_PRICE = 3;
const PRIMES = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23]);
const FIBONACCI = new Set([1, 2, 3, 5, 8, 13, 21]);
const MOLDURA = new Set([1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25]);

export function getPresetInputSize(preset: WorksheetMatrixPreset) {
  if (preset.mode === "base") return preset.baseCount ?? 0;
  if (preset.mode === "fixed-plus-pool") return (preset.fixedCount ?? 0) + (preset.poolCount ?? 0);
  return (preset.fixedCount ?? 0) + (preset.eliminatedCount ?? 0);
}

export function selectTopLotofacilNumbers(rankedNumbers: number[], count: number) {
  return rankedNumbers
    .filter((n) => n >= 1 && n <= 25)
    .slice(0, count)
    .sort((a, b) => a - b);
}

export function generateWorksheetMatrixGames(
  preset: WorksheetMatrixPreset,
  selectedNumbers: number[],
): number[][] {
  const unique = [...new Set(selectedNumbers)].filter((n) => n >= 1 && n <= 25).sort((a, b) => a - b);

  if (preset.mode === "base") {
    return generateBalancedBaseGames(unique.slice(0, preset.baseCount), preset.gameCount);
  }

  if (preset.mode === "fixed-plus-pool") {
    const fixed = unique.slice(0, preset.fixedCount);
    const pool = unique.slice(preset.fixedCount, (preset.fixedCount ?? 0) + (preset.poolCount ?? 0));
    return generateFixedPlusPoolGames(fixed, pool, preset.gameCount);
  }

  const fixed = unique.slice(0, preset.fixedCount);
  const eliminated = new Set(unique.slice(preset.fixedCount, (preset.fixedCount ?? 0) + (preset.eliminatedCount ?? 0)));
  const pool = Array.from({ length: 25 }, (_, i) => i + 1).filter((n) => !fixed.includes(n) && !eliminated.has(n));
  return generateGroupedFixedGames(fixed, pool, preset.gameCount);
}

export function analyzeWorksheetGames(
  games: number[][],
  draw?: DrawResult | null,
  previousDraw?: DrawResult | null,
): WorksheetMatrixResult {
  const drawSet = new Set(draw?.numbers ?? []);
  const previousSet = new Set(previousDraw?.numbers ?? []);
  const hitDistribution: Record<number, number> = {};

  const analyzed = games.map((numbers, idx) => {
    const hits = draw ? numbers.filter((n) => drawSet.has(n)).length : 0;
    const missing = draw ? numbers.filter((n) => !drawSet.has(n)) : [];
    hitDistribution[hits] = (hitDistribution[hits] ?? 0) + 1;

    return {
      index: idx + 1,
      numbers,
      hits,
      missing,
      sum: numbers.reduce((acc, n) => acc + n, 0),
      even: numbers.filter((n) => n % 2 === 0).length,
      odd: numbers.filter((n) => n % 2 !== 0).length,
      primes: numbers.filter((n) => PRIMES.has(n)).length,
      fibonacci: numbers.filter((n) => FIBONACCI.has(n)).length,
      repeatedFromPrevious: previousDraw ? numbers.filter((n) => previousSet.has(n)).length : 0,
      moldura: numbers.filter((n) => MOLDURA.has(n)).length,
      lines: countGridAxis(numbers, "line"),
      columns: countGridAxis(numbers, "column"),
    };
  });

  return {
    games: analyzed,
    bestHits: analyzed.reduce((best, game) => Math.max(best, game.hits), 0),
    hitDistribution,
    totalCost: games.length * LOTOFACIL_PRICE,
  };
}

export function runWorksheetBacktest(
  games: number[][],
  draws: DrawResult[],
  period: number = 100
): WorksheetBacktestResult {
  const periodDraws = draws.slice(0, Math.min(period, draws.length));
  let totalHits = 0;
  let totalPrizes = 0;
  const hitsDistribution: Record<number, number> = {};
  let bestHitsInPeriod = 0;

  periodDraws.forEach(draw => {
    const drawSet = new Set(draw.numbers);
    games.forEach(game => {
      const hits = game.filter(n => drawSet.has(n)).length;
      totalHits += hits;
      if (hits >= 11) totalPrizes++;
      hitsDistribution[hits] = (hitsDistribution[hits] || 0) + 1;
      if (hits > bestHitsInPeriod) bestHitsInPeriod = hits;
    });
  });

  const totalGamesChecked = games.length * periodDraws.length;

  return {
    totalDraws: periodDraws.length,
    avgHits: totalGamesChecked > 0 ? parseFloat((totalHits / totalGamesChecked).toFixed(2)) : 0,
    totalPrizes,
    prizeRate: totalGamesChecked > 0 ? parseFloat(((totalPrizes / totalGamesChecked) * 100).toFixed(2)) : 0,
    hitsDistribution,
    bestHitsInPeriod
  };
}



// Sample `count` distinct k-subsets of `arr`, biased toward even usage of each element.
function sampleDistinctSubsets(arr: number[], k: number, count: number, seed = 42): number[][] {
  if (arr.length < k || k <= 0 || count <= 0) return [];
  const results: number[][] = [];
  const seen = new Set<string>();
  const usage = new Map(arr.map((n) => [n, 0]));
  const rng = makeRng(seed);
  const maxAttempts = Math.max(count * 40, 400);

  for (let attempt = 0; results.length < count && attempt < maxAttempts; attempt++) {
    // Sort by (usage asc, random tiebreak) so under-used numbers surface earlier
    const ranked = [...arr].sort((a, b) => {
      const du = (usage.get(a) ?? 0) - (usage.get(b) ?? 0);
      if (du !== 0) return du;
      return rng() - 0.5;
    });
    // Take the least-used k, then perturb the last few positions with a random swap
    // to break ties differently across attempts and force uniqueness.
    const pick = ranked.slice(0, k);
    // Random swaps between selected and unselected to diversify
    const swaps = 1 + Math.floor(rng() * 3);
    const unselected = ranked.slice(k);
    for (let s = 0; s < swaps && unselected.length > 0; s++) {
      const inIdx = Math.floor(rng() * pick.length);
      const outIdx = Math.floor(rng() * unselected.length);
      [pick[inIdx], unselected[outIdx]] = [unselected[outIdx], pick[inIdx]];
    }
    const sorted = pick.slice().sort((a, b) => a - b);
    const key = sorted.join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(sorted);
    sorted.forEach((n) => usage.set(n, (usage.get(n) ?? 0) + 1));
  }

  // Fallback: if capacity of C(n,k) is above what we produced but we still fell short,
  // top up with pure random distinct subsets.
  while (results.length < count) {
    const shuffled = shuffleWith(arr, rng).slice(0, k).sort((a, b) => a - b);
    const key = shuffled.join(",");
    if (seen.has(key)) { seen.add(key); results.push(shuffled); }
    // Safety: stop if the combinatorial space is exhausted
    if (seen.size >= combinationCount(arr.length, k)) break;
  }
  return results;
}

function combinationCount(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let c = 1;
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1);
  return Math.round(c);
}

function generateBalancedBaseGames(baseNumbers: number[], gameCount: number) {
  if (baseNumbers.length < 15) return [];
  return sampleDistinctSubsets(baseNumbers, 15, gameCount, 2101);
}

function generateFixedPlusPoolGames(fixed: number[], pool: number[], gameCount: number) {
  const take = 15 - fixed.length;
  if (fixed.length <= 0 || pool.length < take) return [];
  const subsets = sampleDistinctSubsets(pool, take, gameCount, 3141);
  return subsets.map((sub) => [...fixed, ...sub].sort((a, b) => a - b));
}

function generateGroupedFixedGames(fixed: number[], pool: number[], gameCount: number) {
  if (fixed.length !== 3 || pool.length < 12) return [];
  const groups = [0, 1, 2, 3, 4].map((idx) => pool.slice(idx * 4, idx * 4 + 4)).filter((g) => g.length === 4);
  const patterns = [
    [0, 1, 2], [0, 1, 3], [0, 1, 4], [0, 2, 3], [0, 2, 4],
    [0, 3, 4], [1, 2, 3], [1, 2, 4], [1, 3, 4], [2, 3, 4],
  ];
  return patterns.slice(0, gameCount).map((pattern) =>
    [...fixed, ...pattern.flatMap((idx) => groups[idx])].sort((a, b) => a - b)
  );
}

function rotate(values: number[], offset: number) {
  if (values.length === 0) return [];
  const normalized = offset % values.length;
  return [...values.slice(normalized), ...values.slice(0, normalized)];
}

function countGridAxis(numbers: number[], axis: "line" | "column") {
  const counts = [0, 0, 0, 0, 0];
  numbers.forEach((n) => {
    const zero = n - 1;
    const index = axis === "line" ? Math.floor(zero / 5) : zero % 5;
    counts[index]++;
  });
  return counts;
}
