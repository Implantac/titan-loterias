import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const content = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("alegações comerciais auditáveis", () => {
  it("não fixa quantidade divergente de modalidades nos planos", () => {
    for (const path of ["src/pages/PlanosPage.tsx", "src/components/common/PricingSection.tsx"]) {
      expect(content(path)).not.toMatch(/todas as 9 loterias oficiais/i);
    }
  });

  it("não inventa premiação no conferidor de bilhetes", () => {
    const checker = content("src/components/lottery/PhysicalTicketCheckerDialog.tsx");
    expect(checker).not.toContain("Estimativa Líquida de Resgate");
    expect(checker).not.toContain("CaixaPrizeRedemptionDialog");
    expect(checker).not.toContain("value: 50000000");
    expect(checker).toContain("Somente conferência de dezenas");
  });

  it("não anuncia métricas fictícias ou aumento de chance no painel público", () => {
    const panel = content("src/components/common/TitanCommandCenter.tsx");
    expect(panel).not.toContain("CAIXA-API-OK");
    expect(panel).not.toContain("INTEGRIDADE: 100%");
    expect(panel).not.toContain("Math.random()");
    expect(content("index.html")).not.toContain("Aumente suas chances");
  });
});
