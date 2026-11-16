/**
 * Biblioteca de presets de configuração — não contém matrizes nem provas.
 * Ao aplicar um preset, o Motor Universal roda `generateClosing()` com os
 * parâmetros exatos. Nada é armazenado como matriz fixa.
 */

import type { ClosingStrategy } from "../core/types";

export type Complexity = "baixa" | "media" | "alta" | "extrema";

export interface ClassicClosing {
  id: string;
  /** Nome curto tipo "17x8" (base × jogos). */
  code: string;
  /** Nome descritivo humano. */
  name: string;
  /** Modalidade principal para a qual foi originalmente projetado. */
  primaryLottery: string;
  /** Lista de modalidades onde o preset pode ser aplicado. */
  applicableLotteries: string[];
  /** Tamanho da base de dezenas do fechamento clássico. */
  base: number;
  /** Meta solicitada ao motor (acertos), não garantia provada. */
  minHits: number;
  /** Nº de jogos-alvo. Usado como `maxGames`. */
  games: number;
  complexity: Complexity;
  /** Estratégia sugerida para gerar. */
  strategy: ClosingStrategy;
  /** Descrição curta. */
  description: string;
}

export const CLASSIC_CLOSINGS: ClassicClosing[] = [
  // ---------- Lotofácil ----------
  {
    id: "lf-17x8",
    code: "17x8",
    name: "Lotofácil 17 dezenas em 8 jogos",
    primaryLottery: "lotofacil",
    applicableLotteries: ["lotofacil"],
    base: 17, minHits: 14, games: 8,
    complexity: "baixa",
    strategy: "greedy",
    description: "Preset de parâmetros; cobertura e meta dependem dos jogos gerados e da validação posterior.",
  },
  {
    id: "lf-18x12",
    code: "18x12",
    name: "Lotofácil 18 dezenas em 12 jogos",
    primaryLottery: "lotofacil",
    applicableLotteries: ["lotofacil"],
    base: 18, minHits: 14, games: 12,
    complexity: "media",
    strategy: "simulated_annealing",
    description: "Preset de parâmetros; cobertura e meta dependem dos jogos gerados e da validação posterior.",
  },
  {
    id: "lf-19x5",
    code: "19x5",
    name: "Lotofácil 19 dezenas em 5 jogos",
    primaryLottery: "lotofacil",
    applicableLotteries: ["lotofacil"],
    base: 19, minHits: 13, games: 5,
    complexity: "baixa",
    strategy: "greedy",
    description: "Preset de parâmetros; cobertura e meta dependem dos jogos gerados e da validação posterior.",
  },
  {
    id: "lf-19x20",
    code: "19x20",
    name: "Lotofácil 19 dezenas em 20 jogos",
    primaryLottery: "lotofacil",
    applicableLotteries: ["lotofacil"],
    base: 19, minHits: 14, games: 20,
    complexity: "media",
    strategy: "genetic",
    description: "Preset de parâmetros; cobertura e meta dependem dos jogos gerados e da validação posterior.",
  },
  {
    id: "lf-20x25",
    code: "20x25",
    name: "Lotofácil 20 dezenas em 25 jogos",
    primaryLottery: "lotofacil",
    applicableLotteries: ["lotofacil"],
    base: 20, minHits: 14, games: 25,
    complexity: "alta",
    strategy: "genetic",
    description: "Preset de parâmetros; cobertura e meta dependem dos jogos gerados e da validação posterior.",
  },
  {
    id: "lf-21x50",
    code: "21x50",
    name: "Lotofácil 21 dezenas em 50 jogos",
    primaryLottery: "lotofacil",
    applicableLotteries: ["lotofacil"],
    base: 21, minHits: 14, games: 50,
    complexity: "alta",
    strategy: "covering_design",
    description: "Preset de parâmetros; cobertura e meta dependem dos jogos gerados e da validação posterior.",
  },
  {
    id: "lf-22x100",
    code: "22x100",
    name: "Lotofácil 22 dezenas em 100 jogos",
    primaryLottery: "lotofacil",
    applicableLotteries: ["lotofacil"],
    base: 22, minHits: 14, games: 100,
    complexity: "alta",
    strategy: "covering_design",
    description: "Preset de parâmetros; cobertura e meta dependem dos jogos gerados e da validação posterior.",
  },
  {
    id: "lf-23x200",
    code: "23x200",
    name: "Lotofácil 23 dezenas em 200 jogos",
    primaryLottery: "lotofacil",
    applicableLotteries: ["lotofacil"],
    base: 23, minHits: 14, games: 200,
    complexity: "extrema",
    strategy: "covering_design",
    description: "Preset de parâmetros; cobertura e meta dependem dos jogos gerados e da validação posterior.",
  },
  {
    id: "lf-24x400",
    code: "24x400",
    name: "Lotofácil 24 dezenas em 400 jogos",
    primaryLottery: "lotofacil",
    applicableLotteries: ["lotofacil"],
    base: 24, minHits: 14, games: 400,
    complexity: "extrema",
    strategy: "covering_design",
    description: "Preset de parâmetros; cobertura e meta dependem dos jogos gerados e da validação posterior.",
  },
  // ---------- Mega-Sena ----------
  {
    id: "ms-8x7",
    code: "8x7",
    name: "Mega-Sena 8 dezenas em 7 jogos",
    primaryLottery: "megasena",
    applicableLotteries: ["megasena"],
    base: 8, minHits: 5, games: 7,
    complexity: "baixa",
    strategy: "greedy",
    description: "Preset de parâmetros; cobertura e meta dependem dos jogos gerados e da validação posterior.",
  },
  {
    id: "ms-10x21",
    code: "10x21",
    name: "Mega-Sena 10 dezenas em 21 jogos",
    primaryLottery: "megasena",
    applicableLotteries: ["megasena"],
    base: 10, minHits: 5, games: 21,
    complexity: "media",
    strategy: "covering_design",
    description: "Preset de parâmetros; cobertura e meta dependem dos jogos gerados e da validação posterior.",
  },
  {
    id: "ms-12x50",
    code: "12x50",
    name: "Mega-Sena 12 dezenas em 50 jogos",
    primaryLottery: "megasena",
    applicableLotteries: ["megasena"],
    base: 12, minHits: 5, games: 50,
    complexity: "alta",
    strategy: "genetic",
    description: "Preset de parâmetros; cobertura e meta dependem dos jogos gerados e da validação posterior.",
  },
  // ---------- Quina ----------
  {
    id: "qn-8x6",
    code: "8x6",
    name: "Quina 8 dezenas em 6 jogos",
    primaryLottery: "quina",
    applicableLotteries: ["quina"],
    base: 8, minHits: 4, games: 6,
    complexity: "baixa",
    strategy: "greedy",
    description: "Preset de parâmetros; cobertura e meta dependem dos jogos gerados e da validação posterior.",
  },
  {
    id: "qn-10x15",
    code: "10x15",
    name: "Quina 10 dezenas em 15 jogos",
    primaryLottery: "quina",
    applicableLotteries: ["quina"],
    base: 10, minHits: 4, games: 15,
    complexity: "media",
    strategy: "covering_design",
    description: "Preset de parâmetros; cobertura e meta dependem dos jogos gerados e da validação posterior.",
  },
];

export type ClassicComplexityFilter = Complexity | "todas";

export function filterClassicClosings(list: ClassicClosing[], opts: {
  lottery?: string;
  complexity?: ClassicComplexityFilter;
  maxGames?: number;
  search?: string;
}): ClassicClosing[] {
  let out = list;
  if (opts.lottery) out = out.filter(c => c.applicableLotteries.includes(opts.lottery!));
  if (opts.complexity && opts.complexity !== "todas") out = out.filter(c => c.complexity === opts.complexity);
  if (opts.maxGames && opts.maxGames > 0) out = out.filter(c => c.games <= opts.maxGames!);
  if (opts.search) {
    const q = opts.search.toLowerCase();
    out = out.filter(c =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q),
    );
  }
  return out;
}
