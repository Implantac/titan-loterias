import { NumberStats } from "@/features/statistics/engine";
import { DrawResult, LotteryConfig } from "@/data/lotteries";
import { generateByStrategy, Strategy, STRATEGIES } from "@/features/statistics/strategies";

// ═══════════════════════════════════════════════════════
// Motor de Backtesting Automático
// Testa estratégias contra resultados históricos reais
// ═══════════════════════════════════════════════════════

export interface BacktestResult {
  strategy: Strategy;
  label: string;
  totalTests: number;
  hitDistribution: Record<number, number>;
  avgHits: number;
  bestHit: number;
  winRate: number; // % with minimum prize hits
  profit: number; // estimated ROI
  consistency: number; // 0-1
  streaks: { bestWin: number; worstLoss: number };
  equityCurve: { x: number; y: number }[];
  maxDrawdown: number;
  recoveryFactor: number;
  sharpeRatio: number;
  globalScore: number;
}

export interface BacktestConfig {
  strategies: Strategy[];
  testWindow: number; // how many recent draws to test
  betsPerDraw: number; // bets generated per draw
  minPrizeHits: number; // minimum hits to count as "win"
}

export function runBacktest(
  stats: NumberStats[],
  config: LotteryConfig,
  draws: DrawResult[],
  btConfig: BacktestConfig
): BacktestResult[] {
  const sorted = [...draws].sort((a, b) => a.concurso - b.concurso);
  const testDraws = sorted.slice(-btConfig.testWindow);

  const results: BacktestResult[] = [];

  // Preços oficiais Caixa — vigentes desde nov/2024
  const costs: Record<string, number> = {
    lotofacil: 3.5, megasena: 6.0, quina: 3.0, lotomania: 3.5,
    duplasena: 3.0, timemania: 4.5, diadesorte: 3.0, supersete: 2.5,
  };
  const costPerGame = costs[config.id] || 3.0;

  const prizeMap: Record<string, Record<number, number>> = {
    megasena: { 4: 1200, 5: 45000, 6: 35000000 },
    lotofacil: { 11: 6, 12: 12, 13: 30, 14: 1500, 15: 1500000 },
    quina: { 2: 3, 3: 120, 4: 8000, 5: 2000000 },
    lotomania: { 0: 300000, 15: 10, 16: 40, 17: 200, 18: 2500, 19: 50000, 20: 5000000 },
    duplasena: { 3: 6, 4: 150, 5: 5000, 6: 1000000 },
    timemania: { 3: 3.5, 4: 10.5, 5: 100, 6: 25000, 7: 3000000 },
    diadesorte: { 4: 5, 5: 25, 6: 2500, 7: 500000 },
    supersete: { 3: 5, 4: 50, 5: 1000, 6: 15000, 7: 2000000 },
  };
  const prizeWeights = prizeMap[config.id] || { [config.pick - 2]: 50, [config.pick - 1]: 5000, [config.pick]: 500000 };

  for (const strategy of btConfig.strategies) {
    const stratInfo = STRATEGIES.find(s => s.id === strategy);
    const hitDist: Record<number, number> = {};
    for (let i = 0; i <= config.pick; i++) hitDist[i] = 0;

    let totalHits = 0;
    let bestHit = 0;
    let wins = 0;
    let currentStreak = 0;
    let bestWinStreak = 0;
    let currentLossStreak = 0;
    let worstLossStreak = 0;
    
    let balance = 0;
    const equityCurve: { x: number; y: number }[] = [{ x: 0, y: 0 }];
    let peak = 0;
    let maxDrawdown = 0;
    const dailyReturns: number[] = [];

    const totalTests = testDraws.length * btConfig.betsPerDraw;

    testDraws.forEach((draw, drawIdx) => {
      let drawPrize = 0;
      const drawCost = btConfig.betsPerDraw * costPerGame;
      
      for (let b = 0; b < btConfig.betsPerDraw; b++) {
        const bet = generateByStrategy(strategy, stats, config);
        const drawSet = new Set(draw.numbers);
        const hits = bet.filter(n => drawSet.has(n)).length;

        hitDist[hits] = (hitDist[hits] || 0) + 1;
        totalHits += hits;
        if (hits > bestHit) bestHit = hits;

        const prize = prizeWeights[hits] || 0;
        drawPrize += prize;

        if (hits >= btConfig.minPrizeHits) {
          wins++;
          currentStreak++;
          if (currentStreak > bestWinStreak) bestWinStreak = currentStreak;
          currentLossStreak = 0;
        } else {
          currentLossStreak++;
          if (currentLossStreak > worstLossStreak) worstLossStreak = currentLossStreak;
          currentStreak = 0;
        }
      }
      
      const netDraw = drawPrize - drawCost;
      balance += netDraw;
      equityCurve.push({ x: drawIdx + 1, y: Math.round(balance * 100) / 100 });
      dailyReturns.push(netDraw);

      if (balance > peak) peak = balance;
      const drawdown = peak > 0 ? (peak - balance) : Math.abs(balance);
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    const avgHits = totalHits / totalTests;
    const winRate = (wins / totalTests) * 100;

    // Consistency: inverse coefficient of variation
    const hitValues = Object.entries(hitDist).flatMap(([h, c]) => Array(c).fill(Number(h)));
    const variance = hitValues.length > 0 ? hitValues.reduce((s, v) => s + (v - avgHits) ** 2, 0) / hitValues.length : 0;
    const consistency = avgHits > 0 ? Math.max(0, 1 - Math.sqrt(variance) / avgHits) : 0;

    const profit = totalTests > 0 ? balance / (totalTests * costPerGame) : 0;
    
    // Recovery Factor = Net Profit / Max Drawdown
    const recoveryFactor = maxDrawdown > 0 ? balance / maxDrawdown : balance > 0 ? 10 : 0;
    
    // Simplified Sharpe Ratio
    const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const stdDevReturn = Math.sqrt(dailyReturns.reduce((s, v) => s + (v - avgReturn) ** 2, 0) / dailyReturns.length);
    const sharpeRatio = stdDevReturn > 0 ? (avgReturn / stdDevReturn) : 0;

    // Composite Score
    const globalScore = Math.round(
      (winRate * 2.5) + 
      (consistency * 30) + 
      (sharpeRatio * 15) + 
      (Math.min(10, recoveryFactor) * 2) +
      (avgHits * 10)
    );

    results.push({
      strategy,
      label: stratInfo?.label || strategy,
      totalTests,
      hitDistribution: hitDist,
      avgHits: Math.round(avgHits * 1000) / 1000,
      bestHit,
      winRate: Math.round(winRate * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      consistency: Math.round(consistency * 1000) / 1000,
      streaks: { bestWin: bestWinStreak, worstLoss: worstLossStreak },
      equityCurve,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      recoveryFactor: Math.round(recoveryFactor * 100) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      globalScore,
    });
  }

  return results.sort((a, b) => b.globalScore - a.globalScore);
}
