/**
 * Motor Universal de Fechamentos — tipos de domínio.
 * Núcleo puramente matemático, sem dependências de framework.
 */

export type ClosingStrategy =
  | "greedy"
  | "genetic"
  | "simulated_annealing"
  | "hill_climbing"
  | "beam_search"
  | "backtracking"
  | "branch_and_bound"
  | "covering_design"
  | "monte_carlo"
  | "hybrid";

export type ClosingKind =
  | "chosen"          // fechamento por dezenas escolhidas
  | "eliminated"      // fechamento por dezenas eliminadas
  | "economic"        // econômico (min jogos, cobertura relaxada)
  | "guaranteed"      // garantido (garantia fixa, min jogos)
  | "balanced"        // balanceado (equilíbrio jogos/cobertura)
  | "custom";         // com filtros customizados

/** Parâmetros matemáticos genéricos de uma modalidade. */
export interface LotteryParams {
  id: string;
  name: string;
  totalNumbers: number;   // universo (ex: 25 na Lotofácil)
  pick: number;           // dezenas por jogo (ex: 15)
  ticketPrice: number;
}

/** Requisição de geração de fechamento. */
export interface ClosingRequest {
  lottery: LotteryParams;
  /** Dezenas-base selecionadas pelo usuário. */
  baseNumbers: number[];
  /** Meta de garantia: se K dezenas sortearem dentro da base, garantir M acertos. */
  guarantee: {
    /** K — quantos dos sorteados caem na base (default = pick). */
    hitsInBase: number;
    /** M — mínimo de acertos garantidos em pelo menos um jogo. */
    minHits: number;
  };
  /** Máximo de jogos permitido (orçamento). undefined = sem limite. */
  maxGames?: number;
  /** Estratégia principal (default "greedy"). */
  strategy?: ClosingStrategy;
  kind?: ClosingKind;
}

/** Resultado da validação matemática de um fechamento. */
export interface ClosingValidation {
  guaranteedHits: number;       // menor acerto observado; só é garantia quando exhaustive=true
  targetMinHits: number;        // meta pedida
  meetsGuarantee: boolean;       // true somente com prova exaustiva e meta satisfeita
  coveragePercent: number;      // % cenários que batem meta
  redundancyPercent: number;    // % cobertura duplicada
  wastedCoveragePercent: number;
  efficiencyPercent: number;
  exhaustive: boolean;
  testedScenarios: number;
  distribution: Record<number, number>;
}

/** Nota multi-critério (0-100). */
export interface ClosingScore {
  coverage: number;
  diversity: number;
  redundancy: number;    // menor = melhor; normalizado para "quanto melhor 0-100"
  efficiency: number;
  time: number;
  overall: number;
}

/** Resultado completo de uma geração. */
export interface ClosingResult {
  request: ClosingRequest;
  strategy: ClosingStrategy;
  /** Jogos em ordem, cada um com números-base (não índices). */
  games: number[][];
  gameCount: number;
  cost: number;
  validation: ClosingValidation;
  score: ClosingScore;
  elapsedMs: number;
  /** Schönheim lower bound (mínimo teórico de jogos). */
  lowerBound: number;
  notes: string[];
}
