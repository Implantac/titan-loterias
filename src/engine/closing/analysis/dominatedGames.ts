/**
 * dominatedGames — identifica jogos dominados dentro de um fechamento.
 * Um jogo é "dominado" quando sua contribuição de cobertura é subconjunto
 * (ou quase) da união dos demais — removê-lo não reduz a cobertura.
 *
 * Estratégia: para cada jogo, calcula sua contribuição única (M-subsets
 * cobertos SÓ por ele). Se contribuição única <= threshold, é candidato a remoção.
 */

import { combinations } from "@/engine/closing/core/combinatorics";

export interface DominatedGameInput {
  games: number[][];
  minHits: number;              // M
  pick: number;                 // K (dezenas por jogo)
  maxRemove?: number;           // limite superior de remoções (default 50%)
  /** Reduz resolução/cobertura para bases maiores (amostragem). */
  sampleLimit?: number;
}

export interface DominatedGame {
  index: number;
  numbers: number[];
  uniqueCoverage: number;   // qtos M-subsets são cobertos SÓ por este jogo
  totalCoverage: number;    // qtos M-subsets cobre no total
  redundancyPct: number;    // 100 - uniqueCoverage/totalCoverage
  safeToRemove: boolean;
}

export interface DominatedResult {
  analysis: DominatedGame[];
  candidates: DominatedGame[];
  keptGames: number[][];
  savings: number;         // qts jogos removidos
  originalCount: number;
  finalCount: number;
}

function subsetsOf<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  const rec = (start: number, chosen: T[]) => {
    if (chosen.length === size) { out.push([...chosen]); return; }
    for (let i = start; i < arr.length; i++) {
      chosen.push(arr[i]);
      rec(i + 1, chosen);
      chosen.pop();
    }
  };
  rec(0, []);
  return out;
}

function keyOf(subset: number[]): string {
  return subset.join(",");
}

export function findDominatedGames(input: DominatedGameInput): DominatedResult {
  const { games, minHits, pick } = input;
  const maxRemove = input.maxRemove ?? Math.floor(games.length / 2);

  // Mapa: subset (chave) -> lista de índices de jogos que o cobrem
  const coverage = new Map<string, Set<number>>();
  const perGameCovers: string[][] = games.map(() => []);

  // Se M > pick, nada a fazer
  if (minHits > pick) {
    return {
      analysis: [],
      candidates: [],
      keptGames: games,
      savings: 0,
      originalCount: games.length,
      finalCount: games.length,
    };
  }

  // Para cada jogo, gera todos os M-subsets que ele cobre
  games.forEach((g, gi) => {
    const subs = subsetsOf([...g].sort((a, b) => a - b), minHits);
    for (const sub of subs) {
      const k = keyOf(sub);
      let set = coverage.get(k);
      if (!set) { set = new Set(); coverage.set(k, set); }
      set.add(gi);
      perGameCovers[gi].push(k);
    }
  });

  const analysis: DominatedGame[] = games.map((g, gi) => {
    let unique = 0;
    let total = 0;
    for (const k of perGameCovers[gi]) {
      total++;
      const set = coverage.get(k)!;
      if (set.size === 1) unique++;
    }
    const redundancy = total > 0 ? 100 - (unique / total) * 100 : 100;
    return {
      index: gi,
      numbers: g,
      uniqueCoverage: unique,
      totalCoverage: total,
      redundancyPct: Math.round(redundancy),
      safeToRemove: unique === 0,
    };
  });

  // Remoção gulosa: repete enquanto houver jogos com unique==0
  const removed = new Set<number>();
  const localCoverage = new Map<string, Set<number>>();
  for (const [k, v] of coverage) localCoverage.set(k, new Set(v));

  const canRemove = (gi: number): boolean => {
    for (const k of perGameCovers[gi]) {
      const set = localCoverage.get(k)!;
      if (set.size <= 1 && set.has(gi)) return false;
    }
    return true;
  };

  // Ordena por total desc (remove os mais redundantes primeiro)
  const order = analysis
    .filter(a => a.safeToRemove)
    .sort((a, b) => b.totalCoverage - a.totalCoverage)
    .map(a => a.index);

  for (const gi of order) {
    if (removed.size >= maxRemove) break;
    if (!canRemove(gi)) continue;
    removed.add(gi);
    for (const k of perGameCovers[gi]) {
      const set = localCoverage.get(k)!;
      set.delete(gi);
    }
  }

  const keptGames = games.filter((_, gi) => !removed.has(gi));
  const candidates = analysis.filter(a => removed.has(a.index));

  return {
    analysis,
    candidates,
    keptGames,
    savings: removed.size,
    originalCount: games.length,
    finalCount: keptGames.length,
  };
}

// re-exporta binomial para uso opcional (evita warning de import não usado)
export { combinations };
