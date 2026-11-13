/**
 * Retrospectiva de jogos fixos contra concursos passados. NÃO é backtest
 * preditivo: jogos escolhidos após os concursos sofrem viés de seleção.
 * Só calcula valores monetários quando o rateio oficial de CADA concurso
 * está disponível. O preço por bilhete é fornecido pelo chamador (cenário,
 * não reconstrução de preços históricos).
 */
import type { DrawPrizeData } from "@/services/api/lottery";

const TIERS: Record<string, Record<number, number>> = {
  megasena: { 6: 1, 5: 2, 4: 3 },
  lotofacil: { 15: 1, 14: 2, 13: 3, 12: 4, 11: 5 },
  quina: { 5: 1, 4: 2, 3: 3, 2: 4 },
};

export interface RoiSimulationInput {
  lotteryId: string;
  ticketPrice: number;
  games: number[][];
  recentDraws: Array<{ concurso: number; numbers: number[]; date?: string; prizeTiers?: DrawPrizeData | null }>;
  window?: number;
}

export interface RoiPerDraw {
  concurso: number;
  date?: string;
  hitsByGame: number[];
  winners: Record<number, number>;
  prizeTotal: number;
}

export interface RoiSimulationResult {
  drawsConsidered: number;
  totalCost: number;
  totalPrize: number;
  netResult: number;
  roiPercent: number;
  hitRatePercent: number;
  winningDraws: number;
  bestDraw: RoiPerDraw | null;
  perDraw: RoiPerDraw[];
  breakEvenGames: number | null;
  prizeThreshold: number;
}

/** null = insuficiência de dados ou modalidade não suportada; nunca inventa prêmio. */
export function simulateRoi(input: RoiSimulationInput): RoiSimulationResult | null {
  const tiers = TIERS[input.lotteryId];
  const draws = input.recentDraws.slice(0, input.window ?? 30);
  if (!tiers || draws.length === 0 || input.games.length === 0 ||
      !Number.isFinite(input.ticketPrice) || input.ticketPrice <= 0 ||
      draws.some(d => !d.prizeTiers?.premiacoes?.length ||
        Object.values(tiers).some(faixa => !d.prizeTiers!.premiacoes.some(p =>
          p.faixa === faixa && Number.isFinite(p.valorPremio) && p.valorPremio >= 0)))) return null;

  const perDraw: RoiPerDraw[] = [];
  let totalPrize = 0;
  let winningDraws = 0;

  for (const d of draws) {
    const drawn = new Set(d.numbers);
    const hitsByGame: number[] = [];
    const winners: Record<number, number> = {};
    const payout = new Map(d.prizeTiers!.premiacoes.map(p => [p.faixa, p.valorPremio]));
    let prize = 0;
    for (const game of input.games) {
      const hits = game.filter(n => drawn.has(n)).length;
      hitsByGame.push(hits);
      const faixa = tiers[hits];
      if (faixa !== undefined) {
        winners[hits] = (winners[hits] ?? 0) + 1;
        prize += payout.get(faixa) ?? 0;
      }
    }
    perDraw.push({ concurso: d.concurso, date: d.date, hitsByGame, winners, prizeTotal: prize });
    totalPrize += prize;
    if (prize > 0) winningDraws++;
  }

  const totalCost = input.games.length * input.ticketPrice * draws.length;
  const netResult = totalPrize - totalCost;
  const bestDraw = perDraw.reduce<RoiPerDraw | null>(
    (best, d) => (!best || d.prizeTotal > best.prizeTotal ? d : best), null,
  );
  return {
    drawsConsidered: draws.length, totalCost, totalPrize, netResult,
    roiPercent: (netResult / totalCost) * 100,
    hitRatePercent: (winningDraws / draws.length) * 100,
    winningDraws, bestDraw, perDraw,
    breakEvenGames: null, // não inferível dos pagamentos de uma matriz fixa
    prizeThreshold: Math.min(...Object.keys(tiers).map(Number)),
  };
}
