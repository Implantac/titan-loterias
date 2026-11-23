import type { LotteryConfig } from "@/data/lotteries";

/** Apenas modalidades com jogo formado por dezenas distintas sem posições. */
const SIMPLE_NUMBER_LOTTERIES = new Set([
  "megasena", "lotofacil", "quina", "lotomania", "duplasena",
]);

export function isValidSimpleBolaoGame(game: unknown, lottery: LotteryConfig): game is number[] {
  return SIMPLE_NUMBER_LOTTERIES.has(lottery.id) && Array.isArray(game) &&
    game.length === lottery.pick && new Set(game).size === lottery.pick &&
    game.every(n => Number.isInteger(n) && (lottery.id === "lotomania"
      ? n >= 0 && n <= 99 : n >= 1 && n <= lottery.numbers));
}

/** Legacy generators enumerate 1..100; Lotomania volante is 00..99. */
export function normalizeGeneratedSimpleBolaoGame(game: number[], lottery: LotteryConfig): number[] {
  return lottery.id === "lotomania" ? game.map(n => n === 100 ? 0 : n) : game;
}
