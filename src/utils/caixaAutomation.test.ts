import { describe, expect, it } from "vitest";
import { formatGamesToCologaTxt } from "./caixaAutomation";

describe("exportação TXT de jogos planejados", () => {
  it("ordena dezenas sem alterar os jogos originais", () => {
    const games = [[15, 3, 1, 25, 12, 7], [2, 4, 6, 8, 10, 12]];
    expect(formatGamesToCologaTxt(games)).toBe("01 03 07 12 15 25\n02 04 06 08 10 12");
    expect(games[0][0]).toBe(15);
  });
});
