/**
 * ValidationEngine — valida matematicamente um fechamento.
 *
 * Rodamos os cenários possíveis (ou amostrados) de sorteios dentro da base
 * e medimos o pior caso de acertos.
 */

import { binomial, combinations, sampleCombinations } from "../core/combinatorics";
import type { ClosingValidation } from "../core/types";

const MAX_SCENARIOS = 20_000;

export function validateClosing(
  games: number[][],
  baseSize: number,
  hitsInBase: number,
  targetMinHits: number,
  seed?: number,
): ClosingValidation {
  if (games.length === 0 || !Number.isInteger(baseSize) || baseSize <= 0 ||
      !Number.isInteger(hitsInBase) || hitsInBase < 0 || hitsInBase > baseSize ||
      !Number.isInteger(targetMinHits) || targetMinHits < 0 ||
      games.some(game => game.length === 0 || new Set(game).size !== game.length ||
        game.some(index => !Number.isInteger(index) || index < 0 || index >= baseSize))) {
    return {
      guaranteedHits: 0, targetMinHits, meetsGuarantee: false,
      coveragePercent: 0, redundancyPercent: 0, wastedCoveragePercent: 0,
      efficiencyPercent: 0, exhaustive: true, testedScenarios: 0, distribution: {},
    };
  }

  const totalScenarios = binomial(baseSize, hitsInBase);
  const exhaustive = totalScenarios <= MAX_SCENARIOS;
  const scenarios = exhaustive
    ? combinations(baseSize, hitsInBase)
    : sampleCombinations(baseSize, hitsInBase, MAX_SCENARIOS, seed);

  const pick = games[0].length;
  const gameSets = games.map(g => new Set(g));

  let guaranteed = Infinity;
  let meets = 0;
  const distribution: Record<number, number> = {};

  for (const drawn of scenarios) {
    const D = new Set(drawn);
    let bestHits = 0;
    for (const gs of gameSets) {
      let h = 0;
      for (const n of D) if (gs.has(n)) h++;
      if (h > bestHits) bestHits = h;
    }
    if (bestHits < guaranteed) guaranteed = bestHits;
    if (bestHits >= targetMinHits) meets++;
    distribution[bestHits] = (distribution[bestHits] || 0) + 1;
  }

  const coveragePercent = scenarios.length > 0 ? (meets / scenarios.length) * 100 : 0;

  // Redundância = média de "cobertura extra" por cenário / máximo possível.
  let extraSum = 0;
  for (const [hits, count] of Object.entries(distribution)) {
    const excess = Math.max(0, Number(hits) - targetMinHits);
    extraSum += excess * count;
  }
  const maxPossibleExcess = scenarios.length * (pick - targetMinHits);
  const redundancyPercent = maxPossibleExcess > 0
    ? (extraSum / maxPossibleExcess) * 100
    : 0;

  const wastedCoveragePercent = 100 - coveragePercent;

  // Eficiência: relação cobertura/jogos, normalizada.
  const efficiencyPercent = games.length > 0
    ? Math.min(100, (coveragePercent * 100) / (games.length * 2))
    : 0;

  return {
    guaranteedHits: guaranteed === Infinity ? 0 : guaranteed,
    targetMinHits,
    meetsGuarantee: exhaustive && scenarios.length > 0 && guaranteed >= targetMinHits,
    coveragePercent,
    redundancyPercent,
    wastedCoveragePercent,
    efficiencyPercent,
    exhaustive,
    testedScenarios: scenarios.length,
    distribution,
  };
}
