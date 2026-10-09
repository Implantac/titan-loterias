import { describe, it, expect } from "vitest";
// Importa o código REAL da Edge Function (TS puro, sem APIs do Deno),
// não uma reimplementação. Se a lógica do limitador mudar, este teste quebra.
import {
  checkRateLimit,
  rateLimited,
  AI_RATE_LIMIT,
} from "../../supabase/functions/_shared/rate-limit.ts";

/** Chave única por teste para não haver interferência entre casos. */
let seq = 0;
const key = (prefix: string) => `${prefix}-${Date.now()}-${seq++}`;

describe("rate-limit — proteção das funções de IA", () => {
  it("configura 20 chamadas por minuto para IA", () => {
    expect(AI_RATE_LIMIT).toEqual({ max: 20, windowMs: 60_000 });
  });

  it("permite até o limite e bloqueia a chamada seguinte", () => {
    const k = key("limite");
    let last;
    for (let i = 0; i < 20; i++) last = checkRateLimit(k, AI_RATE_LIMIT);
    expect(last?.allowed).toBe(true);

    const blocked = checkRateLimit(k, AI_RATE_LIMIT);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(1);
  });

  it("mantém contadores independentes por usuário", () => {
    const a = key("userA");
    const b = key("userB");
    for (let i = 0; i < 20; i++) checkRateLimit(a, AI_RATE_LIMIT);

    expect(checkRateLimit(a, AI_RATE_LIMIT).allowed).toBe(false);
    expect(checkRateLimit(b, AI_RATE_LIMIT).allowed).toBe(true);
  });

  it("decrementa `remaining` a cada chamada", () => {
    const k = key("remaining");
    expect(checkRateLimit(k, AI_RATE_LIMIT).remaining).toBe(19);
    expect(checkRateLimit(k, AI_RATE_LIMIT).remaining).toBe(18);
    expect(checkRateLimit(k, AI_RATE_LIMIT).remaining).toBe(17);
  });

  it("libera novamente depois que a janela passa", async () => {
    const k = key("janela");
    const win = { max: 2, windowMs: 120 };
    checkRateLimit(k, win);
    checkRateLimit(k, win);
    expect(checkRateLimit(k, win).allowed).toBe(false);

    await new Promise((r) => setTimeout(r, 160));
    expect(checkRateLimit(k, win).allowed).toBe(true);
  });

  it("responde 429 com Retry-After e preserva CORS", async () => {
    const resp = rateLimited(7, { "Access-Control-Allow-Origin": "*" });
    expect(resp.status).toBe(429);
    expect(resp.headers.get("Retry-After")).toBe("7");
    expect(resp.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(resp.headers.get("Content-Type")).toContain("application/json");

    const body = await resp.json();
    expect(body.retryAfterSec).toBe(7);
    expect(typeof body.error).toBe("string");
  });

  it("não cresce sem limite na memória com muitas chaves distintas", () => {
    // MAX_TRACKED_KEYS é 5000: passar disso dispara a limpeza de chaves ociosas.
    for (let i = 0; i < 6000; i++) {
      checkRateLimit(`bulk-${i}`, { max: 1, windowMs: 1000 });
    }
    expect(checkRateLimit(key("post-bulk"), { max: 5, windowMs: 1000 }).allowed).toBe(true);
  });
});
