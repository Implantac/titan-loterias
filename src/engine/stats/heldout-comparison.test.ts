import { describe, expect, it } from "vitest";
import { compareHeldoutHits, splitHeldoutDraws } from "./heldout-comparison";

describe("comparação fora da amostra com orçamento igual", () => {
  it("compara o mesmo número de jogos em concursos separados", () => {
    const r = compareHeldoutHits([[1, 2], [3, 4]], [[1, 3], [2, 4]],
      [{ numbers: [1, 2] }, { numbers: [3, 4] }], 2, 2);
    expect(r.gamesPerStrategy).toBe(2);
    expect(r.generated.targetDraws).toBe(2);
    expect(r.random.targetDraws).toBe(0);
  });
  it("separa concursos mais recentes e impede vazamento entre treino e teste", () => {
    const draws = Array.from({ length: 25 }, (_, i) => ({ concurso: i + 1, date: "", numbers: [i + 1] }));
    const { training, test } = splitHeldoutDraws(draws, 5);
    expect(test.map(d => d.concurso)).toEqual([25, 24, 23, 22, 21]);
    expect(training[0].concurso).toBe(20);
    expect(() => splitHeldoutDraws(draws.slice(0, 23), 5)).toThrow();
    expect(() => splitHeldoutDraws([...draws, draws[0]], 5)).toThrow();
  });
  it("rejeita quantidade de jogos desigual", () => {
    expect(() => compareHeldoutHits([[1]], [[1], [2]], [{ numbers: [1] }], 1, 1)).toThrow();
  });
});
