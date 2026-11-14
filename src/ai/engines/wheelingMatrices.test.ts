import { describe, expect, it } from 'vitest';
import { applyWheelingMatrix, validateMatrix, isUsableWheelingMatrix, getMatricesForLottery } from './wheelingMatrices';

describe('matrizes exportáveis', () => {
  it('rejeita base longa e duplicada sem fabricar dezenas', () => {
    expect(applyWheelingMatrix('megasena_7_7', [1, 2, 3, 4, 5, 6, 7, 8]).games).toEqual([]);
    expect(applyWheelingMatrix('megasena_7_7', [1, 2, 3, 4, 5, 6, 6]).games).toEqual([]);
  });
  it('bloqueia índices fora da base em planos legados', () => {
    const result = applyWheelingMatrix('lotofacil_6_13', [1, 2, 3, 4, 5, 6]);
    expect(result.games).toEqual([]);
    expect(result.error).toBeTruthy();
  });
  it('oferece apenas matrizes utilizáveis da modalidade ativa', () => {
    expect(isUsableWheelingMatrix('lotofacil_6_13')).toBe(false);
    const matrices = getMatricesForLottery('megasena').filter(m => isUsableWheelingMatrix(m.id));
    expect(matrices.length).toBeGreaterThan(0);
    expect(matrices.every(m => m.lottery === 'megasena')).toBe(true);
  });
  it('gera jogos válidos para matriz comprovada', () => {
    const base = [1, 2, 3, 4, 5, 6, 7];
    const result = applyWheelingMatrix('megasena_7_7', base);
    expect(result.games).toHaveLength(7);
    expect(result.games.every(g => g.length === 6 && g.every(n => base.includes(n)))).toBe(true);
    expect(validateMatrix('megasena_7_7').valid).toBe(true);
  });
});
