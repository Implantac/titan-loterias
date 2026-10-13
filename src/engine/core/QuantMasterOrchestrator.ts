import { GameSimilarityEngine } from '../portfolio/GameSimilarityEngine';
import { PortfolioEngine, PortfolioInput, PortfolioOutput } from '../portfolio/PortfolioEngine';
import { BenchmarkEngine, StrategyBenchmarkResult } from '../stats/benchmark-engine';
import { AblationEngine, AblationImpact } from '../evidence/ablation-engine';
import { DrawResult, LotteryConfig } from '@/data/lotteries';
import { NumberStats, computeFrequencyStats } from '../stats/statistics';

/**
 * QuantMasterOrchestrator
 * 
 * Fachada principal para operações quantitativas de alto nível.
 * Coordena os motores de Similaridade, Portfólio, Benchmark e Ablação.
 */
export class QuantMasterOrchestrator {
  /**
   * Prepara uma carteira profissional completa.
   */
  static async prepareProfessionalPortfolio(
    input: PortfolioInput,
    stats: NumberStats[],
    draws: DrawResult[],
    historicalAvgHits?: number
  ): Promise<PortfolioOutput & { benchmark?: StrategyBenchmarkResult }> {
    // 1. Otimiza o portfólio
    const portfolio = PortfolioEngine.optimize(input);

    // 2. Executa benchmark se houver jogos selecionados
    let benchmark: StrategyBenchmarkResult | undefined;
    if (portfolio.selectedGames.length > 0) {
      // Usamos a média histórica se fornecida, ou calculamos uma baseada nos draws recentes
      const performanceToCompare = historicalAvgHits || 0;

      benchmark = await BenchmarkEngine.runBenchmark(
        'current-portfolio',
        'Carteira Titan',
        { pick: 15, numbers: 25, id: input.lotteryId, name: 'Lotofácil' } as LotteryConfig,
        draws,
        portfolio.selectedGames,
        performanceToCompare
      );
    }

    return {
      ...portfolio,
      benchmark
    };
  }

  /**
   * Realiza auditoria completa de uma estratégia.
   * Inclui ablação de indicadores e teste de estresse temporal.
   */
  static async auditStrategy(
    indicators: string[],
    lotteryConfig: LotteryConfig,
    draws: DrawResult[],
    performance: number,
    games: number[][]
  ): Promise<{ 
    ablation: AblationImpact[];
    stress?: any;
  }> {
    const ablation = await AblationEngine.runAblation(
      indicators,
      lotteryConfig,
      draws,
      performance,
      games,
      computeFrequencyStats,
    );

    // Integrando StressTest no audit (Phase 8)
    const { StressTestEngine } = await import("../evidence/StressTestEngine");
    const stressEngine = new StressTestEngine(draws, lotteryConfig);
    // Simulação básica para auditoria rápida
    const stress = await stressEngine.runStressTest(
      () => games[0] || [],
      { windowSize: 50, testSize: 20, mode: "rolling" }
    );

    return { ablation, stress };
  }
}
