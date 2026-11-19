import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("retorno do início do checkout", () => {
  it("não anuncia plano ativo em resposta vazia ou inválida", () => {
    const source = readFileSync("src/pages/PlanosPage.tsx", "utf8");
    expect(source).toContain('result?.subscribed && result.plan === "lifetime"');
    expect(source).toContain("Nenhuma compra foi confirmada");
  });
});
