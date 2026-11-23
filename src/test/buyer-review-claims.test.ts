import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const file = (path: string) => readFileSync(path, "utf8");

describe("correções de confiança na jornada do apostador", () => {
  it("jogos salvos não exibem premiações como prova de aposta", () => {
    const source = file("src/pages/JogosSalvosPage.tsx");
    expect(source).not.toContain("Premiações Recentes");
    expect(source).not.toContain("getPrizeTiers");
    expect(source).toContain("countSavedGameMatches");
    expect(source).toContain("comparação retrospectiva");
  });
  it("oferta não promete PIX instantâneo, prova geral nem recibo oficial", () => {
    const sources = ["src/components/common/PricingSection.tsx", "src/components/landing/HeroSection.tsx", "src/pages/PlanosPage.tsx"].map(file).join("\n");
    for (const claim of ["Pix Imediato", "Acesso em 30 segundos", "Garantia Exaustiva", "Recibo WhatsApp", "Exportação de bilhetes"])
      expect(sources).not.toContain(claim);
  });
});
