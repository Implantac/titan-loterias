/**
 * ClosingEngine — facade do Motor Universal de Fechamentos.
 *
 * API pública:
 *   - generateClosing(request)         — despacha por estratégia
 *   - compareStrategies(request, list) — roda várias e compara
 *   - validateClosing(...)
 *   - calculateCoverage(...)
 *   - calculateGuarantee(baseSize, pick, m)
 *   - compareClosings(a, b)
 */

import type {
  ClosingRequest, ClosingResult, ClosingStrategy,
  LotteryParams, ClosingValidation,
} from "./types";
import { greedyCover } from "../generators/GreedyOptimizer";
import { runHillClimbing } from "../generators/HillClimbing";
import { runSimulatedAnnealing } from "../generators/SimulatedAnnealingCover";
import { runGeneticAlgorithm } from "../generators/GeneticOptimizer";
import { runCoveringDesign } from "../generators/CoveringDesignEngine";
import { validateClosing as runValidation } from "../validation/ValidationEngine";
import { computeScore } from "../scoring/ScoreEngine";
import { calculateCoverage, type CoverageReport } from "./CoverageCalculator";
import { schonheimBound, binomial } from "./combinatorics";

export function generateClosing(request: ClosingRequest): ClosingResult {
  const start = performance.now();
  const strategy: ClosingStrategy = request.strategy ?? "greedy";
  const base = request.baseNumbers.slice().sort((a, b) => a - b);
  const b = base.length;
  const pick = request.lottery.pick;
  const m = request.guarantee.minHits;
  const notes: string[] = [];

  if (b < pick) {
    return emptyResult(request, strategy, start, [
      `Base insuficiente: ${b} dezenas selecionadas, mínimo ${pick}.`,
    ]);
  }
  if (m > pick) {
    return emptyResult(request, strategy, start, [
      `Garantia inválida: minHits (${m}) não pode ser maior que pick (${pick}).`,
    ]);
  }

  if (!Number.isInteger(request.guarantee.hitsInBase) ||
      request.guarantee.hitsInBase < 0 || request.guarantee.hitsInBase > Math.min(pick, b) ||
      !Number.isInteger(m) || m < 1 || m > request.guarantee.hitsInBase ||
      new Set(base).size !== b || base.some(n => !Number.isInteger(n) || n < 1 || n > request.lottery.totalNumbers)) {
    return emptyResult(request, strategy, start, [
      "Parâmetros inválidos: confira base, dezenas por sorteio e meta de acertos.",
    ]);
  }

  // Executa a estratégia escolhida. Todos retornam índices em [0..b-1].
  let idxGames: number[][] = [];
  let exhaustiveUniverse = true;
  let exhaustiveCandidates = true;

  switch (strategy) {
    case "hill_climbing": {
      const r = runHillClimbing(b, pick, m, { maxGames: request.maxGames, seed: request.seed });
      idxGames = r.games;
      notes.push(`Hill Climbing: ${r.iterations} iterações, ${r.improvements} melhorias.`);
      break;
    }
    case "simulated_annealing": {
      const r = runSimulatedAnnealing(b, pick, m, { maxGames: request.maxGames, seed: request.seed });
      idxGames = r.games;
      notes.push(`Simulated Annealing: ${r.iterations} passos, ${r.accepted} aceitos.`);
      break;
    }
    case "genetic": {
      const r = runGeneticAlgorithm(b, pick, m, { maxGames: request.maxGames, seed: request.seed });
      idxGames = r.games;
      notes.push(`Algoritmo Genético: ${r.generations} gerações, fitness ${r.bestFitness.toFixed(1)}.`);
      break;
    }
    case "covering_design": {
      const r = runCoveringDesign(b, pick, m, { maxGames: request.maxGames, seed: request.seed });
      idxGames = r.games;
      notes.push(
        r.reachedBound && request.guarantee.hitsInBase === m
          ? `Covering Design: atingiu lower bound de Schönheim (${r.lowerBound}).`
          : `Covering Design: ${r.passes} passes, cobertura ${r.finalCoverage.toFixed(1)}%.`,
      );
      break;
    }
    case "greedy":
    default: {
      const g = greedyCover(b, pick, m, { maxGames: request.maxGames });
      idxGames = g.games;
      exhaustiveUniverse = g.exhaustiveUniverse;
      exhaustiveCandidates = g.exhaustiveCandidates;
    }
  }

  const gamesReal: number[][] = idxGames.map(g => g.map(i => base[i]).sort((a, b) => a - b));

  const validation = runValidation(
    idxGames, b, request.guarantee.hitsInBase, m,
  );

  // Schönheim limita a cobertura de todos os M-subconjuntos, condição mais
  // forte que a meta "M acertos se K>M dezenas saírem na base". Nesse caso,
  // exibir a cota como mínimo do problema solicitado seria incorreto.
  const lowerBound = request.guarantee.hitsInBase === m ? schonheimBound(b, pick, m) : 1;
  const elapsed = performance.now() - start;

  const score = computeScore({
    validation, gameCount: gamesReal.length, lowerBound,
    elapsedMs: elapsed, baseSize: b, pick,
  });

  if (request.guarantee.hitsInBase !== m) notes.push("Schönheim se aplica à cobertura de todos os M-subconjuntos; mínimo exibido é apenas a cota trivial 1 para a hipótese K > M.");
  if (!exhaustiveUniverse) notes.push("Universo de M-subconjuntos muito grande — cobertura estimada por amostragem.");
  if (!exhaustiveCandidates) notes.push("Pool de candidatos amostrado (universo combinatório enorme).");
  if (!validation.exhaustive) notes.push("Validação por amostragem (cenários demais para checagem exaustiva).");
  if (request.guarantee.hitsInBase === m && gamesReal.length === lowerBound && lowerBound > 0 && validation.meetsGuarantee) {
    notes.push(`Ótimo alcançado: ${gamesReal.length} jogos = lower bound de Schönheim.`);
  }

  return {
    request, strategy,
    games: gamesReal, gameCount: gamesReal.length,
    cost: gamesReal.length * request.lottery.ticketPrice,
    validation, score,
    elapsedMs: Math.round(elapsed),
    lowerBound, notes,
  };
}

/** Roda várias estratégias e devolve resultados ordenados por overall score. */
export function compareStrategies(
  request: ClosingRequest,
  strategies: ClosingStrategy[],
): ClosingResult[] {
  const results = strategies.map(s => generateClosing({ ...request, strategy: s }));
  return results.sort((a, b) => b.score.overall - a.score.overall);
}

export function calculateGuarantee(baseSize: number, pick: number, m: number) {
  return {
    lowerBound: schonheimBound(baseSize, pick, m),
    universeSize: binomial(baseSize, m),
    candidatePoolSize: binomial(baseSize, pick),
  };
}

export function compareClosings(a: ClosingResult, b: ClosingResult) {
  return {
    winner: a.score.overall >= b.score.overall ? "a" : "b",
    delta: {
      overall: a.score.overall - b.score.overall,
      coverage: a.score.coverage - b.score.coverage,
      games: a.gameCount - b.gameCount,
      cost: a.cost - b.cost,
    },
  };
}

export function calculateCoverageForGames(
  games: number[][],
  base: number[],
  m: number,
): CoverageReport {
  const b = base.length;
  const idxMap = new Map(base.map((n, i) => [n, i]));
  const idxGames = games
    .map(g => g.map(n => idxMap.get(n)).filter((v): v is number => v !== undefined))
    .filter(g => g.length > 0);
  return calculateCoverage(idxGames, b, m);
}

function emptyResult(
  request: ClosingRequest, strategy: ClosingStrategy, start: number, notes: string[],
): ClosingResult {
  const elapsed = performance.now() - start;
  const validation: ClosingValidation = {
    guaranteedHits: 0, targetMinHits: request.guarantee.minHits, meetsGuarantee: false,
    coveragePercent: 0, redundancyPercent: 0, wastedCoveragePercent: 100,
    efficiencyPercent: 0, exhaustive: true, testedScenarios: 0, distribution: {},
  };
  return {
    request, strategy, games: [], gameCount: 0, cost: 0,
    validation,
    score: { coverage: 0, diversity: 0, redundancy: 0, efficiency: 0, time: 0, overall: 0 },
    elapsedMs: Math.round(elapsed), lowerBound: 0, notes,
  };
}

export function lotteryParamsFrom(
  id: string, name: string, totalNumbers: number, pick: number, ticketPrice: number,
): LotteryParams {
  return { id, name, totalNumbers, pick, ticketPrice };
}
