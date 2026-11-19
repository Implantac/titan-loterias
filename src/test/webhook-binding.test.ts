import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("isolamento do billing", () => {
  it("webhook sincroniza apenas customer já vinculado, nunca e-mail", () => {
    const source = readFileSync("supabase/functions/stripe-webhook/index.ts", "utf8");
    expect(source).toContain('.eq("stripe_customer_id", customerId)');
    expect(source).not.toContain('.eq("email", email)');
    expect(source).toContain('session.payment_status !== "paid"');
  });
  it("migration protege vínculo contra escrita por usuário autenticado", () => {
    const sql = readFileSync("supabase/migrations/20261113000001_protect_stripe_customer_binding.sql", "utf8");
    expect(sql).toContain("auth.role() = 'authenticated'");
    expect(sql).toContain('BEFORE INSERT OR UPDATE ON public.profiles');
  });
});
