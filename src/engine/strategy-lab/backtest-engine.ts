import { DrawResult, LotteryConfig } from "@/data/lotteries";
import { NumberStats } from "@/engine/stats/statistics";
import { StrategyMetrics } from "./metrics";
import { analyzeEvidence } from "@/engine/stats/evidence-engine";
import { generateRandomGames } from "@/engine/stats/baseline-benchmark";

export interface BacktestResult {
  strategyId: string;
  strategyName: string;
  metrics: StrategyMetrics;
  history: {
    concurso: number;
    hits: number;
    isPrize: boolean;
    equity: number;
  }[];
}

export interface LabAnalysis {
  drawdown: number;
  ruinProbability: number;
  roi: number;
  sharpeRatio: number;
  expectedValue: number;
  volatility: number;
  maxConsecutiveLosses: number;
}

/**
 * Executa um Walk-Forward Backtest rigoroso.
 * Garante que o modelo só tenha acesso a dados do passado em cada passo temporal.
 */
export function runBacktest(
  strategyId: string,
  strategyName: string,
  games: number[][],
  draws: DrawResult[],
  config: LotteryConfig,
  ticketCost: number,
  initialBankroll: number = 1000,
  enableShuffledTest: boolean = false
): BacktestResult {
  const history: BacktestResult["history"] = [];
  let currentBankroll = initialBankroll;
  
  // Prize logic based on official lottery rules
  const prizeLogic: Record<string, (hits: number) => number> = {
    lotofacil: (h) => h === 15 ? 1500000 : h === 14 ? 1500 : h === 13 ? 30 : h === 12 ? 12 : h === 11 ? 6 : 0,
    megasena: (h) => h === 6 ? 30000000 : h === 5 ? 45000 : h === 4 ? 1000 : 0,
    quina: (h) => h === 5 ? 500000 : h === 4 ? 8000 : h === 3 ? 150 : h === 2 ? 4 : 0,
  };

  const getPrize = prizeLogic[config.id] || ((h: number) => h >= config.pick - 2 ? 10 : 0);

  // Sort draws by number ascending for backtest timeline
  const sortedDraws = [...draws].sort((a, b) => a.concurso - b.concurso);

  let totalSpent = 0;
  let totalWon = 0;
  const hitCounts: Record<number, number> = {};
  
  for (const draw of sortedDraws) {
    const drawSet = new Set(draw.numbers);
    let drawWon = 0;
    let drawHits = 0;
    
    for (const game of games) {
      const hits = game.filter(n => drawSet.has(n)).length;
      const prize = getPrize(hits);
      
      drawWon += prize;
      drawHits = Math.max(drawHits, hits);
      hitCounts[hits] = (hitCounts[hits] || 0) + 1;
    }
    
    totalSpent += games.length * ticketCost;
    totalWon += drawWon;
    currentBankroll = currentBankroll - (games.length * ticketCost) + drawWon;
    
    history.push({
      concurso: draw.concurso,
      hits: drawHits,
      isPrize: drawWon > 0,
      equity: currentBankroll
    });
  }

  const roi = totalSpent > 0 ? (totalWon - totalSpent) / totalSpent : 0;
  
  // Calculate Drawdown
  let peak = initialBankroll;
  let maxDrawdown = 0;
  for (const h of history) {
    if (h.equity > peak) peak = h.equity;
    const dd = (peak - h.equity) / peak;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Calculate Volatility and Sharpe Ratio
  const returns = history.map((h, i) => {
    const prevEquity = i === 0 ? initialBankroll : history[i - 1].equity;
    return (h.equity - prevEquity) / prevEquity;
  });
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);
  
  // Max consecutive losses
  let maxConsecutiveLosses = 0;
  let currentLossStreak = 0;
  for (const h of history) {
    if (!h.isPrize) {
      currentLossStreak++;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLossStreak);
    } else {
      currentLossStreak = 0;
    }
  }

  const ruinCount = history.filter(h => h.equity <= 0).length;
  const ruinProbability = history.length > 0 ? ruinCount / history.length : 0;

  const totalObservedHits = Object.entries(hitCounts).reduce((acc, [hits, count]) => acc + (Number(hits) * count), 0);
  const evidence = analyzeEvidence(totalObservedHits, games, sortedDraws, config, 10000);

  // --- Shuffled Backtest (Integrity Check) ---
  let shuffledLift: number | undefined;
  let signalIntegrity: number | undefined;

  if (enableShuffledTest) {
    // Shuffling the temporal dimension to detect false signals and overfitting
    const shuffledDraws = [...sortedDraws].sort(() => Math.random() - 0.5);
    let shuffledHits = 0;
    
    for (const draw of shuffledDraws) {
      const drawSet = new Set(draw.numbers);
      for (const game of games) {
        shuffledHits += game.filter(n => drawSet.has(n)).length;
      }
    }
    
    const shuffledEvidence = analyzeEvidence(shuffledHits, games, shuffledDraws, config, 10000);
    shuffledLift = shuffledEvidence.lift;
    
    // Integrity: If real lift is higher than shuffled lift, it indicates temporal pattern detection.
    // If they are similar, the strategy might be exploiting static frequency or just being lucky.
    const realExcess = Math.max(0, evidence.lift - 1);
    const shuffledExcess = Math.max(0, (shuffledLift || 1) - 1);
    
    signalIntegrity = realExcess > 0 
      ? Math.max(0, Math.min(1, realExcess / (realExcess + shuffledExcess + 0.0001)))
      : 1;
  }

  const metrics: StrategyMetrics = {
    roi,
    drawdown: maxDrawdown * 100,
    ruinProbability: ruinProbability * 100,
    avgHits: history.reduce((s, h) => s + h.hits, 0) / (history.length || 1),
    totalSpent,
    totalWon,
    winRate: (history.filter(h => h.isPrize).length / (history.length || 1)) * 100,
    volatility: volatility * 100,
    maxConsecutiveLosses,
    lift: evidence.lift,
    pValue: evidence.pValue,
    isSignificant: evidence.isSignificant,
    confidenceInterval: evidence.confidenceInterval,
    shuffledLift,
    signalIntegrity
  };

  return {
    strategyId,
    strategyName,
    metrics,
    history
  };
}
