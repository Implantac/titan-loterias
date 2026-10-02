import { supabase } from "@/integrations/supabase/client";
import { DrawResult } from "@/data/lotteries";

export interface PrizeTierInfo {
  descricao: string;
  faixa: number;
  ganhadores: number;
  valorPremio: number;
}

export interface DrawPrizeData {
  premiacoes: PrizeTierInfo[];
  acumulou: boolean;
  valorAcumulado: number;
  valorEstimado: number;
  valorArrecadado: number;
}

export interface LatestDrawResult extends DrawResult {
  prizeTiers?: DrawPrizeData | null;
}

export interface DrawResultWithPrizes extends DrawResult {

  prize_tiers?: DrawPrizeData | null;
  prizeTiers?: DrawPrizeData | null;
}

export interface MatchResult {
  concurso: number;
  date: string;
  drawnNumbers: number[];
  matchedNumbers: number[];
  matchCount: number;
}

/**
 * Lottery API Service
 * Centralizes all communication with Supabase and external lottery APIs.
 */
export async function fetchDraws(lotteryId: string, limitCount = 2000) {
  let allData: any[] = [];
  let from = 0;
  const pageSize = 1000;
  let totalCount = 0;

  const { data, error, count } = await supabase
    .from("lottery_draws")
    .select("concurso, draw_date, numbers, prize_tiers", { count: "exact" })
    .eq("lottery_id", lotteryId)
    .order("concurso", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) throw error;
  if (count !== null) totalCount = count;
  if (data) allData = data;

  while (allData.length < limitCount && data && data.length === pageSize) {
    from += pageSize;
    const nextSize = Math.min(pageSize, limitCount - allData.length);
    const { data: nextData, error: nextError } = await supabase
      .from("lottery_draws")
      .select("concurso, draw_date, numbers, prize_tiers")
      .eq("lottery_id", lotteryId)
      .order("concurso", { ascending: false })
      .range(from, from + nextSize - 1);

    if (nextError) throw nextError;
    if (!nextData || nextData.length === 0) break;
    allData = allData.concat(nextData);
    if (nextData.length < nextSize) break;
  }

  return {
    draws: allData.map(row => ({
      concurso: row.concurso,
      date: row.draw_date || "",
      numbers: row.numbers || [],
    })) as DrawResult[],
    drawsWithPrizes: allData.map(row => ({
      concurso: row.concurso,
      date: row.draw_date || "",
      numbers: row.numbers || [],
      prizeTiers: row.prize_tiers as DrawPrizeData | null,
    })) as DrawResultWithPrizes[],
    totalCount: totalCount || allData.length
  };
}

export async function syncLottery(lotteryId?: string, fullSync = false) {
  const { data, error } = await supabase.functions.invoke("sync-lottery-draws", {
    body: { 
      ...(lotteryId ? { lottery_id: lotteryId } : {}),
      full_sync: fullSync
    },
  });
  if (error) throw error;
  return data;
}

/** Busca na fonte oficial apenas os concursos que faltam no banco. */
export async function fillLotteryGaps(lotteryId: string): Promise<{ inserted: number; errors: number; missing: number }> {
  const { data, error } = await supabase.functions.invoke("sync-lottery-draws", {
    body: { lottery_id: lotteryId, fill_gaps: true },
  });
  if (error) throw error;
  const r = data?.results?.[0] ?? {};
  return { inserted: r.inserted ?? 0, errors: r.errors ?? 0, missing: r.missing ?? 0 };
}

export function checkBetAgainstDraws(bet: number[], draws: DrawResult[]): MatchResult[] {
  return draws.map(draw => {
    const matched = bet.filter(n => draw.numbers.includes(n));
    return {
      concurso: draw.concurso,
      date: draw.date,
      drawnNumbers: draw.numbers,
      matchedNumbers: matched,
      matchCount: matched.length,
    };
  }).filter(r => r.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount);
}

export function getPrizeTiers(lotteryId: string): { hits: number; label: string; estimatedPrize?: string }[] {
  switch (lotteryId) {
    case "megasena":
      return [
        { hits: 6, label: "Sena (6 acertos)", estimatedPrize: "Variável" },
        { hits: 5, label: "Quina (5 acertos)", estimatedPrize: "Variável" },
        { hits: 4, label: "Quadra (4 acertos)", estimatedPrize: "Variável" },
      ];
    case "lotofacil":
      return [
        { hits: 15, label: "15 acertos", estimatedPrize: "Variável" },
        { hits: 14, label: "14 acertos", estimatedPrize: "Variável" },
        { hits: 13, label: "13 acertos", estimatedPrize: "R$ 35,00" },
        { hits: 12, label: "12 acertos", estimatedPrize: "R$ 14,00" },
        { hits: 11, label: "11 acertos", estimatedPrize: "R$ 7,00" },
      ];
    case "maismilionaria":
      return [
        { hits: 6, label: "6 acertos + 2 trevos", estimatedPrize: "Variável" },
        { hits: 6, label: "6 acertos + 1 ou 0 trevo", estimatedPrize: "Variável" },
        { hits: 5, label: "5 acertos + 2 trevos", estimatedPrize: "Variável" },
        { hits: 5, label: "5 acertos + 1 ou 0 trevo", estimatedPrize: "Variável" },
      ];
    case "federal":
      return [
        { hits: 1, label: "1º Prêmio", estimatedPrize: "Variável" },
        { hits: 1, label: "2º Prêmio", estimatedPrize: "Variável" },
        { hits: 1, label: "3º Prêmio", estimatedPrize: "Variável" },
        { hits: 1, label: "4º Prêmio", estimatedPrize: "Variável" },
        { hits: 1, label: "5º Prêmio", estimatedPrize: "Variável" },
      ];
    case "loteca":
      return [
        { hits: 14, label: "14 acertos", estimatedPrize: "Variável" },
        { hits: 13, label: "13 acertos", estimatedPrize: "Variável" },
      ];
    default:
      return [
        { hits: 6, label: "Faixa 1", estimatedPrize: "Variável" },
        { hits: 5, label: "Faixa 2", estimatedPrize: "Variável" },
        { hits: 4, label: "Faixa 3", estimatedPrize: "Variável" },
      ];
  }
}

export async function fetchLatestDraw(lotteryId: string): Promise<LatestDrawResult | null> {
  const { drawsWithPrizes } = await fetchDraws(lotteryId, 1);
  return drawsWithPrizes.length > 0 ? drawsWithPrizes[0] : null;
}

export const LotteryApi = {
  fetchDraws,
  syncLottery,
  checkBetAgainstDraws,
  getPrizeTiers,
  fetchLatestDraw
};


