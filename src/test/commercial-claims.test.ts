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

  it("não exibe números fictícios como auditoria nem jackpot fixo na landing", () => {
    const process = content("src/components/landing/HowItWorksSection.tsx");
    const showcase = content("src/components/landing/ScreensShowcase.tsx");
    const specials = content("src/components/landing/SeasonalJackpotsSection.tsx");
    expect(process).not.toContain("Validando integridade de 100% dos concursos");
    expect(showcase).not.toContain("14.502");
    expect(showcase).toContain("Demonstração ilustrativa");
    expect(specials).not.toMatch(/R\$ (?:500|200|35)\+ Milhões/);
  });

  it("não exibe prêmio em dinheiro inventado no simulador histórico ativo", () => {
    const simulator = content("src/components/lottery/simulators/HistoricalSimulatorPanel.tsx");
    expect(simulator).not.toContain("Prêmio Estimado");
    expect(simulator).not.toContain("💰 {prize.estimatedPrize");
    expect(simulator).toContain("Faixa possível");
  });

  it("não inventa premiação no conferidor de bilhetes", () => {
    const checker = content("src/components/lottery/PhysicalTicketCheckerDialog.tsx");
    expect(checker).not.toContain("Estimativa Líquida de Resgate");
    expect(checker).not.toContain("CaixaPrizeRedemptionDialog");
    expect(checker).not.toContain("value: 50000000");
    expect(checker).toContain("Somente conferência de dezenas");
  });

  it("não atribui lucro ou rateios inventados à planilha de matrizes", () => {
    const worksheet = content("src/pages/PlanilhasMatrizPage.tsx");
    expect(worksheet).not.toContain("PRIZE_ESTIMATES");
    expect(worksheet).not.toContain("Lucro Líquido");
    expect(worksheet).not.toContain("Retorno Estimado");
    expect(worksheet).toContain("não há retorno líquido calculável");
  });

  it("não apresenta amostragem como garantia no painel executivo", () => {
    const executive = content("src/components/closing/ClosingExecutiveSummaryPanel.tsx");
    expect(executive).toContain("v.exhaustive && v.testedScenarios > 0 && v.meetsGuarantee");
    expect(executive).toContain("Verificação exaustiva: meta não atingida");
    expect(executive).not.toContain("Garantia Estimada por Amostragem");
  });

  it("identifica fichas imprimíveis como não oficiais", () => {
    const ticket = content("src/components/closing/ClosingTicketPanel.tsx");
    expect(ticket).toContain("não comprova aposta, pagamento, registro ou prêmio");
    expect(ticket).toContain("Não são volantes ou comprovantes oficiais de apostas");
    expect(ticket).not.toContain("registro em lotérica");
    expect(ticket).not.toContain("hash único");
  });

  it("comparativo não ranqueia matriz inválida nem confunde meta e prova", () => {
    const comparison = content("src/components/lottery/analysis/MatrixComparisonPanel.tsx");
    expect(comparison).toContain("isUsableWheelingMatrix(m.id)");
    expect(comparison).toContain("Meta provada");
    expect(comparison).not.toContain(">Melhor</Badge>");
  });

  it("PDF e Excel profissionais verificam os jogos que exportam", () => {
    const panel = content("src/components/closing/ClosingProExportPanel.tsx");
    expect(panel).toContain("validateExportedGames(");
    expect(panel).toContain("result.games,");
    expect(panel).not.toContain("result.validation.exhaustive");
    expect(panel).toContain("Meta não atingida");
    expect(panel).toContain("Amostral: sem prova");
  });

  it("biblioteca não vende cobertura ou origem histórica sem prova", () => {
    const presets = content("src/engine/closing/library/classicClosings.ts");
    const panel = content("src/components/closing/ClosingLibraryPanel.tsx");
    expect(presets).not.toMatch(/coverage: \d+/);
    expect(presets).not.toContain("origin:");
    expect(panel).toContain("Sem prova prévia");
    expect(panel).toContain("disabled={!compatible}");
    expect(panel).not.toContain("Garantia:");
  });

  it("preset e recomendação na tela universal não são provas antecipadas", () => {
    const page = content("src/pages/FechamentoUniversalPage.tsx");
    expect(page).not.toContain("garantia ${opts.minHits}");
    expect(page).not.toContain("garantia ${rec.minHits}");
    expect(page).toContain("meta ${opts.minHits} acertos (a validar)");
    expect(page).toContain("exaustiva: meta não atingida");
  });

  it("recomendador não inventa ROI ou cobertura antes de gerar jogos", () => {
    const engine = content("src/engine/closing/ai/AIRecommendationEngine.ts");
    const panel = content("src/components/closing/ClosingAIRecommendationPanel.tsx");
    expect(engine).not.toContain("expectedROI");
    expect(engine).not.toContain("expectedCoverage");
    expect(panel).toContain("Sem previsão de cobertura, prêmio ou ROI");
    expect(panel).toContain("disabled={!rec.budgetFits || rec.maxGames < 1}");
  });

  it("sensibilidade não promete economia ou garantia sem gerar jogos", () => {
    const panel = content("src/components/closing/ClosingSensitivityPanel.tsx");
    expect(panel).toContain("não são jogos gerados");
    expect(panel).not.toContain("economia estimada");
    expect(panel).not.toContain("mantendo a mesma garantia");
    expect(panel).not.toContain("projetaria");
  });

  it("não anuncia métricas fictícias ou aumento de chance no painel público", () => {
    const panel = content("src/components/common/TitanCommandCenter.tsx");
    expect(panel).not.toContain("CAIXA-API-OK");
    expect(panel).not.toContain("INTEGRIDADE: 100%");
    expect(panel).not.toContain("Math.random()");
    expect(content("index.html")).not.toContain("Aumente suas chances");
  });
});
