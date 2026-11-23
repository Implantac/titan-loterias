import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("intenção de plano após login", () => {
  it("preserva caminho de planos e escolha sem iniciar cobrança automaticamente", () => {
    const source = readFileSync("src/components/common/PricingSection.tsx", "utf8");
    expect(source).toContain('`/planos?interest=${planType}`');
    expect(source).toContain('`/login?next=${encodeURIComponent(destination)}`');
    expect(source).not.toContain('createCheckoutSession');
  });
});
