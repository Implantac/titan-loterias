import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock do cliente Supabase ────────────────────────────────────────────────
// `fetchDraws` monta `.from().select().eq().order().range()`. O mock registra
// cada chamada e devolve fatias de uma base sintética, imitando o PostgREST
// (inclusive o `count: "exact"` só na primeira página).
const state = {
  rows: [] as Array<{ concurso: number; draw_date: string; numbers: number[]; prize_tiers: null }>,
  calls: [] as Array<{ from: number; to: number; withCount: boolean }>,
  inFlight: 0,
  maxInFlight: 0,
  latencyMs: 20,
};

vi.mock("@/integrations/supabase/client", () => {
  const builder = (opts: { withCount: boolean }) => {
    const api: Record<string, any> = {
      eq: () => api,
      order: () => api,
      select: () => api,
      range: async (from: number, to: number) => {
        state.calls.push({ from, to, withCount: opts.withCount });
        state.inFlight += 1;
        state.maxInFlight = Math.max(state.maxInFlight, state.inFlight);
        await new Promise((r) => setTimeout(r, state.latencyMs));
        state.inFlight -= 1;
        const slice = state.rows.slice(from, to + 1);
        return { data: slice, error: null, count: opts.withCount ? state.rows.length : null };
      },
    };
    return api;
  };
  return {
    supabase: {
      from: () => ({ select: (_c: string, o?: { count: string }) => builder({ withCount: !!o?.count }) }),
    },
  };
});

import { fetchDraws } from "@/services/api/lottery";

function makeRows(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    concurso: n - i, // desc, como no banco
    draw_date: "08/10/2026",
    numbers: [1, 2, 3],
    prize_tiers: null,
  }));
}

beforeEach(() => {
  state.calls = [];
  state.inFlight = 0;
  state.maxInFlight = 0;
  state.latencyMs = 20;
});

describe("fetchDraws — paginação", () => {
  it("carrega os 7.135 concursos da Quina na ordem certa", async () => {
    state.rows = makeRows(7135);
    const result = await fetchDraws("quina", 8000);

    expect(result.draws).toHaveLength(7135);
    expect(result.totalCount).toBe(7135);
    // ordem decrescente preservada através das páginas paralelas
    expect(result.draws[0].concurso).toBe(7135);
    expect(result.draws[result.draws.length - 1].concurso).toBe(1);
    const concursos = result.draws.map((d) => d.concurso);
    expect(concursos).toEqual([...concursos].sort((a, b) => b - a));
  });

  it("não busca mais páginas do que o limitCount permite", async () => {
    state.rows = makeRows(7135);
    const result = await fetchDraws("quina", 2000);

    expect(result.draws).toHaveLength(2000);
    expect(state.calls).toHaveLength(2); // 1000 + 1000
  });

  it("respeita um total menor que uma página", async () => {
    state.rows = makeRows(37);
    const result = await fetchDraws("supersete", 8000);

    expect(result.draws).toHaveLength(37);
    expect(state.calls).toHaveLength(1);
  });

  it("mantém a concorrência dentro do teto de 4", async () => {
    state.rows = makeRows(7135);
    await fetchDraws("quina", 8000);

    expect(state.maxInFlight).toBeLessThanOrEqual(4);
    expect(state.maxInFlight).toBeGreaterThan(1); // prova que é paralelo
  });

  it("é mais rápido que a paginação sequencial equivalente", async () => {
    state.rows = makeRows(7135);
    state.latencyMs = 30;
    const t0 = Date.now();
    await fetchDraws("quina", 8000);
    const elapsed = Date.now() - t0;

    // 8 páginas: sequencial seria ~240ms; com 4 em voo, ~2 rodadas (~60-90ms).
    expect(state.calls).toHaveLength(8);
    expect(elapsed).toBeLessThan(200);
  });

  it("pede o total (count exact) só na primeira página", async () => {
    state.rows = makeRows(3000);
    await fetchDraws("lotofacil", 8000);

    expect(state.calls.filter((c) => c.withCount)).toHaveLength(1);
    expect(state.calls[0].withCount).toBe(true);
  });

  it("mantém prize_tiers nos resultados", async () => {
    state.rows = makeRows(5).map((r) => ({ ...r, prize_tiers: { premiacoes: [] } as any }));
    const result = await fetchDraws("lotofacil", 8000);

    expect(result.drawsWithPrizes[0].prizeTiers).toEqual({ premiacoes: [] });
  });

  it("propaga erro do PostgREST", async () => {
    state.rows = makeRows(100);
    const { supabase } = await import("@/integrations/supabase/client");
    vi.spyOn(supabase, "from").mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({ order: () => ({ range: async () => ({ data: null, error: new Error("boom"), count: null }) }) }),
      }),
    }) as any);

    await expect(fetchDraws("quina", 100)).rejects.toThrow("boom");
    vi.restoreAllMocks();
  });
});
