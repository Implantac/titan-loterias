import { describe, expect, it } from "vitest";
import {
  analyzeWorksheetGames,
  generateWorksheetMatrixGames,
  LOTOFACIL_WORKSHEET_PRESETS,
} from "@/engine/worksheet-matrices";
import { validateWheelCoverage } from "@/engine/wheeling/coverageValidator";

describe("worksheet matrices", () => {
  it("generates Lotofacil worksheet games with 15 numbers", () => {
    const preset = LOTOFACIL_WORKSHEET_PRESETS.find((item) => item.id === "plan17x8")!;
    const selected = Array.from({ length: 17 }, (_, index) => index + 1);

    const games = generateWorksheetMatrixGames(preset, selected);

    expect(games).toHaveLength(8);
    expect(games.every((game) => game.length === 15)).toBe(true);
    expect(games.every((game) => new Set(game).size === 15)).toBe(true);
  });

  it("checks generated games against a draw", () => {
    const preset = LOTOFACIL_WORKSHEET_PRESETS.find((item) => item.id === "plan19x5")!;
    const selected = Array.from({ length: 19 }, (_, index) => index + 1);
    const games = generateWorksheetMatrixGames(preset, selected);
    const draw = {
      concurso: 3200,
      date: "2026-06-03",
      numbers: Array.from({ length: 15 }, (_, index) => index + 1),
    };

    const result = analyzeWorksheetGames(games, draw);

    expect(result.games).toHaveLength(5);
    expect(result.bestHits).toBeGreaterThan(0);
    expect(result.totalCost).toBe(15);
  });

  it("garante que todos os 7 presets geram jogos válidos de 15 dezenas com contagem exata", () => {
    for (const preset of LOTOFACIL_WORKSHEET_PRESETS) {
      let selected: number[];
      if (preset.mode === "base") {
        selected = Array.from({ length: preset.baseCount ?? 21 }, (_, i) => i + 1);
      } else if (preset.mode === "fixed-plus-pool") {
        selected = Array.from({ length: (preset.fixedCount ?? 6) + (preset.poolCount ?? 14) }, (_, i) => i + 1);
      } else {
        selected = Array.from({ length: (preset.fixedCount ?? 3) + (preset.eliminatedCount ?? 2) }, (_, i) => i + 1);
      }

      const games = generateWorksheetMatrixGames(preset, selected);
      expect(games, `Preset ${preset.id} deve gerar ${preset.gameCount} jogos`).toHaveLength(preset.gameCount);
      expect(games.every(g => g.length === 15), `Preset ${preset.id} deve ter 15 dezenas em cada jogo`).toBe(true);
      expect(games.every(g => new Set(g).size === 15), `Preset ${preset.id} não deve ter dezenas duplicadas`).toBe(true);

      // Garante proteção anti-plágio: nenhum termo da planilha externa
      const lowerLabel = preset.label.toLowerCase();
      expect(lowerLabel).not.toContain("tribo da sorte");
      expect(lowerLabel).not.toContain("farol selecionador");
    }
  });

  it("valida status de cobertura exaustiva vs amostral para matrizes da planilha", () => {
    // plan17x8: C(17, 15) = 136 cenários <= 5000 -> 100% EXAUSTIVO
    const preset17 = LOTOFACIL_WORKSHEET_PRESETS.find((p) => p.id === "plan17x8")!;
    const selected17 = Array.from({ length: 17 }, (_, i) => i + 1);
    const games17 = generateWorksheetMatrixGames(preset17, selected17);
    const numToIndex17 = new Map(selected17.map((n, i) => [n, i]));
    const indexGames17 = games17.map((g) => g.map((n) => numToIndex17.get(n)!));
    const val17 = validateWheelCoverage(indexGames17, 17, 15, 15, 11);
    expect(val17.exhaustive).toBe(true);
    expect(val17.testedScenarios).toBe(136);

    // plan21x50: C(21, 15) = 54.264 cenários > 5000 -> AMOSTRAL (Monte Carlo)
    const preset21 = LOTOFACIL_WORKSHEET_PRESETS.find((p) => p.id === "plan21x50")!;
    const selected21 = Array.from({ length: 21 }, (_, i) => i + 1);
    const games21 = generateWorksheetMatrixGames(preset21, selected21);
    const numToIndex21 = new Map(selected21.map((n, i) => [n, i]));
    const indexGames21 = games21.map((g) => g.map((n) => numToIndex21.get(n)!));
    const val21 = validateWheelCoverage(indexGames21, 21, 15, 15, 11);
    expect(val21.exhaustive).toBe(false);
    expect(val21.testedScenarios).toBe(5000);
  });
});
