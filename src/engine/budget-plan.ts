import { LOTTERY_BET_COST } from './betting-budget';
import { getMatricesForLottery, isUsableWheelingMatrix, validateMatrix } from '@/ai/engines/wheelingMatrices';

/** Planejamento de custo, não previsão de resultado ou lucro. */
export function planLotteryBudget(lotteryId: string, monthlyBudget: number, months: number) {
  const price = LOTTERY_BET_COST[lotteryId];
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(monthlyBudget) || monthlyBudget < 0 ||
      !Number.isInteger(months) || months < 1) return null;
  const maxSimpleGames = Math.floor(monthlyBudget / price);
  const matrices = getMatricesForLottery(lotteryId)
    .filter(m => isUsableWheelingMatrix(m.id) && m.games.length <= maxSimpleGames)
    .map(m => ({ ...m, validation: validateMatrix(m.id) }))
    .sort((a, b) => a.games.length - b.games.length);
  const matrix = matrices[0] ?? null;
  return {
    price, maxSimpleGames, monthlyBudget, months,
    totalBudget: monthlyBudget * months,
    matrix: matrix ? { id: matrix.id, name: matrix.name, games: matrix.games.length,
      cost: matrix.games.length * price, target: matrix.guarantee,
      proven: matrix.validation.valid } : null,
  };
}
