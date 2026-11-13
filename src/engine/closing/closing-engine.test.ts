import { describe, it, expect } from "vitest";
import { generateClosing, schonheimBound } from "./index";

describe("ClosingEngine — Fase 1 (Greedy + Validação)", () => {
  it("rejeita hipótese de mais dezenas na base do que saem no sorteio", () => {
    const r = generateClosing({
      lottery: { id: "megasena", name: "Mega-Sena", totalNumbers: 60, pick: 6, ticketPrice: 5 },
      baseNumbers: [1, 2, 3, 4, 5, 6, 7],
      guarantee: { hitsInBase: 7, minHits: 5 },
    });
    expect(r.games).toEqual([]);
    expect(r.validation.meetsGuarantee).toBe(false);
  });


  it("gera fechamento clássico da Lotofácil 16→C(16,15)=16 jogos, garante 14", () => {
    const base = Array.from({ length: 16 }, (_, i) => i + 1);
    const r = generateClosing({
      lottery: { id: "lotofacil", name: "Lotofácil", totalNumbers: 25, pick: 15, ticketPrice: 3 },
      baseNumbers: base,
      guarantee: { hitsInBase: 15, minHits: 14 },
    });
    // greedy pode achar solução <= 16 jogos; cobertura deve ser 100
    expect(r.games.length).toBeGreaterThan(0);
    expect(r.games.length).toBeLessThanOrEqual(16);
    expect(r.validation.meetsGuarantee).toBe(true);
    expect(r.validation.guaranteedHits).toBeGreaterThanOrEqual(14);
  });

  it("Mega-Sena 7 base → gera C(7,6)=7 jogos e garante 6 quando os 6 saem na base", () => {
    const base = [3, 8, 15, 22, 27, 40, 55];
    const r = generateClosing({
      lottery: { id: "megasena", name: "Mega-Sena", totalNumbers: 60, pick: 6, ticketPrice: 5 },
      baseNumbers: base,
      guarantee: { hitsInBase: 6, minHits: 6 },
    });
    expect(r.games.length).toBe(7);
    expect(r.validation.guaranteedHits).toBe(6);
    expect(r.validation.meetsGuarantee).toBe(true);
  });

  it("rejeita base menor que pick", () => {
    const r = generateClosing({
      lottery: { id: "megasena", name: "Mega-Sena", totalNumbers: 60, pick: 6, ticketPrice: 5 },
      baseNumbers: [1, 2, 3, 4, 5],
      guarantee: { hitsInBase: 5, minHits: 5 },
    });
    expect(r.games.length).toBe(0);
    expect(r.notes.join(" ")).toMatch(/Base insuficiente/);
  });

  it("Schönheim bound coerente: L(7,6,6)=1 (cobrir todos 6-subsets com blocos de 6)", () => {
    expect(schonheimBound(7, 6, 6)).toBeGreaterThanOrEqual(7);
  });
});
