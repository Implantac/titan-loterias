/** Modelos de jogos simples para planejamento privado, sem compatibilidade de importação Caixa. */
export type SuperSeteGame = { kind: "supersete"; columns: number[] };
export type MaisMilionariaGame = { kind: "maismilionaria"; numbers: number[]; trevos: number[] };
export type SpecialBolaoGame = SuperSeteGame | MaisMilionariaGame;

export const SPECIAL_GAME_SOURCE = {
  supersete: "https://loterias.caixa.gov.br/Paginas/Super-Sete.aspx",
  maismilionaria: "https://loterias.caixa.gov.br/paginas/mais-milionaria.aspx",
} as const;

export function isValidSpecialBolaoGame(value: unknown): value is SpecialBolaoGame {
  if (!value || typeof value !== "object") return false;
  const game = value as Partial<SpecialBolaoGame>;
  if (game.kind === "supersete") {
    const columns = (game as Partial<SuperSeteGame>).columns;
    return Array.isArray(columns) && columns.length === 7 &&
      columns.every(n => Number.isInteger(n) && n >= 0 && n <= 9);
  }
  if (game.kind === "maismilionaria") {
    const numbers = (game as Partial<MaisMilionariaGame>).numbers;
    const trevos = (game as Partial<MaisMilionariaGame>).trevos;
    return Array.isArray(numbers) && numbers.length === 6 && new Set(numbers).size === 6 &&
      numbers.every(n => Number.isInteger(n) && n >= 1 && n <= 50) &&
      Array.isArray(trevos) && trevos.length === 2 && new Set(trevos).size === 2 &&
      trevos.every(n => Number.isInteger(n) && n >= 1 && n <= 6);
  }
  return false;
}

export function formatSpecialBolaoGame(game: SpecialBolaoGame): string {
  if (!isValidSpecialBolaoGame(game)) throw new Error("Jogo especial inválido");
  return game.kind === "supersete"
    ? game.columns.map((digit, i) => `C${i + 1}=${digit}`).join(" ")
    : `DEZENAS=${[...game.numbers].sort((a, b) => a - b).map(n => String(n).padStart(2, "0")).join("-")} TREVOS=${[...game.trevos].sort((a, b) => a - b).join("-")}`;
}

export function specialBolaoInternalTxt(games: SpecialBolaoGame[]): string {
  if (!games.length || !games.every(isValidSpecialBolaoGame) || games.some(g => g.kind !== games[0].kind))
    throw new Error("Lista de jogos especiais inválida");
  return ["TITAN LOTERIAS | PLANEJAMENTO INTERNO", "NÃO É BILHETE, RECIBO OU ARQUIVO DE IMPORTAÇÃO DA CAIXA",
    `MODALIDADE=${games[0].kind}`, `FONTE DAS REGRAS=${SPECIAL_GAME_SOURCE[games[0].kind]}`,
    ...games.map((game, i) => `JOGO ${i + 1}: ${formatSpecialBolaoGame(game)}`)].join("\n");
}
