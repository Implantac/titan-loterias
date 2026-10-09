import { NumberStats } from "./statistics";
import { DrawResult, LotteryConfig } from "@/data/lotteries";

export interface FarolStats extends NumberStats {
  // Enhanced "FAROL" metrics
  historicalFreq: number;
  recentFreq10: number;
  recentFreq50: number;
  cycleFreq: number;
  
  currentDelay: number;
  maxDelay: number;
  avgDelay: number;
  
  repeatLast: boolean;
  repeatLast5: number;
  repeatLast10: number;
  
  trendStatus: "hot" | "warm" | "cold";
  titanScore: number;
  titanGrade: "Weak" | "Medium" | "Strong" | "Elite";
  
  correlations: { number: number; percentage: number }[];
}

export interface CycleStats {
  currentCycle: number;
  missingNumbers: number[];
  avgDrawsToClose: number;
  drawsInCurrentCycle: number;
}

/**
 * Titan "FAROL" Engine
 * Implements advanced statistical analysis and the proprietary Titan Score
 */
export function computeFarolStats(
  draws: DrawResult[], 
  config: LotteryConfig,
  baseStats: NumberStats[]
): { farol: FarolStats[]; cycle: CycleStats } {
  const totalNumbers = config.numbers;
  const lastDrawNumbers = new Set(draws[0]?.numbers || []);
  const last5Draws = draws.slice(0, 5);
  const last10Draws = draws.slice(0, 10);
  const last50Draws = draws.slice(0, 50);

  // 1. Calculate Cycles
  let currentCycle = 1;
  let missingInCycle = new Set(Array.from({ length: totalNumbers }, (_, i) => i + 1));
  const drawsToClose: number[] = [];
  const cycleCount = 0;
  let currentCycleDraws = 0;

  // Process draws from oldest to newest to track cycles
  const sortedDraws = [...draws].sort((a, b) => a.concurso - b.concurso);
  for (const draw of sortedDraws) {
    currentCycleDraws++;
    draw.numbers.forEach(n => missingInCycle.delete(n));
    
    if (missingInCycle.size === 0) {
      drawsToClose.push(currentCycleDraws);
      currentCycle++;
      currentCycleDraws = 0;
      missingInCycle = new Set(Array.from({ length: totalNumbers }, (_, i) => i + 1));
    }
  }

  const cycleStats: CycleStats = {
    currentCycle,
    missingNumbers: Array.from(missingInCycle).sort((a, b) => a - b),
    avgDrawsToClose: drawsToClose.length > 0 
      ? drawsToClose.reduce((a, b) => a + b, 0) / drawsToClose.length 
      : 0,
    drawsInCurrentCycle: currentCycleDraws
  };

  // Draws belonging to the currently open (unfinished) cycle — used by cycleFreq
  const currentCycleDrawsList = currentCycleDraws > 0
    ? sortedDraws.slice(-currentCycleDraws)
    : [];

  // 2. Correlation Matrix
  const correlationMap = new Map<number, Map<number, number>>();
  draws.slice(0, 100).forEach(draw => {
    draw.numbers.forEach(n1 => {
      if (!correlationMap.has(n1)) correlationMap.set(n1, new Map());
      const subs = correlationMap.get(n1)!;
      draw.numbers.forEach(n2 => {
        if (n1 === n2) return;
        subs.set(n2, (subs.get(n2) || 0) + 1);
      });
    });
  });

  // 3. Compute Enhanced Stats per Number
  const farolStats: FarolStats[] = baseStats.map(s => {
    const n = s.number;
    
    // Repetitions
    const repeatLast = lastDrawNumbers.has(n);
    const repeatLast5 = last5Draws.filter(d => d.numbers.includes(n)).length;
    const repeatLast10 = last10Draws.filter(d => d.numbers.includes(n)).length;
    
    // Recent frequencies
    const recentFreq10 = last10Draws.filter(d => d.numbers.includes(n)).length;
    const recentFreq50 = last50Draws.filter(d => d.numbers.includes(n)).length;
    
    // Delays
    const currentDelay = s.lastSeen;
    
    // Titan Score Algorithm (Proprietary v5.0)
    // Weights: Frequency(25%), Delay(20%), Trend(20%), Cycle(15%), Correlation(10%), Logistics(10%)
    
    // Guard: with empty/partial history these ratios can be NaN or Infinity.
    const safe = (value: number, fallback = 0) =>
      Number.isFinite(value) ? value : fallback;

    // 1. Freq Score (How often it appears)
    const expectedShare = (config.pick / config.numbers) * 100;
    const freqScore = Math.min(
      100,
      expectedShare > 0 ? safe((s.percentage / expectedShare) * 50) : 0
    );

    // 2. Delay Score (How 'due' it is)
    const delayScore = Math.min(
      100,
      s.avgGap > 0 ? safe((currentDelay / s.avgGap) * 100) : 0
    );

    // 3. Trend Score (Recent momentum)
    const trendScore = Math.min(100, Math.max(0, 50 + safe(s.trend)));
    
    // 4. Cycle Score (Cycle closing pressure)
    const cycleScoreVal = cycleStats.missingNumbers.includes(n) ? 100 : 25;
    
    // 5. Correlation Score (Synergy with others)
    const correlations = Array.from(correlationMap.get(n)?.entries() || [])
      .map(([num, count]) => ({ number: num, percentage: (count / (s.frequency || 1)) * 100 }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10);
    const correlationScore = Math.min(
      100,
      correlations.length > 0 ? safe(correlations[0].percentage, 50) : 50
    );

    // 6. Logistics Score (Dynamic movement patterns)
    // If the number was in the last draw, its logistics score might be lower unless it's a "repeater" trend
    const logisticsScore = repeatLast ? (s.trend > 0 ? 80 : 40) : (currentDelay > s.avgGap ? 90 : 60);

    const titanScore = Math.max(0, Math.min(100, Math.round(
      safe(
        freqScore * 0.25 +
        delayScore * 0.20 +
        trendScore * 0.20 +
        cycleScoreVal * 0.15 +
        correlationScore * 0.10 +
        logisticsScore * 0.10
      )
    )));


    const titanGrade = 
      titanScore >= 90 ? "Elite" :
      titanScore >= 70 ? "Strong" :
      titanScore >= 40 ? "Medium" : "Weak";

    const trendStatus = 
      s.trend > 10 ? "hot" :
      s.trend < -10 ? "cold" : "warm";

    return {
      ...s,
      historicalFreq: s.frequency,
      recentFreq10,
      recentFreq50,
      cycleFreq: currentCycleDrawsList.filter(d => d.numbers.includes(n)).length,
      currentDelay,
      maxDelay: s.maxGap,
      avgDelay: s.avgGap,
      repeatLast,
      repeatLast5,
      repeatLast10,
      trendStatus,
      titanScore,
      titanGrade,
      correlations
    };
  });

  return { farol: farolStats, cycle: cycleStats };
}
