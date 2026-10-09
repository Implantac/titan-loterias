import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUserAuth } from "../_shared/auth.ts";
import { getSupabaseAdmin, getCachedAnalysis, setCachedAnalysis } from "../_shared/ai-cache.ts";
import { checkRateLimit, rateLimited, AI_RATE_LIMIT } from "../_shared/rate-limit.ts";
import {
  FEW_SHOT_PROMPT_BLOCK,
  runEnsembleOrSingle,
  chainOfVerification,
  validateCitations,
  gatewayErrorResponse,
} from "../_shared/ai-enhance.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireUserAuth(req, { allowedPlans: ["premium", "professional", "lifetime"] });
    if (auth instanceof Response) return auth;
    
    // Chamadas de IA custam dinheiro: limita abuso por usuário logado.
    const rl = checkRateLimit(`ai:ai-simulation-analysis:${auth.userId}`, AI_RATE_LIMIT);
    if (!rl.allowed) return rateLimited(rl.retryAfterSec, corsHeaders);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { simulationData, lotteryName, lotteryPick, lotteryNumbers } = await req.json();
    if (!simulationData) throw new Error("simulationData required");

    const supabase = await getSupabaseAdmin();
    const lotteryId = lotteryName?.toLowerCase().replace(/\s+/g, "").replace(/á/g, "a") || "unknown";
    const cacheInput = { lotteryName, totalDraws: simulationData.totalDraws, betsCount: simulationData.bets?.length };
    const cached = await getCachedAnalysis(supabase, lotteryId, "ai-simulation-analysis", cacheInput, 6);
    if (cached) {
      return new Response(JSON.stringify({ ...cached, fromCache: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lotteryStrategies: Record<string, string> = {
      "Lotofácil": "Lotofácil (15/25): Cobertura por quintil (1-5, 6-10, 11-15, 16-20, 21-25) com 3 números cada. Par/ímpar entre 7/8 e 8/7. Soma ideal: 170-210. Máximo 3 consecutivos.",
      "Mega Sena": "Mega Sena (6/60): Distribuição em ≥3 dezenas de 10. Par/ímpar 3/3. Soma 120-220. Máximo 1 par consecutivo. Evitar clusters.",
      "Quina": "Quina (5/80): Distribuição ampla em ≥3 faixas de 20. Par/ímpar 2/3 ou 3/2. Soma 100-250. Spread mínimo 40.",
      "Lotomania": "Lotomania (50/100): Cobertura ≥85% por dezena. Par/ímpar 24-26/24-26. Soma 2400-2600. Alta diversificação.",
      "Dupla Sena": "Dupla Sena (6/50): Distribuição em ≥3 faixas de 10. Par/ímpar 3/3. Soma 100-180.",
      "Dia de Sorte": "Dia de Sorte (7/31): Cobertura por terço (1-10, 11-20, 21-31). Par/ímpar 3/4 ou 4/3. Soma 100-130.",
      "Super Sete": "Super Sete (7 colunas 0-9): Análise por coluna independente. Variação entre colunas.",
      "Timemania": "Timemania (10/80): ≥5 faixas de 16 cobertas. Par/ímpar 5/5. Soma 350-450. Spread ≥60.",
    };

    // Pre-compute comparative metrics
    const bets = simulationData.bets || [];
    const avgHits = bets.length > 0 ? bets.reduce((s: number, b: any) => s + b.avgHits, 0) / bets.length : 0;
    const bestOverall = Math.max(...bets.map((b: any) => b.bestHit || 0));
    const avgPrizeRate = bets.length > 0 
      ? (bets.reduce((s: number, b: any) => s + (b.prizeCount || 0), 0) / (bets.length * Math.max(simulationData.totalDraws, 1)) * 100).toFixed(1)
      : "0";

    // Number frequency across all bets
    const numUsage: Record<number, { count: number; avgHits: number; bets: number }> = {};
    bets.forEach((b: any) => {
      (b.bet?.numbers || []).forEach((n: number) => {
        if (!numUsage[n]) numUsage[n] = { count: 0, avgHits: 0, bets: 0 };
        numUsage[n].count++;
        numUsage[n].avgHits += b.avgHits || 0;
        numUsage[n].bets++;
      });
    });
    for (const n in numUsage) {
      numUsage[n].avgHits = numUsage[n].avgHits / numUsage[n].bets;
    }

    const bestNums = Object.entries(numUsage)
      .sort((a, b) => b[1].avgHits - a[1].avgHits)
      .slice(0, 15)
      .map(([n, s]) => `${n}(em ${s.count} jogos, média:${s.avgHits.toFixed(1)})`);
    const worstNums = Object.entries(numUsage)
      .sort((a, b) => a[1].avgHits - b[1].avgHits)
      .slice(0, 10)
      .map(([n, s]) => `${n}(em ${s.count} jogos, média:${s.avgHits.toFixed(1)})`);

    const systemPrompt = `Você é um analista quantitativo de elite em loterias brasileiras.
Analise resultados de simulação de apostas contra sorteios reais com rigor estatístico.
Formate com markdown (##, ###, **negrito**, listas). Português do Brasil.

ESTRATÉGIA DE REFERÊNCIA:
${lotteryStrategies[lotteryName] || ""}

OBJETIVOS DA ANÁLISE:
1. Identificar por que certos jogos performam melhor
2. Encontrar dezenas que consistentemente prejudicam o desempenho
3. Sugerir substituições CONCRETAS (trocar X por Y) com lift esperado
4. Gerar 2 jogos otimizados baseados nos padrões dos melhores
5. Quantificar cada recomendação com números

## FORMATO OBRIGATÓRIO (markdown rico)
- **Diagnóstico** em 1 linha
- **Tabela** comparando top vs bottom performers (hits médios, score, padrão)
- **Substituições recomendadas** em lista densa: \`XX → YY\` com justificativa numérica
- **Jogos otimizados** com dezenas em **negrito** (2 dígitos) + score esperado
- Sem rodeios, sem repetir o input, sem disclaimers genéricos.${FEW_SHOT_PROMPT_BLOCK}`;

    const userPrompt = `═══ SIMULAÇÃO HISTÓRICA — ${lotteryName} (${lotteryPick}/${lotteryNumbers}) ═══
Concursos testados: ${simulationData.totalDraws}
Jogos avaliados: ${bets.length}

═══ MÉTRICAS GERAIS ═══
Média geral de acertos: ${avgHits.toFixed(2)}
Melhor acerto geral: ${bestOverall}
Taxa média de premiação: ${avgPrizeRate}%

═══ DESEMPENHO POR JOGO ═══
${bets.map((b: any, i: number) => {
  const rank = simulationData.ranking?.indexOf(i) + 1 || i + 1;
  const nums = b.bet?.numbers || [];
  const evens = nums.filter((n: number) => n % 2 === 0).length;
  const sum = nums.reduce((a: number, n: number) => a + n, 0);
  const sorted = [...nums].sort((a: number, b: number) => a - b);
  const consec = sorted.filter((n: number, idx: number, arr: number[]) => idx > 0 && n === arr[idx-1] + 1).length;
  const spread = sorted.length > 0 ? sorted[sorted.length - 1] - sorted[0] : 0;
  const distStr = Object.entries(b.hitDistribution || {})
    .sort((a: any, b: any) => Number(b[0]) - Number(a[0]))
    .map(([hits, count]: any) => `${hits}ac→${count}x`)
    .join(" | ");
  return `JOGO #${rank} [${nums.join(",")}]
  Média:${b.avgHits} | Melhor:${b.bestHit} | Prêmios:${b.prizeCount}/${simulationData.totalDraws} | Estab:${b.stability}
  Par/Ímpar:${evens}/${nums.length - evens} | Soma:${sum} | Consec:${consec} | Spread:${spread}
  Distribuição: ${distStr}`;
}).join("\n\n")}

═══ ANÁLISE DE DEZENAS INDIVIDUAIS ═══
Dezenas com melhor performance: ${bestNums.join(", ")}
Dezenas com pior performance: ${worstNums.join(", ")}

═══ SOLICITAÇÃO ═══

## 1. RANKING ANALÍTICO
Ranking dos jogos com explicação técnica de por que cada um performa como performa.

## 2. DIAGNÓSTICO POR JOGO
Para cada jogo, identifique:
- 2-4 dezenas ineficientes com evidência numérica
- Substituições concretas (ex: "trocar 15 por 22 porque...")
- O que está correto no jogo

## 3. PADRÕES DOS MELHORES
- Que características os top jogos compartilham?
- Par/ímpar, soma, spread, distribuição por faixas

## 4. JOGOS OTIMIZADOS
- 2 combinações de ${lotteryPick} dezenas baseadas nos padrões identificados
- Justificativa número a número

## 5. SCORE DE CONFIANÇA
- 0-100 para cada recomendação
- Limitações da simulação`;

    const ensemble = await runEnsembleOrSingle(LOVABLE_API_KEY, systemPrompt, userPrompt);
    if (!ensemble.analysis) {
      const errResp = gatewayErrorResponse(ensemble.rateLimited ? 429 : ensemble.creditsExhausted ? 402 : 500, corsHeaders);
      if (errResp) return errResp;
      throw new Error("Erro na análise de IA");
    }

    const { verified, revised } = await chainOfVerification(LOVABLE_API_KEY, ensemble.analysis, userPrompt);
    const validation = validateCitations(verified, userPrompt);

    const responseData = {
      success: true,
      analysis: verified,
      meta: { ensemble: ensemble.ensemble, variants: ensemble.variants, revised, validation },
    };
    await setCachedAnalysis(supabase, lotteryId, "ai-simulation-analysis", cacheInput, responseData, 6);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("AI simulation analysis error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
