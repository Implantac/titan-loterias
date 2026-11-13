/**
 * GeneticOptimizer — algoritmo genético reforçado para set-cover de fechamentos.
 *
 * Fitness multi-objetivo:
 *   - Cobertura (peso alto)
 *   - Diversidade Jaccard (peso médio) — descorrelaciona jogos
 *   - Compressão (peso baixo) — menos jogos quando 100% coberto
 *
 * Melhorias:
 *   - Elitismo N=2 (configurável)
 *   - Mutação adaptativa: aumenta quando estagna, decai quando melhora
 *   - Parada por estagnação (patience configurável)
 *   - Curva de convergência com best, avg, diversidade média
 */

import { greedyCover } from "./GreedyOptimizer";
import { makeRng } from "../../rng";
import {
  makeContext, coveragePct, pruneRedundant, randomGame,
  type CoverContext,
} from "../core/CoverEval";

export interface GAOptions {
  maxGames?: number;
  populationSize?: number;
  generations?: number;
  mutationRate?: number;      // taxa base
  elitism?: number;
  seedGames?: number[][];
  seed?: number;
  patience?: number;          // gerações sem melhora antes de parar (default = generations)
  diversityWeight?: number;   // 0..1 peso da diversidade no fitness composto (default 0.15)
  onProgress?: (gen: number, best: number, avg: number) => void;
}

export interface GAHistoryPoint {
  gen: number;
  best: number;
  avg: number;
  diversity: number;
  mutationRate: number;
}

export interface GAOutput {
  games: number[][];
  generations: number;
  bestFitness: number;
  finalCoverage: number;
  history: GAHistoryPoint[];
  stopped: "converged" | "max_generations" | "stagnation";
}

// ─── Fitness composto ────────────────────────────────────────────────
function jaccard(a: Set<number>, b: Set<number>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const uni = a.size + b.size - inter;
  return uni === 0 ? 0 : inter / uni;
}

/** Diversidade média (1 - Jaccard médio). Custo O(n²·pick) mas n pequeno. */
function diversity(games: number[][]): number {
  if (games.length < 2) return 1;
  const sets = games.map(g => new Set(g));
  let sum = 0, pairs = 0;
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      sum += jaccard(sets[i], sets[j]);
      pairs++;
    }
  }
  return pairs === 0 ? 1 : 1 - sum / pairs;
}

function compositeFitness(
  games: number[][],
  ctx: CoverContext,
  targetGames: number,
  divWeight: number,
): { fit: number; cov: number; div: number } {
  const cov = coveragePct(games, ctx);
  const div = diversity(games);
  if (cov < 100) {
    // Antes de 100% cobertura, prioriza cobertura mas premia diversidade
    const fit = cov * (1 - divWeight) + div * 100 * divWeight;
    return { fit: fit * 0.9, cov, div };
  }
  // 100% coberto: bônus por poucos jogos + diversidade
  const eff = targetGames > 0 ? Math.min(1, targetGames / Math.max(1, games.length)) : 1;
  const fit = 90 + eff * 8 + div * 2;
  return { fit, cov, div };
}

// ─── Operadores ──────────────────────────────────────────────────────
function crossover(a: number[][], b: number[][], rng: () => number): number[][] {
  const size = Math.max(a.length, b.length);
  const child: number[][] = [];
  for (let i = 0; i < size; i++) {
    const src = rng() < 0.5 ? a : b;
    if (src[i]) child.push(src[i]);
  }
  return child;
}

function mutate(games: number[][], ctx: CoverContext, rate: number, rng: () => number): number[][] {
  return games.map(g =>
    rng() < rate ? randomGame(ctx.baseSize, ctx.pick, rng) : g,
  );
}

function tournamentPick(scored: { ind: number[][]; fit: number }[], rng: () => number): number[][] {
  const k = 3;
  let best = scored[Math.floor(rng() * scored.length)];
  for (let i = 1; i < k; i++) {
    const c = scored[Math.floor(rng() * scored.length)];
    if (c.fit > best.fit) best = c;
  }
  return best.ind;
}

// ─── Motor principal ─────────────────────────────────────────────────
export function runGeneticAlgorithm(
  baseSize: number, pick: number, m: number, opts: GAOptions = {},
): GAOutput {
  const ctx = makeContext(baseSize, pick, m);
  const rng = makeRng(opts.seed ?? (Math.imul(baseSize, 73856093) ^ Math.imul(pick, 19349663) ^ m));
  const popSize = opts.populationSize ?? 20;
  const generations = opts.generations ?? 60;
  const baseMutation = opts.mutationRate ?? 0.15;
  const elitism = Math.max(1, opts.elitism ?? 2);
  const patience = Math.max(5, opts.patience ?? Math.ceil(generations / 3));
  const divWeight = Math.min(1, Math.max(0, opts.diversityWeight ?? 0.15));

  const seed = opts.seedGames
    ?? greedyCover(baseSize, pick, m, { maxGames: opts.maxGames }).games;
  const target = seed.length;

  let population: number[][][] = [seed];
  while (population.length < popSize) population.push(mutate(seed, ctx, 0.3, rng));

  const history: GAHistoryPoint[] = [];
  let best = seed;
  let bestFit = compositeFitness(seed, ctx, target, divWeight).fit;
  let stagnation = 0;
  let mutationRate = baseMutation;
  let stopped: GAOutput["stopped"] = "max_generations";
  let doneGen = generations;

  for (let gen = 0; gen < generations; gen++) {
    const scored = population.map(ind => {
      const s = compositeFitness(ind, ctx, target, divWeight);
      return { ind, fit: s.fit, cov: s.cov, div: s.div };
    });
    scored.sort((a, b) => b.fit - a.fit);

    if (scored[0].fit > bestFit + 1e-6) {
      best = scored[0].ind;
      bestFit = scored[0].fit;
      stagnation = 0;
      mutationRate = Math.max(baseMutation * 0.6, mutationRate * 0.9); // decai
    } else {
      stagnation++;
      mutationRate = Math.min(0.6, mutationRate * 1.08); // aumenta gradativamente
    }

    const avg = scored.reduce((s, x) => s + x.fit, 0) / scored.length;
    const avgDiv = scored.reduce((s, x) => s + x.div, 0) / scored.length;
    history.push({ gen, best: bestFit, avg, diversity: avgDiv, mutationRate });
    opts.onProgress?.(gen, bestFit, avg);

    // Parada antecipada: 100% cobertura + estagnação
    if (scored[0].cov >= 100 - 1e-6 && stagnation >= patience) {
      stopped = "converged";
      doneGen = gen + 1;
      break;
    }
    if (stagnation >= patience * 2) {
      stopped = "stagnation";
      doneGen = gen + 1;
      break;
    }

    // Nova geração: elitismo + descendentes
    const next: number[][][] = scored.slice(0, elitism).map(s => s.ind);
    while (next.length < popSize) {
      const p1 = tournamentPick(scored, rng);
      const p2 = tournamentPick(scored, rng);
      let child = crossover(p1, p2, rng);
      child = mutate(child, ctx, mutationRate, rng);
      if (child.length === 0) child = [randomGame(baseSize, pick, rng)];
      next.push(child);
    }
    population = next;
  }

  best = pruneRedundant(best, ctx);

  return {
    games: best,
    generations: doneGen,
    bestFitness: bestFit,
    finalCoverage: coveragePct(best, ctx),
    history,
    stopped,
  };
}
