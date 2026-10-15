import type { DrawResult, LotteryConfig } from "@/data/lotteries";
import type { NumberStats } from "@/engine/stats/statistics";
import { buildStrategyBriefing, type StrategyBriefingTone } from "@/engine/strategy-briefing";

export type BudgetRiskProfile = "low" | "medium" | "high";

// Preços oficiais Caixa da aposta simples — reajuste de jul/2025 (fonte única do app)
export const LOTTERY_BET_COST: Record<string, number> = {
  megasena: 6.0,
  lotofacil: 3.5,
  quina: 3.0,
  lotomania: 3.0,
  duplasena: 3.0,
  timemania: 3.5,
  diadesorte: 2.5,
  supersete: 3.0,
  maismilionaria: 6.0,
  mais_milionaria: 6.0,
  federal: 4.0,
};

const DRAWS_PER_MONTH: Record<string, number> = {
  megasena: 8,
  lotofacil: 24,
  quina: 24,
  lotomania: 8,
  duplasena: 8,
  timemania: 8,
  diadesorte: 8,
  supersete: 12,
};

const RISK_FACTOR: Record<BudgetRiskProfile, number> = {
  low: 0.45,
  medium: 0.7,
  high: 1,
};

const TONE_RISK: Record<StrategyBriefingTone, BudgetRiskProfile> = {
  conservative: "low",
  balanced: "medium",
  aggressive: "high",
};

export interface BettingBudgetPlan {
  monthlyBudget: number;
  riskProfile: BudgetRiskProfile;
  suggestedRiskProfile: BudgetRiskProfile;
  costPerGame: number;
  drawsPerMonth: number;
  maxGamesPerDraw: number;
  recommendedGamesPerDraw: number;
  monthlyGames: number;
  monthlyCost: number;
  reserveAmount: number;
  budgetUsagePct: number;
  operatingMode: string;
  warning: string | null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function buildBettingBudgetPlan(
  config: LotteryConfig,
  stats: NumberStats[],
  draws: DrawResult[],
  monthlyBudget: number,
  riskProfile?: BudgetRiskProfile,
): BettingBudgetPlan {
  const briefing = buildStrategyBriefing(config, stats, draws);
  const suggestedRiskProfile = TONE_RISK[briefing.recommendedTone];
  const selectedRisk = riskProfile ?? suggestedRiskProfile;
  const costPerGame = LOTTERY_BET_COST[config.id] ?? 3;
  const drawsPerMonth = DRAWS_PER_MONTH[config.id] ?? 8;
  const safeBudget = Math.max(0, monthlyBudget);
  const maxGamesPerDraw = Math.floor(safeBudget / (costPerGame * drawsPerMonth));
  const confidenceFactor = clamp(briefing.confidenceScore / 100, 0.35, 0.95);
  const recommendedGamesPerDraw = Math.max(
    safeBudget >= costPerGame * drawsPerMonth ? 1 : 0,
    Math.floor(maxGamesPerDraw * RISK_FACTOR[selectedRisk] * confidenceFactor),
  );
  const monthlyGames = recommendedGamesPerDraw * drawsPerMonth;
  const monthlyCost = monthlyGames * costPerGame;
  const reserveAmount = Math.max(0, safeBudget - monthlyCost);
  const budgetUsagePct = safeBudget > 0 ? (monthlyCost / safeBudget) * 100 : 0;

  const operatingMode =
    selectedRisk === "low"
      ? "Disciplina: poucos jogos, foco em backtest e recorrencia."
      : selectedRisk === "high"
        ? "Exploracao: mais combinacoes, simulacao massiva obrigatoria."
        : "Equilibrio: volume moderado com filtros e conferencia recorrente.";

  const warning =
    safeBudget < costPerGame * drawsPerMonth
      ? `Orcamento insuficiente para 1 jogo por concurso em ${config.name}.`
      : budgetUsagePct > 90
        ? "Uso de banca muito alto; considere manter uma reserva operacional."
        : null;

  return {
    monthlyBudget: safeBudget,
    riskProfile: selectedRisk,
    suggestedRiskProfile,
    costPerGame,
    drawsPerMonth,
    maxGamesPerDraw,
    recommendedGamesPerDraw,
    monthlyGames,
    monthlyCost,
    reserveAmount,
    budgetUsagePct: Math.round(budgetUsagePct),
    operatingMode,
    warning,
  };
}
