// Titan Loterias — Notify Bet Results & ROI Tracker
// Compara saved_bets de cada usuário contra o sorteio mais recente (ou concurso especificado),
// compara jogos salvos e envia aviso sem comprovar aposta ou atualizar ROI financeiro.
//
// Modos:
//   1) Autenticado (usuário logado): {lottery_id, concurso?} → analisa apenas as apostas do próprio user
//   2) Service key (x-service-key): {lottery_id, concurso?} → fan-out para TODOS os usuários com apostas
//
// A tag identifica a comparação; não é recibo ou controle de entrega financeira.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-service-key",
};

// Only modalities represented by unique plain dozens in saved_bets.numbers.
// Positional/auxiliary selections and double draws require their own schemas.
const SIMPLE_COMPARISONS: Record<string, { pick: number; min: number; max: number; name: string }> = {
  megasena: { pick: 6, min: 1, max: 60, name: "Mega-Sena" },
  lotofacil: { pick: 15, min: 1, max: 25, name: "Lotofácil" },
  quina: { pick: 5, min: 1, max: 80, name: "Quina" },
};
const ALERT_MIN_HITS: Record<string, number> = { megasena: 4, lotofacil: 11, quina: 2 };

async function firePush(
  supabaseUrl: string,
  serviceRole: string,
  userId: string,
  title: string,
  body: string,
  url: string,
  tag: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-service-key": serviceRole,
        Authorization: `Bearer ${serviceRole}`,
      },
      body: JSON.stringify({
        user_id: userId,
        title,
        body,
        url,
        category: "results",
        tag,
      }),
    });
    return res.ok;
  } catch (_e) {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceRole);

    const body = await req.json().catch(() => ({}));
    const lotteryId = body?.lottery_id as string | undefined;
    let concurso = body?.concurso as number | undefined;

    // Super Sete depende de posições; saved_bets.numbers não preserva colunas.
    if (!lotteryId || !SIMPLE_COMPARISONS[lotteryId]) {
      return new Response(JSON.stringify({ error: "invalid lottery_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determina escopo (self vs service)
    const serviceKeyHeader = req.headers.get("x-service-key");
    const isService = serviceKeyHeader && serviceKeyHeader === serviceRole;
    let scopedUserId: string | null = null;

    if (!isService) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const anonClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data, error } = await anonClient.auth.getClaims(token);
      if (error || !data?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      scopedUserId = data.claims.sub as string;
    }

    // Busca o sorteio-alvo
    let drawQuery = admin
      .from("lottery_draws")
      .select("concurso, numbers, draw_date, prize_tiers")
      .eq("lottery_id", lotteryId);
    if (concurso) drawQuery = drawQuery.eq("concurso", concurso);
    else drawQuery = drawQuery.order("concurso", { ascending: false }).limit(1);

    const { data: drawRows, error: drawErr } = await drawQuery;
    if (drawErr) throw drawErr;
    const draw = drawRows?.[0];
    if (!draw) {
      return new Response(JSON.stringify({ error: "draw not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    concurso = draw.concurso;
    const drawSet = new Set<number>(draw.numbers as number[]);

    // Busca apostas
    let betsQuery = admin
      .from("saved_bets")
      .select("id, user_id, numbers, label, created_at")
      .eq("lottery_id", lotteryId);
    if (scopedUserId) betsQuery = betsQuery.eq("user_id", scopedUserId);

    // draw_date é DD/MM/AAAA; nunca concatene diretamente com horário ISO.
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(draw.draw_date ?? "");
    if (!match) throw new Error("Data do sorteio indisponível para conferência temporal");
    const [, day, month, year] = match;
    const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== `${year}-${month}-${day}`)
      throw new Error("Data do sorteio inválida");
    // Sem horário oficial comprovado, só jogos salvos antes do dia do sorteio.
    betsQuery = betsQuery.lt("created_at", `${year}-${month}-${day}T00:00:00Z`);

    const { data: bets, error: betsErr } = await betsQuery;
    if (betsErr) throw betsErr;

    if (!bets || bets.length === 0) {
      return new Response(JSON.stringify({ ok: true, concurso, checked: 0, pushed: 0, roi_updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const info = SIMPLE_COMPARISONS[lotteryId];
    const alertMin = ALERT_MIN_HITS[lotteryId];

    // Agrupa por usuário apenas para comparação e push; não grava ROI.
    const byUser = new Map<string, { 
      hits: number; 
      best: number; 
      totalWinners: number; 
      games: number; 
      bestLabel?: string;
      betIds: string[];
    }>();

    let validCount = 0;
    for (const bet of bets) {
      const nums = (bet.numbers || []) as number[];
      // Não contar jogos incompletos ou malformados como acertos.
      if (!Array.isArray(nums) || nums.length !== info.pick || new Set(nums).size !== info.pick ||
          nums.some(n => !Number.isInteger(n) || n < info.min || n > info.max)) continue;
      validCount++;
      const hits = nums.filter((n) => drawSet.has(n)).length;
      
      const entry = byUser.get(bet.user_id) || { 
        hits: 0, 
        best: 0, 
        totalWinners: 0, 
        games: 0, 
        betIds: [] 
      };
      
      entry.games += 1;
      entry.betIds.push(bet.id);
      
      if (hits > entry.best) {
        entry.best = hits;
        entry.bestLabel = bet.label || undefined;
      }
      
      if (hits >= alertMin) entry.totalWinners += 1;
      
      byUser.set(bet.user_id, entry);
    }

    let pushed = 0;

    for (const [userId, entry] of byUser) {
      // Jogos salvos não comprovam apostas, despesas ou prêmios recebidos.
      // Não alimentar user_roi_tracking a partir deste verificador.
      // Push de coincidência de dezenas, sem alegar prêmio ou bilhete oficial.
      if (entry.best >= alertMin) {
        const emoji = "🎯";
        const title = `${info.name} #${concurso}: ${entry.best} acertos! ${emoji}`;
        const winnersStr = entry.totalWinners > 1
          ? ` ${entry.totalWinners} jogos salvos atingiram a contagem de acertos.`
          : "";
        const labelStr = entry.bestLabel ? ` (${entry.bestLabel})` : "";
        const bodyText = `Seu jogo salvo${labelStr} coincide com ${entry.best} dezenas do resultado.${winnersStr} Sem comprovante oficial, isso não demonstra aposta nem prêmio.`;
        const tag = `results-${lotteryId}-${concurso}-${userId}`;
        
        const ok = await firePush(
          supabaseUrl,
          serviceRole,
          userId,
          title,
          bodyText,
          `/jogos-salvos?lottery=${lotteryId}`,
          tag,
        );
        if (ok) pushed++;
      }
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        concurso, 
        checked: validCount, 
        users: byUser.size, 
        pushed, 
        roi_updated: 0 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[notify-bet-results] fatal", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
