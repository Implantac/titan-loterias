/**
 * AIRecommendationEngine — recomenda estratégia, garantia e nº ideal de jogos
 * a partir do contexto (modalidade, base disponível, orçamento, perfil de risco).
 *
 * Trabalha em duas camadas:
 *   1. `heuristicRecommendation` — puro, offline, determinístico.
 *   2. `aiRecommendation` — chama edge function `ai-closing-recommendation` para
 *      gerar racional em linguagem natural. Cai no heurístico se falhar.
 */

import type { ClosingStrategy, LotteryParams } from "../core/types";
import { schonheimBound, binomial } from "../core/combinatorics";
import { supabase } from "@/integrations/supabase/client";

export type RiskProfile = "conservative" | "balanced" | "aggressive";

export interface RecommendationInput {
  lottery: LotteryParams;
  baseSize: number;
  budget?: number;         // R$
  ticketPrice?: number;    // R$ por jogo
  riskProfile?: RiskProfile;
  historicalDraws?: number[][];
}

export interface Recommendation {
  strategy: ClosingStrategy;
  minHits: number;
  maxGames: number;
  rationale: string[];
  source: "heuristic" | "ai";
  budgetFits: boolean;
}

const RISK_MULTIPLIER: Record<RiskProfile, number> = {
  conservative: 0.5,
  balanced: 1,
  aggressive: 2,
};

export function heuristicRecommendation(input: RecommendationInput): Recommendation {
  const { lottery, baseSize } = input;
  const pick = lottery.pick;
  const price = input.ticketPrice ?? lottery.ticketPrice ?? 3;
  const risk = input.riskProfile ?? "balanced";

  const minHits = Math.max(1, pick - (risk === "aggressive" ? 2 : risk === "conservative" ? 1 : 1));
  const lowerBound = schonheimBound(baseSize, pick, minHits);
  const budgetGames = input.budget ? Math.floor(input.budget / price) : Infinity;

  const targetGames = Math.min(
    Math.max(lowerBound, Math.ceil(lowerBound * RISK_MULTIPLIER[risk] * 1.4)),
    budgetGames,
  );

  const totalScenarios = binomial(baseSize, pick);

  const strategy: ClosingStrategy = targetGames >= 200
    ? "covering_design"
    : targetGames >= 50
      ? "genetic"
      : targetGames >= 15
        ? "simulated_annealing"
        : "greedy";

  const cost = targetGames * price;
  const budgetFits = targetGames > 0 && (input.budget === undefined || cost <= input.budget);

  const rationale = [
    `Base de ${baseSize} dezenas gera ${totalScenarios.toLocaleString("pt-BR")} cenários possíveis.`,
    `Cota combinatória de referência: ${lowerBound} jogos; não comprova cobertura do conjunto sugerido.`,
    `Perfil ${risk}: alvo de ${targetGames} jogos (fator ${RISK_MULTIPLIER[risk]}× sobre o bound).`,
    `Meta de ${minHits} acertos depende dos jogos gerados e de validação posterior; não há cobertura prevista nem ROI esperado.`,
    `Estratégia sugerida: ${strategy} para avaliação após geração.`,
    input.budget
      ? budgetFits
        ? `Orçamento de R$ ${input.budget.toFixed(2)} comporta o custo estimado de R$ ${cost.toFixed(2)}.`
        : `Orçamento insuficiente: ${targetGames} jogos custam R$ ${cost.toFixed(2)}, acima dos R$ ${input.budget.toFixed(2)}.`
      : "Orçamento não informado — considere definir um teto de custo.",
  ];

  return {
    strategy,
    minHits,
    maxGames: targetGames,
    rationale,
    source: "heuristic",
    budgetFits,
  };
}

export async function aiRecommendation(input: RecommendationInput): Promise<Recommendation> {
  const base = heuristicRecommendation(input);
  try {
    const { data, error } = await supabase.functions.invoke("ai-closing-recommendation", {
      body: { input, heuristic: base },
    });
    if (error || !data) return base;
    const payload = data as { rationale?: string[]; strategy?: ClosingStrategy; minHits?: number; maxGames?: number };
    return {
      ...base,
      // A resposta remota fornece apenas explicação; números e estratégia são
      // recalculados localmente para não ultrapassar o orçamento ou a modalidade.
      rationale: Array.isArray(payload.rationale) && payload.rationale.every(x => typeof x === "string")
        ? payload.rationale.slice(0, 8) : base.rationale,
      source: "ai",
    };
  } catch {
    return base;
  }
}
