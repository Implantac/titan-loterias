import { describe, expect, it } from 'vitest';
import { isRestorableBolaoDraft } from './bolaoDraft';

describe('rascunho de bolão por modalidade', () => {
  const valid = { lotteryId: 'megasena', games: [[1, 2, 3, 4, 5, 6]] };
  it('aceita somente jogos válidos da modalidade ativa', () => {
    expect(isRestorableBolaoDraft(valid, 'megasena', 6, 60)).toBe(true);
    expect(isRestorableBolaoDraft(valid, 'lotofacil', 15, 25)).toBe(false);
  });
  it('rejeita rascunhos vazios, duplicados e fora da faixa', () => {
    expect(isRestorableBolaoDraft({ ...valid, games: [] }, 'megasena', 6, 60)).toBe(false);
    expect(isRestorableBolaoDraft({ ...valid, games: [[1, 2, 3, 4, 5, 5]] }, 'megasena', 6, 60)).toBe(false);
    expect(isRestorableBolaoDraft({ ...valid, games: [[1, 2, 3, 4, 5, 61]] }, 'megasena', 6, 60)).toBe(false);
  });
});
