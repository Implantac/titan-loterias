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
/**
 * Máximo de páginas buscadas ao mesmo tempo.
 *
 * A paginação era sequencial: 7.135 concursos da Quina = 8 requests um atrás do
 * outro. No primeiro request já sabemos o total (`count: "exact"`), então dá
 * para disparar o resto em paralelo. O teto de 4 evita estourar o limite de
 * conexões HTTP/1.1 do navegador (6 por origem) junto com o resto da página.
 */
const PAGE_SIZE = 1000;
const PAGE_CONCURRENCY = 4;

async function fetchDrawPage(lotteryId: string, from: number, size: number, withCount = false) {
  const query = supabase
    .from("lottery_draws")
    .select("concurso, draw_date, numbers, prize_tiers", withCount ? { count: "exact" } : undefined)
    .eq("lottery_id", lotteryId)
    .order("concurso", { ascending: false })
    .range(from, from + size - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], count };
}

/** Dispara tarefas mantendo no máximo `concurrency` em voo. Preserva a ordem. */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

export async function fetchDraws(lotteryId: string, limitCount = 2000) {
  const first = await fetchDrawPage(lotteryId, 0, PAGE_SIZE, true);
  let allData: any[] = first.data;
  const totalCount = first.count ?? allData.length;

  // Quantas páginas faltam? Usa o total informado pelo PostgREST quando ele é
  // confiável, e nunca passa do que o chamador pediu.
  const knownTotal = Math.min(totalCount, limitCount);
  if (allData.length < knownTotal) {
    const offsets: number[] = [];
    for (let from = PAGE_SIZE; from < knownTotal; from += PAGE_SIZE) offsets.push(from);

    const pages = await mapWithConcurrency(offsets, PAGE_CONCURRENCY, async (from) => {
      const size = Math.min(PAGE_SIZE, knownTotal - from);
      return fetchDrawPage(lotteryId, from, size);
    });

    for (const page of pages) {
      if (page.data.length === 0) break;
      allData = allData.concat(page.data);
    }
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


