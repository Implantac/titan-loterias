import { makeRng } from "../../rng";

/**
 * MonteCarloEngine — simula milhões de sorteios aleatórios uniformes e mede
 * a distribuição de acertos entregue pelo fechamento.
 *
 * Modelo: cada sorteio é uma combinação aleatória de `drawSize` dezenas
 * do universo [1..totalNumbers]. Para cada sorteio calculamos o melhor
 * hit-count dentre os jogos do fechamento.
 */

export interface MonteCarloOptions {
  games: number[][];              // jogos como dezenas reais
  totalNumbers: number;           // universo completo (ex: 25)
  drawSize: number;               // quantas dezenas por sorteio oficial (ex: 15)
  trials?: number;                // default 100k
  seed?: number;                  // repetir sorteios simulados
  targetHits?: number;            // meta para calcular hit-rate
  convergenceSamples?: number;    // default 20 pontos amostrados ao longo dos trials
  captureHeatmap?: boolean;       // se true, retorna hits por dezena
}

export interface ConvergencePoint {
  trial: number;
  hitRate: number;
  meanHits: number;
}

export interface MonteCarloResult {
  trials: number;
  distribution: Record<number, number>;    // hits → count
  meanHits: number;
  bestHits: number;
  worstHits: number;
  hitRate: number;                          // % trials com hits ≥ target
  hitRateCI95: [number, number];            // IC 95% (Wilson)
  targetHits: number;
  elapsedMs: number;
  convergence: ConvergencePoint[];          // curva de hitRate ao longo dos trials
  heatmap?: Record<number, number>;         // dezena → nº trials em que foi acertada
}

function wilsonCI(successes: number, trials: number, z = 1.96): [number, number] {
  if (trials === 0) return [0, 0];
  const p = successes / trials;
  const denom = 1 + (z * z) / trials;
  const center = (p + (z * z) / (2 * trials)) / denom;
  const half = (z * Math.sqrt((p * (1 - p) + (z * z) / (4 * trials)) / trials)) / denom;
  return [Math.max(0, (center - half) * 100), Math.min(100, (center + half) * 100)];
}

export function runMonteCarlo(opts: MonteCarloOptions): MonteCarloResult {
  const start = performance.now();
  const trials = opts.trials ?? 100_000;
  const target = opts.targetHits ?? opts.games[0]?.length ?? 0;
  if (!Number.isInteger(trials) || trials < 1 || trials > 1_000_000 ||
      !Number.isInteger(opts.totalNumbers) || opts.totalNumbers < 1 || opts.totalNumbers > 1000 ||
      !Number.isInteger(opts.drawSize) || opts.drawSize < 1 || opts.drawSize > opts.totalNumbers ||
      !Number.isInteger(target) || target < 1 || target > opts.drawSize ||
      !opts.games.length || opts.games.some(g => g.length !== opts.drawSize ||
        new Set(g).size !== g.length ||
        g.some(n => !Number.isInteger(n) || n < 1 || n > opts.totalNumbers))) {
    throw new Error("Parâmetros inválidos para simulação de dezenas simples.");
  }
  const rng = makeRng(opts.seed ?? (Math.imul(opts.totalNumbers, 73856093) ^
    Math.imul(opts.drawSize, 19349663) ^ Math.imul(target, 83492791)));
  const convSamples = Math.max(2, opts.convergenceSamples ?? 20);
  const convStep = Math.max(1, Math.floor(trials / convSamples));

  const universe = Array.from({ length: opts.totalNumbers }, (_, i) => i + 1);
  const gameSets = opts.games.map(g => new Set(g));

  const distribution: Record<number, number> = {};
  const heatmap: Record<number, number> | undefined = opts.captureHeatmap ? {} : undefined;
  const convergence: ConvergencePoint[] = [];
  let hitsSum = 0;
  let best = 0;
  let worst = Number.MAX_SAFE_INTEGER;
  let meetsTarget = 0;

  const pool = new Array<number>(opts.totalNumbers);

  for (let t = 0; t < trials; t++) {
    for (let i = 0; i < opts.totalNumbers; i++) pool[i] = universe[i];
    for (let i = 0; i < opts.drawSize; i++) {
      const j = i + Math.floor(rng() * (opts.totalNumbers - i));
      const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    let bestHits = 0;
    for (const gs of gameSets) {
      let h = 0;
      for (let i = 0; i < opts.drawSize; i++) if (gs.has(pool[i])) h++;
      if (h > bestHits) bestHits = h;
    }
    if (heatmap) {
      for (let i = 0; i < opts.drawSize; i++) {
        // conta ocorrência do número no sorteio (agnóstico ao hit)
        const n = pool[i];
        heatmap[n] = (heatmap[n] || 0) + 1;
      }
    }
    distribution[bestHits] = (distribution[bestHits] || 0) + 1;
    hitsSum += bestHits;
    if (bestHits > best) best = bestHits;
    if (bestHits < worst) worst = bestHits;
    if (bestHits >= target) meetsTarget++;

    if ((t + 1) % convStep === 0 || t === trials - 1) {
      convergence.push({
        trial: t + 1,
        hitRate: (meetsTarget / (t + 1)) * 100,
        meanHits: hitsSum / (t + 1),
      });
    }
  }

  return {
    trials,
    distribution,
    meanHits: hitsSum / trials,
    bestHits: best,
    worstHits: worst === Number.MAX_SAFE_INTEGER ? 0 : worst,
    hitRate: (meetsTarget / trials) * 100,
    hitRateCI95: wilsonCI(meetsTarget, trials),
    targetHits: target,
    elapsedMs: Math.round(performance.now() - start),
    convergence,
    heatmap,
  };
}
