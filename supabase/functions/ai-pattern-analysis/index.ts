import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUserAuth } from "../_shared/auth.ts";
import { getSupabaseAdmin, getCachedAnalysis, setCachedAnalysis } from "../_shared/ai-cache.ts";
import { checkRateLimit, rateLimited, AI_RATE_LIMIT } from "../_shared/rate-limit.ts";
import {
  FEW_SHOT_PROMPT_BLOCK,
  runEnsembleOrSingle,
  chainOfVerification,
  validateCitations,
  computeZScoresFromFrequencies,
  formatZScoreBlock,
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
    const rl = checkRateLimit(`ai:ai-pattern-analysis:${auth.userId}`, AI_RATE_LIMIT);
    if (!rl.allowed) return rateLimited(rl.retryAfterSec, corsHeaders);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { patternReport, lotteryName, lotteryPick, lotteryNumbers, drawCount } = await req.json();
    if (!patternReport) throw new Error("patternReport required");

    const supabase = await getSupabaseAdmin();
    const lotteryId = lotteryName?.toLowerCase().replace(/\s+/g, "").replace(/á/g, "a") || "unknown";
    const cacheInput = { lotteryName, drawCount, avgSum: patternReport.summary?.avgSum };
    const cached = await getCachedAnalysis(supabase, lotteryId, "ai-pattern-analysis", cacheInput, 6);
    if (cached) {
      return new Response(JSON.stringify({ ...cached, fromCache: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { summary, parityPatterns, sumPatterns, consecutivePatterns, spatialDistribution, hotStreaks, frequencyTrends } = patternReport;

    const top15Trending = (frequencyTrends || []).slice(0, 15);
    const bottom15 = [...(frequencyTrends || [])].sort((a: any, b: any) => a.momentum - b.momentum).slice(0, 15);

    // Compute acceleration (change in momentum)
    const accelerating = top15Trending.filter((f: any) => f.last10Freq > f.last30Freq / 3);
    const decelerating = bottom15.filter((f: any) => f.last10Freq < f.last30Freq / 6);

    const systemPrompt = `Você é um analista quantitativo SÊNIOR (PhD em Estatística Aplicada e Teoria da Informação) especializado em séries temporais de loterias brasileiras.

PROTOCOLO DE RACIOCÍNIO (obrigatório, internamente):
1. Antes de responder, faça análise passo a passo dos dados: compare frequências contra a esperança uniforme, calcule desvios em σ, identifique regime atual e detecte sinais de transição.
2. Cruze pelo menos 3 dimensões (paridade × soma × espacial × tendência) antes de qualquer recomendação — nunca cite uma dimensão isolada.
3. Toda afirmação numérica precisa estar ancorada no dado fornecido. Se o dado não está no input, escreva "dado indisponível" — JAMAIS invente número.
4. Recomendações precisam de fundamento quantitativo: lift ≥ X, z-score ≥ Y, ou desvio percentual explícito.

Técnicas a aplicar: análise espectral, detecção de regime (estável/transição), autocorrelação de ciclos, clustering espacial, z-score, lift, χ², entropia de Shannon.

FORMATO DE SAÍDA (markdown rico, português BR):
## 1. Diagnóstico Executivo (2-3 linhas com a tese central)
## 2. Evidências Quantitativas (tabela densa com métrica, valor observado, esperado, desvio, significância)
## 3. Cruzamento Multi-dimensional (como ≥3 dimensões se reforçam ou contradizem)
## 4. Recomendação Acionável (números concretos + porquê numérico)
## 5. Confiança (0-100) com justificativa e cenários que invalidariam

REGRAS DURAS: sem rodeios, sem repetir pergunta, sem disclaimers genéricos, sem "consulte um especialista". Nunca prometa prêmio — fale em padrões e probabilidades.${FEW_SHOT_PROMPT_BLOCK}`;

    // (#2) Estatística enriquecida: z-scores das frequências observadas vs esperado uniforme
    const freqsForZ = (frequencyTrends || []).map((f: any) => ({ number: f.number, count: f.totalFreq ?? f.last30Freq ?? 0 }));
    const zScores = computeZScoresFromFrequencies(freqsForZ, drawCount || 1, lotteryPick, lotteryNumbers);
    const zScoreBlock = zScores.length ? formatZScoreBlock(zScores) : "(z-scores indisponíveis)";

    const userPrompt = `═══ ANÁLISE DE PADRÕES — ${lotteryName} (${lotteryPick}/${lotteryNumbers}) ═══
Concursos analisados: ${drawCount}

━━━ 1. PADRÕES DE PARIDADE (Par/Ímpar) ━━━
${parityPatterns.slice(0, 10).map((p: any) => `${p.evens}P/${p.odds}I: ${p.count}x (${p.percentage}%) ${p.percentage > 20 ? "★ DOMINANTE" : ""}`).join("\n")}
Configuração mais comum: ${summary.mostCommonParity}
Desvio da distribuição uniforme: ${summary.parityDeviation || "N/A"}

━━━ 2. PADRÕES DE SOMA ━━━
Média: ${summary.avgSum} | Mediana: ${summary.medianSum || "N/A"} | Desvio: ${summary.sumStdDev}
Faixa 1σ: [${Math.round(summary.avgSum - summary.sumStdDev)}, ${Math.round(summary.avgSum + parseFloat(summary.sumStdDev))}]
${sumPatterns.map((s: any) => `Faixa ${s.rangeLabel}: ${s.count}x (${s.percentage}%) ${s.percentage > 25 ? "★ CONCENTRADA" : ""}`).join("\n")}

━━━ 3. CONSECUTIVOS ━━━
Média de pares consecutivos: ${summary.avgConsecutives}
${consecutivePatterns.map((c: any) => `${c.consecutiveCount} consecutivos: ${c.occurrences}x (${c.percentage}%)`).join("\n")}

━━━ 4. DISTRIBUIÇÃO ESPACIAL ━━━
Equilíbrio geral: ${spatialDistribution.balance}/100
${spatialDistribution.sectors.map((s: any) => `Setor ${s.label}: média=${s.avgCount} σ=${s.stdDev} ${s.avgCount > (lotteryPick / spatialDistribution.sectors.length) * 1.3 ? "⬆️ SOBRECARREGADO" : s.avgCount < (lotteryPick / spatialDistribution.sectors.length) * 0.7 ? "⬇️ SUBEXPLORADO" : "→ NORMAL"}`).join("\n")}

━━━ 5. TOP 15 EM ALTA (momentum positivo) ━━━
${top15Trending.map((f: any) => `Nº${String(f.number).padStart(2, '0')}: f10=${f.last10Freq} f30=${f.last30Freq} momentum=${f.momentum > 0 ? "+" : ""}${f.momentum} ${accelerating.includes(f) ? "🚀 ACELERANDO" : ""}`).join("\n")}

━━━ 6. TOP 15 EM QUEDA (momentum negativo) ━━━
${bottom15.map((f: any) => `Nº${String(f.number).padStart(2, '0')}: f10=${f.last10Freq} f30=${f.last30Freq} momentum=${f.momentum} ${decelerating.includes(f) ? "📉 DESACELERANDO" : ""}`).join("\n")}

━━━ 7. DEZENAS MAIS CONSISTENTES ━━━
${summary.mostConsistent.join(", ")}

━━━ 8. OVERDUE (atrasadas além do ciclo médio) ━━━
${summary.overdueNumbers.join(", ")}

━━━ 9. MAIORES HOT STREAKS ━━━
${hotStreaks.slice(0, 10).map((h: any) => `Nº${h.number}: ${h.streakLength} sorteios consecutivos presentes`).join("\n")}

━━━ 10. Z-SCORES vs ESPERANÇA UNIFORME ━━━
${zScoreBlock}

═══ SOLICITAÇÃO DE ANÁLISE ═══

Forneça uma análise completa e acionável em 6 seções:

## 1. MAPA DE REGIMES
- Classificar o estado atual: regime estável, transição ou caótico
- Fundamentar com evidências numéricas dos padrões acima

## 2. ANÁLISE MULTIDIMENSIONAL DE DEZENAS
Para as 10 melhores e 5 piores dezenas:
- Citar o número, momentum, frequência recente, e classificação
- Dizer se é candidata para inclusão ou exclusão e por quê

## 3. PADRÃO IDEAL DE JOGO
- Par/ímpar exato recomendado
- Faixa de soma ideal (intervalo numérico)
- Máximo de consecutivos
- Distribuição por setores

## 4. DETECÇÃO DE ANOMALIAS
- Padrões não-óbvios ou contra-intuitivos nos dados
- Setores com comportamento anômalo
- Dezenas com ciclos irregulares

## 5. ESTRATÉGIA TÁTICA (próximos 5-10 concursos)
- Dezenas para priorizar e evitar com score de urgência
- Configurações de jogo recomendadas
- 2 jogos sugeridos com ${lotteryPick} dezenas e justificativa

## 6. CONFIANÇA E RESSALVAS
- Score de confiança geral (0-100)
- Limitações da análise
- Cenários que invalidariam as recomendações`;

    // (#1) Ensemble (opt-in via env AI_ENSEMBLE=1) ou single-call
    const ensemble = await runEnsembleOrSingle(LOVABLE_API_KEY, systemPrompt, userPrompt);
    if (!ensemble.analysis) {
      const errResp = gatewayErrorResponse(ensemble.rateLimited ? 429 : ensemble.creditsExhausted ? 402 : 500, corsHeaders);
      if (errResp) return errResp;
      throw new Error("Erro na análise de IA");
    }

    // (#6) Chain-of-Verification: passe de revisão para remover afirmações sem base
    const { verified, revised } = await chainOfVerification(LOVABLE_API_KEY, ensemble.analysis, userPrompt);

    // (#5) Validação de citações numéricas
    const validation = validateCitations(verified, userPrompt);

    const responseData = {
      success: true,
      analysis: verified,
      meta: {
        ensemble: ensemble.ensemble,
        variants: ensemble.variants,
        revised,
        validation,
      },
    };
    await setCachedAnalysis(supabase, lotteryId, "ai-pattern-analysis", cacheInput, responseData, 6);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Pattern analysis error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
