import { describe, expect, it } from "vitest";
import { LOTTERIES } from "@/data/lotteries";
import { isValidSimpleBolaoGame } from "./bolaoGameValidation";

const mega = LOTTERIES.find(l => l.id === "megasena")!;
describe("jogos simples importados para bolão", () => {
  it("aceita somente dezenas distintas no intervalo da modalidade", () => {
    expect(isValidSimpleBolaoGame([1, 2, 3, 4, 5, 60], mega)).toBe(true);
    expect(isValidSimpleBolaoGame([1, 2, 3, 4, 5, 5], mega)).toBe(false);
    expect(isValidSimpleBolaoGame([1, 2, 3, 4, 5, 61], mega)).toBe(false);
    expect(isValidSimpleBolaoGame([1, 2, 3, 4, 5, 6.5], mega)).toBe(false);
    expect(isValidSimpleBolaoGame([1, 2, 3], mega)).toBe(false);
  });
  it("não aplica regra de dezenas simples à Federal ou Super Sete", () => {
    expect(isValidSimpleBolaoGame([12345], LOTTERIES.find(l => l.id === "federal")!)).toBe(false);
    expect(isValidSimpleBolaoGame([1, 2, 3, 4, 5, 6, 7], LOTTERIES.find(l => l.id === "supersete")!)).toBe(false);
  });
});
