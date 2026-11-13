/**
 * CoveringDesignEngine — combina Schönheim lower bound com refinamento iterativo:
 *  1. Greedy inicial
 *  2. Prune de redundantes
 *  3. Múltiplas rodadas de hill climbing
 *  4. Aceita a menor solução que preserve cobertura 100%
 */

import { greedyCover } from "./GreedyOptimizer";
import { makeRng } from "../../rng";
import { runHillClimbing } from "./HillClimbing";
import {
  makeContext, coveragePct, pruneRedundant, randomGame,
} from "../core/CoverEval";
import { schonheimBound } from "../core/combinatorics";

export interface CDOptions {
  maxGames?: number;
  refinementPasses?: number;
  seed?: number;
}

export interface CDOutput {
  games: number[][];
  lowerBound: number;
  passes: number;
  finalCoverage: number;
  reachedBound: boolean;
}

export function runCoveringDesign(
  baseSize: number, pick: number, m: number, opts: CDOptions = {},
): CDOutput {
  const ctx = makeContext(baseSize, pick, m);
  const seed = opts.seed ?? (Math.imul(baseSize, 73856093) ^ Math.imul(pick, 19349663) ^ m);
  const rng = makeRng(seed);
  const bound = schonheimBound(baseSize, pick, m);
  const passes = opts.refinementPasses ?? 5;

  let best = greedyCover(baseSize, pick, m, { maxGames: opts.maxGames }).games;
  best = pruneRedundant(best, ctx);
  let bestCov = coveragePct(best, ctx);

  for (let p = 0; p < passes; p++) {
    if (best.length <= bound && bestCov >= 100) break;

    // Tenta reduzir 1 jogo, se cobertura permanece 100% após substituições locais
    const hc = runHillClimbing(baseSize, pick, m, {
      seedGames: best, maxIterations: 40, seed: rng() * 0x100000000,
    });
    if (hc.finalCoverage >= bestCov && hc.games.length <= best.length) {
      best = hc.games;
      bestCov = hc.finalCoverage;
    }

    // Perturbação: injeta jogo aleatório e faz nova prune
    const perturbed = best.slice();
    perturbed.push(randomGame(baseSize, pick, rng));
    const pruned = pruneRedundant(perturbed, ctx);
    const prunedCov = coveragePct(pruned, ctx);
    if (prunedCov >= bestCov && pruned.length < best.length) {
      best = pruned;
      bestCov = prunedCov;
    }
  }

  return {
    games: best,
    lowerBound: bound,
    passes,
    finalCoverage: bestCov,
    reachedBound: best.length === bound && bestCov >= 100,
  };
}
