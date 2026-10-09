import { describe, it, expect } from "vitest";
import {
  parseDrawDate,
  hasValidDrawDate,
  formatDrawDate,
  compareDrawDates,
} from "@/lib/draw-date";

describe("parseDrawDate — formato brasileiro DD/MM/AAAA do banco", () => {
  it("não inverte dia e mês", () => {
    const d = parseDrawDate("06/02/2019");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2019);
    expect(d!.getMonth()).toBe(1); // fevereiro
    expect(d!.getDate()).toBe(6);
  });

  it("aceita dia > 12, que `new Date()` transformava em Invalid Date", () => {
    // Estes são os casos que faziam 61,3% dos registros sumirem dos filtros.
    for (const raw of ["25/12/2024", "31/12/2024", "13/01/2026", "30/09/2026"]) {
      expect(hasValidDrawDate(raw), raw).toBe(true);
      expect(Number.isNaN(parseDrawDate(raw)!.getTime()), raw).toBe(false);
    }
  });

  it("confirma a regressão histórica: new Date() errava onde o parser acerta", () => {
    expect(Number.isNaN(new Date("25/12/2024").getTime())).toBe(true);
    expect(hasValidDrawDate("25/12/2024")).toBe(true);

    expect(new Date("06/02/2019").getMonth()).toBe(5); // junho — errado
    expect(parseDrawDate("06/02/2019")!.getMonth()).toBe(1); // fevereiro — certo
  });

  it("aceita ISO 8601", () => {
    const d = parseDrawDate("2026-10-08T12:00:00Z");
    expect(d).not.toBeNull();
    expect(d!.getUTCFullYear?.() ?? d!.getFullYear()).toBeGreaterThanOrEqual(2026);
  });

  it("retorna null para entrada vazia ou inválida", () => {
    for (const raw of [null, undefined, "", "   ", "32/01/2026", "31/02/2026", "abc"]) {
      expect(parseDrawDate(raw), String(raw)).toBeNull();
    }
  });

  it("rejeita rollover de data inexistente (31/02)", () => {
    expect(parseDrawDate("31/02/2026")).toBeNull();
  });
});

describe("compareDrawDates — ordenação cronológica real", () => {
  it("ordena por data, não lexicograficamente", () => {
    const datas = ["31/12/2022", "31/12/2024", "15/01/2026", "01/02/2025"];
    const ordenado = [...datas].sort(compareDrawDates);
    expect(ordenado).toEqual(["31/12/2022", "31/12/2024", "01/02/2025", "15/01/2026"]);
  });

  it("trata nulos como mais antigos", () => {
    expect(compareDrawDates(null, "01/01/2020")).toBeLessThan(0);
    expect(compareDrawDates("01/01/2020", null)).toBeGreaterThan(0);
  });
});

describe("formatDrawDate", () => {
  it("não renderiza 'Invalid Date'", () => {
    expect(formatDrawDate("25/12/2024")).toBe(new Date(2024, 11, 25).toLocaleDateString("pt-BR"));
    expect(formatDrawDate(null)).toBe("");
    expect(formatDrawDate("lixo")).toBe("");
  });
});
