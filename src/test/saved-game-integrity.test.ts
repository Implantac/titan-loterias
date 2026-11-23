import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { LOTTERIES } from "@/data/lotteries";
import { isValidSimpleBolaoGame } from "@/utils/bolaoGameValidation";

const source = (p: string) => readFileSync(p, "utf8");
describe("integridade de jogos salvos", () => {
  it("hook recusa formato incompleto antes de inserir no banco", () => {
    const hook = source("src/hooks/useSavedBets.ts");
    expect(hook.indexOf("isValidSimpleBolaoGame(bet?.numbers, lottery)")).toBeLessThan(hook.indexOf('.from("saved_bets").insert'));
    expect(hook).toContain("não é aposta registrada");
  });
  it("modalidades com campos extras não são representadas por um number[]", () => {
    for (const id of ["supersete", "maismilionaria", "timemania", "diadesorte", "federal"]) {
      const lottery = LOTTERIES.find(l => l.id === id)!;
      expect(isValidSimpleBolaoGame(Array.from({ length: lottery.pick }, (_, i) => i + 1), lottery)).toBe(false);
    }
  });
  it("gerador não reaproveita resultados de outra modalidade nem salva jogo inválido", () => {
    const page = source("src/pages/GeradorPage.tsx");
    expect(page).toContain("<GeradorPageForLottery key={config.id} />");
    expect(page).toContain("processedResults.every(item => isValidSimpleBolaoGame(item.numbers, config))");
  });
});
