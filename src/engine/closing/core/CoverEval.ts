/**
 * CoverEval — helpers para avaliar/manter cobertura em soluções (arrays de jogos).
 * Todos os jogos são arrays de índices em [0..baseSize-1] com |g| = pick.
 */

import { gameMSubsets } from "./CoverageCalculator";
import { binomial, combinations, sampleCombinations } from "./combinatorics";

const MAX_UNIVERSE = 200_000;

export interface CoverContext {
  baseSize: number;
  pick: number;
  m: number;
  universe: Set<string>;
  universeSize: number;
  exhaustive: boolean;
}

export function makeContext(baseSize: number, pick: number, m: number): CoverContext {
  const total = binomial(baseSize, m);
  const exhaustive = total <= MAX_UNIVERSE;
  const arr = exhaustive
    ? combinations(baseSize, m)
    : sampleCombinations(baseSize, m, MAX_UNIVERSE);
  return {
    baseSize, pick, m,
    universe: new Set(arr.map(c => c.join(","))),
    universeSize: arr.length,
    exhaustive,
  };
}

/** Retorna quantos M-subsets do universo estão cobertos por `games`. */
export function coveredCount(games: number[][], ctx: CoverContext): number {
  const covered = new Set<string>();
  for (const g of games) {
    for (const s of gameMSubsets(g, ctx.m)) {
      if (ctx.universe.has(s)) covered.add(s);
    }
  }
  return covered.size;
}

/** Cobertura em %. */
export function coveragePct(games: number[][], ctx: CoverContext): number {
  if (ctx.universeSize === 0) return 0;
  return (coveredCount(games, ctx) / ctx.universeSize) * 100;
}

/**
 * Fitness: prioriza cobertura, depois minimiza jogos.
 * 0..100 (100 = cobertura total com o menor número de jogos).
 */
export function fitness(
  games: number[][],
  ctx: CoverContext,
  targetGames: number,
): number {
  const cov = coveragePct(games, ctx);
  if (cov < 100) return cov * 0.9; // não coberto = teto 90
  // 100% coberto: bônus por poucos jogos
  const eff = targetGames > 0 ? Math.min(1, targetGames / Math.max(1, games.length)) : 1;
  return 90 + eff * 10;
}

/** Remove jogos redundantes (cuja remoção não afeta cobertura). */
export function pruneRedundant(games: number[][], ctx: CoverContext): number[][] {
  const result = games.slice();
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = result.length - 1; i >= 0; i--) {
      const without = result.filter((_, j) => j !== i);
      if (coveredCount(without, ctx) === coveredCount(result, ctx)) {
        result.splice(i, 1);
        changed = true;
      }
    }
  }
  return result;
}

/** Gera um jogo aleatório com `pick` índices distintos em [0..baseSize-1]. */
export function randomGame(baseSize: number, pick: number, rng: () => number = Math.random): number[] {
  const pool = Array.from({ length: baseSize }, (_, i) => i);
  const out: number[] = [];
  for (let i = 0; i < pick; i++) {
    const j = Math.floor(rng() * pool.length);
    out.push(pool[j]);
    pool.splice(j, 1);
  }
  return out.sort((a, b) => a - b);
}
