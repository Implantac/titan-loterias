import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("confiabilidade do faturamento", () => {
  it("não reconhece webhook se auditoria de eventos falhar", () => {
    const source = readFileSync("supabase/functions/stripe-webhook/index.ts", "utf8");
    expect(source).toContain('if (lookupError) throw');
    expect(source).toContain('if (recordError && recordError.code !== "23505")');
    expect(source).toContain('status: 500');
  });
  it("não perde plano vitalício ao consultar assinatura profissional e confere a escrita", () => {
    const source = readFileSync("supabase/functions/check-subscription/index.ts", "utf8");
    expect(source).not.toContain('detectedPlan !== "professional"');
    expect(source).toContain('if (updateError) throw');
  });
});
