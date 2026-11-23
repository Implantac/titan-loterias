import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("formatos dos alertas estatísticos", () => {
  it("não interpreta colunas posicionais ou dezenas 00..99 como universo 1..N", () => {
    const scan = readFileSync("supabase/functions/alerts-scan/index.ts", "utf8");
    const config = scan.slice(scan.indexOf("const LOTTERY_UNIVERSE"), scan.indexOf("type Alert"));
    expect(config).not.toMatch(/\bsupersete\s*:/);
    expect(config).not.toMatch(/\blotomania\s*:/);
    const options = readFileSync("src/hooks/useAlertsConfig.ts", "utf8");
    expect(options).not.toContain('{ id: "supersete"');
    expect(options).not.toContain('{ id: "lotomania"');
  });
});
