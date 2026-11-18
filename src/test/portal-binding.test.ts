import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("portal de cobrança", () => {
  it("só usa customer vinculado ao perfil autenticado; nunca procura por e-mail", () => {
    const source = readFileSync("supabase/functions/customer-portal/index.ts", "utf8");
    expect(source).toContain('.eq("id", auth.userId)');
    expect(source).toContain('customer: profile.stripe_customer_id');
    expect(source).not.toContain('stripe.customers.list(');
  });
});
