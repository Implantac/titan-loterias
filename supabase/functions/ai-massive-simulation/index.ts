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
    const rl = checkRateLimit(`ai:ai-massive-simulation:${auth.userId}`, AI_RATE_LIMIT);
    if (!rl.allowed) return rateLimited(rl.retryAfterSec, corsHeaders);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { topGames, patternInsights, distributionSummary, lotteryName, lotteryPick, lotteryNumbers, totalGenerated, totalEvaluated } = await req.json();
    if (!topGames || topGames.length === 0) throw new Error("topGames required");

    const supabase = await getSupabaseAdmin();
    const lotteryId = lotteryName?.toLowerCase().replace(/\s+/g, "").replace(/á/g, "a") || "unknown";
    const cacheInput = { lotteryName, totalGenerated, totalEvaluated, topScore: topGames[0]?.score };
    const cached = await getCachedAnalysis(supabase, lotteryId, "ai-massive-simulation", cacheInput, 6);
    if (cached) {
      return new Response(JSON.stringify({ ...cached, fromCache: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deep analysis of number frequency across top games
    const numFreq: Record<number, number> = {};
    const numScoreAvg: Record<number, { total: number; count: number }> = {};
    topGames.forEach((g: any) => {
      (g.numbers || []).forEach((n: number) => {
        numFreq[n] = (numFreq[n] || 0) + 1;
        if (!numScoreAvg[n]) numScoreAvg[n] = { total: 0, count: 0 };
        numScoreAvg[n].total += g.score || 0;
        numScoreAvg[n].count++;
      });
    });

    const topNumbers = Object.entries(numFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([n, freq]) => {
        const avg = numScoreAvg[Number(n)] ? (numScoreAvg[Number(n)].total / numScoreAvg[Number(n)].count).toFixed(1) : "0";
        return `${n}(${freq}x,scoreM:${avg})`;
      });

    // Analyze distribution patterns of top 5 vs bottom 5 in top games
    const top5 = topGames.slice(0, 5);
    const bottom5 = topGames.slice(-5);

    const getProfile = (games: any[]) => {
      const avgSum = games.reduce((s: number, g: any) => s + (g.sum || 0), 0) / games.length;
      const avgEven = games.reduce((s: number, g: any) => s + (g.evenCount || 0), 0) / games.length;
      const avgConsec = games.reduce((s: number, g: any) => s + (g.consecutivePairs || 0), 0) / games.length;
      const avgSpread = games.reduce((s: number, g: any) => s + (g.rangeSpread || 0), 0) / games.length;
      const avgScore = games.reduce((s: number, g: any) => s + (g.score || 0), 0) / games.length;
      return { avgSum: avgSum.toFixed(0), avgEven: avgEven.toFixed(1), avgConsec: avgConsec.toFixed(1), avgSpread: avgSpread.toFixed(0), avgScore: avgScore.toFixed(1) };
    };

    const top5Profile = getProfile(top5);
    const bottom5Profile = getProfile(bottom5);

    const systemPrompt = `Você é um analista quantitativo de elite especializado em simulação massiva de loterias brasileiras.
Analise os resultados de uma simulação de larga escala e forneça insights acionáveis.
Sua análise deve ser rigorosa, técnica e baseada em evidências numéricas.
Responda em português do Brasil com markdown formatado.

REGRAS:
- Cite números específicos e porcentagens com precisão
- Compare top performers vs bottom performers para identificar diferenciais
- Identifique padrões recorrentes nas melhores combinações
- Sugira 3 combinações otimizadas com justificativa número a número
- Compare os padrões encontrados com as distribuições ideais para ${lotteryName}
- Dê um score de confiança (0-100) com fundamentação

## FORMATO OBRIGATÓRIO (markdown rico)
- **Diagnóstico** em 1-2 linhas
- **Tabela comparativa** top vs bottom (freq, soma, par/ímpar, faixas)
- **3 jogos otimizados** com dezenas em **negrito** (2 dígitos) + score esperado + justificativa numérica por dezena
- **Confiança final** (0-100) com fundamentação estatística (χ², entropia, lift)
- Direto ao ponto. Sem rodeios. Sem disclaimers genéricos.${FEW_SHOT_PROMPT_BLOCK}`;

    const gamesReport = topGames.slice(0, 20).map((g: any, i: number) => {
      const nums = (g.numbers || []).join(",");
      return `#${i + 1} [${nums}] Score:${g.score} Avg:${g.avgHits} Best:${g.bestHit} Prêmios:${g.prizeCount} Par:${g.evenCount} Ímpar:${g.oddCount} Soma:${g.sum} Consec:${g.consecutivePairs} Spread:${g.rangeSpread}`;
    }).join("\n");

    const insightsReport = (patternInsights || []).map((p: any) =>
      `- ${p.label}: ${p.value} (${p.description})`
    ).join("\n");

    const userPrompt = `═══ SIMULAÇÃO MASSIVA — ${lotteryName} (${lotteryPick}/${lotteryNumbers}) ═══

ESCALA: ${totalGenerated.toLocaleString()} jogos gerados | ${totalEvaluated.toLocaleString()} comparações realizadas

═══ PERFIL COMPARATIVO: TOP 5 vs BOTTOM 5 ═══
              | TOP 5         | BOTTOM 5      | DELTA
Soma média    | ${top5Profile.avgSum}           | ${bottom5Profile.avgSum}           | ${(Number(top5Profile.avgSum) - Number(bottom5Profile.avgSum)).toFixed(0)}
Par médio     | ${top5Profile.avgEven}          | ${bottom5Profile.avgEven}          | ${(Number(top5Profile.avgEven) - Number(bottom5Profile.avgEven)).toFixed(1)}
Consec médio  | ${top5Profile.avgConsec}        | ${bottom5Profile.avgConsec}        | ${(Number(top5Profile.avgConsec) - Number(bottom5Profile.avgConsec)).toFixed(1)}
Spread médio  | ${top5Profile.avgSpread}        | ${bottom5Profile.avgSpread}        | ${(Number(top5Profile.avgSpread) - Number(bottom5Profile.avgSpread)).toFixed(0)}
Score médio   | ${top5Profile.avgScore}         | ${bottom5Profile.avgScore}         | ${(Number(top5Profile.avgScore) - Number(bottom5Profile.avgScore)).toFixed(1)}

═══ DISTRIBUIÇÃO GERAL DO UNIVERSO ELITE ═══
Soma média: ${distributionSummary.avgSum}
Razão par/total: ${distributionSummary.avgEvenRatio}
Consecutivos médios: ${distributionSummary.avgConsecutive}
Spread médio: ${distributionSummary.avgSpread}
Melhor acerto geral: ${distributionSummary.bestHitOverall}
Taxa média de premiação: ${distributionSummary.avgPrizeRate}%

═══ DEZENAS MAIS RECORRENTES NOS TOP GAMES ═══
${topNumbers.join(", ")}

═══ PADRÕES DETECTADOS PELO MOTOR ═══
${insightsReport}

═══ TOP 20 JOGOS DETALHADOS ═══
${gamesReport}

═══ SOLICITAÇÃO DE ANÁLISE PROFUNDA ═══

## 1. PADRÕES DOMINANTES
O que diferencia estatisticamente os melhores jogos dos piores? Use a comparação TOP 5 vs BOTTOM 5.

## 2. PERFIL IDEAL DE JOGO
- Par/ímpar exato
- Faixa de soma (intervalo numérico)
- Consecutivos ideais
- Spread mínimo e máximo
- Distribuição por faixas numéricas

## 3. DEZENAS-CHAVE
- Quais números são "must-have" (aparecem em ≥60% dos top games)?
- Quais são "nice-to-have" (40-60%)?
- Quais são "tóxicos" (nunca ou raramente nos melhores)?

## 4. TRÊS JOGOS OTIMIZADOS
Para cada jogo:
- ${lotteryPick} dezenas em ordem crescente
- Justificativa para cada dezena (hot, overdue, cobertura, etc.)
- Score estimado e par/ímpar/soma/spread

## 5. SCORE DE CONFIANÇA
- De 0 a 100, quão confiáveis são esses padrões?
- Tamanho amostral é suficiente?
- Quais padrões são mais robustos?

## 6. ESTRATÉGIA DE USO
Como o jogador deve usar esses resultados na prática?`;

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
    await setCachedAnalysis(supabase, lotteryId, "ai-massive-simulation", cacheInput, responseData, 6);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("AI massive simulation error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
