import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("cadastro em redes compartilhadas", () => {
  it("não pré-reserva IP ou aceita registro público em service-role", () => {
    const edge = readFileSync("supabase/functions/signup-guard/index.ts", "utf8");
    expect(edge).toContain("allowed: true, suspended: true");
    expect(edge).not.toContain('signup_ip_registry');
    expect(edge).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });
  it("não exige aprovação por IP no cadastro e trata falha na verificação do telefone", () => {
    const ui = readFileSync("src/pages/SignupPage.tsx", "utf8");
    expect(ui).not.toContain('functions.invoke("signup-guard"');
    expect(ui).toContain('if (phoneError)');
  });
});
