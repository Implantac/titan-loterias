import { describe, expect, it } from 'vitest';
import { validateExportedGames } from './validateExportedGames';

describe('revalidação dos jogos exportados', () => {
  it('converte dezenas reais em índices antes da prova combinatória', () => {
    const base = [10, 20, 30, 40, 50, 60, 70];
    const games = base.map(excluded => base.filter(n => n !== excluded));
    const result = validateExportedGames(games, base, 6, 6, 6);
    expect(result.exhaustive).toBe(true);
    expect(result.testedScenarios).toBe(7);
    expect(result.guaranteedHits).toBe(6);
    expect(result.meetsGoalPercent).toBe(100);
  });
  it('rejeita jogo com dezena externa à base', () => {
    const result = validateExportedGames([[10, 20, 30, 40, 50, 99]], [10, 20, 30, 40, 50, 60], 6, 6, 6);
    expect(result.testedScenarios).toBe(0);
  });
});
