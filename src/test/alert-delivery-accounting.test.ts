import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("contagem e cursor dos alertas", () => {
  it("não chama HTTP 200 de push entregue quando ninguém recebeu", () => {
    const source = readFileSync("supabase/functions/alerts-scan/index.ts", "utf8");
    expect(source).toContain('typeof result?.sent === "number" && result.sent > 0');
    expect(source).toContain('if (delivered) totalAlerts++');
    expect(source).toContain('if (allDelivered)');
    expect(source).toContain('if (drawError) throw');
  });
});
