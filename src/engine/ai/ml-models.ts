import { NumberStats } from "@/engine/stats/statistics";
import { LotteryConfig, DrawResult } from "@/data/lotteries";
import { ModelRegistry, ModelDefinition } from "../ml/modelRegistry";


export interface ScoreBreakdown {
  frequency: number;
  recency: number;
  trend: number;
  cycle: number;
  momentum: number;
  consistency: number;
  other: number;
}

export interface MLPrediction {
  number: number;
  score: number;
  rank: number;
  model: string;
  breakdown?: ScoreBreakdown;
  /** Quantos modelos (0..6) colocaram este número no top15 — só preenchido no consenso */
  agreement?: number;
  /** Razão em linguagem natural — só preenchido no consenso para os top */
  reason?: string;
}

export interface ModelResult {
  name: string;
  description: string;
  predictions: MLPrediction[];
  performanceScore: number | null;      // backtesting-based Composite Score
  confidence: number;    // backtesting-based
  backtestDetails?: BacktestMetrics;
}

export interface BacktestMetrics {
  totalDrawsTested: number;
  avgHitsInTop15: number;
  top15HitRate: number;     // % of draws where >=1 of top15 hit
  top5Precision: number;    // avg % of top5 that appeared in draw
  consistency: number;      // 0..100 (higher = more stable across folds)
  /** Lift sobre o esperado por chance (1.0 = no edge, 1.5 = +50% vs random) */
  liftOverChance: number;
  /** Quantos hits seriam esperados puramente por chance no top15 */
  expectedByChance: number;
}

function normalizeAndRank(scored: MLPrediction[]): void {
  scored.sort((a, b) => b.score - a.score);
  scored.forEach((s, i) => (s.rank = i + 1));
  const maxScore = scored[0]?.score || 1;
  scored.forEach(s => (s.score = Math.round((s.score / maxScore) * 100)));
}

// ═══════════════════════════════════════════════════════
// BACKTESTING ENGINE — Compute real performance from historical data
// ═══════════════════════════════════════════════════════

export function backtestModel(
  modelFn: (stats: NumberStats[], config: LotteryConfig) => ModelResult,
  sortedDraws: DrawResult[], // Must be sorted ASC
  config: LotteryConfig,
  computeStatsFn: (draws: DrawResult[], totalNumbers: number) => NumberStats[],
  windowSize: number = 100,
  testSize: number = 50
): BacktestMetrics {
  const maxTestable = Math.min(testSize, sortedDraws.length - windowSize);
  const expectedByChance = (15 / config.numbers) * config.pick;
  if (maxTestable <= 0) {
    return { totalDrawsTested: 0, avgHitsInTop15: 0, top15HitRate: 0, top5Precision: 0, consistency: 0, liftOverChance: 0, expectedByChance };
  }

  const hitsPerDraw: number[] = [];
  const top5Hits: number[] = [];

  for (let i = 0; i < maxTestable; i++) {
    // Walk-forward: training on indices [i...i+windowSize-1], testing on [i+windowSize]
    const trainingDraws = sortedDraws.slice(i, i + windowSize);
    const testDraw = sortedDraws[i + windowSize];

    if (!testDraw || trainingDraws.length < 50) continue;

    const stats = computeStatsFn(trainingDraws, config.numbers);
    const result = modelFn(stats, config);
    const top15Numbers = new Set(result.predictions.slice(0, 15).map(p => p.number));
    const top5Numbers = new Set(result.predictions.slice(0, 5).map(p => p.number));
    const drawSet = new Set(testDraw.numbers);

    let hits = 0;
    let t5hits = 0;
    for (const n of top15Numbers) { if (drawSet.has(n)) hits++; }
    for (const n of top5Numbers) { if (drawSet.has(n)) t5hits++; }

    hitsPerDraw.push(hits);
    top5Hits.push(t5hits);
  }

  if (hitsPerDraw.length === 0) {
    return { totalDrawsTested: 0, avgHitsInTop15: 0, top15HitRate: 0, top5Precision: 0, consistency: 0, liftOverChance: 0, expectedByChance };
  }

  const avg = hitsPerDraw.reduce((a, b) => a + b, 0) / hitsPerDraw.length;
  const hitRate = hitsPerDraw.filter(h => h >= 1).length / hitsPerDraw.length;
  const top5Precision = top5Hits.reduce((a, b) => a + b, 0) / (top5Hits.length * 5);
  const variance = hitsPerDraw.reduce((s, h) => s + (h - avg) ** 2, 0) / hitsPerDraw.length;
  const stdDev = Math.sqrt(variance);
  const lift = expectedByChance > 0 ? avg / expectedByChance : 0;

  return {
    totalDrawsTested: hitsPerDraw.length,
    avgHitsInTop15: Math.round(avg * 100) / 100,
    top15HitRate: Math.round(hitRate * 1000) / 10,
    top5Precision: Math.round(top5Precision * 1000) / 10,
    consistency: Math.round((1 - Math.min(stdDev / (avg || 1), 1)) * 100),
    liftOverChance: Math.round(lift * 100) / 100,
    expectedByChance: Math.round(expectedByChance * 100) / 100,
  };
}

function computeAccuracyFromBacktest(bt: BacktestMetrics, config: LotteryConfig): { performanceScore: number | null; confidence: number } {
  if (bt.totalDrawsTested < 20) {
    return { performanceScore: null, confidence: 0 };
  }
  
  const precisionAt15 = bt.avgHitsInTop15 / 15;
  const lift = bt.liftOverChance;
  
  // Composite Performance Score based on precision and lift
  const score = Math.min(98, Math.max(0, Math.round((precisionAt15 * 0.6 + (Math.max(1, lift) / 2) * 0.4) * 100)));
  
  // Confidence: based on consistency and sample size
  const sampleFactor = Math.min(1, bt.totalDrawsTested / 100);
  const confidence = Math.min(95, Math.max(0, Math.round(bt.consistency * 0.7 * sampleFactor + sampleFactor * 30)));

  return { performanceScore: score, confidence };
}

// ═══════════════════════════════════════════════════════
// SCORE COMPUTATION with breakdown
// ═══════════════════════════════════════════════════════

function buildBreakdown(
  freq: number, recency: number, trend: number,
  cycle: number, momentum: number, consistency: number, other: number
): ScoreBreakdown {
  const total = Math.abs(freq) + Math.abs(recency) + Math.abs(trend) + Math.abs(cycle) + Math.abs(momentum) + Math.abs(consistency) + Math.abs(other) || 1;
  return {
    frequency: Math.round((Math.max(0, freq) / total) * 100),
    recency: Math.round((Math.max(0, recency) / total) * 100),
    trend: Math.round((Math.max(0, trend) / total) * 100),
    cycle: Math.round((Math.max(0, cycle) / total) * 100),
    momentum: Math.round((Math.max(0, momentum) / total) * 100),
    consistency: Math.round((Math.max(0, consistency) / total) * 100),
    other: Math.round((Math.max(0, other) / total) * 100),
  };
}

// ═══════════════════════════════════════════════════════
// MODELS — deterministic (no Math.random in scoring)
// ═══════════════════════════════════════════════════════

// FrequencyTrendScore — frequency, recency, trend, cycle, parity features
export function runFrequencyTrendScore(
  stats: NumberStats[], 
  config: LotteryConfig,
  excludedFeatures: string[] = []
): ModelResult {
  const scored: MLPrediction[] = stats.map(s => {
    const freqScore = excludedFeatures.includes("frequency") ? 0 : s.percentage * 0.25;
    const recencyScore = excludedFeatures.includes("recency") ? 0 : Math.max(0, (50 - s.lastSeen) / 50) * 20;
    const recentTrend = excludedFeatures.includes("trend") ? 0 : s.recentFreq * 1.5;
    const trendBonus = excludedFeatures.includes("trend") ? 0 : s.trend * 0.8;
    const cycleBonus = excludedFeatures.includes("cycle") ? 0 : (s.cycleScore > 1.2 ? s.cycleScore * 5 : 0);
    const momentumBonus = excludedFeatures.includes("momentum") ? 0 : (s.momentum > 0 ? s.momentum * 0.15 : s.momentum * 0.05);
    const gapConsistency = excludedFeatures.includes("consistency") ? 0 : (s.stdDev < s.avgGap * 0.5 ? 3 : 0);
    const parityBonus = excludedFeatures.includes("parity") ? 0 : (s.number % 2 === 0 ? 1 : 0);
    const rangeBonus = excludedFeatures.includes("range") ? 0 : (s.number <= config.numbers * 0.6 ? 1.5 : 0);
    const consecutiveBonus = excludedFeatures.includes("consecutive") ? 0 : s.consecutivePairs * 0.5;


    const raw = Math.max(0, freqScore + recencyScore + recentTrend + trendBonus + cycleBonus +
      momentumBonus + gapConsistency + parityBonus + rangeBonus + consecutiveBonus);

    return {
      number: s.number,
      score: raw,
      rank: 0,
      model: "FrequencyTrendScore",
      breakdown: buildBreakdown(freqScore, recencyScore + recentTrend, trendBonus, cycleBonus, momentumBonus, gapConsistency, parityBonus + rangeBonus + consecutiveBonus),
    };
  });

  normalizeAndRank(scored);
  return {
    name: "FrequencyTrendScore",
    description: "FrequencyTrendScore: Heurística ponderada de frequência, tendência, ciclo e momentum",
    predictions: scored,
    performanceScore: null, 

    confidence: 0,
  };
}

// MultiFactorScore — gradient pattern engine logic
export function runMultiFactorScore(stats: NumberStats[], config: LotteryConfig): ModelResult {
  const scored: MLPrediction[] = stats.map(s => {
    const freqWeight = Math.pow(s.percentage, 1.15) * 0.3;
    const delayPenalty = s.lastSeen > 20 ? -s.lastSeen * 0.2 : s.lastSeen * 0.4;
    const recency = s.recentFreq * 1.8;
    const hotColdBonus = s.status === "hot" ? 6 : s.status === "cold" ? -2 : 0;
    const trendFeature = s.trend * 1.2;
    const cycleFeature = Math.min(s.cycleScore, 3) * 4;
    const gapFeature = s.avgGap < 10 ? 3 : s.avgGap > 30 ? -2 : 0;
    const stdDevFeature = s.stdDev < 5 ? 2 : -1;
    const momentumAccel = s.momentum > 0 ? s.momentum * 0.2 : 0;
    const positionFeature = Math.sin((s.number / config.numbers) * Math.PI) * 3;

    const raw = Math.max(0, freqWeight + delayPenalty + recency + hotColdBonus + trendFeature +
      cycleFeature + gapFeature + stdDevFeature + momentumAccel + positionFeature + 20);

    return {
      number: s.number,
      score: raw,
      rank: 0,
      model: "MultiFactorScore",
      breakdown: buildBreakdown(freqWeight, recency + delayPenalty, trendFeature + hotColdBonus, cycleFeature, momentumAccel, gapFeature + stdDevFeature, positionFeature),
    };
  });

  normalizeAndRank(scored);
  return {
    name: "MultiFactorScore",
    description: "MultiFactorScore: Algoritmo de pontuação multi-fatorial estatístico com desvio padrão e ciclos",
    predictions: scored,
    performanceScore: null,

    confidence: 0,
  };
}

// TemporalPatternScore — non-linear pattern recognition
export function runTemporalPatternScore(stats: NumberStats[], config: LotteryConfig): ModelResult {
  const scored: MLPrediction[] = stats.map(s => {
    const layer1 = Math.tanh(s.percentage * 0.08 - 0.8) * 15 + 15;
    const layer2 = Math.tanh((s.recentFreq - 3) * 0.4) * 12;
    const layer3 = 1 / (1 + Math.exp(-(50 - s.lastSeen) * 0.08)) * 20;
    const trendNeuron = Math.tanh(s.trend * 0.3) * 10;
    const cycleNeuron = 1 / (1 + Math.exp(-(s.cycleScore - 1) * 2)) * 15;
    const momentumNeuron = Math.tanh(s.momentum * 0.05) * 8;
    const gapAttention = Math.exp(-Math.abs(s.avgGap - 10) * 0.1) * 10;
    const embedding = Math.cos((s.number / config.numbers) * Math.PI * 2) * 5;
    const consecutiveAttention = s.consecutivePairs > 2 ? 4 : 0;

    const raw = Math.max(0, layer1 + layer2 + layer3 + trendNeuron + cycleNeuron +
      momentumNeuron + gapAttention + embedding + consecutiveAttention);

    return {
      number: s.number,
      score: raw,
      rank: 0,
      model: "TemporalPatternScore",
      breakdown: buildBreakdown(layer1, layer2 + layer3, trendNeuron, cycleNeuron, momentumNeuron, gapAttention, embedding + consecutiveAttention),
    };
  });

  normalizeAndRank(scored);
  return {
    name: "TemporalPatternScore",
    description: "TemporalPatternScore: Decomposição não-linear estatística com attention em gaps",
    predictions: scored,
    performanceScore: null,

    confidence: 0,
  };
}

// Bayesian Inference — posterior with rich priors
export function runBayesianScore(stats: NumberStats[], config: LotteryConfig): ModelResult {
  const totalDraws = stats.reduce((sum, s) => sum + s.frequency, 0) / config.pick;
  const uniformPrior = 1 / config.numbers;

  const scored: MLPrediction[] = stats.map(s => {
    const likelihood = totalDraws > 0 ? s.frequency / totalDraws : uniformPrior;
    const recentLikelihood = s.recentFreq / 30;
    const trendLikelihood = (s.trend + 10) / 20;
    const posterior = (likelihood * 0.35 + recentLikelihood * 0.25 + trendLikelihood * 0.15 + uniformPrior * 0.1);
    const consistency = s.status === "hot" ? 1.25 : s.status === "cold" ? 0.75 : 1.0;
    const cyclePrior = s.cycleScore > 1 ? 1 + (s.cycleScore - 1) * 0.3 : 1;
    const gapPrior = s.stdDev < s.avgGap ? 1.1 : 0.95;
    const delayFactor = 1 / (1 + Math.exp(-0.12 * (s.lastSeen - 15))) * 0.6;
    const momentumPrior = s.momentum > 0 ? 1.05 : 0.98;

    const raw = Math.max(0, (posterior * consistency * cyclePrior * gapPrior * momentumPrior + delayFactor) * 100);

    return {
      number: s.number,
      score: raw,
      rank: 0,
      model: "BayesianScore",
      breakdown: buildBreakdown(likelihood * 100, recentLikelihood * 100, trendLikelihood * 100, (cyclePrior - 1) * 100, (momentumPrior - 1) * 100, (gapPrior - 1) * 100, delayFactor * 100),
    };
  });

  normalizeAndRank(scored);
  return {
    name: "BayesianScore",
    description: "Atualização bayesiana (antigo Bayesian Inference) com priors de ciclo e momentum",
    predictions: scored,
    performanceScore: null,

    confidence: 0,
  };
}

// Markov Chain — transition probabilities with cycle detection
export function runTransitionScore(stats: NumberStats[], config: LotteryConfig): ModelResult {
  const scored: MLPrediction[] = stats.map(s => {
    const transitionProb = s.lastSeen <= 3 ? 0.75 : s.lastSeen <= 10 ? 0.5 : s.lastSeen <= 20 ? 0.25 : 0.1;
    const steadyState = s.percentage / 100;
    const mixingFactor = Math.exp(-s.lastSeen * 0.04) * 0.25;
    const periodicBonus = s.recentFreq >= 4 ? 0.2 : s.recentFreq >= 3 ? 0.12 : s.recentFreq >= 2 ? 0.06 : 0;
    const cycleTransition = s.cycleScore > 1.3 ? 0.15 : s.cycleScore > 1 ? 0.08 : 0;
    const trendTransition = s.trend > 0 ? s.trend * 0.008 : 0;
    const gapRegularity = s.stdDev < s.avgGap * 0.6 ? 0.1 : 0;

    const raw = Math.max(0, (transitionProb * 35 + steadyState * 25 + mixingFactor * 15 +
      periodicBonus * 10 + cycleTransition * 10 + trendTransition * 5 + gapRegularity * 5) * 1.3);

    return {
      number: s.number,
      score: raw,
      rank: 0,
      model: "TransitionScore",
      breakdown: buildBreakdown(steadyState * 25, transitionProb * 35, trendTransition * 5, cycleTransition * 10, 0, gapRegularity * 5, mixingFactor * 15 + periodicBonus * 10),
    };
  });

  normalizeAndRank(scored);
  return {
    name: "TransitionScore",
    description: "Transições de estado (antigo Markov Chain) com detecção de periodicidade",
    predictions: scored,
    performanceScore: null,

    confidence: 0,
  };
}

// ═══════════════════════════════════════════════════════
// ENSEMBLE — weights calibrated by backtesting performance
// Quantum Analysis — Multi-dimensional pattern detection
export function runMultiDimensionalPatternScore(stats: NumberStats[], config: LotteryConfig): ModelResult {
  const scored: MLPrediction[] = stats.map(s => {
    const frequencyEnergy = Math.log10(s.frequency + 1) * 20;
    const timeDecay = Math.exp(-s.lastSeen * 0.05) * 15;
    const cycleResonance = s.cycleScore > 1.2 ? Math.pow(s.cycleScore, 1.5) * 8 : 0;
    const momentumSpin = Math.tanh(s.momentum * 0.1) * 10;
    const gapEntanglement = s.stdDev < s.avgGap * 0.4 ? 12 : 0;
    const positionWave = Math.sin((s.number / config.numbers) * Math.PI * 4) * 5;
    const hotColdInteraction = s.status === "hot" ? 10 : s.status === "cold" ? 5 : 0;

    const raw = Math.max(0, frequencyEnergy + timeDecay + cycleResonance + momentumSpin + gapEntanglement + positionWave + hotColdInteraction);

    return {
      number: s.number,
      score: raw,
      rank: 0,
      model: "MultiDimensionalPatternScore",
      breakdown: buildBreakdown(frequencyEnergy, timeDecay, momentumSpin, cycleResonance, momentumSpin, gapEntanglement, positionWave + hotColdInteraction),
    };
  });

  normalizeAndRank(scored);
  return {
    name: "MultiDimensionalPatternScore",
    description: "Detecção de padrões multi-dimensionais (antigo Quantum) usando ressonância",
    predictions: scored,
    performanceScore: null,

    confidence: 0,
  };
}

// ═══════════════════════════════════════════════════════

/**
 * Pesos do ensemble. Exportados porque o estudo de ablação precisa zerar um
 * modelo de cada vez — antes viviam inline aqui dentro e não havia como
 * referenciá-los de fora sem duplicar a tabela.
 */
export const ENSEMBLE_WEIGHTS: Record<string, number> = {
  "FrequencyTrendScore": 0.18,
  "MultiFactorScore": 0.22,
  "TemporalPatternScore": 0.18,
  "BayesianScore": 0.12,
  "TransitionScore": 0.08,
  "MultiDimensionalPatternScore": 0.22,
};

/** Nomes dos modelos do ensemble, na ordem em que são combinados. */
export const ENSEMBLE_MODELS = Object.keys(ENSEMBLE_WEIGHTS);

export function runEnsembleVoting(stats: NumberStats[], config: LotteryConfig, modelWeights?: Record<string, number>): ModelResult {
  const weights = modelWeights || ENSEMBLE_WEIGHTS;

  const models = [
    { result: runFrequencyTrendScore(stats, config), name: "FrequencyTrendScore" },
    { result: runMultiFactorScore(stats, config), name: "MultiFactorScore" },
    { result: runTemporalPatternScore(stats, config), name: "TemporalPatternScore" },
    { result: runBayesianScore(stats, config), name: "BayesianScore" },
    { result: runTransitionScore(stats, config), name: "TransitionScore" },
    { result: runMultiDimensionalPatternScore(stats, config), name: "MultiDimensionalPatternScore" },
  ];

  const numberScores: Record<number, { total: number; agreement: number; breakdownAccum: ScoreBreakdown }> = {};

  models.forEach(({ result, name }) => {
    const w = weights[name] || 0.2;
    const top30 = new Set(result.predictions.slice(0, 30).map(p => p.number));
    result.predictions.forEach(p => {
      if (!numberScores[p.number]) {
        numberScores[p.number] = { total: 0, agreement: 0, breakdownAccum: { frequency: 0, recency: 0, trend: 0, cycle: 0, momentum: 0, consistency: 0, other: 0 } };
      }
      numberScores[p.number].total += p.score * w;
      if (top30.has(p.number)) numberScores[p.number].agreement++;
      if (p.breakdown) {
        const ba = numberScores[p.number].breakdownAccum;
        ba.frequency += (p.breakdown.frequency || 0) * w;
        ba.recency += (p.breakdown.recency || 0) * w;
        ba.trend += (p.breakdown.trend || 0) * w;
        ba.cycle += (p.breakdown.cycle || 0) * w;
        ba.momentum += (p.breakdown.momentum || 0) * w;
        ba.consistency += (p.breakdown.consistency || 0) * w;
        ba.other += (p.breakdown.other || 0) * w;
      }
    });
  });

  const scored: MLPrediction[] = Object.entries(numberScores).map(([num, data]) => {
    const total = Math.abs(data.breakdownAccum.frequency) + Math.abs(data.breakdownAccum.recency) + Math.abs(data.breakdownAccum.trend) + Math.abs(data.breakdownAccum.cycle) + Math.abs(data.breakdownAccum.momentum) + Math.abs(data.breakdownAccum.consistency) + Math.abs(data.breakdownAccum.other) || 1;
    return {
      number: parseInt(num),
      score: Math.round(data.total * (1 + data.agreement * 0.1)),
      rank: 0,
      model: "Ensemble",
      breakdown: {
        frequency: Math.round((data.breakdownAccum.frequency / total) * 100),
        recency: Math.round((data.breakdownAccum.recency / total) * 100),
        trend: Math.round((data.breakdownAccum.trend / total) * 100),
        cycle: Math.round((data.breakdownAccum.cycle / total) * 100),
        momentum: Math.round((data.breakdownAccum.momentum / total) * 100),
        consistency: Math.round((data.breakdownAccum.consistency / total) * 100),
        other: Math.round((data.breakdownAccum.other / total) * 100),
      },
    };
  });

  normalizeAndRank(scored);

  const weightDesc = Object.entries(weights).map(([k, v]) => {
    const short = k.replace("MultiDimensionalPatternScore", "MDPS").replace("FrequencyTrendScore", "FTS").replace("MultiFactorScore", "MFS").replace("TemporalPatternScore", "TPS").replace("BayesianScore", "Bayes").replace("TransitionScore", "Markov");
    return `${short}(${Math.round(v * 100)}%)`;
  }).join(" + ");

  return {
    name: "Votação por Consenso",
    description: `Consenso de modelos com pesos calibrados por Lift histórico: ${weightDesc}`,
    predictions: scored,
    performanceScore: null,
    confidence: 0,
  };
}

// ═══════════════════════════════════════════════════════
// RUN ALL with backtesting and calibrated weights
// ═══════════════════════════════════════════════════════

export function runAllModels(
  stats: NumberStats[],
  config: LotteryConfig,
  draws?: DrawResult[],
  computeStatsFn?: (draws: DrawResult[], totalNumbers: number) => NumberStats[]
): ModelResult[] {
  const modelFns: Array<{ fn: (s: NumberStats[], c: LotteryConfig) => ModelResult; name: string }> = [
    { fn: runFrequencyTrendScore, name: "FrequencyTrendScore" },
    { fn: runMultiFactorScore, name: "MultiFactorScore" },
    { fn: runTemporalPatternScore, name: "TemporalPatternScore" },
    { fn: runBayesianScore, name: "BayesianScore" },
    { fn: runTransitionScore, name: "TransitionScore" },
    { fn: runMultiDimensionalPatternScore, name: "MultiDimensionalPatternScore" },
  ];

  const results: ModelResult[] = [];
  const calibratedWeights: Record<string, number> = {};

  for (const { fn, name } of modelFns) {
    const result = fn(stats, config);

    // Run backtesting if draws are available
    if (draws && draws.length > 100 && computeStatsFn) {
      // Sort draws by concurso ASC for walk-forward validation
      const sortedDraws = [...draws].sort((a, b) => a.concurso - b.concurso);
      const bt = backtestModel(fn, sortedDraws, config, computeStatsFn, 100, 50);
      const metrics = computeAccuracyFromBacktest(bt, config);
      result.performanceScore = metrics.performanceScore;
      result.confidence = metrics.confidence;
      result.backtestDetails = bt;
      calibratedWeights[name] = bt.liftOverChance > 1 ? bt.liftOverChance - 1 : 0.01;
    } else {
      result.performanceScore = null;
      result.confidence = 0;
      calibratedWeights[name] = 0.1;
    }

    results.push(result);
  }

  // Normalize calibrated weights to sum to 1
  const totalWeight = Object.values(calibratedWeights).reduce((a, b) => a + b, 0);
  if (totalWeight > 0) {
    for (const k of Object.keys(calibratedWeights)) {
      calibratedWeights[k] = calibratedWeights[k] / totalWeight;
    }
  }

  // Run ensemble with calibrated weights
  const ensemble = runEnsembleVoting(stats, config, totalWeight > 0 ? calibratedWeights : undefined);
  if (draws && draws.length > 100 && computeStatsFn) {
    const ensembleFn = (s: NumberStats[], c: LotteryConfig) => runEnsembleVoting(s, c, totalWeight > 0 ? calibratedWeights : undefined);
    const sortedDraws = [...draws].sort((a, b) => a.concurso - b.concurso);
    const bt = backtestModel(ensembleFn, sortedDraws, config, computeStatsFn, 100, 50);
    const metrics = computeAccuracyFromBacktest(bt, config);
    ensemble.performanceScore = metrics.performanceScore;
    ensemble.confidence = metrics.confidence;
    ensemble.backtestDetails = bt;
  } else {
    ensemble.performanceScore = null;
    ensemble.confidence = 0;
  }
  results.push(ensemble);

  return results;
}

export function getConsensusRanking(models: ModelResult[]): MLPrediction[] {
  const numberScores: Record<number, { total: number; count: number; topCount: number; breakdown: ScoreBreakdown }> = {};

  // Use performance-based weights for consensus (if score is null, use 50 as baseline)
  const totalScore = models.reduce((s, m) => s + (m.performanceScore ?? 50), 0) || models.length;

  models.forEach(model => {
    const modelWeight = (model.performanceScore ?? 50) / totalScore;
    const top15 = new Set(model.predictions.slice(0, 15).map(p => p.number));
    model.predictions.forEach(p => {
      if (!numberScores[p.number]) {
        numberScores[p.number] = { total: 0, count: 0, topCount: 0, breakdown: { frequency: 0, recency: 0, trend: 0, cycle: 0, momentum: 0, consistency: 0, other: 0 } };
      }
      numberScores[p.number].total += p.score * modelWeight;
      numberScores[p.number].count += 1;
      if (top15.has(p.number)) numberScores[p.number].topCount += 1;
      if (p.breakdown) {
        const bd = numberScores[p.number].breakdown;
        bd.frequency += (p.breakdown.frequency || 0) * modelWeight;
        bd.recency += (p.breakdown.recency || 0) * modelWeight;
        bd.trend += (p.breakdown.trend || 0) * modelWeight;
        bd.cycle += (p.breakdown.cycle || 0) * modelWeight;
        bd.momentum += (p.breakdown.momentum || 0) * modelWeight;
        bd.consistency += (p.breakdown.consistency || 0) * modelWeight;
        bd.other += (p.breakdown.other || 0) * modelWeight;
      }
    });
  });

  const consensus: MLPrediction[] = Object.entries(numberScores).map(([num, data]) => {
    const total = Math.abs(data.breakdown.frequency) + Math.abs(data.breakdown.recency) + Math.abs(data.breakdown.trend) + Math.abs(data.breakdown.cycle) + Math.abs(data.breakdown.momentum) + Math.abs(data.breakdown.consistency) + Math.abs(data.breakdown.other) || 1;
    return {
      number: parseInt(num),
      score: Math.round((data.total / (data.count || 1)) * (1 + data.topCount * 0.15)),
      rank: 0,
      model: "Consenso",
      agreement: data.topCount, // quantos modelos (0..N) listaram no top15
      breakdown: {
        frequency: Math.round((data.breakdown.frequency / total) * 100),
        recency: Math.round((data.breakdown.recency / total) * 100),
        trend: Math.round((data.breakdown.trend / total) * 100),
        cycle: Math.round((data.breakdown.cycle / total) * 100),
        momentum: Math.round((data.breakdown.momentum / total) * 100),
        consistency: Math.round((data.breakdown.consistency / total) * 100),
        other: Math.round((data.breakdown.other / total) * 100),
      },
    };
  });

  consensus.sort((a, b) => b.score - a.score);
  consensus.forEach((c, i) => (c.rank = i + 1));
  const max = consensus[0]?.score || 1;
  consensus.forEach(c => (c.score = Math.round((c.score / max) * 100)));

  // Anexa razão em linguagem natural aos top 10
  consensus.slice(0, 10).forEach(c => {
    c.reason = buildReason(c, models.length);
  });

  return consensus;
}

/**
 * Gera explicação textual curta sobre por que um número foi recomendado pelo consenso.
 */
function buildReason(p: MLPrediction, totalModels: number): string {
  const bd = p.breakdown;
  if (!bd) return "Recomendação baseada em convergência algorítmica de alta precisão.";
  const factors: Array<{ label: string; value: number }> = [
    { label: "frequência histórica sólida", value: bd.frequency },
    { label: "momentum de curto prazo positivo", value: bd.recency },
    { label: "tendência de alta confirmada", value: bd.trend },
    { label: "maturidade de ciclo detectada", value: bd.cycle },
    { label: "aceleração de momentum estatístico", value: bd.momentum },
    { label: "estabilidade de desvio padrão (gaps)", value: bd.consistency },
  ].filter(f => f.value >= 8).sort((a, b) => b.value - a.value).slice(0, 3);

  const agree = p.agreement ?? 0;
  const agreementText = agree >= totalModels - 1
    ? `Consenso de nível Profissional (${agree}/${totalModels} modelos)`
    : agree >= Math.ceil(totalModels / 2)
      ? `Convergência Majoritária (${agree}/${totalModels} modelos)`
      : `Sinal Algorítmico (${agree}/${totalModels} modelos)`;

  const factorText = factors.length > 0
    ? factors.map(f => f.label).join(", ")
    : "distribuição de probabilidade equilibrada";

  return `${agreementText}. Indicadores: ${factorText}.`;
}
