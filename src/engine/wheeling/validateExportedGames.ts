import { validateWheelCoverage, type WheelValidationResult } from './coverageValidator';

/** Revalida exatamente os jogos exportados, convertendo dezenas reais em índices da base. */
export function validateExportedGames(
  games: number[][],
  baseNumbers: number[],
  pick: number,
  hitsInBase: number,
  minHits: number,
): WheelValidationResult {
  if (new Set(baseNumbers).size !== baseNumbers.length ||
      baseNumbers.some(n => !Number.isInteger(n)) ||
      games.some(game => game.some(n => !baseNumbers.includes(n)))) {
    return { guaranteedHits: 0, distribution: {}, meetsGoalPercent: 0, exhaustive: false, testedScenarios: 0 };
  }
  const positions = new Map(baseNumbers.map((n, i) => [n, i]));
  const indexed = games.map(game => game.map(n => positions.get(n)!));
  return validateWheelCoverage(indexed, baseNumbers.length, pick, hitsInBase, minHits);
}
