import { describe, expect, it } from "vitest";
import { formatSpecialBolaoGame, isValidSpecialBolaoGame, specialBolaoInternalTxt } from "./specialBolaoGames";

describe("jogos especiais para planejamento interno", () => {
  it("preserva ordem posicional e aceita dígitos repetidos no Super Sete", () => {
    const game = { kind: "supersete", columns: [0, 2, 2, 9, 0, 5, 7] };
    expect(isValidSpecialBolaoGame(game)).toBe(true);
    expect(formatSpecialBolaoGame(game as any)).toContain("C1=0 C2=2 C3=2");
    expect(isValidSpecialBolaoGame({ ...game, columns: [0, 1, 2, 3, 4, 5, 10] })).toBe(false);
    expect(isValidSpecialBolaoGame({ ...game, columns: [0, 1, 2, 3, 4, 5] })).toBe(false);
  });
  it("exige seis dezenas e dois trevos distintos na +Milionária", () => {
    const game = { kind: "maismilionaria", numbers: [50, 1, 3, 8, 12, 25], trevos: [6, 1] };
    expect(isValidSpecialBolaoGame(game)).toBe(true);
    expect(formatSpecialBolaoGame(game as any)).toContain("DEZENAS=01-03-08-12-25-50 TREVOS=1-6");
    expect(isValidSpecialBolaoGame({ ...game, trevos: [1, 1] })).toBe(false);
    expect(isValidSpecialBolaoGame({ ...game, numbers: [1, 1, 3, 8, 12, 25] })).toBe(false);
  });
  it("TXT interno não se declara formato de importação oficial", () => {
    const txt = specialBolaoInternalTxt([{ kind: "supersete", columns: [0, 1, 2, 3, 4, 5, 6] }]);
    expect(txt).toContain("NÃO É BILHETE, RECIBO OU ARQUIVO DE IMPORTAÇÃO DA CAIXA");
    expect(() => specialBolaoInternalTxt([])).toThrow();
    expect(() => specialBolaoInternalTxt([{ kind: "maismilionaria", numbers: [1, 2, 3, 4, 5, 6], trevos: [1, 2] },
      { kind: "supersete", columns: [0, 1, 2, 3, 4, 5, 6] }])).toThrow();
  });
});
