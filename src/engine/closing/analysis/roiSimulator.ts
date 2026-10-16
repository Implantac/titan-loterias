/**
 * roiSimulator — estima ROI de um fechamento contra sorteios oficiais.
 * Usa tabela de prêmios médios (aproximados) por modalidade para faixas fixas
 * e um "hit rate" para faixas variáveis (jackpot). Objetivo: métrica prática,
 * não valor exato (que depende de rateio de cada concurso).
 */

/**
 * Tabela de prêmios médios (R$). Valores conservadores baseados em médias
 * históricas dos últimos anos. Faixas variáveis (top tier) usam estimativa
 * mais baixa quando não há rateio; user deve interpretar como piso.
 */
const AVG_PRIZES: Record<string, Record<number, number>> = {
  lotofacil: { 11: 7, 12: 14, 13: 35, 14: 1800, 15: 1_500_000 },
  megasena: { 4: 1200, 5: 60_000, 6: 40_000_000 },
  quina: { 2: 3.5, 3: 130, 4: 8500, 5: 8_000_000 },
  lotomania: { 15: 6, 16: 20, 17: 100, 18: 1500, 19: 30_000, 20: 3_000_000, 0: 3_000_000 },
  timemania: { 3: 3, 4: 8, 5: 900, 6: 30_000, 7: 12_000_000 },
  duplasena: { 3: 3, 4: 100, 5: 5000, 6: 3_500_000 },
  diadesorte: { 4: 5, 5: 25, 6: 1200, 7: 350_000 },
  supersete: { 3: 5, 4: 40, 5: 800, 6: 8000, 7: 3_500_000 },
  maismilionaria: { 3: 6, 4: 50, 5: 500, 6: 8000 },
};

export interface RoiSimulationInput {
  lotteryId: string;
  ticketPrice: number;
  games: number[][];
  /** Últimos sorteios (do mais recente ao mais antigo). */
  recentDraws: Array<{ concurso: number; numbers: number[]; date?: string }>;
  /** Quantos concursos usar (default 30). */
  window?: number;
}

export interface RoiPerDraw {
  concurso: number;
  date?: string;
  hitsByGame: number[];
  winners: Record<number, number>; // hits -> count
  prizeTotal: number;
}

export interface RoiSimulationResult {
  drawsConsidered: number;
  totalCost: number;         // custo total (games × ticketPrice × sorteios)
  totalPrize: number;
  netResult: number;
  roiPercent: number;        // ((prize - cost) / cost) * 100
  hitRatePercent: number;    // % de sorteios com ao menos 1 jogo premiado
  winningDraws: number;
  bestDraw: RoiPerDraw | null;
  perDraw: RoiPerDraw[];
  breakEvenGames: number | null; // qtos jogos daria ROI ~0 (estimado)
  prizeThreshold: number;
}

function tierThreshold(lotteryId: string): number {
  const t = AVG_PRIZES[lotteryId];
  if (!t) return 4;
  return Math.min(...Object.keys(t).map(Number));
}

export function simulateRoi(input: RoiSimulationInput): RoiSimulationResult {
  const window = input.window ?? 30;
  const draws = input.recentDraws.slice(0, window);
  const table = AVG_PRIZES[input.lotteryId] ?? {};
  const threshold = tierThreshold(input.lotteryId);
  const perDraw: RoiPerDraw[] = [];
  let totalPrize = 0;
  let winningDraws = 0;

  for (const d of draws) {
    const set = new Set(d.numbers);
    const hitsByGame: number[] = [];
    const winners: Record<number, number> = {};
    let prize = 0;
    for (const g of input.games) {
      let h = 0;
      for (const n of g) if (set.has(n)) h++;
      hitsByGame.push(h);
      if (h in table) {
        winners[h] = (winners[h] ?? 0) + 1;
        prize += table[h];
      } else if (input.lotteryId === "lotomania" && h === 0 && 0 in table) {
        winners[0] = (winners[0] ?? 0) + 1;
        prize += table[0];
      }
    }
    perDraw.push({ concurso: d.concurso, date: d.date, hitsByGame, winners, prizeTotal: prize });
    totalPrize += prize;
    if (prize > 0) winningDraws++;
  }

  const totalCost = input.games.length * input.ticketPrice * draws.length;
  const netResult = totalPrize - totalCost;
  const roiPercent = totalCost > 0 ? (netResult / totalCost) * 100 : 0;
  const hitRatePercent = draws.length > 0 ? (winningDraws / draws.length) * 100 : 0;
  const bestDraw = perDraw.reduce<RoiPerDraw | null>(
    (best, d) => (!best || d.prizeTotal > best.prizeTotal ? d : best),
    null,
  );

  // Break-even estimate: qtos jogos manteriam prêmio médio == custo
  const avgPrizePerDraw = draws.length > 0 ? totalPrize / draws.length : 0;
  const breakEvenGames = avgPrizePerDraw > 0 && input.ticketPrice > 0
    ? Math.ceil(avgPrizePerDraw / input.ticketPrice)
    : null;

  return {
    drawsConsidered: draws.length,
    totalCost,
    totalPrize,
    netResult,
    roiPercent,
    hitRatePercent,
    winningDraws,
    bestDraw,
    perDraw,
    breakEvenGames,
    prizeThreshold: threshold,
  };
}

export function getAvgPrizeTable(lotteryId: string): Record<number, number> {
  return AVG_PRIZES[lotteryId] ?? {};
}
