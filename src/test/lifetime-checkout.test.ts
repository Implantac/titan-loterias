import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("compra vitalícia", () => {
  it("webhook considera compra paga mesmo com assinatura profissional ativa", () => {
    const source = readFileSync("supabase/functions/stripe-webhook/index.ts", "utf8");
    expect(source).toContain('if (detected !== "lifetime")');
    expect(source).not.toContain('detected !== "professional" && detected !== "lifetime"');
    expect(source).toContain('stripe.checkout.sessions.listLineItems(session.id)');
    expect(source).toContain('if (items.data.some(item => item.price?.id === LIFETIME_PRICE_ID)) plan = "lifetime"');
  });
});
