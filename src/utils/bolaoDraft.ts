import { isValidSimpleBolaoNumbers } from "./bolaoGameValidation";

/** A draft must belong to the active lottery and contain only simple valid games. */
export function isRestorableBolaoDraft(
  draft: unknown,
  lotteryId: string,
  pick: number,
  totalNumbers: number,
): draft is { lotteryId: string; games: number[][]; title?: string; participants?: unknown[] } {
  if (!draft || typeof draft !== 'object') return false;
  const value = draft as { lotteryId?: unknown; games?: unknown };
  return value.lotteryId === lotteryId && Array.isArray(value.games) && value.games.length > 0 &&
    value.games.every(game => isValidSimpleBolaoNumbers(game, lotteryId, pick, totalNumbers));
}
