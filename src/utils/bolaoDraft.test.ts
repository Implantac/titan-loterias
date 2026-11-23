import { describe, expect, it } from 'vitest';
import { isRestorableBolaoDraft } from './bolaoDraft';

describe('rascunho de bolão por modalidade', () => {
  const valid = { lotteryId: 'megasena', games: [[1, 2, 3, 4, 5, 6]] };
  it('aceita somente jogos válidos da modalidade ativa', () => {
    expect(isRestorableBolaoDraft(valid, 'megasena', 6, 60)).toBe(true);
    expect(isRestorableBolaoDraft(valid, 'lotofacil', 15, 25)).toBe(false);
    expect(isRestorableBolaoDraft(valid, 'duplasena', 6, 50)).toBe(false);
  });
  it('restaura 00 na Lotomania, não 100 nem rascunhos de modalidade especial', () => {
    const draft = { lotteryId: 'lotomania', games: [Array.from({ length: 50 }, (_, i) => i)] };
    expect(isRestorableBolaoDraft(draft, 'lotomania', 50, 100)).toBe(true);
    expect(isRestorableBolaoDraft({ ...draft, games: [[...draft.games[0].slice(0, 49), 100]] }, 'lotomania', 50, 100)).toBe(false);
    expect(isRestorableBolaoDraft({ lotteryId: 'supersete', games: [[0, 1, 2, 3, 4, 5, 6]] }, 'supersete', 7, 10)).toBe(false);
  });
  it('rejeita rascunhos vazios, duplicados e fora da faixa', () => {
    expect(isRestorableBolaoDraft({ ...valid, games: [] }, 'megasena', 6, 60)).toBe(false);
    expect(isRestorableBolaoDraft({ ...valid, games: [[1, 2, 3, 4, 5, 5]] }, 'megasena', 6, 60)).toBe(false);
    expect(isRestorableBolaoDraft({ ...valid, games: [[1, 2, 3, 4, 5, 61]] }, 'megasena', 6, 60)).toBe(false);
  });
});
