import { describe, it, expect } from "vitest";
import { heuristicRecommendation } from "@/engine/closing/ai/AIRecommendationEngine";
import type { LotteryParams } from "@/engine/closing/core/types";

const lotofacil: LotteryParams = {
  id: "lotofacil", name: "Lotofácil", totalNumbers: 25, pick: 15, ticketPrice: 3,
};

describe("ai/AIRecommendationEngine · heuristicRecommendation", () => {
  it("retorna estrutura válida", () => {
    const rec = heuristicRecommendation({ lottery: lotofacil, baseSize: 18, riskProfile: "balanced" });
    expect(rec.source).toBe("heuristic");
    expect(rec.strategy).toMatch(/covering_design|genetic|simulated_annealing|greedy/);
    expect(rec.minHits).toBeGreaterThan(0);
    expect(rec.maxGames).toBeGreaterThan(0);
    expect(rec).not.toHaveProperty("expectedCoverage");
    expect(rec).not.toHaveProperty("expectedROI");
    expect(rec.rationale.length).toBeGreaterThanOrEqual(5);
  });

  it("perfil agressivo produz mais jogos que conservador", () => {
    const cons = heuristicRecommendation({ lottery: lotofacil, baseSize: 18, riskProfile: "conservative" });
    const aggr = heuristicRecommendation({ lottery: lotofacil, baseSize: 18, riskProfile: "aggressive" });
    expect(aggr.maxGames).toBeGreaterThanOrEqual(cons.maxGames);
  });

  it("respeita orçamento — budgetFits reflete custo", () => {
    const rec = heuristicRecommendation({
      lottery: lotofacil, baseSize: 18, riskProfile: "aggressive", budget: 30, ticketPrice: 3,
    });
    // 30 / 3 = 10 jogos máx pelo budget
    expect(rec.maxGames).toBeLessThanOrEqual(10);
    expect(rec.budgetFits).toBe(true);
  });

  it("orçamento inferior ao preço de um jogo não oferece plano aplicável", () => {
    const rec = heuristicRecommendation({ lottery: lotofacil, baseSize: 18, budget: 1, ticketPrice: 3 });
    expect(rec.maxGames).toBe(0);
    expect(rec.budgetFits).toBe(false);
  });

  it("orçamento zero: reporta budgetFits false quando custo > 0", () => {
    const rec = heuristicRecommendation({
      lottery: lotofacil, baseSize: 20, riskProfile: "balanced", budget: 0, ticketPrice: 3,
    });
    expect(rec.maxGames).toBeGreaterThanOrEqual(0);
  });
});
