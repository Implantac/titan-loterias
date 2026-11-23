import type { LotteryConfig } from "@/data/lotteries";

/** Apenas modalidades com jogo formado por dezenas distintas sem posições. */
const SIMPLE_NUMBER_LOTTERIES = new Set([
  "megasena", "lotofacil", "quina", "lotomania", "duplasena",
]);

export function isValidSimpleBolaoNumbers(game: unknown, lotteryId: string, pick: number, totalNumbers: number): game is number[] {
  return SIMPLE_NUMBER_LOTTERIES.has(lotteryId) && Array.isArray(game) &&
    game.length === pick && new Set(game).size === pick &&
    game.every(n => Number.isInteger(n) && (lotteryId === "lotomania"
      ? n >= 0 && n <= 99 : n >= 1 && n <= totalNumbers));
}

export function isValidSimpleBolaoGame(game: unknown, lottery: LotteryConfig): game is number[] {
  return isValidSimpleBolaoNumbers(game, lottery.id, lottery.pick, lottery.numbers);
}

/** Legacy generators enumerate 1..100; Lotomania volante is 00..99. */
export function normalizeGeneratedSimpleBolaoGame(game: number[], lottery: LotteryConfig): number[] {
  return lottery.id === "lotomania" ? game.map(n => n === 100 ? 0 : n) : game;
}
