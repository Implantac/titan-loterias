/**
 * montecarlo.worker.ts — Web Worker dedicado ao MonteCarloEngine.
 * Simula sorteios aleatórios fora da main thread em chunks e emite progresso.
 */

import {
  runMonteCarlo,
  type MonteCarloOptions,
  type MonteCarloResult,
} from "@/engine/closing/simulation/MonteCarloEngine";

type InMsg = {
  type: "run";
  id: string;
  options: MonteCarloOptions;
  /** Chunk size para progresso (default: trials/20). */
  progressChunks?: number;
};

const post = (data: unknown) => (self as unknown as Worker).postMessage(data);

self.addEventListener("message", async (e: MessageEvent<InMsg>) => {
  const msg = e.data;
  try {
    if (msg.type !== "run") return;

    const trials = msg.options.trials ?? 100_000;
    const chunks = Math.max(1, Math.min(msg.progressChunks ?? 20, trials));
    const per = Math.ceil(trials / chunks);

    // Executa em pedaços somando resultados intermediários para permitir progresso.
    const accDist: Record<number, number> = {};
    const accHeat: Record<number, number> = {};
    let accTrials = 0;
    let hitsSum = 0;
    let best = 0;
    let worst = Number.MAX_SAFE_INTEGER;
    let meetsTarget = 0;
    const convergence: MonteCarloResult["convergence"] = [];
    const target =
      msg.options.targetHits ?? msg.options.games[0]?.length ?? 0;

    const start = performance.now();

    for (let c = 0; c < chunks; c++) {
      const remaining = trials - accTrials;
      if (remaining <= 0) break;
      const t = Math.min(per, remaining);

      const partial = runMonteCarlo({
        ...msg.options,
        trials: t,
        convergenceSamples: 2,
        // Chunks não podem reiniciar a mesma sequência de sorteios.
        seed: ((msg.options.seed ?? (Math.imul(msg.options.totalNumbers, 73856093) ^
          Math.imul(msg.options.drawSize, 19349663) ^ Math.imul(target, 83492791))) + c * 0x9e3779b9) >>> 0,
      });

      accTrials += partial.trials;
      hitsSum += partial.meanHits * partial.trials;
      if (partial.bestHits > best) best = partial.bestHits;
      if (partial.worstHits < worst) worst = partial.worstHits;
      for (const [h, count] of Object.entries(partial.distribution)) {
        accDist[Number(h)] = (accDist[Number(h)] || 0) + count;
      }
      if (partial.heatmap) {
        for (const [n, count] of Object.entries(partial.heatmap)) {
          accHeat[Number(n)] = (accHeat[Number(n)] || 0) + count;
        }
      }
      // conta acertos ≥ target no chunk (aproximado via distribuição)
      for (const [h, count] of Object.entries(partial.distribution)) {
        if (Number(h) >= target) meetsTarget += count;
      }

      convergence.push({
        trial: accTrials,
        hitRate: (meetsTarget / accTrials) * 100,
        meanHits: hitsSum / accTrials,
      });

      post({
        id: msg.id,
        type: "progress",
        current: accTrials,
        total: trials,
        hitRate: (meetsTarget / accTrials) * 100,
      });

      // yield to allow message flush
      await new Promise<void>(r => setTimeout(r, 0));
    }

    // Wilson CI 95%
    const p = accTrials > 0 ? meetsTarget / accTrials : 0;
    const z = 1.96;
    const denom = 1 + (z * z) / accTrials;
    const center = (p + (z * z) / (2 * accTrials)) / denom;
    const half =
      (z * Math.sqrt((p * (1 - p) + (z * z) / (4 * accTrials)) / accTrials)) /
      denom;

    const result: MonteCarloResult = {
      trials: accTrials,
      distribution: accDist,
      meanHits: accTrials > 0 ? hitsSum / accTrials : 0,
      bestHits: best,
      worstHits: worst === Number.MAX_SAFE_INTEGER ? 0 : worst,
      hitRate: p * 100,
      hitRateCI95: [
        Math.max(0, (center - half) * 100),
        Math.min(100, (center + half) * 100),
      ],
      targetHits: target,
      elapsedMs: Math.round(performance.now() - start),
      convergence,
      heatmap: msg.options.captureHeatmap ? accHeat : undefined,
    };

    post({ id: msg.id, type: "done", ok: true, result });
  } catch (err) {
    post({
      id: msg.id, type: "done", ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

export {};
