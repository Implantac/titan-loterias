import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("ROI automático suspenso", () => {
  it("não grava gasto e prêmio presumidos de jogos salvos", () => {
    const source = readFileSync("supabase/functions/notify-bet-results/index.ts", "utf8");
    expect(source).not.toContain('.from("user_roi_tracking")');
    expect(source).toContain('roi_updated: 0');
    expect(source).not.toMatch(/\bsupersete\s*:/);
    expect(source).toContain('nums.length !== info.pick');
  });
  it("não alimenta dimensionamento de banca com estimativas antigas", () => {
    const source = readFileSync("src/hooks/useROIByLottery.ts", "utf8");
    expect(source).not.toContain('.from("user_roi_tracking")');
    expect(source).toContain('data: []');
  });
});
