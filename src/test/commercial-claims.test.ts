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

  it("planejador de orçamento não simula retorno financeiro inventado", () => {
    const planner = content("src/components/lottery/simulators/InvestmentSimulator.tsx");
    expect(planner).not.toContain("estimatedReturn");
    expect(planner).not.toContain("Expectativa de Retorno");
    expect(planner).toContain("estimated_return: null");
    expect(planner).toContain("Planejador de Orçamento");
  });

  it("plano anual recorrente e vitalício único são descritos sem descontos inventados", () => {
    const plans = content("src/pages/PlanosPage.tsx");
    const pricing = content("src/components/common/PricingSection.tsx");
    const faq = content("src/components/plans/PlanFAQ.tsx");
    const terms = content("src/pages/LegalPage.tsx");
    for (const page of [plans, pricing]) {
      expect(page).not.toContain("R$ 397,00");
      expect(page).not.toContain("-75% DE DESCONTO");
      expect(page).not.toContain("12x de R$ 9,98");
    }
    expect(plans).not.toContain("Cobrança única de R$ 69,90");
    expect(faq).toContain("renovação automática a cada 12 meses");
    expect(terms).toContain("assinatura com renovação automática");
  });

  it("preserva destino e modalidade da campanha após o login", () => {
    expect(content("src/components/landing/MegaViradaBanner.tsx")).toContain('/bolao?lottery=megasena');
    expect(content("src/components/ProtectedRoute.tsx")).toContain('encodeURIComponent(location.pathname + location.search)');
    expect(content("src/pages/BolaoPage.tsx")).toContain('isRestorableBolaoDraft');
  });

  it("não incentiva script de console na Caixa nem promete vantagem matemática no FAQ", () => {
    const exportDialog = content("src/components/lottery/ExportCaixaDialog.tsx");
    const studies = content("src/pages/CentralEstudosPage.tsx");
    expect(exportDialog).not.toContain("handleCopyScript");
    expect(content("src/utils/caixaAutomation.ts")).not.toContain("generateCaixaAutomationScript");
    expect(content("src/utils/caixaAutomation.ts")).not.toContain("javascript:");
    expect(exportDialog).not.toContain("bookmarkletUrl");
    expect(exportDialog).toContain("Não cole códigos no console");
    expect(studies).not.toContain("aumenta suas chances matemáticas");
    expect(studies).toContain("verificada exaustivamente");
  });

  it("bolão não confunde registro interno com aposta ou cobrança confirmada", () => {
    const page = content("src/pages/BolaoPage.tsx");
    const dialog = content("src/components/lottery/BolaoContractDialog.tsx");
    const record = content("src/utils/bolaoContract.ts");
    const pix = content("src/utils/pix.ts");
    const shortcuts = content("src/components/lottery/CockpitShortcuts.tsx");
    for (const file of [page, dialog, shortcuts]) {
      expect(file).not.toMatch(/Contrato Blindado|Cobrança PIX Automática/);
    }
    expect(page).toContain("O Titan não consulta o banco e não confirma transferências");
    expect(page).toContain("As cotas se referem ao grupo inteiro de jogos");
    expect(page).not.toContain("Jogos Atribuidos");
    expect(page).not.toContain("para não dividir o prêmio caso seja premiado");
    expect(page).toContain("Não aumenta a chance de acerto nem garante");
    expect(page).toContain("!pixPayload");
    expect(record).toContain("Não é bilhete, recibo de aposta");
    expect(record).toContain("não autentica o PDF inteiro");
    expect(record).not.toContain('"QUITADO"');
    expect(pix).toContain("não comprova aposta na Caixa");
    expect(pix).toContain("isValidPixKey(rawKey)");
  });

  it("não anuncia métricas fictícias ou aumento de chance no painel público", () => {
    const panel = content("src/components/common/TitanCommandCenter.tsx");
    expect(panel).not.toContain("CAIXA-API-OK");
    expect(panel).not.toContain("INTEGRIDADE: 100%");
    expect(panel).not.toContain("Math.random()");
    expect(content("index.html")).not.toContain("Aumente suas chances");
  });
});
