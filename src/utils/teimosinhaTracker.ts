/**
 * Titan Loterias - Multi-Draw Teimosinha Cycle Tracker & Break-Even ROI Calculator
 * 
 * Regras oficiais Caixa Econômica Federal para Teimosinha:
 * - Mega-Sena: 2, 4, 8, 12 concursos consecutivos
 * - Lotofácil: 2, 4, 8, 12, 18, 24 concursos consecutivos
 * - Quina: 3, 6, 12, 18, 24 concursos consecutivos
 * - Lotomania: 2, 4, 8 concursos consecutivos
 * - Dupla Sena: 2, 4, 8, 12 concursos consecutivos
 * - Dia de Sorte: 2, 4, 8, 12 concursos consecutivos
 * - +Milionária: 2, 4, 8, 12 concursos consecutivos
 * - Timemania: 2, 4, 8 concursos consecutivos
 */

import { LOTTERY_BET_COST } from "@/engine/betting-budget";
import { calculateNetPrize } from "./caixaTaxCalculator";

export interface TeimosinhaOptions {
  lotteryId: string;
  allowedCycles: number[];
  defaultCycle: number;
}

export const CAIXA_TEIMOSINHA_RULES: Record<string, number[]> = {
  megasena: [2, 4, 8, 12],
  lotofacil: [2, 4, 8, 12, 18, 24],
  quina: [3, 6, 12, 18, 24],
  lotomania: [2, 4, 8],
  duplasena: [2, 4, 8, 12],
  diadesorte: [2, 4, 8, 12],
  maismilionaria: [2, 4, 8, 12],
  timemania: [2, 4, 8],
  supersete: [3, 6, 9, 12, 18, 24],
};

export function getCaixaTeimosinhaOptions(lotteryId: string): number[] {
  return CAIXA_TEIMOSINHA_RULES[lotteryId] || [2, 4, 8, 12];
}

export interface DrawData {
  concurso: number;
  date?: string;
  numbers: number[];
  prizes?: { hits: number; value: number; label: string }[];
}

export interface DrawCycleResult {
  drawIndex: number;
  concurso: number;
  date?: string;
  costThisDraw: number;
  cumulativeCost: number;
  prizeGrossThisDraw: number;
  prizeNetThisDraw: number;
  cumulativePrizeGross: number;
  cumulativePrizeNet: number;
  bestHitsThisDraw: number;
  netProfit: number; // cumulativePrizeNet - cumulativeCost
  isBreakEven: boolean; // netProfit >= 0
  roiPercent: number; // ((cumulativePrizeNet - cumulativeCost) / cumulativeCost) * 100
}

export interface TeimosinhaCycleReport {
  lotteryId: string;
  cycleLength: number;
  totalGames: number;
  costPerDraw: number;
  totalCycleCost: number;
  drawsAnalyzed: number;
  totalPrizeGross: number;
  totalPrizeNet: number;
  netProfit: number;
  overallRoiPercent: number;
  isBreakEvenAchieved: boolean;
  firstBreakEvenDraw: number | null; // Concurso index when break-even occurred
  drawResults: DrawCycleResult[];
}

/**
 * Retorna estimativa oficial ou prêmio real para acertos em uma modalidade
 */
function estimatePrizeForHits(lotteryId: string, hits: number): number {
  if (lotteryId === "megasena") {
    if (hits === 6) return 50000000;
    if (hits === 5) return 45000;
    if (hits === 4) return 950;
  } else if (lotteryId === "lotofacil") {
    if (hits === 15) return 1800000;
    if (hits === 14) return 1600;
    if (hits === 13) return 35;
    if (hits === 12) return 14;
    if (hits === 11) return 7;
  } else if (lotteryId === "quina") {
    if (hits === 5) return 12000000;
    if (hits === 4) return 7500;
    if (hits === 3) return 90;
    if (hits === 2) return 4.5;
  } else if (lotteryId === "lotomania") {
    if (hits === 20) return 5000000;
    if (hits === 19) return 40000;
    if (hits === 18) return 2500;
    if (hits === 17) return 250;
    if (hits === 16) return 40;
    if (hits === 15) return 10;
    if (hits === 0) return 150000;
  }
  return 0;
}

/**
 * Calcula o custo total planejado de um ciclo de Teimosinha
 */
export function calculateTeimosinhaCycleCost(
  lotteryId: string,
  totalBets: number,
  cycles: number
): {
  costPerSingleBet: number;
  costPerDraw: number;
  totalCycleCost: number;
} {
  const costPerSingleBet = LOTTERY_BET_COST[lotteryId] ?? 3.0;
  const costPerDraw = costPerSingleBet * totalBets;
  const totalCycleCost = costPerDraw * cycles;

  return {
    costPerSingleBet,
    costPerDraw,
    totalCycleCost,
  };
}

/**
 * Simula e audita o ciclo da Teimosinha com base em sorteios reais
 */
export function auditTeimosinhaCycle(
  games: number[][],
  draws: DrawData[],
  cycleLength: number,
  lotteryId: string
): TeimosinhaCycleReport {
  const { costPerDraw, totalCycleCost } = calculateTeimosinhaCycleCost(
    lotteryId,
    games.length,
    cycleLength
  );

  const activeDraws = draws.slice(0, cycleLength).reverse(); // Cronológico
  let cumulativeCost = 0;
  let cumulativePrizeGross = 0;
  let cumulativePrizeNet = 0;
  let firstBreakEvenDraw: number | null = null;

  const drawResults: DrawCycleResult[] = activeDraws.map((draw, idx) => {
    cumulativeCost += costPerDraw;

    const drawNumberSet = new Set(draw.numbers);
    let prizeGrossThisDraw = 0;
    let bestHitsThisDraw = 0;

    for (const game of games) {
      const hits = game.filter((n) => drawNumberSet.has(n)).length;
      if (hits > bestHitsThisDraw) bestHitsThisDraw = hits;

      // Prize lookup
      let prizeValue = 0;
      if (draw.prizes && draw.prizes.length > 0) {
        const found = draw.prizes.find((p) => p.hits === hits);
        if (found) prizeValue = found.value;
      }
      if (prizeValue === 0) {
        prizeValue = estimatePrizeForHits(lotteryId, hits);
      }

      prizeGrossThisDraw += prizeValue;
    }

    const { netAmount: prizeNetThisDraw } = calculateNetPrize(prizeGrossThisDraw);
    cumulativePrizeGross += prizeGrossThisDraw;
    cumulativePrizeNet += prizeNetThisDraw;

    const netProfit = cumulativePrizeNet - cumulativeCost;
    const isBreakEven = netProfit >= 0;
    const roiPercent = cumulativeCost > 0 ? (netProfit / cumulativeCost) * 100 : 0;

    if (isBreakEven && firstBreakEvenDraw === null) {
      firstBreakEvenDraw = draw.concurso;
    }

    return {
      drawIndex: idx + 1,
      concurso: draw.concurso,
      date: draw.date,
      costThisDraw: costPerDraw,
      cumulativeCost,
      prizeGrossThisDraw,
      prizeNetThisDraw,
      cumulativePrizeGross,
      cumulativePrizeNet,
      bestHitsThisDraw,
      netProfit,
      isBreakEven,
      roiPercent,
    };
  });

  const overallNetProfit = cumulativePrizeNet - cumulativeCost;
  const overallRoiPercent = cumulativeCost > 0 ? (overallNetProfit / cumulativeCost) * 100 : 0;

  return {
    lotteryId,
    cycleLength,
    totalGames: games.length,
    costPerDraw,
    totalCycleCost,
    drawsAnalyzed: activeDraws.length,
    totalPrizeGross: cumulativePrizeGross,
    totalPrizeNet: cumulativePrizeNet,
    netProfit: overallNetProfit,
    overallRoiPercent,
    isBreakEvenAchieved: overallNetProfit >= 0,
    firstBreakEvenDraw,
    drawResults,
  };
}
