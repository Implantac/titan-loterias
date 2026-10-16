// Titan Loterias — Notify Bet Results & ROI Tracker
// Compara saved_bets de cada usuário contra o sorteio mais recente (ou concurso especificado),
// dispara push notification personalizado e ATUALIZA o rastreamento de ROI Real.
//
// Modos:
//   1) Autenticado (usuário logado): {lottery_id, concurso?} → analisa apenas as apostas do próprio user
//   2) Service key (x-service-key): {lottery_id, concurso?} → fan-out para TODOS os usuários com apostas
//
// Idempotência: usa tag `results-{lottery}-{concurso}-{user}` para push e Unique Index no DB para ROI.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-service-key",
};

// Custos oficiais por aposta simples
const LOTTERY_BET_COST: Record<string, number> = {
  megasena: 6.0,
  lotofacil: 3.5,
  quina: 3.0,
  lotomania: 3.0,
  duplasena: 3.0,
  timemania: 3.5,
  diadesorte: 2.5,
  supersete: 3.0,
  maismilionaria: 6.0,
  loteca: 4.0,
  federal: 4.0,
};

// Mapeamento de acertos para faixa de premiação (faixa 1 = prêmio principal)
const HITS_TO_FAIXA: Record<string, Record<number, number>> = {
  megasena:   { 6: 1, 5: 2, 4: 3 },
  lotofacil:  { 15: 1, 14: 2, 13: 3, 12: 4, 11: 5 },
  quina:      { 5: 1, 4: 2, 3: 3, 2: 4 },
  lotomania:  { 20: 1, 19: 2, 18: 3, 17: 4, 16: 5, 15: 6, 0: 7 },
  duplasena:  { 6: 1, 5: 2, 4: 3, 3: 4 },
  timemania:  { 7: 1, 6: 2, 5: 3, 4: 4, 3: 5 },
  diadesorte: { 7: 1, 6: 2, 5: 3, 4: 4 },
  supersete:  { 7: 1, 6: 2, 5: 3, 4: 4, 3: 5 },
};

const PRIZE_THRESHOLDS: Record<string, { min: number; name: string; emojiTiers: Record<number, string> }> = {
  megasena:   { min: 4,  name: "Mega-Sena",  emojiTiers: { 4: "🎯", 5: "🏆", 6: "💰👑" } },
  lotofacil:  { min: 11, name: "Lotofácil",  emojiTiers: { 11: "🎯", 12: "🥉", 13: "🥈", 14: "🥇", 15: "💰👑" } },
  quina:      { min: 2,  name: "Quina",      emojiTiers: { 2: "🎯", 3: "🥉", 4: "🥇", 5: "💰👑" } },
  lotomania:  { min: 15, name: "Lotomania",  emojiTiers: { 15: "🎯", 16: "🥉", 17: "🥈", 18: "🥇", 19: "🏆", 20: "💰👑" } },
  duplasena:  { min: 3,  name: "Dupla Sena", emojiTiers: { 3: "🎯", 4: "🥉", 5: "🥇", 6: "💰👑" } },
  timemania:  { min: 3,  name: "Timemania",  emojiTiers: { 3: "🎯", 4: "🥉", 5: "🥈", 6: "🥇", 7: "💰👑" } },
  diadesorte: { min: 4,  name: "Dia de Sorte", emojiTiers: { 4: "🎯", 5: "🥉", 6: "🥇", 7: "💰👑" } },
  supersete:  { min: 3,  name: "Super Sete", emojiTiers: { 3: "🎯", 4: "🥉", 5: "🥈", 6: "🥇", 7: "💰👑" } },
};

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

    if (!lotteryId || !PRIZE_THRESHOLDS[lotteryId]) {
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
    const prizeTiers = (draw.prize_tiers as any)?.premiacoes || [];

    // Busca apostas
    let betsQuery = admin
      .from("saved_bets")
      .select("id, user_id, numbers, label, created_at")
      .eq("lottery_id", lotteryId);
    if (scopedUserId) betsQuery = betsQuery.eq("user_id", scopedUserId);

    // Só apostas registradas ANTES do sorteio (evita pós-verificação sem sentido)
    if (draw.draw_date) {
      betsQuery = betsQuery.lte("created_at", `${draw.draw_date}T23:59:59`);
    }

    const { data: bets, error: betsErr } = await betsQuery;
    if (betsErr) throw betsErr;

    if (!bets || bets.length === 0) {
      return new Response(JSON.stringify({ ok: true, concurso, checked: 0, pushed: 0, roi_updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const info = PRIZE_THRESHOLDS[lotteryId];
    const hitToFaixa = HITS_TO_FAIXA[lotteryId] || {};
    const standardCost = LOTTERY_BET_COST[lotteryId] || 3.0;

    // Agrupa por usuário para processar ROI e Push
    const byUser = new Map<string, { 
      hits: number; 
      best: number; 
      totalWinners: number; 
      games: number; 
      bestLabel?: string;
      totalWon: number;
      betIds: string[];
    }>();

    for (const bet of bets) {
      const nums = (bet.numbers || []) as number[];
      const hits = nums.filter((n) => drawSet.has(n)).length;
      
      const entry = byUser.get(bet.user_id) || { 
        hits: 0, 
        best: 0, 
        totalWinners: 0, 
        games: 0, 
        totalWon: 0, 
        betIds: [] 
      };
      
      entry.games += 1;
      entry.betIds.push(bet.id);
      
      // Calcula prêmio para esta aposta
      const faixa = hitToFaixa[hits];
      if (faixa) {
        const tier = prizeTiers.find((t: any) => t.faixa === faixa);
        if (tier) {
          entry.totalWon += Number(tier.valorPremio) || 0;
        }
      }

      if (hits > entry.best) {
        entry.best = hits;
        entry.bestLabel = bet.label || undefined;
      }
      
      if (hits >= info.min) entry.totalWinners += 1;
      
      byUser.set(bet.user_id, entry);
    }

    let pushed = 0;
    let roiUpdated = 0;
    
    // Data do sorteio para o ROI (bet_date)
    const betDate = draw.draw_date || new Date().toISOString().split("T")[0];

    for (const [userId, entry] of byUser) {
      // 1. Atualiza ROI Real
      const amountSpent = entry.games * standardCost;
      const amountWon = entry.totalWon;

      try {
        const { error: roiError } = await admin
          .from("user_roi_tracking")
          .upsert({
            user_id: userId,
            lottery_id: lotteryId,
            bet_date: betDate,
            amount_spent: amountSpent,
            amount_won: amountWon,
            game_ids: entry.betIds,
          }, { 
            onConflict: "user_id,lottery_id,bet_date" 
          });
        
        if (!roiError) roiUpdated++;
        else console.warn(`[roi] Update failed for ${userId}:`, roiError);
      } catch (e) {
        console.error(`[roi] Fatal for ${userId}:`, e);
      }

      // 2. Dispara Push se houver prêmio relevante
      if (entry.best >= info.min) {
        const emoji = info.emojiTiers[entry.best] || "🎯";
        const title = `${info.name} #${concurso}: ${entry.best} acertos! ${emoji}`;
        const winnersStr = entry.totalWinners > 1
          ? ` Você tem ${entry.totalWinners} apostas premiadas.`
          : "";
        const labelStr = entry.bestLabel ? ` (${entry.bestLabel})` : "";
        const bodyText = `Seu melhor jogo${labelStr} acertou ${entry.best} números.${winnersStr} Confira o detalhamento e o prêmio real na sua banca.`;
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
        checked: bets.length, 
        users: byUser.size, 
        pushed, 
        roi_updated: roiUpdated 
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
