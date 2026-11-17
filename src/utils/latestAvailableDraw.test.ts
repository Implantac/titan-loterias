import { describe, expect, it } from "vitest";
import { latestAvailableDraw } from "./latestAvailableDraw";

describe("último concurso disponível", () => {
  it("não confunde ordem de importação com número do concurso", () => {
    expect(latestAvailableDraw([
      { concurso: 9, date: "2026-01-01", numbers: [1] },
      { concurso: 11, date: "2026-01-03", numbers: [3] },
      { concurso: 10, date: "2026-01-02", numbers: [2] },
    ])?.concurso).toBe(11);
    expect(latestAvailableDraw([])).toBeNull();
    expect(latestAvailableDraw([{ concurso: NaN, date: "", numbers: [] }])).toBeNull();
  });
});
