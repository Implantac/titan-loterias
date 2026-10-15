import { LOTTERY_BET_COST } from "@/engine/betting-budget";
/**
 * Strategy Evolution Engine — Core
 * Backtesting, ranking, auto-evolution and recommendations
 * Implements Quantitative Ranking (Evidence E0-E4, Significance, Robustness)
 */

import { DrawResult, LotteryConfig } from "@/data/lotteries";
import { NumberStats, computeFrequencyStats } from "@/features/statistics/engine";
import { generateByStrategy, Strategy } from "@/engine/strategies";
import { analyzeEvidence, runMonteCarloSim } from "@/engine/stats/evidence-engine";

import {
  StrategyDefinition,
  StrategyMetrics,
  RankingEntry,
  EvolutionSuggestion,
  LabConfig,
  LabResult,
  StrategyParams,
  StrategyGames,
} from "./types";
import { getStrategiesForLottery, getStrategy, STRATEGY_REGISTRY } from "./strategies-registry";

// ═══════════════════════════════════════════════════════
// BACKTESTING
// ═══════════════════════════════════════════════════════

function backtestStrategy(
  strategyDef: StrategyDefinition,
  games: number[][],
  draws: DrawResult[],
  config: LotteryConfig,
): StrategyMetrics {
  const hitDistribution: Record<number, number> = {};
  let totalHits = 0;
  let bestHits = 0;
  let worstHits = config.pick;
  const hitsPerDraw: number[] = [];

  for (const draw of draws) {
    if (!draw?.numbers?.length) continue;
    const drawSet = new Set(draw.numbers);

    for (const game of games) {
      const hits = game.filter(n => drawSet.has(n)).length;
      hitDistribution[hits] = (hitDistribution[hits] || 0) + 1;
      totalHits += hits;
      if (hits > bestHits) bestHits = hits;
      if (hits < worstHits) worstHits = hits;
      hitsPerDraw.push(hits);
    }
  }

  const totalComparisons = draws.length * games.length;
  const avgHits = totalComparisons > 0 ? totalHits / totalComparisons : 0;

  // Consistency: 1 - coefficient of variation
  let consistency = 0;
  if (hitsPerDraw.length > 1 && avgHits > 0) {
    const variance = hitsPerDraw.reduce((s, h) => s + (h - avgHits) ** 2, 0) / hitsPerDraw.length;
    const stdDev = Math.sqrt(variance);
    consistency = Math.max(0, Math.min(1, 1 - stdDev / avgHits));
  }

  // Prize count (simplified: consider hits >= pick-2 as prize-worthy)
  const prizeThreshold = Math.max(config.pick - 4, Math.floor(config.pick * 0.7));
  let totalPrizes = 0;
  for (const [hits, count] of Object.entries(hitDistribution)) {
    if (Number(hits) >= prizeThreshold) totalPrizes += count;
  }

  // Diversity between generated games
  let diversitySum = 0;
  let pairCount = 0;
  for (let i = 0; i < games.length; i++) {
    for (let j = i + 1; j < games.length; j++) {
      const setA = new Set(games[i]);
      const overlap = games[j].filter(n => setA.has(n)).length;
      diversitySum += 1 - overlap / config.pick;
      pairCount++;
    }
  }
  const diversityScore = pairCount > 0 ? (diversitySum / pairCount) * 100 : 50;

  // Redundancy
  const redundancyIndex = pairCount > 0 ? 1 - diversitySum / pairCount : 0;

  // Coverage: unique numbers used
  const allNums = new Set(games.flat());
  const coverageScore = (allNums.size / config.numbers) * 100;

  // Evidence Engine integration with selectable iterations
  const iterations = 100000; // default for internal backtest, but LabConfig can override
  const evidence = analyzeEvidence(totalHits, games, draws, config, iterations);
  const lift = evidence.lift;
  const monteCarloData = runMonteCarloSim(games, draws, config, 1000);
  const performanceScore = draws.length >= 20 ? Math.min(98, Math.max(0, Math.round(((Math.max(1, lift) - 1) * 20 + consistency * 40)))) : null;

  // Global composite score (audit note: proprietary composite metric for internal ranking)
  const globalScore = Math.min(100,
    avgHits * 8 +
    consistency * 20 +
    diversityScore * 0.15 +
    coverageScore * 0.1 +
    (totalPrizes > 0 ? 15 : 0) -
    redundancyIndex * 10
  );

  return {
    avgHits,
    bestHits,
    worstHits,
    consistency,
    hitDistribution,
    totalPrizes,
    costPerGame: getCostForLottery(config.id),
    coverageScore,
    diversityScore,
    redundancyIndex,
    globalScore,
    performanceScore,
    lift,
    pValue: evidence.pValue,
    zScore: evidence.zScore,
    confidenceInterval: evidence.confidenceInterval,
    monteCarloData,
    monteCarloStats: evidence.monteCarloStats,
    evidenceGrade: evidence.grade,
    evidenceExplanation: evidence.explanation
  };
}


function getCostForLottery(lotteryId: string): number {
  const costs: Record<string, number> = LOTTERY_BET_COST;
  return costs[lotteryId] || 3.0;
}

// ═══════════════════════════════════════════════════════
// RANKING
// ═══════════════════════════════════════════════════════

function buildRanking(
  results: { def: StrategyDefinition; metrics: StrategyMetrics }[],
  lotteryId: string,
): RankingEntry[] {
  // Quantitative Ranking Engine (Phase 11-12)
  // Sort by multiple dimensions:
  // 1. Evidence Grade (E4 > E3 > E2 > E1 > E0)
  // 2. Statistical Significance (P-Value)
  // 3. Global Score (Performance/Consistency composite)
  const gradeWeight: Record<string, number> = {
    'E4': 10000,
    'E3': 8000,
    'E2': 6000,
    'E1': 4000,
    'E0': 0
  };

  const sorted = [...results].sort((a, b) => {
    // Evidence Grade Priority
    const gradeA = gradeWeight[a.metrics.evidenceGrade || 'E0'] || 0;
    const gradeB = gradeWeight[b.metrics.evidenceGrade || 'E0'] || 0;
    
    if (gradeA !== gradeB) return gradeB - gradeA;

    // Statistical Significance (P-Value)
    const pA = a.metrics.pValue || 1;
    const pB = b.metrics.pValue || 1;
    if (Math.abs(pA - pB) > 0.0001) return pA - pB;

    // Global Score tie-breaker
    return b.metrics.globalScore - a.metrics.globalScore;
  });

  return sorted.map((r, idx) => ({
    rank: idx + 1,
    strategyId: r.def.id,
    strategyName: r.def.name,
    lotteryId,
    metrics: r.metrics,
    trend: "stable" as const,
    executions: 1,
    lastTestedAt: Date.now(),
    explanation: buildExplanation(r.def, r.metrics, idx + 1),
  }));
}

function buildExplanation(def: StrategyDefinition, m: StrategyMetrics, rank: number): string {
  const parts: string[] = [];
  if (rank === 1) {
    parts.push(`${def.name} ficou em 1º lugar`);
  } else {
    parts.push(`${def.name} ficou na posição ${rank}`);
  }

  if (m.consistency > 0.7) parts.push("com alta consistência");
  else if (m.consistency < 0.3) parts.push("com baixa consistência");

  if (m.avgHits > 0) parts.push(`média de ${m.avgHits.toFixed(2)} acertos`);
  if (m.totalPrizes > 0) parts.push(`${m.totalPrizes} premiações detectadas`);
  if (m.diversityScore > 70) parts.push("boa diversidade entre jogos");
  if (m.lift > 1.05) parts.push(`evidência estatística positiva (${m.lift.toFixed(2)}x)`);

  return parts.join(", ") + ".";
}

// ═══════════════════════════════════════════════════════
// AUTO-EVOLUTION
// ═══════════════════════════════════════════════════════

function generateEvolutionSuggestions(
  rankings: RankingEntry[],
  results: { def: StrategyDefinition; metrics: StrategyMetrics }[],
): EvolutionSuggestion[] {
  const suggestions: EvolutionSuggestion[] = [];
  if (rankings.length < 2) return suggestions;

  const top = results.find(r => r.def.id === rankings[0].strategyId);
  const bottom = results.find(r => r.def.id === rankings[rankings.length - 1].strategyId);

  // Suggest promoting top performer
  if (top && top.metrics.globalScore > 60) {
    suggestions.push({
      type: "promote",
      sourceStrategy: top.def.id,
      reason: `${top.def.name} apresentou a melhor performance geral com score ${top.metrics.globalScore.toFixed(1)}`,
      expectedImprovement: 0,
      confidence: Math.min(1, top.metrics.consistency + 0.2),
    });
  }

  // Suggest discarding bottom performer
  if (bottom && bottom.metrics.globalScore < 30) {
    suggestions.push({
      type: "discard",
      sourceStrategy: bottom.def.id,
      reason: `${bottom.def.name} apresentou performance muito baixa (score ${bottom.metrics.globalScore.toFixed(1)})`,
      expectedImprovement: 0,
      confidence: 0.8,
    });
  }

  // Suggest parameter adjustments based on patterns
  for (const r of results) {
    if (r.metrics.consistency < 0.4 && r.metrics.avgHits > 0) {
      suggestions.push({
        type: "adjust_param",
        sourceStrategy: r.def.id,
        targetParam: "parityWeight",
        suggestedValue: Math.min(1, r.def.params.parityWeight + 0.2),
        reason: `${r.def.name} tem baixa consistência — aumentar peso de paridade pode estabilizar`,
        expectedImprovement: 8,
        confidence: 0.5,
      });
    }

    if (r.metrics.redundancyIndex > 0.6) {
      suggestions.push({
        type: "adjust_param",
        sourceStrategy: r.def.id,
        targetParam: "dispersalWeight",
        suggestedValue: Math.min(1, r.def.params.dispersalWeight + 0.3),
        reason: `${r.def.name} gera jogos muito parecidos — aumentar dispersão reduz redundância`,
        expectedImprovement: 12,
        confidence: 0.6,
      });
    }
  }

  // Suggest combining top 2
  if (rankings.length >= 2) {
    suggestions.push({
      type: "combine",
      sourceStrategy: `${rankings[0].strategyId}+${rankings[1].strategyId}`,
      reason: `Combinar ${rankings[0].strategyName} com ${rankings[1].strategyName} pode melhorar performance geral`,
      expectedImprovement: 5,
      confidence: 0.4,
    });
  }

  return suggestions;
}

// ═══════════════════════════════════════════════════════
// INSIGHTS
// ═══════════════════════════════════════════════════════

function generateInsights(rankings: RankingEntry[], lotteryId: string): string[] {
  const insights: string[] = [];

  if (rankings.length === 0) return ["Nenhuma estratégia testada ainda."];

  const best = rankings[0];
  insights.push(`🏆 Melhor estratégia para ${lotteryId}: ${best.strategyName} (Score: ${best.metrics.globalScore.toFixed(1)})`);

  const avgScore = rankings.reduce((s, r) => s + r.metrics.globalScore, 0) / rankings.length;
  insights.push(`📊 Score médio entre ${rankings.length} estratégias: ${avgScore.toFixed(1)}`);

  const consistent = rankings.filter(r => r.metrics.consistency > 0.6);
  if (consistent.length > 0) {
    insights.push(`✅ ${consistent.length} estratégia(s) com alta consistência`);
  }

  const withPrizes = rankings.filter(r => r.metrics.totalPrizes > 0);
  if (withPrizes.length > 0) {
    insights.push(`🎯 ${withPrizes.length} estratégia(s) geraram premiações no backtesting`);
  }

  if (best.metrics.avgHits > 0) {
    insights.push(`📈 Média de acertos da melhor: ${best.metrics.avgHits.toFixed(2)} por jogo/concurso`);
  }

  return insights;
}

// ═══════════════════════════════════════════════════════
// MAIN LAB RUNNER
// ═══════════════════════════════════════════════════════

export function runStrategyLab(
  labConfig: LabConfig,
  allDraws: DrawResult[],
  config: LotteryConfig,
): LabResult {
  const start = performance.now();

  // Filter draws to range
  const draws = allDraws.filter(d =>
    d.concurso >= labConfig.drawRange[0] && d.concurso <= labConfig.drawRange[1]
  );

  if (draws.length === 0) {
    return {
      config: labConfig,
      rankings: [],
      suggestions: [],
      bestStrategy: null,
      insights: ["Sem sorteios disponíveis no intervalo selecionado."],
      elapsedMs: Math.round(performance.now() - start),
      generatedGames: [],
    };
  }

  // Initial stats are deferred to avoid leakage.

  // Get strategies
  const available = getStrategiesForLottery(labConfig.lotteryId);
  const selectedDefs = labConfig.strategies.length > 0
    ? labConfig.strategies.map(id => getStrategy(id)).filter(Boolean) as StrategyDefinition[]
    : available;

  // Split data: 70% Train, 30% Evaluation (Temporal Paired Split)
  // Ensure we sort draws chronologically if they aren't already
  const sortedDraws = [...draws].sort((a, b) => a.concurso - b.concurso);
  const trainCount = Math.floor(sortedDraws.length * 0.7);
  const trainDraws = sortedDraws.slice(0, trainCount);
  const evalDraws = sortedDraws.slice(trainCount);

  // Compute stats ONLY from Train data to avoid future data leakage
  const trainStats = computeFrequencyStats(trainDraws, config.numbers);

  // Generate games and backtest each strategy on Eval data
  const results: { def: StrategyDefinition; metrics: StrategyMetrics; games: number[][] }[] = [];

  for (const def of selectedDefs) {
    const games: number[][] = [];
    const seen = new Set<string>();

    for (let i = 0; i < labConfig.gamesPerStrategy * 3 && games.length < labConfig.gamesPerStrategy; i++) {
      const game = generateByStrategy(def.baseStrategy as any, trainStats, config);
      const sorted = [...game].sort((a, b) => a - b);
      const key = sorted.join(",");
      if (!seen.has(key)) {
        seen.add(key);
        games.push(sorted);
      }
    }

    const metrics = backtestStrategy(def, games, evalDraws, config);
    // Overwrite iterations if provided in config
    if (labConfig.monteCarloIterations) {
      const customEvidence = analyzeEvidence(metrics.avgHits * evalDraws.length * games.length, games, evalDraws, config, labConfig.monteCarloIterations);
      metrics.pValue = customEvidence.pValue;
      metrics.zScore = customEvidence.zScore;
      metrics.lift = customEvidence.lift;
      metrics.confidenceInterval = customEvidence.confidenceInterval;
      metrics.monteCarloStats = customEvidence.monteCarloStats;
      metrics.evidenceGrade = customEvidence.grade;
      metrics.evidenceExplanation = customEvidence.explanation;
    }
    results.push({ def, metrics, games });
  }

  // Build ranking
  const rankings = buildRanking(results, labConfig.lotteryId);

  // Generate evolution suggestions
  const suggestions = generateEvolutionSuggestions(rankings, results);

  // Generate insights
  const insights = generateInsights(rankings, labConfig.lotteryId);

  // Build generated games sorted by ranking order
  const generatedGames: StrategyGames[] = rankings.map(r => {
    const entry = results.find(res => res.def.id === r.strategyId)!;
    return {
      strategyId: r.strategyId,
      strategyName: r.strategyName,
      games: entry.games,
      metrics: entry.metrics,
    };
  });

  return {
    config: labConfig,
    rankings,
    suggestions,
    bestStrategy: rankings[0] || null,
    insights,
    elapsedMs: Math.round(performance.now() - start),
    generatedGames,
  };
}

export { STRATEGY_REGISTRY, getStrategiesForLottery, getStrategy };
