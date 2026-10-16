import { describe, expect, it } from "vitest";
import { nativeLotteryAgent } from "./nativeLotteryAgent";
import { computeFrequencyStats } from "@/engine/stats/statistics";

describe("NativeLotteryAgent — Zero Token AI", () => {
  const mockDraws = [
    { concurso: 3200, date: "2026-06-03", numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
    { concurso: 3199, date: "2026-06-02", numbers: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] },
  ];

  const mockStats = computeFrequencyStats(mockDraws, 25);

  it("responde sobre números quentes sem consumir tokens", () => {
    const res = nativeLotteryAgent.process({
      input: "Quais os números mais quentes?",
      lotteryId: "lotofacil",
      draws: mockDraws,
      stats: mockStats,
    });

    expect(res.metadata.tokensConsumed).toBe(0);
    expect(res.markdown).toContain("Radar de Dezenas Quentes");
    expect(res.markdown).toContain("Lotofácil");
    expect(res.suggestions.length).toBeGreaterThan(0);
  });

  it("responde sobre dezenas atrasadas", () => {
    const res = nativeLotteryAgent.process({
      input: "Quais números estão atrasados?",
      lotteryId: "lotofacil",
      draws: mockDraws,
      stats: mockStats,
    });

    expect(res.markdown).toContain("Radar de Atrasos & Fechamento de Ciclo");
    expect(res.metadata.tokensConsumed).toBe(0);
  });

  it("gera jogos estruturados com Titan Score", () => {
    const res = nativeLotteryAgent.process({
      input: "Gere 3 jogos equilibrados",
      lotteryId: "lotofacil",
      draws: mockDraws,
      stats: mockStats,
    });

    expect(res.generatedGames).toBeDefined();
    expect(res.generatedGames?.length).toBe(3);
    expect(res.markdown).toContain("Jogos Otimizados");
    expect(res.markdown).toContain("Titan Score");
  });

  it("explica a estratégia de fechamento matemático e garantias", () => {
    const res = nativeLotteryAgent.process({
      input: "Explique a estratégia de fechamento",
      lotteryId: "lotofacil",
      draws: mockDraws,
      stats: mockStats,
    });

    expect(res.markdown).toContain("Fechamentos Matemáticos");
    expect(res.markdown).toContain("100% EXAUSTIVO");
  });

  it("explica o filtro split-avoidance (anti-divisão de prêmio)", () => {
    const res = nativeLotteryAgent.process({
      input: "Como funciona o split avoidance?",
      lotteryId: "lotofacil",
      draws: mockDraws,
      stats: mockStats,
    });

    expect(res.markdown).toContain("Anti-Divisão de Prêmio (Split-Avoidance)");
  });

  it("informa os preços oficiais atualizados da Caixa", () => {
    const res = nativeLotteryAgent.process({
      input: "Quanto custa a aposta?",
      lotteryId: "lotofacil",
      draws: mockDraws,
      stats: mockStats,
    });

    expect(res.markdown).toContain("R$ 3,50");
    expect(res.markdown).toContain("Mega-Sena");
  });

  it("faz streaming suave da resposta com cancelamento por signal", async () => {
    const deltas: string[] = [];
    const controller = new AbortController();

    await nativeLotteryAgent.stream(
      {
        input: "Qual a melhor abordagem para hoje?",
        lotteryId: "lotofacil",
        draws: mockDraws,
        stats: mockStats,
      },
      (chunk) => deltas.push(chunk),
      (full) => {
        expect(full.markdown.length).toBeGreaterThan(50);
      },
      controller.signal
    );

    expect(deltas.length).toBeGreaterThan(0);
    expect(deltas.join("")).toContain("Guia Tático Recomendado");
  });

  it("audita volante fornecido pelo apostador com cálculo do Titan Score e X-Ray", () => {
    const res = nativeLotteryAgent.process({
      input: "Audite o meu volante da Lotofácil: 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15",
      lotteryId: "lotofacil",
      draws: mockDraws,
      stats: mockStats,
    });

    expect(res.metadata.tokensConsumed).toBe(0);
    expect(res.markdown).toContain("Raio-X & Auditoria de Jogo");
    expect(res.markdown).toContain("Titan Score");
    expect(res.markdown).toContain("Soma Total");
    expect(res.markdown).toContain("Paridade");
    expect(res.markdown).toContain("Moldura");
  });

  it("calcula planejamento orçamentário de bancada e bolão com preços reais", () => {
    const res = nativeLotteryAgent.process({
      input: "Tenho R$ 50 para jogar na Lotofácil, como distribuir?",
      lotteryId: "lotofacil",
      draws: mockDraws,
      stats: mockStats,
    });

    expect(res.metadata.tokensConsumed).toBe(0);
    expect(res.markdown).toContain("Planejamento Orçamentário");
    expect(res.markdown).toContain("R$ 3,50");
    expect(res.markdown).toContain("apostas simples");
    expect(res.suggestions.length).toBeGreaterThan(0);
  });

  it("desmistifica Surpresinha e Teimosinha com base probabilística", () => {
    const res = nativeLotteryAgent.process({
      input: "A Surpresinha da lotérica vale a pena?",
      lotteryId: "lotofacil",
      draws: mockDraws,
      stats: mockStats,
    });

    expect(res.metadata.tokensConsumed).toBe(0);
    expect(res.markdown).toContain("Surpresinha da Lotérica");
    expect(res.markdown).toContain("entropia calibrada");
  });

  it("combate a falácia do apostador e explica independência estatística", () => {
    const res = nativeLotteryAgent.process({
      input: "O número 10 está muito atrasado, ele tem mais chance de sair hoje?",
      lotteryId: "lotofacil",
      draws: mockDraws,
      stats: mockStats,
    });

    expect(res.metadata.tokensConsumed).toBe(0);
    expect(res.markdown).toContain("Falácia do Apostador");
    expect(res.markdown).toContain("não tem memória");
  });
});
