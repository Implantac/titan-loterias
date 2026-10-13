import { describe, it, expect } from "vitest";
import { AblationEngine } from "./ablation-engine";
import { computeFrequencyStats } from "@/engine/stats/statistics";
import { ENSEMBLE_MODELS, ENSEMBLE_WEIGHTS } from "@/engine/ai/ml-models";
import type { DrawResult, LotteryConfig } from "@/data/lotteries";

/** Configuração mínima no formato Lotofácil. */
const config = {
  id: "lotofacil",
  name: "Lotofácil",
  numbers: 25,
  pick: 15,
  price: 3,
} as unknown as LotteryConfig;

/**
 * Histórico sintético mas DETERMINÍSTICO: um gerador congruencial linear.
 * Não usa Math.random(), então o teste é reprodutível.
 */
function makeDraws(count: number): DrawResult[] {
  let seed = 42;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  return Array.from({ length: count }, (_, i) => {
    const pool = Array.from({ length: 25 }, (_, n) => n + 1);
    const numbers: number[] = [];
    while (numbers.length < 15) {
      const idx = Math.floor(rnd() * pool.length);
      numbers.push(pool.splice(idx, 1)[0]);
    }
    return {
      concurso: 1000 + i,
      date: "01/01/2020",
      numbers: numbers.sort((a, b) => a - b),
    };
  });
}

describe("AblationEngine — Leave-One-Out real", () => {
  const draws = makeDraws(200);

  it("avalia exatamente os modelos do ensemble", () => {
    const report = AblationEngine.runLeaveOneOut(config, draws, computeFrequencyStats, {
      windowSize: 60,
      testSize: 20,
    });

    expect(report.impacts).toHaveLength(ENSEMBLE_MODELS.length);
    const names = report.impacts.map((i) => i.indicator).sort();
    expect(names).toEqual([...ENSEMBLE_MODELS].sort());
  });

  it("é determinístico — duas execuções idênticas produzem o mesmo resultado", () => {
    const opts = { windowSize: 60, testSize: 20 };
    const a = AblationEngine.runLeaveOneOut(config, draws, computeFrequencyStats, opts);
    const b = AblationEngine.runLeaveOneOut(config, draws, computeFrequencyStats, opts);

    expect(a.impacts).toEqual(b.impacts);
    expect(a.baselineLift).toBe(b.baselineLift);
  });

  it("importância relativa fica em [0,1]", () => {
    const { impacts } = AblationEngine.runLeaveOneOut(config, draws, computeFrequencyStats, {
      windowSize: 60,
      testSize: 20,
    });

    impacts.forEach((i) => {
      expect(i.relativeImportance).toBeGreaterThanOrEqual(0);
      expect(i.relativeImportance).toBeLessThanOrEqual(1);
    });
  });

  /**
   * Em dados uniformemente aleatórios nenhum modelo tem edge mensurável, então
   * todas as contribuições saem <= 0 e a importância relativa fica em zero.
   * Isso é o resultado CORRETO — e é exatamente o que a versão anterior
   * escondia ao sortear números que pareciam significativos.
   */
  it("em dados sem sinal, reporta contribuição zero em vez de inventar importância", () => {
    const report = AblationEngine.runLeaveOneOut(config, draws, computeFrequencyStats, {
      windowSize: 60,
      testSize: 20,
    });

    expect(report.impacts.length).toBeGreaterThan(0);
    const soma = report.impacts.reduce((s, i) => s + i.relativeImportance, 0);
    expect(soma).toBe(0);
    report.impacts.forEach((i) => expect(i.robustnessGrade).toBe("Low"));
  });

  /**
   * Prova de que o Leave-One-Out realmente mede algo: num histórico com viés
   * forte e detectável, a remoção de um modelo precisa provocar queda de lift.
   * Se o motor só devolvesse zeros sempre, este teste falharia.
   */
  it("detecta contribuição positiva quando o histórico tem sinal detectável", () => {
    // 70% das dezenas sorteadas vêm da metade baixa — viés que os modelos de
    // frequência e padrão conseguem capturar.
    let seed = 7;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const biased: DrawResult[] = Array.from({ length: 220 }, (_, i) => {
      const low = Array.from({ length: 13 }, (_, n) => n + 1);      // 1..13
      const high = Array.from({ length: 12 }, (_, n) => n + 14);    // 14..25
      const pick = (pool: number[], k: number) => {
        const out: number[] = [];
        const p = [...pool];
        while (out.length < k) out.push(p.splice(Math.floor(rnd() * p.length), 1)[0]);
        return out;
      };
      return {
        concurso: 2000 + i,
        date: "01/01/2020",
        numbers: [...pick(low, 11), ...pick(high, 4)].sort((a, b) => a - b),
      };
    });

    const report = AblationEngine.runLeaveOneOut(config, biased, computeFrequencyStats, {
      windowSize: 60,
      testSize: 30,
    });

    const positiva = report.impacts.filter((i) => i.liftContribution > 0);
    expect(positiva.length).toBeGreaterThan(0);
    expect(report.impacts.some((i) => i.relativeImportance > 0)).toBe(true);
  });

  it("vem ordenado do mais para o menos importante", () => {
    const { impacts } = AblationEngine.runLeaveOneOut(config, draws, computeFrequencyStats, {
      windowSize: 60,
      testSize: 20,
    });

    const imp = impacts.map((i) => i.relativeImportance);
    expect(imp).toEqual([...imp].sort((a, b) => b - a));
  });

  it("reporta progresso real, um passo por modelo", () => {
    const steps: Array<{ done: number; total: number; model: string }> = [];
    AblationEngine.runLeaveOneOut(config, draws, computeFrequencyStats, {
      windowSize: 60,
      testSize: 20,
      onProgress: (done, total, model) => steps.push({ done, total, model }),
    });

    expect(steps).toHaveLength(ENSEMBLE_MODELS.length);
    expect(steps[steps.length - 1].done).toBe(ENSEMBLE_MODELS.length);
    expect(new Set(steps.map((s) => s.model)).size).toBe(ENSEMBLE_MODELS.length);
  });

  it("não inventa resultado quando não há histórico suficiente", () => {
    const report = AblationEngine.runLeaveOneOut(config, makeDraws(10), computeFrequencyStats, {
      windowSize: 100,
    });

    expect(report.impacts).toEqual([]);
    expect(report.drawsTested).toBe(0);
  });

  it("runAblation sem função de stats devolve vazio em vez de inventar números", async () => {
    const result = await AblationEngine.runAblation(
      ["Frequência", "Recência"],
      config,
      draws,
      1.0,
      [[1, 2, 3]],
    );

    expect(result).toEqual([]);
  });

  it("runAblation com função de stats delega para o Leave-One-Out real", async () => {
    const result = await AblationEngine.runAblation(
      ["Frequência"],
      config,
      draws,
      1.0,
      [[1, 2, 3]],
      computeFrequencyStats,
      { windowSize: 60, testSize: 20 },
    );

    expect(result).toHaveLength(ENSEMBLE_MODELS.length);
  });

  it("os pesos do ensemble somam 1 (pré-condição da ablação)", () => {
    const soma = Object.values(ENSEMBLE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(soma).toBeCloseTo(1, 5);
  });
});
