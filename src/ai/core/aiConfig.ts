/**
 * Native AI Core — Configuration
 */

export const AI_CONFIG = {
  defaultHistoryWindow: 100,
  maxHistoryWindow: 500,
  defaultGameCount: 10,
  maxGameCount: 100,
  defaultSimulations: 10000,
  maxSimulations: 500000,
  wheelingMaxBase: 22,
  cacheTTLMs: 60000,
  scoringWeights: {
    statistical: 0.25,
    structural: 0.20,
    coverage: 0.20,
    diversity: 0.15,
    strategyFit: 0.10,
    probability: 0.10,
  },
  riskProfiles: {
    conservative: { hotBias: 0.6, coldBias: 0.1, diversityWeight: 0.8, sequencePenalty: 2.0 },
    balanced:     { hotBias: 0.4, coldBias: 0.2, diversityWeight: 0.5, sequencePenalty: 1.0 },
    aggressive:   { hotBias: 0.2, coldBias: 0.4, diversityWeight: 0.3, sequencePenalty: 0.5 },
    statistical:  { hotBias: 0.5, coldBias: 0.15, diversityWeight: 0.6, sequencePenalty: 1.5 },
    exploratory:  { hotBias: 0.15, coldBias: 0.5, diversityWeight: 0.9, sequencePenalty: 0.3 },
    max_coverage: { hotBias: 0.3, coldBias: 0.3, diversityWeight: 1.0, sequencePenalty: 1.0 },
    anti_popular: { hotBias: 0.1, coldBias: 0.6, diversityWeight: 0.7, sequencePenalty: 0.8 },
    pro_bettor:   { hotBias: 0.45, coldBias: 0.2, diversityWeight: 0.75, sequencePenalty: 1.5 },
    monte_carlo:  { hotBias: 0.4, coldBias: 0.25, diversityWeight: 0.85, sequencePenalty: 1.2 },
    prime_focus:  { hotBias: 0.35, coldBias: 0.3, diversityWeight: 0.8, sequencePenalty: 1.0 },
  },
  lotofacilTicketPrice: 3.5,
  megasenaTicketPrice: 6.0,
  quinaTicketPrice: 3.0,
} as const;
