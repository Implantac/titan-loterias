import { describe, expect, it } from 'vitest';
import { recommendNextDraw } from './nextDrawRecommender';

const input = {
  totalNumbers: 60, pick: 6, ticketPrice: 5,
  recentDraws: [{ concurso: 1, numbers: [1, 2, 3, 4, 5, 6] }],
};

describe('recomendação para próximo concurso', () => {
  it('não produz previsão de cobertura e mantém base válida', () => {
    const result = recommendNextDraw({ ...input, targetBaseSize: 100 });
    expect(result).not.toHaveProperty('expectedCoverage');
    expect(result.baseNumbers).toHaveLength(60);
    expect(new Set(result.baseNumbers).size).toBe(60);
    expect(result.reasoning.join(' ')).not.toMatch(/garantia \d+ acertos|melhorar potencial/i);
  });
  it('ignora dezenas inválidas ou repetidas no histórico', () => {
    const result = recommendNextDraw({ ...input, targetBaseSize: 8,
      recentDraws: [{ concurso: 1, numbers: [0, 61, 999, 1, 1, 2] }] });
    expect(result.baseNumbers).toHaveLength(8);
    expect(result.baseNumbers.every(n => n >= 1 && n <= 60)).toBe(true);
  });
  it('não permite aplicar um plano com orçamento inferior ao preço do jogo', () => {
    expect(recommendNextDraw({ ...input, budget: 2 }).maxGames).toBe(0);
  });
});
