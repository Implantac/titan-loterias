/**
 * HillClimbing — parte de uma solução (greedy) e tenta:
 *   1. Remover jogos redundantes.
 *   2. Trocar jogos por candidatos que preservem/aumentem cobertura.
 * Estratégia gulosa local, determinística por passo.
 */

import { greedyCover } from "./GreedyOptimizer";
import { makeRng } from "../../rng";
import {
  makeContext, coveragePct, pruneRedundant, randomGame,
  type CoverContext,
} from "../core/CoverEval";

export interface HCOptions {
  maxGames?: number;
  maxIterations?: number;
  seedGames?: number[][];
  seed?: number;
}

export interface HCOutput {
  games: number[][];
  iterations: number;
  improvements: number;
  finalCoverage: number;
}

export function runHillClimbing(
  baseSize: number, pick: number, m: number, opts: HCOptions = {},
): HCOutput {
  const ctx = makeContext(baseSize, pick, m);
  const rng = makeRng(opts.seed ?? (Math.imul(baseSize, 73856093) ^ Math.imul(pick, 19349663) ^ m));
  const maxIter = opts.maxIterations ?? 300;

  let solution = opts.seedGames
    ? opts.seedGames.slice()
    : greedyCover(baseSize, pick, m, { maxGames: opts.maxGames }).games;

  solution = pruneRedundant(solution, ctx);
  let bestCov = coveragePct(solution, ctx);
  let improvements = 0;
  let iter = 0;

  for (; iter < maxIter; iter++) {
    // Estratégia: para cada jogo, tenta substituir por um vizinho aleatório;
    // aceita se cobertura sobe ou (=100% e jogos menos redundantes).
    let improved = false;
    for (let i = 0; i < solution.length; i++) {
      const candidate = randomGame(baseSize, pick, rng);
      const trial = solution.slice();
      trial[i] = candidate;
      const cov = coveragePct(trial, ctx);
      if (cov > bestCov) {
        solution = trial;
        bestCov = cov;
        improvements++;
        improved = true;
      }
    }
    if (!improved) break;
    solution = pruneRedundant(solution, ctx);
    bestCov = coveragePct(solution, ctx);
  }

  return { games: solution, iterations: iter, improvements, finalCoverage: bestCov };
}
