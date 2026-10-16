import { describe, expect, it } from "vitest";
import {
  formatGamesToCologaTxt,
  generateCaixaAutomationScript,
  generateBookmarkletUrl,
} from "./caixaAutomation";

describe("Caixa Automation & Cologa TXT Exporter", () => {
  const mockGames = [
    [15, 3, 1, 25, 12, 7],
    [2, 4, 6, 8, 10, 12],
  ];

  it("formata jogos para o padrão universal Cologa com dezenas ordenadas e 2 dígitos", () => {
    const txt = formatGamesToCologaTxt(mockGames);
    const lines = txt.split("\n");

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("01 03 07 12 15 25");
    expect(lines[1]).toBe("02 04 06 08 10 12");
  });

  it("gera script executável com JSON dos jogos embutido para o portal da Caixa", () => {
    const script = generateCaixaAutomationScript(mockGames, "Mega-Sena");

    expect(script).toContain("TITAN LOTERIAS");
    expect(script).toContain("Mega-Sena");
    expect(script).toContain("loteriasonline.caixa.gov.br");
    expect(script).toContain("[[1,3,7,12,15,25],[2,4,6,8,10,12]]");
    expect(script).toContain("colocar no carrinho");
  });

  it("gera Bookmarklet no padrão javascript:...", () => {
    const url = generateBookmarkletUrl(mockGames, "Lotofácil");

    expect(url.startsWith("javascript:")).toBe(true);
    expect(url).toContain("Titan");
  });
});
