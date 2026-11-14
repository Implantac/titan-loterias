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
  const pick = input.lotteryId === "lotofacil" ? 15 : input.lotteryId === "quina" ? 5 : 6;
  const universe = input.lotteryId === "lotofacil" ? 25 : input.lotteryId === "quina" ? 80 : 60;
  if (!tiers || draws.length === 0 || input.games.length === 0 ||
      !Number.isFinite(input.ticketPrice) || input.ticketPrice <= 0 ||
      // Somente jogos simples; apostas múltiplas têm custo e pagamento diferentes.
      input.games.some(g => g.length !== pick || new Set(g).size !== pick ||
        g.some(n => !Number.isInteger(n) || n < 1 || n > universe)) ||
      draws.some(d => d.numbers.length !== pick || new Set(d.numbers).size !== pick ||
        d.numbers.some(n => !Number.isInteger(n) || n < 1 || n > universe)) ||
      draws.some(d => !d.prizeTiers?.premiacoes?.length ||
        Object.values(tiers).some(faixa => !d.prizeTiers!.premiacoes.some(p =>
          p.faixa === faixa && Number.isFinite(p.valorPremio) && p.valorPremio >= 0 &&
          Number.isInteger(p.ganhadores) && p.ganhadores >= 0)))) return null;

  const perDraw: RoiPerDraw[] = [];
  let totalPrize = 0;
  let winningDraws = 0;

  for (const d of draws) {
    const drawn = new Set(d.numbers);
    const hitsByGame: number[] = [];
    const winners: Record<number, number> = {};
    const payout = new Map(d.prizeTiers!.premiacoes.map(p => [p.faixa, p]));
    let prize = 0;
    for (const game of input.games) {
      const hits = game.filter(n => drawn.has(n)).length;
      hitsByGame.push(hits);
      const faixa = tiers[hits];
      if (faixa !== undefined) {
        winners[hits] = (winners[hits] ?? 0) + 1;
        const tier = payout.get(faixa);
        // Se não houve ganhadores, o valor publicado é zero/acumulado; um
        // bilhete hipotético vencedor alteraria o resultado do concurso.
        if (!tier || tier.ganhadores === 0) return null;
        prize += tier.valorPremio;
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
