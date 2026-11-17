import type { LotteryConfig } from "@/data/lotteries";

/** Apenas modalidades com jogo formado por dezenas distintas sem posições. */
const SIMPLE_NUMBER_LOTTERIES = new Set([
  "megasena", "lotofacil", "quina", "lotomania", "duplasena", "timemania", "diadesorte", "maismilionaria",
]);

export function isValidSimpleBolaoGame(game: unknown, lottery: LotteryConfig): game is number[] {
  return SIMPLE_NUMBER_LOTTERIES.has(lottery.id) && Array.isArray(game) &&
    game.length === lottery.pick && new Set(game).size === lottery.pick &&
    game.every(n => Number.isInteger(n) && n >= 1 && n <= lottery.numbers);
}
