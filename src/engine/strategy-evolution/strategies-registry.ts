/**
 * Strategy Registry — All available strategies as configurable entities
 */

import { StrategyDefinition, DEFAULT_PARAMS } from "./types";

export const STRATEGY_REGISTRY: StrategyDefinition[] = [
  {
    id: "freq_recente", name: "Frequência Recente", description: "Dezenas mais frequentes nos últimos 30 sorteios",
    category: "basic", baseStrategy: "hot", supportedLotteries: [],
    params: { ...DEFAULT_PARAMS, frequencyWeight: 0.9, trendWeight: 0.7 },
  },
  {
    id: "freq_historica", name: "Frequência Histórica", description: "Dezenas mais sorteadas em todo o histórico",
    category: "basic", baseStrategy: "hot", supportedLotteries: [],
    params: { ...DEFAULT_PARAMS, frequencyWeight: 0.9, trendWeight: 0.2 },
  },
  {
    id: "atrasadas", name: "Atrasadas", description: "Dezenas com maior atraso e ciclo vencido",
    category: "basic", baseStrategy: "cold", supportedLotteries: [],
    params: { ...DEFAULT_PARAMS, delayWeight: 0.9, cycleWeight: 0.8 },
  },
  {
    id: "freq_atrasadas", name: "Frequentes + Atrasadas", description: "Mix de dezenas frequentes e atrasadas com equilíbrio",
    category: "hybrid", baseStrategy: "balanced", supportedLotteries: [],
    params: { ...DEFAULT_PARAMS, frequencyWeight: 0.7, delayWeight: 0.7, cycleWeight: 0.6 },
  },
  {
    id: "equilibrio_paridade", name: "Equilíbrio Par/Ímpar", description: "Distribuição ótima entre pares e ímpares",
    category: "math", baseStrategy: "balanced", supportedLotteries: [],
    params: { ...DEFAULT_PARAMS, parityWeight: 0.95, dispersalWeight: 0.6 },
  },
  {
    id: "equilibrio_faixas", name: "Equilíbrio por Faixas", description: "Cobertura equilibrada em todas as faixas numéricas",
    category: "math", baseStrategy: "sectors", supportedLotteries: [],
    params: { ...DEFAULT_PARAMS, dispersalWeight: 0.95, parityWeight: 0.5 },
  },
  {
    id: "moldura_centro", name: "Moldura/Centro", description: "Equilíbrio entre dezenas da moldura e centro (Lotofácil)",
    category: "math", baseStrategy: "pattern", supportedLotteries: ["lotofacil"],
    params: { ...DEFAULT_PARAMS, dispersalWeight: 0.8 },
  },
  {
    id: "repeticao_controlada", name: "Repetição Controlada", description: "Repetição inteligente de dezenas do último sorteio",
    category: "basic", baseStrategy: "smart", supportedLotteries: [],
    params: { ...DEFAULT_PARAMS, repeatFromLastWeight: 0.8, frequencyWeight: 0.5 },
  },
  {
    id: "soma_equilibrada", name: "Soma Equilibrada", description: "Soma total das dezenas dentro da faixa ideal",
    category: "math", baseStrategy: "balanced", supportedLotteries: [],
    params: { ...DEFAULT_PARAMS, sumBalanceWeight: 0.9 },
  },
  {
    id: "dispersao_estrutural", name: "Dispersão Estrutural", description: "Máxima dispersão entre as dezenas selecionadas",
    category: "math", baseStrategy: "sectors", supportedLotteries: [],
    params: { ...DEFAULT_PARAMS, dispersalWeight: 0.95, parityWeight: 0.6 },
  },
  {
    id: "hibrida_ia", name: "Híbrida IA", description: "Combina consenso ML + tendência + ciclos + equilíbrio",
    category: "ai", baseStrategy: "hybrid", supportedLotteries: [],
    params: { ...DEFAULT_PARAMS, frequencyWeight: 0.6, trendWeight: 0.7, cycleWeight: 0.7 },
  },
  {
    id: "score_multiobjetivo", name: "Score Multiobjetivo", description: "Otimização simultânea de múltiplos critérios com pesos adaptativos",
    category: "ai", baseStrategy: "smart", supportedLotteries: [],
    params: { ...DEFAULT_PARAMS },
  },
  {
    id: "tendencia", name: "Tendência", description: "Números com momentum ascendente recente",
    category: "basic", baseStrategy: "trend", supportedLotteries: [],
    params: { ...DEFAULT_PARAMS, trendWeight: 0.9, frequencyWeight: 0.4 },
  },
  {
    id: "ciclo", name: "Ciclo", description: "Números no ponto ideal do seu ciclo de aparição",
    category: "math", baseStrategy: "cycle", supportedLotteries: [],
    params: { ...DEFAULT_PARAMS, cycleWeight: 0.95 },
  },
  {
    id: "fibonacci_stats", name: "Fibonacci + Estatística", description: "Sequência de Fibonacci ponderada por desempenho estatístico",
    category: "math", baseStrategy: "fibonacci", supportedLotteries: [],
    params: { ...DEFAULT_PARAMS, frequencyWeight: 0.4, trendWeight: 0.3 },
  },
  {
    id: "primos_ponderados", name: "Primos Ponderados", description: "Números primos selecionados por tendência e ciclo",
    category: "math", baseStrategy: "primes", supportedLotteries: [],
    params: { ...DEFAULT_PARAMS, trendWeight: 0.5, cycleWeight: 0.6 },
  },
  {
    id: "quantum_analysis", name: "Multi-Factor Pattern Engine", description: "Detecção de padrões multi-dimensionais usando ressonância de ciclos e estados estatísticos",
    category: "ai", baseStrategy: "quantum", supportedLotteries: [],
    params: { ...DEFAULT_PARAMS },
  },
  {
    id: "rf_model", name: "Statistical Multi-Factor", description: "Heurística ponderada para detecção de features complexas",
    category: "ai", baseStrategy: "randomForest", supportedLotteries: [],
    params: { ...DEFAULT_PARAMS },
  },
  {
    id: "xgboost_model", name: "Gradient Pattern Engine", description: "Algoritmo multi-fatorial de alto desempenho para máxima cobertura",
    category: "ai", baseStrategy: "xgboost", supportedLotteries: [],
    params: { ...DEFAULT_PARAMS },
  },
  {
    id: "lstm_nn", name: "Temporal Pattern Score", description: "Análise de padrões temporais para sequências numéricas",
    category: "ai", baseStrategy: "lstm", supportedLotteries: [],
    params: { ...DEFAULT_PARAMS },
  },
  {
    id: "bayesian_inf", name: "Inferência Bayesiana", description: "Cálculo probabilístico com atualização contínua",
    category: "ai", baseStrategy: "bayesian", supportedLotteries: [],
    params: { ...DEFAULT_PARAMS },
  },
  {
    id: "markov_chain", name: "Cadeia de Markov", description: "Matriz de transição baseada no último sorteio",
    category: "ai", baseStrategy: "markov_model", supportedLotteries: [],
    params: { ...DEFAULT_PARAMS },
  },
  {
    id: "nucleo_setores", name: "Núcleo Fixo + Setores ⭐", description: "Top-6 quentes fixos + moldura/centro 10:5 + soma-alvo 180–220 (Lotofácil). Melhor lift comprovado em backtest (+26,8% em 11+).",
    category: "math", baseStrategy: "coreSectors", supportedLotteries: ["lotofacil"],
    params: { ...DEFAULT_PARAMS, frequencyWeight: 0.85, dispersalWeight: 0.8, sumBalanceWeight: 0.8 },
  },
  {
    id: "repeticao_estruturada", name: "Repetição Estruturada", description: "8 repetidas do último sorteio + complemento com filtro moldura/centro e soma-alvo (Lotofácil).",
    category: "math", baseStrategy: "repetition", supportedLotteries: ["lotofacil"],
    params: { ...DEFAULT_PARAMS, repeatFromLastWeight: 0.9, dispersalWeight: 0.7, sumBalanceWeight: 0.7 },
  },
  {
    id: "nucleo_repeticao", name: "Núcleo + Repetidas + Setores", description: "Fusão dos melhores sinais: 6 fixos por score + 7 repetidas + 2 setoriais (Lotofácil).",
    category: "hybrid", baseStrategy: "coreRepetition", supportedLotteries: ["lotofacil"],
    params: { ...DEFAULT_PARAMS, frequencyWeight: 0.8, repeatFromLastWeight: 0.85, dispersalWeight: 0.7 },
  },
];

export function getStrategy(id: string): StrategyDefinition | undefined {
  return STRATEGY_REGISTRY.find(s => s.id === id);
}

export function getStrategiesForLottery(lotteryId: string): StrategyDefinition[] {
  return STRATEGY_REGISTRY.filter(s =>
    s.supportedLotteries.length === 0 || s.supportedLotteries.includes(lotteryId)
  );
}
