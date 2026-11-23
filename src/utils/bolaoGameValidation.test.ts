import { describe, expect, it } from "vitest";
import { LOTTERIES } from "@/data/lotteries";
import { isValidSimpleBolaoGame, normalizeGeneratedSimpleBolaoGame } from "./bolaoGameValidation";

const mega = LOTTERIES.find(l => l.id === "megasena")!;
describe("jogos simples importados para bolão", () => {
  it("aceita somente dezenas distintas no intervalo da modalidade", () => {
    expect(isValidSimpleBolaoGame([1, 2, 3, 4, 5, 60], mega)).toBe(true);
    expect(isValidSimpleBolaoGame([1, 2, 3, 4, 5, 5], mega)).toBe(false);
    expect(isValidSimpleBolaoGame([1, 2, 3, 4, 5, 61], mega)).toBe(false);
    expect(isValidSimpleBolaoGame([1, 2, 3, 4, 5, 6.5], mega)).toBe(false);
    expect(isValidSimpleBolaoGame([1, 2, 3], mega)).toBe(false);
  });
  it("Lotomania aceita 00..99, nunca 100", () => {
    const lotomania = LOTTERIES.find(l => l.id === "lotomania")!;
    const game = Array.from({ length: 50 }, (_, i) => i);
    expect(isValidSimpleBolaoGame(game, lotomania)).toBe(true);
    expect(isValidSimpleBolaoGame([...game.slice(0, 49), 100], lotomania)).toBe(false);
    expect(normalizeGeneratedSimpleBolaoGame([...game.slice(1), 100], lotomania).sort((a, b) => a - b)).toEqual(game);
  });
  it("não aplica regra genérica a modalidades com campos adicionais ou posicionais", () => {
    expect(isValidSimpleBolaoGame([12345], LOTTERIES.find(l => l.id === "federal")!)).toBe(false);
    expect(isValidSimpleBolaoGame([1, 2, 3, 4, 5, 6, 7], LOTTERIES.find(l => l.id === "supersete")!)).toBe(false);
    expect(isValidSimpleBolaoGame([1, 2, 3, 4, 5, 6], LOTTERIES.find(l => l.id === "maismilionaria")!)).toBe(false);
    expect(isValidSimpleBolaoGame([1, 2, 3, 4, 5, 6, 7], LOTTERIES.find(l => l.id === "diadesorte")!)).toBe(false);
  });
});
