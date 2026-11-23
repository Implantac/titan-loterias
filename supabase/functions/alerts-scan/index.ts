// Titan Loterias — Alerts Scan Edge Function
// Detecta gatilhos estatísticos e dispara push por usuário.
//
// Modos:
//   1) Autenticado (usuário logado, sem body ou {}) → varre APENAS os alert_configs do próprio usuário.
//   2) Service key (x-service-key = SUPABASE_SERVICE_ROLE_KEY) → cron / fan-out global.
//
// Fluxo:
//   - Para cada (user_id, lottery_id) com enabled=true:
//     - Busca últimos ~120 sorteios da tabela lottery_draws
//     - Compara com last_concurso; se houver concurso novo, calcula gatilhos
//     - Chama send-push (service-role) com os alertas ativos daquele usuário
//     - Atualiza last_concurso
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-service-key",
};

type TriggerFlags = {
  hot: boolean;
  cold: boolean;
  delay: boolean;
  accumulated: boolean;
  cycle: boolean;
};

type Draw = {
  concurso: number;
  numbers: number[];
  acumulou?: boolean | null;
  prize_tiers?: Record<string, unknown> | null;
};

// Apenas universos 1..N de dezenas simples; Lotomania (00..99) e Super Sete
// (colunas posicionais) exigem modelos distintos e ficam fora desta análise.
const LOTTERY_UNIVERSE: Record<string, { total: number; pick: number; name: string }> = {
  megasena: { total: 60, pick: 6, name: "Mega-Sena" },
  lotofacil: { total: 25, pick: 15, name: "Lotofácil" },
  quina: { total: 80, pick: 5, name: "Quina" },
  duplasena: { total: 50, pick: 6, name: "Dupla Sena" },
  timemania: { total: 80, pick: 7, name: "Timemania" },
  diadesorte: { total: 31, pick: 7, name: "Dia de Sorte" },
};

type Alert = {
  category: "results" | "system" | "draws";
  title: string;
  body: string;
  url: string;
  tag: string;
};

function detectTriggers(
  lotteryId: string,
  draws: Draw[],
  triggers: TriggerFlags,
  lastConcurso: number,
): { alerts: Alert[]; newestConcurso: number } {
  const uni = LOTTERY_UNIVERSE[lotteryId];
  if (!uni || draws.length === 0) return { alerts: [], newestConcurso: lastConcurso };

  // Ordena do mais recente para o mais antigo
  const sorted = [...draws].sort((a, b) => b.concurso - a.concurso);
  const newest = sorted[0];
  if (!newest || newest.concurso <= lastConcurso) {
    return { alerts: [], newestConcurso: lastConcurso };
  }

  const alerts: Alert[] = [];
  const url = `/estatisticas?lottery=${lotteryId}`;

  // ── Estatísticas base ──
  const freq = new Array(uni.total + 1).fill(0);
  const lastSeen = new Array(uni.total + 1).fill(sorted.length);
  const recentFreq = new Array(uni.total + 1).fill(0);
  const recentWindow = Math.min(30, sorted.length);

  for (let i = 0; i < sorted.length; i++) {
    for (const n of sorted[i].numbers) {
      if (n < 1 || n > uni.total) continue;
      freq[n]++;
      if (i < lastSeen[n]) lastSeen[n] = i;
      if (i < recentWindow) recentFreq[n]++;
    }
  }

  const avgFreq = sorted.length > 0 ? uni.pick / uni.total : 0;
  const avgPct = avgFreq * 100;

  // Números que apareceram no MAIS RECENTE
  const newNums = new Set(newest.numbers);

  // ── Gatilho 1: Cold-streak break — dezena com atraso alto que voltou ──
  if (triggers.delay || triggers.cold) {
    const universe = sorted.length;
    // Threshold: 2× ciclo médio (universe*pick/total ≈ ciclo esperado)
    const expectedCycle = Math.max(6, Math.round(uni.total / Math.max(1, uni.pick)));
    const returned: number[] = [];
    for (const n of newNums) {
      // "lastSeen" agora é 0 pois apareceu no draw 0. Verificamos o gap ANTERIOR.
      // Recomputa buscando a segunda ocorrência.
      let gap = 0;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].numbers.includes(n)) break;
        gap++;
      }
      // gap é o número de concursos SEM ele antes do atual
      if (gap >= expectedCycle * 2) returned.push(n);
      if (returned.length >= 5) break;
    }
    if (returned.length > 0) {
      const list = returned.map((n) => String(n).padStart(2, "0")).join(", ");
      alerts.push({
        category: "results",
        title: `${uni.name}: dezenas frias voltaram 🧊➡️🔥`,
        body: `Concurso ${newest.concurso} — números com atraso alto que retornaram: ${list}.`,
        url,
        tag: `${lotteryId}-cold-return-${newest.concurso}`,
      });
    }
  }

  // ── Gatilho 2: Números com atraso extremo (ainda ausentes) ──
  if (triggers.delay) {
    const overdue: Array<{ n: number; gap: number }> = [];
    const overdueLimit = Math.max(12, Math.round(uni.total / Math.max(1, uni.pick)) * 3);
    for (let n = 1; n <= uni.total; n++) {
      const gap = lastSeen[n];
      if (gap >= overdueLimit && gap < sorted.length) overdue.push({ n, gap });
    }
    overdue.sort((a, b) => b.gap - a.gap);
    const top = overdue.slice(0, 5);
    if (top.length >= 3) {
      const list = top.map((o) => `${String(o.n).padStart(2, "0")} (${o.gap})`).join(", ");
      alerts.push({
        category: "system",
        title: `${uni.name}: dezenas com atraso crítico ⏳`,
        body: `${top.length} dezenas passaram do ciclo esperado: ${list}.`,
        url,
        tag: `${lotteryId}-overdue-${newest.concurso}`,
      });
    }
  }

  // ── Gatilho 3: Novo líder quente (top-3 recente) ──
  if (triggers.hot) {
    const withRecent = [];
    for (let n = 1; n <= uni.total; n++) {
      withRecent.push({ n, r: recentFreq[n] });
    }
    withRecent.sort((a, b) => b.r - a.r);
    const top3 = withRecent.slice(0, 3);
    // Só dispara se o TOP-1 fez aparição no concurso mais recente E está acima de 1.5x média
    const hotLeaders = top3.filter((t) => newNums.has(t.n) && t.r >= Math.max(3, avgFreq * recentWindow * 1.5));
    if (hotLeaders.length > 0) {
      const list = hotLeaders.map((t) => `${String(t.n).padStart(2, "0")} (${t.r}x/30)`).join(", ");
      alerts.push({
        category: "results",
        title: `${uni.name}: números quentes em alta 🔥`,
        body: `Novo líder de frequência recente: ${list}.`,
        url,
        tag: `${lotteryId}-hot-${newest.concurso}`,
      });
    }
  }

  // ── Gatilho 4: Prêmio acumulou ──
  if (triggers.accumulated && newest.acumulou === true) {
    alerts.push({
      category: "results",
      title: `${uni.name}: acumulou! 💰`,
      body: `Concurso ${newest.concurso} acumulou segundo os dados disponíveis. Confira prêmio e próximo sorteio nos canais oficiais.`,
      url,
      tag: `${lotteryId}-acumulou-${newest.concurso}`,
    });
  }

  // ── Gatilho 5: Ciclo fechado (todas as dezenas apareceram na janela) ──
  if (triggers.cycle && sorted.length >= 20) {
    const window = Math.min(sorted.length, uni.total * 2);
    const seen = new Set<number>();
    for (let i = 0; i < window; i++) {
      for (const n of sorted[i].numbers) seen.add(n);
    }
    if (seen.size === uni.total) {
      // Ciclo fechado se TODAS as dezenas apareceram — só notifica quando o mais recente for o "fechador"
      // Verifica se removendo o mais recente ainda estaria fechado
      const seenWithoutNewest = new Set<number>();
      for (let i = 1; i < window; i++) {
        for (const n of sorted[i].numbers) seenWithoutNewest.add(n);
      }
      if (seenWithoutNewest.size < uni.total) {
        alerts.push({
          category: "system",
          title: `${uni.name}: ciclo completo fechado 🔄`,
          body: `Concurso ${newest.concurso} completou o ciclo — todas as ${uni.total} dezenas saíram nos últimos ${window} sorteios.`,
          url,
          tag: `${lotteryId}-cycle-${newest.concurso}`,
        });
      }
    }
  }

  return { alerts, newestConcurso: newest.concurso };
}

async function firePush(
  supabaseUrl: string,
  serviceRole: string,
  userId: string,
  alert: Alert,
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
        title: alert.title,
        body: alert.body,
        url: alert.url,
        category: alert.category,
        tag: alert.tag,
      }),
    });
    if (!res.ok) {
      console.warn("[alerts-scan] push failed", res.status);
      return false;
    }
    const result = await res.json().catch(() => null);
    return typeof result?.sent === "number" && result.sent > 0;
  } catch (e) {
    console.warn("[alerts-scan] push error", e);
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

    const serviceKeyHeader = req.headers.get("x-service-key");
    const isServiceCall = serviceKeyHeader && serviceKeyHeader === serviceRole;

    // Identifica usuários alvo
    let scopedUserId: string | null = null;

    if (!isServiceCall) {
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

    // Busca configs ativas
    let configsQuery = admin
      .from("user_alert_configs")
      .select("id, user_id, lottery_id, triggers, last_concurso")
      .eq("enabled", true);

    if (scopedUserId) configsQuery = configsQuery.eq("user_id", scopedUserId);

    const { data: configs, error: cfgErr } = await configsQuery;
    if (cfgErr) throw cfgErr;

    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ ok: true, scanned: 0, alerts: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache de draws por loteria
    const drawsCache = new Map<string, Draw[]>();
    let totalAlerts = 0;

    for (const cfg of configs) {
      const lotteryId = cfg.lottery_id as string;
      if (!LOTTERY_UNIVERSE[lotteryId]) continue;

      let draws = drawsCache.get(lotteryId);
      if (!draws) {
        const { data: drawRows, error: drawError } = await admin
          .from("lottery_draws")
          .select("concurso, numbers, acumulou")
          .eq("lottery_id", lotteryId)
          .order("concurso", { ascending: false })
          .limit(120);
        if (drawError) throw new Error("Lottery draw query failed");
        draws = (drawRows || []) as Draw[];
        drawsCache.set(lotteryId, draws);
      }

      const triggers = (cfg.triggers || {}) as TriggerFlags;
      const { alerts, newestConcurso } = detectTriggers(
        lotteryId,
        draws,
        triggers,
        cfg.last_concurso ?? 0,
      );

      if (newestConcurso > (cfg.last_concurso ?? 0)) {
        let allDelivered = true;
        for (const alert of alerts) {
          const delivered = await firePush(supabaseUrl, serviceRole, cfg.user_id, alert);
          if (delivered) totalAlerts++;
          else allDelivered = false;
        }
        // Avoid permanently marking a draw as notified when delivery failed.
        // No subscriptions means the user cannot receive pushes; leave cursor
        // unchanged so enabling push later can still trigger the newest draw.
        if (allDelivered) {
          const { error: cursorError } = await admin.from("user_alert_configs")
            .update({ last_concurso: newestConcurso }).eq("id", cfg.id);
          if (cursorError) throw new Error("Alert cursor update failed");
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, scanned: configs.length, alerts: totalAlerts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[alerts-scan] fatal", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
