import { describe, expect, it } from "vitest";
import { megaBolaoAdvisory } from "./megaBolaoAdvisory";

describe("avisos informativos da Mega-Sena", () => {
  it("não avalia grupo sem jogos e não certifica configuração", () => {
    expect(megaBolaoAdvisory(0, 4, 0)).toEqual([]);
    expect(megaBolaoAdvisory(3, 2, 18)).toEqual([]);
  });
  it("alerta sobre recibo, cotas e valor base sem usar taxa privada", () => {
    const notices = megaBolaoAdvisory(11, 101, 12);
    expect(notices).toHaveLength(4);
    expect(notices.join(" ")).toContain("10 jogos");
    expect(notices.join(" ")).toContain("R$ 7,00");
  });
});
