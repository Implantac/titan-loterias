import { describe, expect, it } from "vitest";
import { validateClosing } from "./ValidationEngine";

describe("validação de garantias: falha de forma segura", () => {
  it("não declara garantia com base em amostra, mesmo se todos os sorteios amostrados baterem a meta", () => {
    const result = validateClosing([Array.from({ length: 10 }, (_, i) => i)], 20, 10, 1);
    expect(result.exhaustive).toBe(false);
    expect(result.testedScenarios).toBeGreaterThan(0);
    expect(result.guaranteedHits).toBeGreaterThanOrEqual(1);
    expect(result.meetsGuarantee).toBe(false);
  });

  it("prova uma garantia real quando todos os cenários são enumerados", () => {
    const result = validateClosing([[0, 1], [0, 2], [1, 2]], 3, 2, 2);
    expect(result.exhaustive).toBe(true);
    expect(result.meetsGuarantee).toBe(true);
  });

  it("rejeita hipótese impossível, índices fora da base e jogo duplicado", () => {
    for (const result of [
      validateClosing([[0, 1]], 3, 4, 1),
      validateClosing([[0, 3]], 3, 2, 1),
      validateClosing([[0, 0]], 3, 2, 1),
    ]) {
      expect(result.meetsGuarantee).toBe(false);
      expect(result.testedScenarios).toBe(0);
    }
  });
});

describe("amostragem do motor de fechamentos", () => {
  it("repete a validação amostral com a mesma semente", () => {
    const games = [Array.from({ length: 10 }, (_, i) => i)];
    const first = validateClosing(games, 20, 10, 5, 12345);
    expect(first.exhaustive).toBe(false);
    expect(validateClosing(games, 20, 10, 5, 12345)).toEqual(first);
    // Mesmo sem informar semente, a escolha padrão é estável para estes parâmetros.
    expect(validateClosing(games, 20, 10, 5)).toEqual(validateClosing(games, 20, 10, 5));
  });
});
