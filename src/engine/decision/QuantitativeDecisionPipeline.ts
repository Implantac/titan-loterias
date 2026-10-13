/**
 * Quantitative Decision Pipeline (TITAN v7.5 Alpha)
 * -----------------------------------------------------------------------------
 * The central brain of Titan. Orchestrates all engines into a single,
 * deterministic and transparent decision flow.
 * 
 * Pipeline: DATA -> QUALITY -> EVIDENCE -> BENCHMARK -> ROBUSTNESS -> VERDICT
 */

import { DrawResult, LotteryConfig } from "@/data/lotteries";
import { NumberStats, computeFrequencyStats } from "@/engine/stats/statistics";
import { validateLotteryData, DataQualityReport } from "@/engine/validation/DataQuality";
import { LeakageDetector } from "@/engine/validation/leakage-detector";
import { analyzeEvidence, EvidenceReport } from "@/engine/stats/evidence-engine";
import { BenchmarkEngine, StrategyBenchmarkResult } from "@/engine/stats/benchmark-engine";
import { StressTestEngine, StressTestResult } from "@/engine/evidence/StressTestEngine";
import { AblationEngine } from "@/engine/evidence/ablation-engine";
import { 
  QuantitativeDecisionResult, 
  DecisionVerdict, 
  RobustnessReport,
  EvidenceGrade
} from "@/engine/contracts/quant";

export interface DecisionRequest {
  lotteryId: string;
  config: LotteryConfig;
  draws: DrawResult[];
  stats: NumberStats[];
  budget: number;
  riskProfile: "conservative" | "balanced" | "aggressive";
  strategyId: string;
  strategyLabel: string;
  generatedGames: number[][];
  historicalPerformance: number;
}

export class QuantitativeDecisionPipeline {
  /**
   * Run the complete quantitative analysis pipeline.
   */
  static async execute(request: DecisionRequest): Promise<QuantitativeDecisionResult> {
    const { config, draws, generatedGames, historicalPerformance } = request;

    // 1. DATA QUALITY & LEAKAGE
    // NOTE: pass null so the engine infers the real drawn-ball count from history
    // (config.pick is the bettor's minimum marking, not the amount drawn).
    const quality = validateLotteryData(draws, null, config.numbers);
    
    // Leakage detection (Phase 2 integration)
    const hasLeakage = LeakageDetector.detect(
      (historicalDraws) => generatedGames[0] || [], // Mock model function for leakage check
      draws,
      draws.length - 2
    );

    if (!quality.isValid || hasLeakage) {
      const reason = hasLeakage ? "Vazamento de dados detectado (Leakage)" : quality.issues.join(", ");
      throw new Error(`Dados insuficientes ou corrompidos para análise: ${reason}`);
    }

    // 2. EVIDENCE & BENCHMARK
    const benchmark = await BenchmarkEngine.runBenchmark(
      request.strategyId,
      request.strategyLabel,
      config,
      draws,
      generatedGames,
      historicalPerformance
    );

    // 3. STRESS TEST (Robustness)
    const stressTester = new StressTestEngine(draws, config);
    const stressResult = await stressTester.runStressTest(
      () => generatedGames[0] || [],
      { windowSize: 30, testSize: 10, mode: "rolling" }
    );


    // 4. ABLATION ANALYSIS (Indicator Contribution)
    const ablationResults = await AblationEngine.runAblation(
      ["Frequência", "Recência", "Atraso", "Tendência", "Ciclos", "Padrões"],
      config,
      draws,
      benchmark.lift / 100 + 1,
      generatedGames,
      // Leave-One-Out real sobre o ensemble. Sem isto o engine devolve vazio —
      // melhor nenhum número do que um número inventado.
      computeFrequencyStats,
    );

    // 5. VERDICT LOGIC
    const verdict = this.calculateVerdict(benchmark, stressResult, request.riskProfile);

    // 5. CONSOLIDATE RESULT
    return {
      timestamp: Date.now(),
      lotteryId: request.lotteryId,
      dataQuality: {
        score: quality.qualityScore,
        isValid: quality.isValid,
        hasLeakage
      },
      evidence: {
        metric: "Performance Score",
        observed: benchmark.lift / 100 + 1,
        baseline: 1.0,
        effectSize: benchmark.zScore,
        confidenceInterval: benchmark.confidenceInterval,
        pValue: benchmark.pValue,
        sampleSize: benchmark.sampleSize,
        method: "Monte Carlo (100k) + OOS",
        conclusion: this.mapLiftToGrade(benchmark.lift / 100 + 1, benchmark.pValue),
        grade: this.mapLiftToGrade(benchmark.lift / 100 + 1, benchmark.pValue),
        explanation: this.getGradeExplanation(this.mapLiftToGrade(benchmark.lift / 100 + 1, benchmark.pValue)),
        lift: benchmark.lift / 100 + 1,
        zScore: benchmark.zScore
      },


      benchmark: {
        lift: benchmark.lift,
        zScore: benchmark.zScore,
        pValue: benchmark.pValue,
        advantage: benchmark.advantage
      },
      robustness: {
        score: stressResult.robustnessScore,
        stabilityIndex: stressResult.stabilityIndex,
        verdict: stressResult.verdict
      },
      ablation: {
        indicators: ablationResults.map(a => a.indicator),
        impacts: ablationResults.map(a => ({
          indicator: a.indicator,
          importance: a.relativeImportance,
          impact: a.liftContribution
        }))
      },
      verdict
    };
  }

  private static mapLiftToGrade(lift: number, pValue: number): EvidenceGrade {
    if (pValue >= 0.10 || lift <= 1.0) return "E0";
    if (pValue >= 0.05) return "E1";
    if (lift > 1.05 && pValue < 0.01) return "E4";
    if (lift > 1.03 && pValue < 0.05) return "E3";
    return "E2";
  }

  private static getGradeExplanation(grade: EvidenceGrade): string {
    const explanations: Record<EvidenceGrade, string> = {
      E0: "Sem evidência: Nenhuma vantagem detectada em relação ao acaso.",
      E1: "Sinal exploratório: Resultado interessante, mas estatisticamente inconclusivo.",
      E2: "Evidência moderada: Resultado consistente em parte dos testes.",
      E3: "Evidência forte: Resultado consistente com baixo p-valor.",
      E4: "Evidência robusta: Vantagem preditiva replicada com alta confiança."
    };
    return explanations[grade];
  }

  private static calculateVerdict(
    benchmark: StrategyBenchmarkResult,
    stress: StressTestResult,
    risk: string
  ): DecisionVerdict {
    const positive: string[] = [];
    const negative: string[] = [];

    if (benchmark.lift > 5) positive.push(`Lift superior a 5% (${benchmark.lift.toFixed(1)}%)`);
    if (benchmark.isStatisticallySignificant) positive.push("Significância estatística confirmada (p < 0.05)");
    if (stress.robustnessScore > 70) positive.push(`Alta robustez estrutural (${stress.robustnessScore.toFixed(0)}/100)`);
    
    if (benchmark.pValue > 0.1) negative.push("Baixa significância estatística");
    if (stress.stabilityIndex < 0.5) negative.push("Instabilidade detectada em diferentes janelas");
    if (benchmark.lift < 2) negative.push("Vantagem marginal sobre o acaso");

    let action: DecisionVerdict["action"] = "OBSERVAR";
    let conclusion = "Recomenda-se cautela. Os sinais são mistos ou insuficientes.";

    const score = (benchmark.lift > 0 ? 1 : 0) + (benchmark.isStatisticallySignificant ? 2 : 0) + (stress.robustnessScore / 25);
    
    if (score >= 5 && benchmark.lift > 3) {
      action = risk === "aggressive" ? "APOSTAR" : "APOSTAR_REDUZIDO";
      conclusion = "Sinais favoráveis e robustos. Estratégia demonstra vantagem consistente.";
    } else if (score >= 3) {
      action = "APOSTAR_REDUZIDO";
      conclusion = "Há evidência de sinal, mas a volatilidade sugere exposição moderada.";
    } else if (benchmark.lift <= 0 || benchmark.pValue > 0.2) {
      action = "NAO_APOSTAR";
      conclusion = "Evidência insuficiente. Risco de ruído estatístico elevado.";
    }

    return {
      action,
      rationale: {
        positive,
        negative,
        conclusion
      }
    };
  }
}
