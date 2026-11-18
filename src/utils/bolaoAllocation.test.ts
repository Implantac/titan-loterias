import { describe, expect, it } from "vitest";
import { allocateBolaoCents } from "./bolaoAllocation";
import { generatePixPayload } from "./pix";

describe("rateio interno de centavos", () => {
  it("distribui resto na ordem exibida e fecha o custo total", () => {
    expect(allocateBolaoCents(10, [1, 1, 1])).toEqual([334, 333, 333]);
    expect(allocateBolaoCents(10, [2, 1])).toEqual([667, 333]);
    expect(allocateBolaoCents(0.05, [2, 1])).toEqual([4, 1]);
    expect(allocateBolaoCents(12, [2, 1])).toEqual([800, 400]);
  });
  it("gera valores PIX individuais coerentes com o rateio sem iniciar pagamento", () => {
    const amounts = allocateBolaoCents(10, [1, 1, 1])!;
    const codes = amounts.map((cents, i) => generatePixPayload({ key: "teste@exemplo.com", name: "Organizador",
      amount: cents / 100, txid: `BOLAO${i + 1}` }));
    expect(codes[0]).toContain("54043.34");
    expect(codes[1]).toContain("54043.33");
    expect(amounts.reduce((sum, cents) => sum + cents, 0)).toBe(1000);
  });

  it("não inventa valores quando custo/cotas não são válidos", () => {
    expect(allocateBolaoCents(0, [1, 1])).toBeNull();
    expect(allocateBolaoCents(0.01, [1, 1])).toBeNull();
    expect(allocateBolaoCents(NaN, [1])).toBeNull();
    expect(allocateBolaoCents(10.005, [1])).toBeNull();
    expect(allocateBolaoCents(10, [1.5])).toBeNull();
  });
});
