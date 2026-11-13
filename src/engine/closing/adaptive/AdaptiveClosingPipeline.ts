/**
 * AdaptiveClosingPipeline — orquestrador puro que combina:
 *   1. Comparação de múltiplas estratégias
 *   2. Seleção pelo score composto (matemático + estatístico)
 *   3. Remoção segura de jogos dominados (mantém garantia)
 *   4. Reordenação dos jogos por ranking estatístico (S→D)
 *
 * O núcleo permanece matemático: qualquer ajuste que reduza jogos é
 * validado (calculateGuarantee) para não violar a meta pedida.
 */

import type { ClosingRequest, ClosingResult, ClosingStrategy } from "../core/types";
import { compareStrategies } from "../core/ClosingEngine";
import { validateClosing } from "../validation/ValidationEngine";
import { findDominatedGames } from "../analysis/dominatedGames";
import { rankGames, type RankedGame } from "../analysis/rankGames";

export interface AdaptivePipelineInput {
  request: ClosingRequest;
  strategies?: ClosingStrategy[];
  recentDraws?: number[][];
  /** Peso estatístico no score final (0-1). Default 0.35. */
  statWeight?: number;
  /** Executar remoção de jogos dominados. Default true. */
  reduceDominated?: boolean;
}

export interface AdaptivePipelineStep {
  name: string;
  detail: string;
  gamesBefore: number;
  gamesAfter: number;
  elapsedMs: number;
}

export interface AdaptivePipelineReport {
  chosen: ClosingResult;
  ranked: RankedGame[];
  strategies: Array<{ strategy: ClosingStrategy; overall: number; adaptive: number; games: number; cost: number }>;
  steps: AdaptivePipelineStep[];
  droppedGames: number;
  guaranteeIntact: boolean;
  elapsedMs: number;
}

const DEFAULT_STRATEGIES: ClosingStrategy[] = [
  "greedy",
  "hill_climbing",
  "simulated_annealing",
  "genetic",
  "covering_design",
];

function statisticalBonus(result: ClosingResult, recentDraws: number[][]): number {
  if (!recentDraws?.length || !result.games.length) return 0;
  const ranks = rankGames({
    games: result.games,
    totalNumbers: result.request.lottery.totalNumbers,
    pick: result.request.lottery.pick,
    recentDraws,
  });
  if (!ranks.length) return 0;
  const avg = ranks.reduce((s, r) => s + r.score, 0) / ranks.length;
  return avg; // 0-100
}

export function runAdaptivePipeline(input: AdaptivePipelineInput): AdaptivePipelineReport {
  const t0 = performance.now();
  const strategies = input.strategies ?? DEFAULT_STRATEGIES;
  const statWeight = Math.min(1, Math.max(0, input.statWeight ?? 0.35));
  const recent = input.recentDraws ?? [];
  const steps: AdaptivePipelineStep[] = [];

  // Step 1 — comparar estratégias
  const s1 = performance.now();
  const results = compareStrategies(input.request, strategies);
  steps.push({
    name: "Comparação multi-estratégia",
    detail: `${results.length} estratégias avaliadas`,
    gamesBefore: 0,
    gamesAfter: results[0]?.games.length ?? 0,
    elapsedMs: performance.now() - s1,
  });

  // Step 2 — ranking composto
  const scored = results.map(r => {
    const bonus = statisticalBonus(r, recent);
    const adaptive = (1 - statWeight) * r.score.overall + statWeight * bonus;
    return { result: r, adaptive, bonus };
  });
  scored.sort((a, b) => b.adaptive - a.adaptive);
  const best = scored[0]?.result ?? results[0];

  const strategiesOut = scored.map(s => ({
    strategy: s.result.strategy,
    overall: Math.round(s.result.score.overall * 10) / 10,
    adaptive: Math.round(s.adaptive * 10) / 10,
    games: s.result.games.length,
    cost: s.result.cost,
  }));

  let chosen: ClosingResult = best;
  let dropped = 0;
  let guaranteeIntact = true;

  // Step 3 — remoção de jogos dominados (opcional)
  if (input.reduceDominated !== false && chosen.games.length > 2) {
    const s3 = performance.now();
    const before = chosen.games.length;
    const dom = findDominatedGames({
      games: chosen.games,
      minHits: chosen.request.guarantee.minHits,
      pick: chosen.request.lottery.pick,
    });
    if (dom.savings > 0) {
      // Reindexa jogos para índices da base (validateClosing usa índices 0..b-1)
      const baseArr = chosen.request.baseNumbers;
      const idxMap = new Map(baseArr.map((n, i) => [n, i]));
      const keptIdx = dom.keptGames.map(g => g.map(n => idxMap.get(n) ?? -1));
      const validation = validateClosing(
        keptIdx,
        baseArr.length,
        chosen.request.guarantee.hitsInBase,
        chosen.request.guarantee.minHits,
      );
      if (validation.meetsGuarantee) {
        dropped = dom.savings;
        chosen = {
          ...chosen,
          games: dom.keptGames,
          gameCount: dom.keptGames.length,
          cost: dom.keptGames.length * chosen.request.lottery.ticketPrice,
          validation,
          notes: [
            ...chosen.notes,
            `Pipeline Adaptativo removeu ${dom.savings} jogos dominados (garantia preservada).`,
          ],
        };
      } else {
        guaranteeIntact = false;
      }
    }
    steps.push({
      name: "Remoção de jogos dominados",
      detail: dropped > 0 ? `${dropped} jogos redundantes removidos` : "Sem redundâncias seguras",
      gamesBefore: before,
      gamesAfter: chosen.games.length,
      elapsedMs: performance.now() - s3,
    });
  }

  // Step 4 — reordenar por ranking
  const s4 = performance.now();
  const ranked = rankGames({
    games: chosen.games,
    totalNumbers: chosen.request.lottery.totalNumbers,
    pick: chosen.request.lottery.pick,
    recentDraws: recent,
  });
  if (ranked.length === chosen.games.length && recent.length) {
    const order = [...ranked].sort((a, b) => b.score - a.score);
    chosen = {
      ...chosen,
      games: order.map(r => r.numbers),
      notes: [...chosen.notes, "Jogos reordenados por força estatística (S→D)."],
    };
  }
  steps.push({
    name: "Ranking estatístico",
    detail: recent.length ? `${ranked.length} jogos pontuados vs. ${recent.length} sorteios` : "Sem histórico — reordenação neutra",
    gamesBefore: chosen.games.length,
    gamesAfter: chosen.games.length,
    elapsedMs: performance.now() - s4,
  });

  return {
    chosen,
    ranked,
    strategies: strategiesOut,
    steps,
    droppedGames: dropped,
    guaranteeIntact,
    elapsedMs: performance.now() - t0,
  };
}

/**
 * runAdaptivePipelineBestOfN — executa o pipeline N vezes e retorna o melhor por nota adaptativa.
 * Útil para estratégias estocásticas (genetic/SA/monte_carlo) onde a semente altera o resultado.
 */
export function runAdaptivePipelineBestOfN(
  input: AdaptivePipelineInput,
  runs = 3,
): { best: AdaptivePipelineReport; allRuns: Array<{ adaptive: number; games: number; cost: number }> } {
  const n = Math.max(1, Math.min(10, runs));
  let bestRep: AdaptivePipelineReport | null = null;
  let bestScore = -Infinity;
  const allRuns: Array<{ adaptive: number; games: number; cost: number }> = [];
  for (let i = 0; i < n; i++) {
    const rep = runAdaptivePipeline(input);
    const top = rep.strategies[0];
    const adaptive = top?.adaptive ?? 0;
    allRuns.push({ adaptive, games: rep.chosen.gameCount, cost: rep.chosen.cost });
    const score = adaptive - rep.chosen.gameCount * 0.01;
    if (score > bestScore) { bestScore = score; bestRep = rep; }
  }
  if (!bestRep) throw new Error("Best-of-N sem resultados");
  return { best: bestRep, allRuns };
}

/**
 * autoTuneAdaptivePipeline — varre pesos estatísticos e retorna o melhor report.
 * Mantém a garantia matemática (usa o próprio pipeline em cada iteração).
 */
export interface AutoTuneResult {
  best: AdaptivePipelineReport;
  bestWeight: number;
  sweep: Array<{ weight: number; adaptive: number; games: number; cost: number; overall: number; refined?: boolean }>;
  /** Sweep fino em torno do vencedor (presente quando refine=true). */
  refinedSweep?: Array<{ weight: number; adaptive: number; games: number; cost: number; overall: number }>;
  /** Delta entre baseline (peso 0 = puramente matemático) e o vencedor. */
  delta: {
    baselineWeight: number;
    baselineAdaptive: number;
    baselineGames: number;
    baselineCost: number;
    adaptiveGain: number;
    gamesGain: number;
    costGain: number;
  };
}

export interface AutoTuneOptions {
  weights?: number[];
  /** Executa segunda passada estreita (±10% / passo 2%) ao redor do vencedor. */
  refine?: boolean;
}

function scoreOf(adaptive: number, games: number) {
  return adaptive - games * 0.01;
}

export function autoTuneAdaptivePipeline(
  input: Omit<AdaptivePipelineInput, "statWeight">,
  options: AutoTuneOptions = {},
): AutoTuneResult {
  const weights = options.weights ?? [0, 0.15, 0.3, 0.45, 0.6];
  const sweep: AutoTuneResult["sweep"] = [];
  let best: AdaptivePipelineReport | null = null;
  let bestWeight = weights[0];
  let bestScore = -Infinity;

  for (const w of weights) {
    const rep = runAdaptivePipeline({ ...input, statWeight: w });
    const top = rep.strategies[0];
    const adaptive = top?.adaptive ?? 0;
    sweep.push({
      weight: w,
      adaptive,
      games: rep.chosen.gameCount,
      cost: rep.chosen.cost,
      overall: top?.overall ?? 0,
    });
    const score = scoreOf(adaptive, rep.chosen.gameCount);
    if (score > bestScore) {
      bestScore = score;
      best = rep;
      bestWeight = w;
    }
  }

  if (!best) throw new Error("Auto-tune sem resultados");

  // Refinamento fino: ±10% em passos de 2% em torno do vencedor
  let refinedSweep: AutoTuneResult["refinedSweep"];
  if (options.refine) {
    const lo = Math.max(0, bestWeight - 0.1);
    const hi = Math.min(0.7, bestWeight + 0.1);
    const fineWeights: number[] = [];
    for (let w = lo; w <= hi + 1e-9; w += 0.02) {
      const rounded = Math.round(w * 100) / 100;
      if (!weights.includes(rounded) && !fineWeights.includes(rounded)) fineWeights.push(rounded);
    }
    refinedSweep = [];
    for (const w of fineWeights) {
      const rep = runAdaptivePipeline({ ...input, statWeight: w });
      const top = rep.strategies[0];
      const adaptive = top?.adaptive ?? 0;
      refinedSweep.push({
        weight: w,
        adaptive,
        games: rep.chosen.gameCount,
        cost: rep.chosen.cost,
        overall: top?.overall ?? 0,
      });
      sweep.push({
        weight: w,
        adaptive,
        games: rep.chosen.gameCount,
        cost: rep.chosen.cost,
        overall: top?.overall ?? 0,
        refined: true,
      });
      const score = scoreOf(adaptive, rep.chosen.gameCount);
      if (score > bestScore) {
        bestScore = score;
        best = rep;
        bestWeight = w;
      }
    }
    sweep.sort((a, b) => a.weight - b.weight);
    refinedSweep.sort((a, b) => a.weight - b.weight);
  }

  const baseline = sweep.find(s => s.weight === 0) ?? sweep[0];
  const winner = sweep.find(s => Math.abs(s.weight - bestWeight) < 1e-9) ?? sweep[0];
  const delta = {
    baselineWeight: baseline.weight,
    baselineAdaptive: baseline.adaptive,
    baselineGames: baseline.games,
    baselineCost: baseline.cost,
    adaptiveGain: Math.round((winner.adaptive - baseline.adaptive) * 10) / 10,
    gamesGain: baseline.games - winner.games,
    costGain: Math.round((baseline.cost - winner.cost) * 100) / 100,
  };

  return { best, bestWeight, sweep, refinedSweep, delta };
}
