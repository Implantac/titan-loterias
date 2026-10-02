import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUserAuth } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_BASE = "https://loteriascaixa-api.herokuapp.com/api";

const LOTTERIES = [
  { id: "megasena", apiName: "megasena" },
  { id: "lotofacil", apiName: "lotofacil" },
  { id: "quina", apiName: "quina" },
  { id: "lotomania", apiName: "lotomania" },
  { id: "duplasena", apiName: "duplasena" },
  { id: "timemania", apiName: "timemania" },
  { id: "diadesorte", apiName: "diadesorte" },
  { id: "supersete", apiName: "supersete" },
  { id: "maismilionaria", apiName: "maismilionaria" },
  { id: "federal", apiName: "federal" },
  { id: "loteca", apiName: "loteca" },
];

interface PrizeTier {
  descricao: string;
  faixa: number;
  ganhadores: number;
  valorPremio: number;
}

interface CaixaResult {
  concurso: number;
  data?: string;
  dezenas?: string[];
  listaDezenas?: string[];
  dezenasSorteioMunicipioMae?: string[];
  colunas?: string[][];
  premiacoes?: PrizeTier[];
  acumulou?: boolean;
  valorAcumuladoProximoConcurso?: number;
  valorEstimadoProximoConcurso?: number;
  valorArrecadado?: number;
  localGanhadores?: Array<{ municipio?: string; uf?: string; ganhadores?: number; nomeFatansiaUL?: string; serie?: string }>;
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (res.status === 404) return null;
    } catch {
      // retry
    }
    if (i < retries - 1) {
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  return null;
}

function extractNumbers(raw: CaixaResult): number[] {
  if (raw.colunas && Array.isArray(raw.colunas)) {
    return raw.colunas.flat().map((d: string) => parseInt(d, 10)).filter((n: number) => !isNaN(n));
  }
  const dezenas = raw.dezenas || raw.listaDezenas || [];
  return dezenas.map((d: string) => parseInt(d, 10)).filter((n: number) => !isNaN(n));
}

function extractPrizeTiers(raw: CaixaResult): object | null {
  if (!raw.premiacoes || !Array.isArray(raw.premiacoes) || raw.premiacoes.length === 0) {
    return null;
  }
  return {
    premiacoes: raw.premiacoes.map(p => ({
      descricao: p.descricao,
      faixa: p.faixa,
      ganhadores: p.ganhadores,
      valorPremio: p.valorPremio,
    })),
    acumulou: raw.acumulou ?? false,
    valorAcumulado: raw.valorAcumuladoProximoConcurso ?? 0,
    valorEstimado: raw.valorEstimadoProximoConcurso ?? 0,
    valorArrecadado: raw.valorArrecadado ?? 0,
    localGanhadores: Array.isArray(raw.localGanhadores)
      ? raw.localGanhadores.map(l => ({
          municipio: l.municipio || "",
          uf: l.uf || "",
          ganhadores: Number(l.ganhadores) || 1,
          nomeFantasia: (l as any).nomeFatansiaUL || (l as any).nomeFantasiaUL || "",
          serie: l.serie || "",
        }))
      : [],
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireUserAuth(req);
    if (auth instanceof Response) return auth;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const MAX_RANGE = 1000; // Increased range to catch up on old data
    const body = await req.json().catch(() => ({}));
    const targetLottery = typeof body.lottery_id === "string" ? body.lottery_id : null;
    const rawFrom = Number(body.from_concurso);
    const rawTo = body.to_concurso == null ? null : Number(body.to_concurso);
    // null quando não informado — nunca assumir 1, senão todo sync refaz o histórico inteiro
    const fromConcurso = Number.isInteger(rawFrom) && rawFrom > 0 ? rawFrom : null;
    const toConcurso = rawTo != null && Number.isInteger(rawTo) && rawTo > 0 ? rawTo : null;
    const startedAt = Date.now();
    const TIME_BUDGET_MS = 100_000; // devolve resultado parcial antes do timeout da função

    const lotteriesFilter = targetLottery
      ? LOTTERIES.filter((l) => l.id === targetLottery)
      : LOTTERIES;

    const results: { lottery: string; inserted: number; errors: number; latest: number }[] = [];

    for (const lottery of lotteriesFilter) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        console.warn(`[sync] tempo esgotado antes de ${lottery.id}`);
        break;
      }
      console.log(`[sync] Processing ${lottery.id}...`);
      let inserted = 0;
      let errors = 0;
      let latestConcurso = 0;

      try {
        const latestRes = await fetchWithRetry(`${API_BASE}/${lottery.apiName}/latest`);
        if (!latestRes) {
          console.error(`Failed to fetch latest for ${lottery.id}`);
          results.push({ lottery: lottery.id, inserted: 0, errors: 1, latest: 0 });
          continue;
        }
        const latestData: CaixaResult = await latestRes.json();
        latestConcurso = latestData.concurso;

        // Update the latest draw with prize info
        const latestPrizeTiers = extractPrizeTiers(latestData);
        const latestNumbers = extractNumbers(latestData);
        if (latestPrizeTiers && latestNumbers.length > 0) {
          // Upsert latest draw to ensure it exists with prize data
          await supabase
            .from("lottery_draws")
            .upsert({
              lottery_id: lottery.id,
              concurso: latestData.concurso,
              draw_date: latestData.data || null,
              numbers: latestNumbers,
              prize_tiers: latestPrizeTiers,
            }, { onConflict: "lottery_id,concurso" });
        }

        // Also backfill prize_tiers for recent draws that are missing them
        const { data: missingPrizes } = await supabase
          .from("lottery_draws")
          .select("concurso")
          .eq("lottery_id", lottery.id)
          .is("prize_tiers", null)
          .order("concurso", { ascending: false })
          .limit(20);

        if (missingPrizes && missingPrizes.length > 0) {
          for (const row of missingPrizes) {
            try {
              const res = await fetchWithRetry(`${API_BASE}/${lottery.apiName}/${row.concurso}`);
              if (!res) continue;
              const data: CaixaResult = await res.json();
              const pt = extractPrizeTiers(data);
              if (pt) {
                await supabase
                  .from("lottery_draws")
                  .update({ prize_tiers: pt })
                  .eq("lottery_id", lottery.id)
                  .eq("concurso", row.concurso);
              }
              await new Promise(r => setTimeout(r, 150));
            } catch { /* skip */ }
          }
        }

        // Modo fill_gaps: busca apenas os concursos que faltam no meio da sequência.
        if (body.fill_gaps === true) {
          const stored: number[] = [];
          for (let off = 0; off < 20000; off += 1000) {
            const { data: page, error: pErr } = await supabase
              .from("lottery_draws").select("concurso").eq("lottery_id", lottery.id)
              .order("concurso", { ascending: true }).range(off, off + 999);
            if (pErr) throw pErr;
            stored.push(...(page ?? []).map((p: { concurso: number }) => p.concurso));
            if (!page || page.length < 1000) break;
          }
          const have = new Set(stored);
          const top = Math.max(latestConcurso, stored[stored.length - 1] ?? 0);
          const missing: number[] = [];
          for (let c = 1; c <= top && missing.length < 300; c++) if (!have.has(c)) missing.push(c);
          for (let i = 0; i < missing.length; i += 15) {
            if (Date.now() - startedAt > TIME_BUDGET_MS) break;
            const chunk = missing.slice(i, i + 15);
            const got = await Promise.all(chunk.map((c) =>
              fetchWithRetry(`${API_BASE}/${lottery.apiName}/${c}`).then((r) => r ? r.json() : null).catch(() => null)));
            const rows = got.filter((r): r is CaixaResult => !!r?.concurso)
              .map((r) => ({ lottery_id: lottery.id, concurso: r.concurso, draw_date: r.data || null, numbers: extractNumbers(r), prize_tiers: extractPrizeTiers(r) }))
              .filter((r) => r.numbers.length > 0);
            if (rows.length) {
              const { error } = await supabase.from("lottery_draws").upsert(rows, { onConflict: "lottery_id,concurso" });
              if (error) errors += rows.length; else inserted += rows.length;
            }
            errors += chunk.length - rows.length;
          }
          results.push({ lottery: lottery.id, inserted, errors, latest: latestConcurso, missing: missing.length } as any);
          continue;
        }

        const { data: existing } = await supabase
          .from("lottery_draws")
          .select("concurso")
          .eq("lottery_id", lottery.id)
          .order("concurso", { ascending: false })
          .limit(1);

        const lastStored = existing?.[0]?.concurso || 0;
        console.log(`[sync] ${lottery.id}: last stored concurso: ${lastStored}, latest API: ${latestConcurso}`);
        const startFrom = fromConcurso ?? (lastStored + 1);
        const requestedEnd = toConcurso || latestConcurso;

        // Backfill amplo só quando o banco está vazio ou em full_sync explícito
        const RANGE = (lastStored === 0 || body.full_sync) ? 2000 : MAX_RANGE;
        const endAt = Math.min(requestedEnd, latestConcurso, startFrom + RANGE - 1);

        if (startFrom > endAt) {
          console.log(`${lottery.id}: already up to date (${lastStored})`);
          results.push({ lottery: lottery.id, inserted: 0, errors: 0, latest: lastStored });
          continue;
        }

        console.log(`${lottery.id}: fetching ${startFrom} to ${endAt}`);

        const batchSize = 15; // Increased batch size for faster sync
        for (let batch = startFrom; batch <= endAt; batch += batchSize) {
          if (Date.now() - startedAt > TIME_BUDGET_MS) {
            console.warn(`[sync] ${lottery.id}: orçamento de tempo esgotado em ${batch}, retornando parcial`);
            break;
          }
          const promises: Promise<CaixaResult | null>[] = [];
          for (let c = batch; c < Math.min(batch + batchSize, endAt + 1); c++) {
            promises.push(
              fetchWithRetry(`${API_BASE}/${lottery.apiName}/${c}`)
                .then((r) => r ? r.json() : null)
                .catch(() => null)
            );
          }

          const batchResults = await Promise.all(promises);

          const rows = batchResults
            .filter((r): r is CaixaResult => r !== null && !!r.concurso)
            .map((r) => {
              const numbers = extractNumbers(r);
              const prizeTiers = extractPrizeTiers(r);
              return {
                lottery_id: lottery.id,
                concurso: r.concurso,
                draw_date: r.data || null,
                numbers,
                prize_tiers: prizeTiers,
              };
            })
            .filter((r) => r.numbers.length > 0);

          if (rows.length > 0) {
            console.log(`[sync] ${lottery.id}: attempting to upsert ${rows.length} rows (from ${rows[0].concurso} to ${rows[rows.length-1].concurso})`);
            const { error } = await supabase
              .from("lottery_draws")
              .upsert(rows, { onConflict: "lottery_id,concurso" });

            if (error) {
              console.error(`Insert error for ${lottery.id}:`, error);
              errors += rows.length;
            } else {
              inserted += rows.length;
            }
          }

          await new Promise((r) => setTimeout(r, 100)); // Reduced delay for faster sync
        }
      } catch (e) {
        console.error(`Error syncing ${lottery.id}:`, e);
        errors++;
      }

      results.push({ lottery: lottery.id, inserted, errors, latest: latestConcurso });
    }

    // Fire-and-forget: encadeia o orquestrador pós-sorteio (alerts + notificações de prêmio)
    // Só dispara se houve nova inserção em qualquer loteria — evita ruído em polls sem novidade.
    const lotteriesWithNew = results.filter((r) => r.inserted > 0).map((r) => r.lottery);
    if (lotteriesWithNew.length > 0) {
      const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      if (serviceRole && supabaseUrl) {
        fetch(`${supabaseUrl}/functions/v1/post-sync-notify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-service-key": serviceRole,
            Authorization: `Bearer ${serviceRole}`,
          },
          body: JSON.stringify({ lotteries: lotteriesWithNew }),
        }).catch((e) => console.warn("[sync] post-sync-notify chain failed", e));
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Sync error:", e);
    return new Response(
      JSON.stringify({ success: false, error: "Sync failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
