import { describe, expect, it } from "vitest";
import { generateClosing } from "../core/ClosingEngine";
import { filterClosingResult } from "./filterClosingResult";

const original = generateClosing({
  lottery: { id: "megasena", name: "Mega-Sena", totalNumbers: 60, pick: 6, ticketPrice: 6 },
  baseNumbers: [1, 2, 3, 4, 5, 6, 7],
  guarantee: { hitsInBase: 6, minHits: 6 }, strategy: "greedy",
});

describe("filtros pós-geração não herdam garantia antiga", () => {
  it("recalcula pior caso e custo após remover bilhetes", () => {
    expect(original.validation.meetsGuarantee).toBe(true);
    const result = filterClosingResult(original, [{ id: "excluded", params: { excluded: [7] } }]);
    expect(result.gameCount).toBeLessThan(original.gameCount);
    expect(result.cost).toBe(result.gameCount * 6);
    expect(result.validation.meetsGuarantee).toBe(false);
    expect(result.validation.guaranteedHits).toBeLessThan(6);
  });
  it("não exibe os jogos originais se todos forem excluídos", () => {
    const result = filterClosingResult(original, [{ id: "excluded", params: { excluded: [1, 2, 3, 4, 5, 6, 7] } }]);
    expect(result.games).toEqual([]);
    expect(result.cost).toBe(0);
    expect(result.validation.meetsGuarantee).toBe(false);
  });
});
