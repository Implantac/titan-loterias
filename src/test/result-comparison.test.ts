import { describe, expect, it } from "vitest";
import { countSavedGameMatches, isSimpleResultLottery } from "../../supabase/functions/_shared/result-comparison";

describe("comparação numérica de jogos salvos", () => {
  it("compara jogos simples válidos sem confundir a ordem", () => {
    expect(countSavedGameMatches("megasena", [1, 2, 3, 4, 5, 6], [60, 5, 2, 3, 10, 20])).toBe(3);
  });
  it("rejeita jogo incompleto, duplicado e sorteio malformado", () => {
    expect(countSavedGameMatches("megasena", [1, 2], [1, 2, 3, 4, 5, 6])).toBeNull();
    expect(countSavedGameMatches("megasena", [1, 1, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6])).toBeNull();
    expect(countSavedGameMatches("megasena", [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 61])).toBeNull();
  });
  it("não compara modalidades especiais pelo número bruto de dezenas", () => {
    for (const id of ["supersete", "lotomania", "maismilionaria", "duplasena", "timemania", "diadesorte"])
      expect(isSimpleResultLottery(id)).toBe(false);
  });
});
