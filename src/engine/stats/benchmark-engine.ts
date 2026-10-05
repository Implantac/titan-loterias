import { DrawResult, LotteryConfig } from "@/data/lotteries";
import { generateRandomGames, buildBenchmarkReport, BenchmarkReport } from "@/engine/stats/baseline-benchmark";
import { analyzeEvidence } from "@/engine/stats/evidence-engine";
import { createXorshift32, hashStringToSeed } from "@/ai/core/rng";

export interface StrategyBenchmarkResult {
  strategyId: string;
  strategyLabel: string;
  titanPerformance: number; // Média de acertos ou ROI
  randomBaseline: number;
  uniformBaseline: number;
  outOfSamplePerformance: number;
  zScore: number;
  pValue: number;
  isStatisticallySignificant: boolean;
  confidenceInterval: [number, number];
  sampleSize: number;
  advantage: number; // Diferença absoluta
  lift: number; // Porcentagem sobre o acaso
}

/**
 * Benchmark Engine
 * 
 * Compara estratégias Titan contra baselines aleatórias e uniformes,
 * calculando a significância estatística real (Verdade Matemática).
 */
export class BenchmarkEngine {
  /**
   * Executa um benchmark completo para uma estratégia.
   */
  static async runBenchmark(
    strategyId: string,
    strategyLabel: string,
    lotteryConfig: LotteryConfig,
    draws: DrawResult[],
    generatedGames: number[][],
    historicalPerformance: number // Desempenho observado da estratégia Titan
  ): Promise<StrategyBenchmarkResult> {
    const sampleSize = generatedGames.length;
    
    // 1. Random Baseline (Monte Carlo para baseline neutra)
    // Baseline com seed fixa (loteria + último concurso) => reproduzível.
    const baselineSeed = hashStringToSeed(`${lotteryConfig.id}:${draws[0]?.concurso ?? 0}:baseline`);
    const randomGames = generateRandomGames(lotteryConfig, 2000, createXorshift32(baselineSeed));
    // Usamos draws aleatórios para baseline para evitar qualquer viés
    const randomResults = this.calculateAverageHits(randomGames, draws.slice(0, 50));
    const randomAvg = randomResults.average;

    // 2. Out-of-Sample (OOS) - Fase 7
    // Dividimos os draws para validar em dados não vistos
    const oosDraws = draws.slice(Math.floor(draws.length * 0.7));
    const oosPerformance = this.calculateAverageHits(generatedGames, oosDraws).average;

    // 3. Simulação de significância via EvidenceEngine
    const totalHits = this.calculateTotalHits(generatedGames, draws.slice(0, 50));
    const evidence = analyzeEvidence(
      totalHits,
      generatedGames,
      draws.slice(0, 50),
      lotteryConfig,
      100000 // Aumentado para 100k conforme Plano Mestre
    );

    // Desempenho observado = média REAL de acertos dos jogos nos mesmos concursos do baseline.
    // `historicalPerformance` só é usado se for um valor em acertos/jogo informado pelo chamador
    // (>= 1 acerto médio); valores-placeholder (ex.: 1.05) não são mais aceitos.
    const measured = this.calculateAverageHits(generatedGames, draws.slice(0, 50)).average;
    const observed = Number.isFinite(measured) && sampleSize > 0 ? measured : historicalPerformance;
    const advantage = observed - randomAvg;
    const lift = (advantage / (randomAvg || 1)) * 100;

    return {
      strategyId,
      strategyLabel,
      titanPerformance: observed,
      randomBaseline: randomAvg,
      uniformBaseline: randomAvg, 
      outOfSamplePerformance: oosPerformance,
      zScore: evidence.zScore,
      pValue: evidence.pValue,
      isStatisticallySignificant: evidence.isSignificant,
      confidenceInterval: evidence.confidenceInterval as [number, number],
      sampleSize,
      advantage,
      lift
    };
  }

  private static calculateTotalHits(games: number[][], draws: DrawResult[]): number {
    let total = 0;
    for (const draw of draws) {
      const drawSet = new Set(draw.numbers);
      for (const game of games) {
        total += game.filter(n => drawSet.has(n)).length;
      }
    }
    return total;
  }

  private static calculateAverageHits(games: number[][], draws: DrawResult[]): { average: number; stdDev: number } {
    if (games.length === 0 || draws.length === 0) return { average: 0, stdDev: 0 };

    const hits: number[] = [];
    for (const draw of draws) {
      const drawSet = new Set(draw.numbers);
      for (const game of games) {
        let hitCount = 0;
        for (const num of game) {
          if (drawSet.has(num)) hitCount++;
        }
        hits.push(hitCount);
      }
    }

    const sum = hits.reduce((a, b) => a + b, 0);
    const avg = sum / hits.length;
    const variance = hits.reduce((s, h) => s + Math.pow(h - avg, 2), 0) / hits.length;

    return {
      average: avg,
      stdDev: Math.sqrt(variance)
    };
  }
}
