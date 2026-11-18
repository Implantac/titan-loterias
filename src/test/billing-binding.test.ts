import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("vínculo de faturamento", () => {
  for (const functionName of ["create-checkout", "check-subscription", "customer-portal"]) {
    it(`${functionName} não resolve cliente por e-mail`, () => {
      const source = readFileSync(`supabase/functions/${functionName}/index.ts`, "utf8");
      expect(source).toContain('.eq("id", auth.userId)');
      expect(source).toContain('stripe_customer_id');
      expect(source).not.toMatch(/stripe\.customers\.list\s*\(/);
    });
  }
});
