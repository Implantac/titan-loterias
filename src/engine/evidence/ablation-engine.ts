import { DrawResult, LotteryConfig } from "@/data/lotteries";
import type { NumberStats } from "@/engine/stats/statistics";
import {
  backtestModel,
  runEnsembleVoting,
  ENSEMBLE_WEIGHTS,
  ENSEMBLE_MODELS,
} from "@/engine/ai/ml-models";

export interface AblationImpact {
  indicator: string;
  liftContribution: number;
  significanceImpact: number;
  confidenceGain: number;
  relativeImportance: number;
  robustnessGrade: "High" | "Medium" | "Low";
  pValueImpact: number;
}

export interface AblationReport {
  impacts: AblationImpact[];
  /** Lift do ensemble completo sobre o acaso, medido no mesmo walk-forward. */
  baselineLift: number;
  /** Lift esperado se os modelos não tivessem nenhuma habilidade. */
  chanceLift: number;
  drawsTested: number;
  windowSize: number;
}

export interface AblationOptions {
  /** Janela de treino em concursos. */
  windowSize?: number;
  /** Quantos concursos testar. Menor = mais rápido. */
  testSize?: number;
  /** Chamado a cada modelo concluído, para a UI mostrar progresso real. */
  onProgress?: (done: number, total: number, model: string) => void;
}

/**
 * Estudo de ablação Leave-One-Out **real**.
 *
 * Como funciona: roda o backtest walk-forward do ensemble completo e depois uma
 * vez para cada modelo com o peso zerado. A contribuição de um modelo é a queda
 * de lift que a remoção dele provoca — nada é estimado por tabela nem sorteado.
 *
 * DETERMINÍSTICO: `backtestModel` não usa aleatoriedade, então o mesmo
 * histórico produz sempre o mesmo resultado. Isso importa porque o
 * `AGENTS.md` exige reprodutibilidade, e a implementação anterior usava
 * `Math.random()` — o número mudava a cada clique.
 */
export class AblationEngine {
  static runLeaveOneOut(
    config: LotteryConfig,
    draws: DrawResult[],
    computeStatsFn: (draws: DrawResult[], totalNumbers: number) => NumberStats[],
    options: AblationOptions = {},
  ): AblationReport {
    const windowSize = options.windowSize ?? 100;
    const testSize = options.testSize ?? 40;

    const sorted = [...draws].sort((a, b) => a.concurso - b.concurso);
    const testable = Math.min(testSize, sorted.length - windowSize);
    if (testable <= 0) {
      return { impacts: [], baselineLift: 0, chanceLift: 0, drawsTested: 0, windowSize };
    }

    const ensembleWith = (weights: Record<string, number>) =>
      (stats: NumberStats[], cfg: LotteryConfig) => runEnsembleVoting(stats, cfg, weights);

    const baseline = backtestModel(
      ensembleWith(ENSEMBLE_WEIGHTS),
      sorted,
      config,
      computeStatsFn,
      windowSize,
      testSize,
    );

    const contributions: { model: string; drop: number; ablatedLift: number }[] = [];
    const total = ENSEMBLE_MODELS.length;

    ENSEMBLE_MODELS.forEach((model, i) => {
      // Zera apenas este modelo; os demais mantêm os pesos originais.
      const ablatedWeights = { ...ENSEMBLE_WEIGHTS, [model]: 0 };
      const ablated = backtestModel(
        ensembleWith(ablatedWeights),
        sorted,
        config,
        computeStatsFn,
        windowSize,
        testSize,
      );
      contributions.push({
        model,
        drop: baseline.liftOverChance - ablated.liftOverChance,
        ablatedLift: ablated.liftOverChance,
      });
      options.onProgress?.(i + 1, total, model);
    });

    // A importância relativa só faz sentido sobre contribuições positivas: um
    // modelo com drop <= 0 não agrega, e dividir por um total que inclui
    // negativos produziria percentuais sem interpretação.
    const positiveTotal = contributions.reduce((s, c) => s + Math.max(0, c.drop), 0);

    const impacts: AblationImpact[] = contributions.map((c) => {
      const relativeImportance = positiveTotal > 0 ? Math.max(0, c.drop) / positiveTotal : 0;
      const grade: AblationImpact["robustnessGrade"] =
        relativeImportance >= 0.25 ? "High" : relativeImportance >= 0.1 ? "Medium" : "Low";

      return {
        indicator: c.model,
        liftContribution: Number(c.drop.toFixed(5)),
        // Quantas vezes a contribuição representa o lift total do ensemble.
        significanceImpact:
          baseline.liftOverChance > 0 ? Number((c.drop / baseline.liftOverChance).toFixed(4)) : 0,
        // `consistency` (0..100) é a estabilidade do modelo entre os folds do
        // walk-forward. Só faz sentido falar em ganho de confiança se o
        // baseline for minimamente estável.
        confidenceGain:
          baseline.consistency > 0 ? Number(relativeImportance.toFixed(4)) : 0,
        relativeImportance: Number(relativeImportance.toFixed(4)),
        robustnessGrade: grade,
        // Sem o modelo, o lift cai para `ablatedLift`; a diferença de lift é a
        // leitura direta do quanto aquele modelo valia.
        pValueImpact: Number(c.ablatedLift.toFixed(5)),
      };
    });

    return {
      impacts: impacts.sort((a, b) => b.relativeImportance - a.relativeImportance),
      baselineLift: baseline.liftOverChance,
      chanceLift: baseline.expectedByChance,
      drawsTested: baseline.totalDrawsTested,
      windowSize,
    };
  }

  /**
   * Assinatura antiga, mantida para não quebrar os call sites.
   *
   * A lista de `indicators` e os parâmetros `fullStrategyPerformance` / `games`
   * são ignorados de propósito: a ablação real opera sobre os modelos do
   * ensemble, que é o que de fato compõe a previsão. Aceitá-los e fingir que
   * influenciam o resultado era exatamente o defeito da versão anterior.
   */
  static async runAblation(
    _indicators: string[],
    lotteryConfig: LotteryConfig,
    draws: DrawResult[],
    _fullStrategyPerformance: number,
    _games: number[][],
    computeStatsFn?: (draws: DrawResult[], totalNumbers: number) => NumberStats[],
    options: AblationOptions = {},
  ): Promise<AblationImpact[]> {
    if (!computeStatsFn) {
      // Sem função de stats não há como medir nada. Devolver vazio é honesto;
      // inventar números era o comportamento anterior.
      return [];
    }
    return this.runLeaveOneOut(lotteryConfig, draws, computeStatsFn, options).impacts;
  }
}
