import { describe, expect, it } from 'vitest';
import { planLotteryBudget } from './budget-plan';
import { LOTTERY_BET_COST } from './betting-budget';

describe('planejamento de orçamento', () => {
  it('usa preço da modalidade e limita jogos ao teto mensal', () => {
    const price = LOTTERY_BET_COST.megasena;
    const plan = planLotteryBudget('megasena', price * 7, 3);
    expect(plan?.maxSimpleGames).toBe(7);
    expect(plan?.totalBudget).toBe(price * 21);
    expect(plan?.matrix?.games).toBeLessThanOrEqual(7);
    expect(plan).not.toHaveProperty('estimatedReturn');
  });
  it('não recomenda matriz inválida ou de modalidade diferente', () => {
    const plan = planLotteryBudget('lotofacil', 1000, 2);
    expect(plan?.matrix?.id).not.toBe('lotofacil_6_13');
    expect(plan?.matrix?.id).not.toMatch(/^megasena/);
  });
  it('rejeita valores impossíveis e modalidade sem preço', () => {
    expect(planLotteryBudget('indefinida', 100, 2)).toBeNull();
    expect(planLotteryBudget('megasena', -1, 2)).toBeNull();
    expect(planLotteryBudget('megasena', 100, 0)).toBeNull();
  });
});
