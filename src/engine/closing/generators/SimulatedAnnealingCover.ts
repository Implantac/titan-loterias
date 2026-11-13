/**
 * SimulatedAnnealingCover — otimização estocástica para set-cover de fechamentos.
 * Aceita movimentos ruins com probabilidade exp(delta/T) para escapar de ótimos locais.
 */

import { greedyCover } from "./GreedyOptimizer";
import { makeRng } from "../../rng";
import {
  makeContext, coveragePct, pruneRedundant, randomGame,
} from "../core/CoverEval";

export interface SAOptions {
  maxGames?: number;
  initialTemp?: number;
  coolingRate?: number;
  iterations?: number;
  seedGames?: number[][];
  seed?: number;
}

export interface SAOutput {
  games: number[][];
  iterations: number;
  accepted: number;
  finalCoverage: number;
  temperatureHistory: { step: number; temp: number; cov: number }[];
}

export function runSimulatedAnnealing(
  baseSize: number, pick: number, m: number, opts: SAOptions = {},
): SAOutput {
  const ctx = makeContext(baseSize, pick, m);
  const rng = makeRng(opts.seed ?? (Math.imul(baseSize, 73856093) ^ Math.imul(pick, 19349663) ^ m));
  const initialTemp = opts.initialTemp ?? 100;
  const coolingRate = opts.coolingRate ?? 0.99;
  const iterations = opts.iterations ?? 500;

  let current = opts.seedGames
    ? opts.seedGames.slice()
    : greedyCover(baseSize, pick, m, { maxGames: opts.maxGames }).games;
  let currentCov = coveragePct(current, ctx);

  let best = current;
  let bestCov = currentCov;
  let temp = initialTemp;
  let accepted = 0;
  const history: SAOutput["temperatureHistory"] = [];
  const sampleEvery = Math.max(1, Math.floor(iterations / 40));

  for (let i = 0; i < iterations; i++) {
    // Movimento: substitui um jogo aleatório por um vizinho.
    const idx = Math.floor(rng() * current.length);
    const trial = current.slice();
    trial[idx] = randomGame(baseSize, pick, rng);
    const trialCov = coveragePct(trial, ctx);
    const delta = trialCov - currentCov;

    if (delta >= 0 || rng() < Math.exp(delta / temp)) {
      current = trial;
      currentCov = trialCov;
      accepted++;
      if (currentCov > bestCov) {
        best = current;
        bestCov = currentCov;
      }
    }
    temp *= coolingRate;
    if ((i + 1) % sampleEvery === 0) {
      history.push({ step: i + 1, temp: Math.round(temp * 100) / 100, cov: bestCov });
    }
  }

  best = pruneRedundant(best, ctx);
  bestCov = coveragePct(best, ctx);

  return {
    games: best,
    iterations,
    accepted,
    finalCoverage: bestCov,
    temperatureHistory: history,
  };
}
