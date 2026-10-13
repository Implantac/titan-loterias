import { NumberStats } from "@/engine/stats/statistics";
import { LotteryConfig, DrawResult } from "@/data/lotteries";
import { evaluateBetQuality, BetQualityReport } from "@/engine/stats/bet-quality";

// ═══════════════════════════════════════════════════════
// ALGORITMO GENÉTICO AVANÇADO
// Otimização evolutiva com crossover, mutação e elitismo
// ═══════════════════════════════════════════════════════

export type RiskLevel = "conservative" | "moderate" | "aggressive";

import { makeRng } from '../rng';

export interface GeneticConfig {
  populationSize: number;
  generations: number;
  mutationRate: number;
  crossoverRate: number;
  eliteRatio: number;
  riskLevel: RiskLevel;
  tournamentSize: number;
  /** Semente do PRNG. Fixa o resultado — necessário para reproduzir e auditar. */
  seed?: number;
}

export interface GeneticResult {
  best: { numbers: number[]; quality: BetQualityReport; fitness: number };
  top10: { numbers: number[]; quality: BetQualityReport; fitness: number }[];
  generations: number;
  elapsedMs: number;
  convergence: { gen: number; bestFitness: number; avgFitness: number }[];
  diversity: number;
}

const RISK_PRESETS: Record<RiskLevel, Partial<GeneticConfig>> = {
  conservative: { mutationRate: 0.05, crossoverRate: 0.7, eliteRatio: 0.2, tournamentSize: 5 },
  moderate: { mutationRate: 0.12, crossoverRate: 0.8, eliteRatio: 0.1, tournamentSize: 3 },
  aggressive: { mutationRate: 0.25, crossoverRate: 0.9, eliteRatio: 0.05, tournamentSize: 2 },
};

function buildWeights(stats: NumberStats[], risk: RiskLevel, rng: () => number): Map<number, number> {
  const weights = new Map<number, number>();
  for (const s of stats) {
    let w: number;
    if (risk === "conservative") {
      // Favor numbers with consistent patterns
      w = s.recentFreq * 3 + (s.stdDev < s.avgGap ? 4 : 1) + s.cycleScore * 2 + (s.status === "hot" ? 3 : 1);
    } else if (risk === "aggressive") {
      // Favor high-momentum and overdue numbers
      w = (s.momentum > 0 ? s.momentum * 5 : 0) + s.cycleScore * 6 + (s.trend > 0 ? s.trend * 4 : 0) + rng() * 3;
    } else {
      w = s.recentFreq * 2 + s.cycleScore * 4 + (s.trend > 0 ? s.trend * 3 : 0.5) + (s.momentum > 0 ? s.momentum : 0);
    }
    weights.set(s.number, Math.max(0.1, w));
  }
  return weights;
}

function weightedSelect(weights: Map<number, number>, exclude: Set<number>, rng: () => number): number {
  const entries = [...weights.entries()].filter(([n]) => !exclude.has(n));
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [n, w] of entries) {
    r -= w;
    if (r <= 0) return n;
  }
  return entries[entries.length - 1][0];
}

function createIndividual(pick: number, maxNum: number, weights: Map<number, number>, rng: () => number): number[] {
  const selected = new Set<number>();
  while (selected.size < pick) {
    selected.add(weightedSelect(weights, selected, rng));
  }
  return [...selected].sort((a, b) => a - b);
}

function tournamentSelect(
  population: { numbers: number[]; fitness: number }[],
  size: number,
  rng: () => number
): number[] {
  const tournament: typeof population = [];
  for (let i = 0; i < size; i++) {
    tournament.push(population[Math.floor(rng() * population.length)]);
  }
  tournament.sort((a, b) => b.fitness - a.fitness);
  return tournament[0].numbers;
}

function orderCrossover(parent1: number[], parent2: number[], pick: number, maxNum: number, rng: () => number): number[] {
  const child = new Set<number>();
  // Take half from each parent
  const half = Math.floor(pick / 2);
  const shuffled1 = [...parent1].sort(() => rng() - 0.5);
  const shuffled2 = [...parent2].sort(() => rng() - 0.5);
  
  for (let i = 0; i < half && child.size < pick; i++) {
    child.add(shuffled1[i]);
  }
  for (let i = 0; i < parent2.length && child.size < pick; i++) {
    child.add(shuffled2[i]);
  }
  // Fill remaining randomly
  while (child.size < pick) {
    child.add(Math.floor(rng() * maxNum) + 1);
  }
  return [...child].sort((a, b) => a - b);
}

function mutate(individual: number[], rate: number, maxNum: number, weights: Map<number, number>, rng: () => number): number[] {
  const result = [...individual];
  for (let i = 0; i < result.length; i++) {
    if (rng() < rate) {
      const exclude = new Set(result);
      exclude.delete(result[i]);
      result[i] = weightedSelect(weights, exclude, rng);
    }
  }
  return result.sort((a, b) => a - b);
}

export function runGeneticAlgorithm(
  stats: NumberStats[],
  config: LotteryConfig,
  draws: DrawResult[],
  geneticConfig: Partial<GeneticConfig> = {}
): GeneticResult {
  const start = performance.now();
  const risk = geneticConfig.riskLevel || "moderate";
  // Sem seed cai em Math.random() (comportamento antigo). Com seed o resultado
  // é reproduzível, como exige o AGENTS.md.
  const rng = makeRng(geneticConfig.seed ?? (Date.now() % 4294967296));
  const preset = RISK_PRESETS[risk];
  
  const cfg: GeneticConfig = {
    populationSize: geneticConfig.populationSize || 50,
    generations: geneticConfig.generations || 500,
    mutationRate: geneticConfig.mutationRate || preset.mutationRate!,
    crossoverRate: geneticConfig.crossoverRate || preset.crossoverRate!,
    eliteRatio: geneticConfig.eliteRatio || preset.eliteRatio!,
    riskLevel: risk,
    tournamentSize: geneticConfig.tournamentSize || preset.tournamentSize!,
  };

  const weights = buildWeights(stats, risk, rng);
  const convergence: GeneticResult["convergence"] = [];

  // Initialize population
  type Individual = { numbers: number[]; fitness: number; quality: BetQualityReport };
  let population: Individual[] = [];
  
  for (let i = 0; i < cfg.populationSize; i++) {
    const numbers = createIndividual(config.pick, config.numbers, weights, rng);
    const quality = evaluateBetQuality(numbers, stats, config, draws);
    population.push({ numbers, fitness: quality.overall, quality });
  }
  population.sort((a, b) => b.fitness - a.fitness);

  const sampleInterval = Math.max(1, Math.floor(cfg.generations / 50));

  for (let gen = 0; gen < cfg.generations; gen++) {
    const eliteCount = Math.max(1, Math.floor(cfg.populationSize * cfg.eliteRatio));
    const newPop: Individual[] = population.slice(0, eliteCount); // Keep elite

    while (newPop.length < cfg.populationSize) {
      const parent1 = tournamentSelect(population, cfg.tournamentSize, rng);
      const parent2 = tournamentSelect(population, cfg.tournamentSize, rng);

      let child: number[];
      if (rng() < cfg.crossoverRate) {
        child = orderCrossover(parent1, parent2, config.pick, config.numbers, rng);
      } else {
        child = [...parent1];
      }

      child = mutate(child, cfg.mutationRate, config.numbers, weights, rng);
      const quality = evaluateBetQuality(child, stats, config, draws);
      newPop.push({ numbers: child, fitness: quality.overall, quality });
    }

    population = newPop.sort((a, b) => b.fitness - a.fitness);

    // Deduplicate
    const seen = new Set<string>();
    population = population.filter(p => {
      const key = p.numbers.join(",");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Fill back if needed
    while (population.length < cfg.populationSize) {
      const numbers = createIndividual(config.pick, config.numbers, weights, rng);
      const quality = evaluateBetQuality(numbers, stats, config, draws);
      population.push({ numbers, fitness: quality.overall, quality });
    }
    population.sort((a, b) => b.fitness - a.fitness);

    if ((gen + 1) % sampleInterval === 0) {
      const avgFitness = population.reduce((s, p) => s + p.fitness, 0) / population.length;
      convergence.push({ gen: gen + 1, bestFitness: population[0].fitness, avgFitness: Math.round(avgFitness) });
    }
  }

  // Calculate diversity
  const uniqueNumbers = new Set(population.flatMap(p => p.numbers));
  const diversity = Math.round((uniqueNumbers.size / config.numbers) * 100);

  const top10 = population.slice(0, 10).map(p => ({
    numbers: p.numbers,
    quality: p.quality,
    fitness: p.fitness,
  }));

  return {
    best: top10[0],
    top10,
    generations: cfg.generations,
    elapsedMs: Math.round(performance.now() - start),
    convergence,
    diversity,
  };
}
