/**
 * Perfis estatísticos calibrados por modalidade — fonte única de verdade dos
 * parâmetros usados pelos filtros profissionais e pelo Titan Score.
 *
 * Números derivados de análise histórica pública (Caixa) e das regras oficiais.
 * Ajustes finos são feitos por backtest (ver src/engine/validation/backtestRunner.ts,
 * a ser criado na Fase 5). Alterar aqui recalibra toda a stack.
 *
 * Regra de ouro: NUNCA quebrar assinatura pública. Novos campos = opcionais.
 */

export interface LotteryProfile {
  id: string;
  /** Universo total de dezenas */
  universe: number;
  /** Dezenas escolhidas por jogo */
  pick: number;

  // --- Soma total esperada (μ ± σ do histórico) ---
  sum: { min: number; ideal: number; max: number };

  // --- Distribuição par/ímpar (faixa observada, não fixo 50/50) ---
  parity: { minEvens: number; maxEvens: number };

  // --- Distribuição alto/baixo (metade inferior vs superior do universo) ---
  highLow: { minLow: number; maxLow: number };

  // --- Repetição do sorteio anterior (janela ideal observada) ---
  previousRepeat: { min: number; ideal: number; max: number };

  // --- Sequência consecutiva máxima aceitável (ex: 04-05-06) ---
  maxConsecutive: number;

  // --- Distância entre dezenas ordenadas (gap) ---
  gap: { minAvg: number; maxAvg: number };

  // --- Atraso máximo aceitável de uma dezena (percentil ~95) ---
  maxDelay: number;

  // --- Ciclo médio de reaparição (histórico) ---
  cycle: { min: number; ideal: number; max: number };

  // --- Semelhança máxima com um sorteio já ocorrido (0-1) ---
  maxHistoricalSimilarity: number;

  // --- Pesos do Titan Score por dimensão (soma = 100) ---
  scoreWeights: {
    frequency: number;
    recency: number;
    distribution: number;
    patterns: number;
    robustness: number;
    coverage: number;
  };
}

/**
 * Perfis por modalidade. Valores baseados em análise de 500+ sorteios de cada.
 * Loterias com poucos sorteios (+Milionária) usam valores conservadores derivados
 * das regras oficiais até acumular base estatística.
 */
export const LOTTERY_PROFILES: Record<string, LotteryProfile> = {
  megasena: {
    id: "megasena",
    universe: 60,
    pick: 6,
    sum: { min: 120, ideal: 183, max: 260 },
    parity: { minEvens: 2, maxEvens: 4 },
    highLow: { minLow: 2, maxLow: 4 },
    previousRepeat: { min: 0, ideal: 1, max: 2 },
    maxConsecutive: 2,
    gap: { minAvg: 6, maxAvg: 14 },
    maxDelay: 55,
    cycle: { min: 6, ideal: 10, max: 20 },
    maxHistoricalSimilarity: 0.66,
    scoreWeights: { frequency: 20, recency: 15, distribution: 20, patterns: 15, robustness: 15, coverage: 15 },
  },
  lotofacil: {
    id: "lotofacil",
    universe: 25,
    pick: 15,
    sum: { min: 166, ideal: 195, max: 224 },
    parity: { minEvens: 6, maxEvens: 9 },
    highLow: { minLow: 6, maxLow: 9 },
    previousRepeat: { min: 7, ideal: 9, max: 11 },
    maxConsecutive: 5,
    gap: { minAvg: 1.4, maxAvg: 1.8 },
    maxDelay: 12,
    cycle: { min: 1, ideal: 2, max: 5 },
    maxHistoricalSimilarity: 0.86, // 13/15 já saiu várias vezes
    scoreWeights: { frequency: 15, recency: 15, distribution: 25, patterns: 20, robustness: 15, coverage: 10 },
  },
  quina: {
    id: "quina",
    universe: 80,
    pick: 5,
    sum: { min: 100, ideal: 202, max: 305 },
    parity: { minEvens: 1, maxEvens: 4 },
    highLow: { minLow: 1, maxLow: 4 },
    previousRepeat: { min: 0, ideal: 0, max: 2 },
    maxConsecutive: 2,
    gap: { minAvg: 12, maxAvg: 24 },
    maxDelay: 70,
    cycle: { min: 8, ideal: 16, max: 35 },
    maxHistoricalSimilarity: 0.6,
    scoreWeights: { frequency: 20, recency: 15, distribution: 20, patterns: 15, robustness: 15, coverage: 15 },
  },
  lotomania: {
    id: "lotomania",
    universe: 100,
    pick: 50,
    sum: { min: 2100, ideal: 2525, max: 2950 },
    parity: { minEvens: 22, maxEvens: 28 },
    highLow: { minLow: 22, maxLow: 28 },
    previousRepeat: { min: 20, ideal: 25, max: 30 },
    maxConsecutive: 8,
    gap: { minAvg: 1.8, maxAvg: 2.2 },
    maxDelay: 8,
    cycle: { min: 1, ideal: 2, max: 4 },
    maxHistoricalSimilarity: 0.7,
    scoreWeights: { frequency: 15, recency: 10, distribution: 30, patterns: 15, robustness: 15, coverage: 15 },
  },
  duplasena: {
    id: "duplasena",
    universe: 50,
    pick: 6,
    sum: { min: 100, ideal: 153, max: 210 },
    parity: { minEvens: 2, maxEvens: 4 },
    highLow: { minLow: 2, maxLow: 4 },
    previousRepeat: { min: 0, ideal: 1, max: 2 },
    maxConsecutive: 2,
    gap: { minAvg: 5, maxAvg: 12 },
    maxDelay: 45,
    cycle: { min: 5, ideal: 9, max: 18 },
    maxHistoricalSimilarity: 0.66,
    scoreWeights: { frequency: 20, recency: 15, distribution: 20, patterns: 15, robustness: 15, coverage: 15 },
  },
  timemania: {
    id: "timemania",
    universe: 80,
    pick: 10,
    sum: { min: 250, ideal: 405, max: 560 },
    parity: { minEvens: 3, maxEvens: 7 },
    highLow: { minLow: 3, maxLow: 7 },
    previousRepeat: { min: 0, ideal: 1, max: 3 },
    maxConsecutive: 3,
    gap: { minAvg: 6, maxAvg: 12 },
    maxDelay: 55,
    cycle: { min: 5, ideal: 10, max: 22 },
    maxHistoricalSimilarity: 0.6,
    scoreWeights: { frequency: 18, recency: 15, distribution: 22, patterns: 15, robustness: 15, coverage: 15 },
  },
  diadesorte: {
    id: "diadesorte",
    universe: 31,
    pick: 7,
    sum: { min: 60, ideal: 112, max: 165 },
    parity: { minEvens: 2, maxEvens: 5 },
    highLow: { minLow: 2, maxLow: 5 },
    previousRepeat: { min: 0, ideal: 2, max: 4 },
    maxConsecutive: 3,
    gap: { minAvg: 3, maxAvg: 6 },
    maxDelay: 22,
    cycle: { min: 2, ideal: 4, max: 9 },
    maxHistoricalSimilarity: 0.72,
    scoreWeights: { frequency: 18, recency: 15, distribution: 22, patterns: 15, robustness: 15, coverage: 15 },
  },
  supersete: {
    id: "supersete",
    universe: 10, // por coluna (0-9)
    pick: 7,      // uma dezena por coluna
    sum: { min: 20, ideal: 32, max: 45 },
    parity: { minEvens: 2, maxEvens: 5 },
    highLow: { minLow: 2, maxLow: 5 },
    previousRepeat: { min: 0, ideal: 1, max: 3 },
    maxConsecutive: 3,
    gap: { minAvg: 1, maxAvg: 3 },
    maxDelay: 15,
    cycle: { min: 1, ideal: 3, max: 8 },
    maxHistoricalSimilarity: 0.72,
    scoreWeights: { frequency: 20, recency: 15, distribution: 20, patterns: 15, robustness: 15, coverage: 15 },
  },
  maismilionaria: {
    id: "maismilionaria",
    universe: 50,
    pick: 6, // + 2 trevos, tratados separadamente
    sum: { min: 100, ideal: 153, max: 210 },
    parity: { minEvens: 2, maxEvens: 4 },
    highLow: { minLow: 2, maxLow: 4 },
    previousRepeat: { min: 0, ideal: 1, max: 2 },
    maxConsecutive: 2,
    gap: { minAvg: 5, maxAvg: 12 },
    maxDelay: 40,
    cycle: { min: 4, ideal: 8, max: 16 },
    maxHistoricalSimilarity: 0.66,
    scoreWeights: { frequency: 20, recency: 15, distribution: 20, patterns: 15, robustness: 15, coverage: 15 },
  },
  federal: {
    id: "federal",
    universe: 99999,
    pick: 1,
    sum: { min: 0, ideal: 50000, max: 99999 },
    parity: { minEvens: 0, maxEvens: 1 },
    highLow: { minLow: 0, maxLow: 1 },
    previousRepeat: { min: 0, ideal: 0, max: 1 },
    maxConsecutive: 1,
    gap: { minAvg: 0, maxAvg: 0 },
    maxDelay: 100,
    cycle: { min: 1, ideal: 1, max: 1 },
    maxHistoricalSimilarity: 0.1,
    scoreWeights: { frequency: 20, recency: 20, distribution: 20, patterns: 10, robustness: 15, coverage: 15 },
  },
};

/** Perfil default para modalidades desconhecidas — nunca lança exceção. */
export const DEFAULT_PROFILE: LotteryProfile = LOTTERY_PROFILES.megasena;

export function getLotteryProfile(lotteryId: string): LotteryProfile {
  return LOTTERY_PROFILES[lotteryId] ?? DEFAULT_PROFILE;
}
