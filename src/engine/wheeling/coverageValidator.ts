import { makeRng } from "../rng";

/**
 * Coverage Validator — valida matematicamente a garantia de um desdobramento.
 *
 * Dado um conjunto de jogos-índice (referenciando N dezenas-base) e uma
 * hipótese "acerto K dentro da base", calcula a **garantia real**:
 * o menor número de acertos que o desdobramento sempre entrega quando K
 * dos números-base saem sorteados.
 *
 * Uso: alimenta o painel de desdobramentos com número honesto em vez
 * de placeholders aleatórios.
 */

/** Gera todas combinações C(n, k) como arrays de índices ordenados. */
export function combinations(n: number, k: number): number[][] {
  if (k < 0 || k > n) return [];
  const result: number[][] = [];
  const combo = new Array<number>(k);
  function recurse(start: number, depth: number) {
    if (depth === k) { result.push(combo.slice()); return; }
    const maxStart = n - (k - depth);
    for (let i = start; i <= maxStart; i++) {
      combo[depth] = i;
      recurse(i + 1, depth + 1);
    }
  }
  recurse(0, 0);
  return result;
}

/** Escolhe até `sampleSize` cenários distintos, com seed opcional; padrão
 * derivado de (n,k,sampleSize). Amostragem não prova cobertura. */
export function sampleCombinations(n: number, k: number, sampleSize: number, seed = (Math.imul(n, 73856093) ^ Math.imul(k, 19349663) ^ Math.imul(sampleSize, 83492791)) >>> 0): number[][] {
  const total = binomial(n, k);
  if (total <= sampleSize) return combinations(n, k);
  const rng = makeRng(seed);
  const seen = new Set<string>();
  const result: number[][] = [];
  let guard = 0;
  while (result.length < sampleSize && guard < sampleSize * 8) {
    guard++;
    const combo: number[] = [];
    const pool = Array.from({ length: n }, (_, i) => i);
    for (let i = 0; i < k; i++) {
      const j = Math.floor(rng() * pool.length);
      combo.push(pool[j]);
      pool.splice(j, 1);
    }
    combo.sort((a, b) => a - b);
    const key = combo.join(",");
    if (!seen.has(key)) { seen.add(key); result.push(combo); }
  }
  return result;
}

export function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  let num = 1;
  for (let i = 0; i < k; i++) num = (num * (n - i)) / (i + 1);
  return Math.round(num);
}

export interface WheelValidationResult {
  /** Menor acerto observado; somente é garantia quando exhaustive=true. */
  guaranteedHits: number;
  /** Distribuição empírica: chave = acertos máximos no melhor jogo, valor = quantos sorteios testados. */
  distribution: Record<number, number>;
  /** % de sorteios em que ao menos um jogo bateu a meta pedida. */
  meetsGoalPercent: number;
  /** Se foi exaustivo (true) ou amostrado (false). */
  exhaustive: boolean;
  testedScenarios: number;
}

/**
 * Valida a garantia de um desdobramento.
 * @param games            Lista de jogos como índices [0..baseSize-1].
 * @param baseSize         Quantidade de dezenas-base.
 * @param pick             Dezenas por jogo (deve bater com games[i].length).
 * @param hitsInBase       Quantos dos números sorteados caem na base (K).
 * @param targetGuarantee  Meta de acertos para reportar meetsGoalPercent (default = pick-1).
 * @param maxScenarios     Corta para amostragem se C(baseSize, hitsInBase) exceder.
 */
export function validateWheelCoverage(
  games: number[][],
  baseSize: number,
  pick: number,
  hitsInBase: number,
  targetGuarantee?: number,
  maxScenarios = 5000,
  seed?: number,
): WheelValidationResult {
  if (!Number.isInteger(baseSize) || baseSize <= 0 ||
      !Number.isInteger(pick) || pick <= 0 || pick > baseSize ||
      !Number.isInteger(hitsInBase) || hitsInBase < 0 || hitsInBase > baseSize ||
      !Number.isInteger(maxScenarios) || maxScenarios < 1 ||
      games.length === 0 || games.some(game => game.length !== pick ||
        new Set(game).size !== pick ||
        game.some(index => !Number.isInteger(index) || index < 0 || index >= baseSize))) {
    return { guaranteedHits: 0, distribution: {}, meetsGoalPercent: 0, exhaustive: false, testedScenarios: 0 };
  }

  const scenarios = binomial(baseSize, hitsInBase) <= maxScenarios
    ? combinations(baseSize, hitsInBase)
    : sampleCombinations(baseSize, hitsInBase, maxScenarios, seed);

  const exhaustive = binomial(baseSize, hitsInBase) <= maxScenarios;
  const goal = targetGuarantee ?? Math.max(1, pick - 1);

  let guaranteed = Infinity;
  let meetsGoal = 0;
  const distribution: Record<number, number> = {};
  const gameSets = games.map(g => new Set(g));

  for (const drawn of scenarios) {
    const drawnSet = new Set(drawn);
    let bestHitsInAnyGame = 0;
    for (const gs of gameSets) {
      let h = 0;
      for (const n of drawnSet) if (gs.has(n)) h++;
      if (h > bestHitsInAnyGame) bestHitsInAnyGame = h;
    }
    if (bestHitsInAnyGame < guaranteed) guaranteed = bestHitsInAnyGame;
    if (bestHitsInAnyGame >= goal) meetsGoal++;
    distribution[bestHitsInAnyGame] = (distribution[bestHitsInAnyGame] || 0) + 1;
  }

  return {
    guaranteedHits: guaranteed === Infinity ? 0 : guaranteed,
    distribution,
    meetsGoalPercent: scenarios.length > 0 ? (meetsGoal / scenarios.length) * 100 : 0,
    exhaustive,
    testedScenarios: scenarios.length,
  };
}

// ─── Matrizes matemáticas prontas (garantia real, não estimada) ───

/** Mega-Sena — 8 dezenas base → C(8,6)=28 jogos, garante 6 acertos se 6 sairem na base. */
export function megaSena8_28(): number[][] {
  return combinations(8, 6);
}

/** Mega-Sena — 7 dezenas base → C(7,6)=7 jogos, garante 6 se todos 6 estiverem na base. */
export function megaSena7_7(): number[][] {
  return combinations(7, 6);
}

/** Quina — 6 dezenas base → C(6,5)=6 jogos, garante 5 se todos 5 estiverem na base. */
export function quina6_6(): number[][] {
  return combinations(6, 5);
}

/** Quina — 7 dezenas base → C(7,5)=21 jogos, garante 5 se todos 5 estiverem na base. */
export function quina7_21(): number[][] {
  return combinations(7, 5);
}

/** Lotofácil — 16 dezenas base → C(16,15)=16 jogos, garante 14 se acertar 15 na base. */
export function lotofacil16_16(): number[][] {
  return combinations(16, 15);
}
