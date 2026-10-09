import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUserAuth } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCachedAnalysis, setCachedAnalysis } from "../_shared/ai-cache.ts";

import { checkRateLimit, rateLimited, AI_RATE_LIMIT } from "../_shared/rate-limit.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRIMES_25 = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23]);

// Lottery-specific validation profiles
const LOTTERY_PROFILES: Record<string, {
  numbers: number; pick: number; name: string;
  sumRange: [number, number];
  parityRange: [number, number]; // min/max even numbers
  oddRange: [number, number]; // min/max odd numbers
  maxConsecutive: number;
  minRanges: number;
  rangeSize: number;
  primesRange?: [number, number]; // min/max primes in bet
  repeatRange?: [number, number]; // min/max numbers repeated from previous draw
  specialRules?: string;
}> = {
  megasena: {
    numbers: 60, pick: 6, name: "Mega Sena",
    sumRange: [120, 260], parityRange: [2, 4], oddRange: [2, 4], maxConsecutive: 2, minRanges: 3, rangeSize: 10,
    specialRules: "Evite concentrar mais de 3 números na mesma dezena. Ideal: 3 pares e 3 ímpares."
  },
  lotofacil: {
    numbers: 25, pick: 15, name: "Lotofácil",
    sumRange: [180, 220], parityRange: [7, 8], oddRange: [7, 8], maxConsecutive: 5, minRanges: 5, rangeSize: 5,
    primesRange: [5, 6],
    repeatRange: [8, 10],
    specialRules: `REGRAS ESPECÍFICAS DA LOTOFÁCIL (OBRIGATÓRIO):
- Equilíbrio Par/Ímpar: PRIORIZE 8 ímpares e 7 pares (31% dos sorteios) OU 7 ímpares e 8 pares.
- Repetição: Repita entre 8 e 10 dezenas do concurso anterior.
- Números Primos: Inclua 5 a 6 primos (02, 03, 05, 07, 11, 13, 17, 19, 23).
- Soma Térmica: A soma DEVE estar entre 180 e 220.
- Dezenas de Ouro: Inclua pelo menos 3 das dezenas 10, 11, 20, 25 (>60% histórico).
- Distribua 3 números por cada faixa de 5 (1-5, 6-10, 11-15, 16-20, 21-25).
- Use o Fechamento Matemático: selecione 18 dezenas-base e gere combinações de 15 a partir delas.`
  },
  quina: {
    numbers: 80, pick: 5, name: "Quina",
    sumRange: [100, 280], parityRange: [2, 3], oddRange: [2, 3], maxConsecutive: 2, minRanges: 3, rangeSize: 16,
    specialRules: "Distribua entre faixas de 20 (1-20, 21-40, 41-60, 61-80). Evite mais de 2 na mesma faixa."
  },
  lotomania: {
    numbers: 100, pick: 50, name: "Lotomania",
    sumRange: [2300, 2800], parityRange: [23, 27], oddRange: [23, 27], maxConsecutive: 8, minRanges: 10, rangeSize: 10,
    specialRules: "Distribua ~5 números por dezena (0-9, 10-19, ..., 90-99). Equilíbrio par/ímpar: 24-26 pares."
  },
  duplasena: {
    numbers: 50, pick: 6, name: "Dupla Sena",
    sumRange: [100, 210], parityRange: [2, 4], oddRange: [2, 4], maxConsecutive: 2, minRanges: 3, rangeSize: 10,
    specialRules: "Distribua entre as faixas 1-10, 11-20, 21-30, 31-40, 41-50. Máximo 2 por faixa."
  },
  timemania: {
    numbers: 80, pick: 10, name: "Timemania",
    sumRange: [250, 520], parityRange: [4, 6], oddRange: [4, 6], maxConsecutive: 3, minRanges: 4, rangeSize: 16,
    specialRules: "Distribua entre 5 faixas de 16. Equilíbrio 5 pares / 5 ímpares é ideal."
  },
  diadesorte: {
    numbers: 31, pick: 7, name: "Dia de Sorte",
    sumRange: [80, 150], parityRange: [3, 4], oddRange: [3, 4], maxConsecutive: 2, minRanges: 3, rangeSize: 8,
    specialRules: "Cubra pelo menos 3 das 4 faixas (1-8, 9-16, 17-24, 25-31). Soma ideal entre 100-130."
  },
  supersete: {
    numbers: 10, pick: 7, name: "Super Sete",
    sumRange: [20, 50], parityRange: [3, 4], oddRange: [3, 4], maxConsecutive: 3, minRanges: 2, rangeSize: 5,
    specialRules: "Super Sete: cada coluna tem valores de 0-9. Gere 7 dígitos de 0-9. Equilíbrio baixos (0-4) e altos (5-9)."
  },
};

// Validate and repair a bet
function validateAndRepairBet(
  bet: number[], 
  profile: typeof LOTTERY_PROFILES[string], 
  allFreq: Record<number, number>,
  lastDrawNums?: number[]
): number[] | null {
  if (!Array.isArray(bet)) return null;

  const minN = profile.name === "Super Sete" ? 0 : 1;
  let nums = [...new Set(bet.filter(n => n >= minN && n <= profile.numbers))];

  if (nums.length > profile.pick) nums = nums.slice(0, profile.pick);

  // Fill missing from frequency pool
  if (nums.length < profile.pick) {
    const pool = Array.from({ length: profile.numbers - minN + 1 }, (_, i) => i + minN)
      .filter(n => !nums.includes(n))
      .sort((a, b) => (allFreq[b] || 0) - (allFreq[a] || 0));
    while (nums.length < profile.pick && pool.length > 0) {
      nums.push(pool.shift()!);
    }
  }

  if (nums.length !== profile.pick) return null;
  nums.sort((a, b) => a - b);

  // Lotofácil-specific: ensure repetition from previous draw
  if (profile.repeatRange && lastDrawNums && lastDrawNums.length > 0) {
    const lastSet = new Set(lastDrawNums);
    let repeated = nums.filter(n => lastSet.has(n)).length;
    const [minRep, maxRep] = profile.repeatRange;

    // Try to fix if too few repeats
    for (let attempt = 0; attempt < 10 && repeated < minRep; attempt++) {
      const nonRepeated = nums.filter(n => !lastSet.has(n));
      const availableRepeats = lastDrawNums.filter(n => !nums.includes(n));
      if (nonRepeated.length === 0 || availableRepeats.length === 0) break;
      // Replace a non-repeated number with a repeat from previous
      const replaceIdx = nums.indexOf(nonRepeated[nonRepeated.length - 1]);
      const bestRepeat = availableRepeats.sort((a, b) => (allFreq[b] || 0) - (allFreq[a] || 0))[0];
      nums[replaceIdx] = bestRepeat;
      nums.sort((a, b) => a - b);
      repeated = nums.filter(n => lastSet.has(n)).length;
    }

    // Fix if too many repeats
    for (let attempt = 0; attempt < 10 && repeated > maxRep; attempt++) {
      const repeatedNums = nums.filter(n => lastSet.has(n));
      const available = Array.from({ length: profile.numbers }, (_, i) => i + 1)
        .filter(n => !nums.includes(n) && !lastSet.has(n))
        .sort((a, b) => (allFreq[b] || 0) - (allFreq[a] || 0));
      if (repeatedNums.length === 0 || available.length === 0) break;
      const replaceIdx = nums.indexOf(repeatedNums[repeatedNums.length - 1]);
      nums[replaceIdx] = available[0];
      nums.sort((a, b) => a - b);
      repeated = nums.filter(n => lastSet.has(n)).length;
    }
  }

  // Fix sum if out of range
  const sum = nums.reduce((a, b) => a + b, 0);
  if (sum < profile.sumRange[0] || sum > profile.sumRange[1]) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const curSum = nums.reduce((a, b) => a + b, 0);
      if (curSum >= profile.sumRange[0] && curSum <= profile.sumRange[1]) break;
      if (curSum < profile.sumRange[0]) {
        // Replace smallest with a bigger number not in set
        const candidates = Array.from({ length: profile.numbers }, (_, i) => i + 1)
          .filter(n => !nums.includes(n) && n > nums[Math.floor(nums.length * 0.7)])
          .sort((a, b) => (allFreq[b] || 0) - (allFreq[a] || 0));
        if (candidates.length > 0) {
          nums[0] = candidates[0];
          nums.sort((a, b) => a - b);
        }
      } else {
        const candidates = Array.from({ length: profile.numbers }, (_, i) => i + 1)
          .filter(n => !nums.includes(n) && n < nums[Math.floor(nums.length * 0.3)])
          .sort((a, b) => (allFreq[b] || 0) - (allFreq[a] || 0));
        if (candidates.length > 0) {
          nums[nums.length - 1] = candidates[0];
          nums.sort((a, b) => a - b);
        }
      }
    }
  }

  if (new Set(nums).size !== profile.pick) return null;
  return nums;
}

// Score a bet with lottery-specific criteria
function scoreBet(
  bet: number[], 
  profile: typeof LOTTERY_PROFILES[string], 
  avgSum: number, 
  sumStdDev: number,
  lastDrawNums?: number[]
): { score: number; details: string[] } {
  const details: string[] = [];
  let score = 100;

  // Sum check
  const sum = bet.reduce((a, b) => a + b, 0);
  if (sum >= profile.sumRange[0] && sum <= profile.sumRange[1]) {
    const sumDev = Math.abs(sum - avgSum) / Math.max(sumStdDev, 1);
    if (sumDev <= 0.5) { score += 8; details.push(`Soma ${sum} ótima`); }
    else if (sumDev <= 1) { score += 5; details.push(`Soma ${sum} boa`); }
    else { details.push(`Soma ${sum} aceitável`); }
  } else {
    score -= 25; details.push(`⚠ Soma ${sum} fora do range ${profile.sumRange[0]}-${profile.sumRange[1]}`);
  }

  // Parity
  const evens = bet.filter(n => n % 2 === 0).length;
  const odds = bet.length - evens;
  if (evens >= profile.parityRange[0] && evens <= profile.parityRange[1]) {
    score += 8; details.push(`Paridade ${evens}P/${odds}I ✓`);
  } else {
    score -= 15; details.push(`⚠ Paridade ${evens}P/${odds}I desequilibrada`);
  }

  // Consecutive
  let maxConsecRun = 0, curRun = 0;
  const sorted = [...bet].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) { curRun++; maxConsecRun = Math.max(maxConsecRun, curRun); }
    else curRun = 0;
  }
  if (maxConsecRun <= profile.maxConsecutive) {
    score += 3;
  } else {
    score -= 10; details.push(`⚠ ${maxConsecRun + 1} consecutivos`);
  }

  // Range coverage
  const ranges = new Set(sorted.map(n => Math.floor((n - 1) / profile.rangeSize)));
  if (ranges.size >= profile.minRanges) {
    score += 5; details.push(`${ranges.size} faixas ✓`);
  } else {
    score -= 15; details.push(`⚠ ${ranges.size}/${profile.minRanges} faixas`);
  }

  // Lotofácil-specific scoring
  if (profile.primesRange) {
    const primeCount = bet.filter(n => PRIMES_25.has(n)).length;
    if (primeCount >= profile.primesRange[0] && primeCount <= profile.primesRange[1]) {
      score += 8; details.push(`${primeCount} primos ✓`);
    } else {
      score -= 10; details.push(`⚠ ${primeCount} primos (ideal ${profile.primesRange[0]}-${profile.primesRange[1]})`);
    }
  }

  if (profile.repeatRange && lastDrawNums && lastDrawNums.length > 0) {
    const lastSet = new Set(lastDrawNums);
    const repeated = bet.filter(n => lastSet.has(n)).length;
    if (repeated >= profile.repeatRange[0] && repeated <= profile.repeatRange[1]) {
      score += 10; details.push(`${repeated} repetições do anterior ✓`);
    } else {
      score -= 12; details.push(`⚠ ${repeated} repetições (ideal ${profile.repeatRange[0]}-${profile.repeatRange[1]})`);
    }
  }

  // "Dezenas de Ouro" for Lotofácil
  if (profile.name === "Lotofácil") {
    const goldenNums = [10, 11, 20, 25];
    const goldenCount = bet.filter(n => goldenNums.includes(n)).length;
    if (goldenCount >= 3) {
      score += 5; details.push(`${goldenCount}/4 dezenas de ouro ✓`);
    } else if (goldenCount >= 2) {
      details.push(`${goldenCount}/4 dezenas de ouro`);
    } else {
      score -= 5; details.push(`⚠ Apenas ${goldenCount}/4 dezenas de ouro`);
    }

    // Frame/Center (Moldura/Centro) scoring
    const FRAME = new Set([1,2,3,4,5,6,10,11,15,16,20,21,22,23,24,25]);
    const frameCount = bet.filter(n => FRAME.has(n)).length;
    const centerCount = bet.length - frameCount;
    if (frameCount >= 9 && frameCount <= 11) {
      score += 5; details.push(`Moldura ${frameCount}/${centerCount} ✓`);
    } else if (frameCount >= 8 && frameCount <= 12) {
      score += 2; details.push(`Moldura ${frameCount}/${centerCount} aceitável`);
    } else {
      score -= 8; details.push(`⚠ Moldura ${frameCount}/${centerCount} desequilibrada`);
    }

    // Row distribution (5x5 grid - no empty rows)
    const rowCounts = [0,0,0,0,0];
    for (const n of bet) { rowCounts[Math.floor((n - 1) / 5)]++; }
    const emptyRows = rowCounts.filter(r => r === 0).length;
    if (emptyRows === 0) {
      score += 3; details.push(`Todas 5 linhas cobertas ✓`);
    } else {
      score -= 10; details.push(`⚠ ${emptyRows} linha(s) vazia(s)`);
    }

    // Maximum sequence run (avoid 1-2-3-4-5 type runs)
    let maxRun = 1, curRunSeq = 1;
    const sortedBet = [...bet].sort((a, b) => a - b);
    for (let i = 1; i < sortedBet.length; i++) {
      if (sortedBet[i] === sortedBet[i-1] + 1) { curRunSeq++; maxRun = Math.max(maxRun, curRunSeq); }
      else curRunSeq = 1;
    }
    if (maxRun <= 3) {
      score += 2;
    } else if (maxRun <= 4) {
      details.push(`Sequência de ${maxRun} consecutivos`);
    } else {
      score -= 5; details.push(`⚠ Sequência longa de ${maxRun} consecutivos`);
    }
  }

  return { score: Math.max(0, Math.min(100, score)), details };
}

// Compute Lotofácil cycle (all 25 numbers drawn at least once)
function computeLotofacilCycle(draws: any[]): { cycleLength: number; missingInCycle: number[]; cycleDraws: number } {
  const seen = new Set<number>();
  let cycleDraws = 0;
  for (const d of draws) {
    cycleDraws++;
    for (const n of (d.numbers || [])) seen.add(n);
    if (seen.size >= 25) break;
  }
  const missing = Array.from({ length: 25 }, (_, i) => i + 1).filter(n => !seen.has(n));
  return { cycleLength: cycleDraws, missingInCycle: missing, cycleDraws };
}

// Generate wheeling combinations (18 base numbers → combinations of 15)
function generateWheeling(baseNums: number[], pick: number, maxCombos: number): number[][] {
  const combos: number[][] = [];
  if (baseNums.length <= pick) return [baseNums.sort((a, b) => a - b)];
  
  // Generate systematic combinations by removing groups of (base-pick) numbers
  const removeCount = baseNums.length - pick;
  const sorted = [...baseNums].sort((a, b) => a - b);
  
  // Use systematic rotation to cover all base numbers
  for (let i = 0; i < sorted.length && combos.length < maxCombos; i++) {
    const combo: number[] = [];
    for (let j = 0; j < sorted.length; j++) {
      // Skip removeCount numbers starting from position i
      const skipStart = i;
      const skipPositions = new Set<number>();
      for (let k = 0; k < removeCount; k++) {
        skipPositions.add((skipStart + k) % sorted.length);
      }
      if (!skipPositions.has(j)) {
        combo.push(sorted[j]);
      }
    }
    if (combo.length === pick) {
      const key = combo.join(",");
      if (!combos.some(c => c.join(",") === key)) {
        combos.push(combo);
      }
    }
  }
  
  return combos;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireUserAuth(req, { allowedPlans: ["premium", "professional", "lifetime"] });
    if (auth instanceof Response) return auth;
    
    // Chamadas de IA custam dinheiro: limita abuso por usuário logado.
    const rl = checkRateLimit(`ai:ai-lottery-predict:${auth.userId}`, AI_RATE_LIMIT);
    if (!rl.allowed) return rateLimited(rl.retryAfterSec, corsHeaders);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const reqBody = await req.json();
    const { lottery_id, count = 3, mode, bets_to_improve, last_draws } = reqBody;
    if (!lottery_id) throw new Error("lottery_id required");

    const profile = LOTTERY_PROFILES[lottery_id];
    if (!profile) throw new Error("Loteria não suportada");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: draws, error: drawsError } = await supabase
      .from("lottery_draws")
      .select("concurso, numbers, draw_date")
      .eq("lottery_id", lottery_id)
      .order("concurso", { ascending: false })
      .limit(300);

    if (drawsError) throw drawsError;
    if (!draws || draws.length < 10) {
      throw new Error("Dados insuficientes. Sincronize os sorteios primeiro.");
    }

    // === IMPROVE MODE: AI suggests improvements for existing bets ===
    if (mode === "improve" && bets_to_improve && Array.isArray(bets_to_improve)) {
      const last10 = draws.slice(0, 10);
      const minNum = profile.name === "Super Sete" ? 0 : 1;
      const allNums = Array.from({ length: profile.numbers - minNum + 1 }, (_, i) => i + minNum);
      const freq: Record<number, number> = {};
      const freq10: Record<number, number> = {};
      for (const n of allNums) { freq[n] = 0; freq10[n] = 0; }
      draws.forEach((d: any, i: number) => {
        (d.numbers || []).forEach((n: number) => {
          freq[n] = (freq[n] || 0) + 1;
          if (i < 10) freq10[n] = (freq10[n] || 0) + 1;
        });
      });

      const hotNums = [...allNums].sort((a, b) => (freq10[b] || 0) - (freq10[a] || 0)).slice(0, 20);
      const coldNums = [...allNums].sort((a, b) => (freq10[a] || 0) - (freq10[b] || 0)).slice(0, 10);

      const betsInfo = bets_to_improve.map((b: any, i: number) => {
        const nums = b.numbers || [];
        const hotCount = nums.filter((n: number) => hotNums.includes(n)).length;
        const coldCount = nums.filter((n: number) => coldNums.includes(n)).length;
        const sum = nums.reduce((a: number, b: number) => a + b, 0);
        const evens = nums.filter((n: number) => n % 2 === 0).length;
        return `Aposta ${i+1} "${b.label}": [${nums.join(",")}] | Média acertos: ${b.avg_hits || "N/A"} | Melhor: ${b.best_hit || "N/A"} | Premiações: ${b.prize_hits || 0} | Soma: ${sum} | Pares: ${evens} | Quentes: ${hotCount} | Frios: ${coldCount}`;
      }).join("\n");

      const improvePrompt = `Você é um Analista Estatístico Sênior de loterias brasileiras.
Loteria: "${profile.name}" (${profile.pick} números de ${minNum} a ${profile.numbers}).

ÚLTIMOS 10 SORTEIOS:
${last10.map((d: any) => `C${d.concurso}: [${(d.numbers || []).join(", ")}]`).join("\n")}

NÚMEROS QUENTES (últimos 10 sorteios): [${hotNums.join(", ")}]
NÚMEROS FRIOS: [${coldNums.join(", ")}]

APOSTAS DO USUÁRIO COM PERFORMANCE:
${betsInfo}

FAIXAS IDEAIS para ${profile.name}:
- Soma: ${profile.sumRange[0]}-${profile.sumRange[1]}
- Pares: ${profile.parityRange[0]}-${profile.parityRange[1]}
- Máx consecutivos: ${profile.maxConsecutive}
${profile.primesRange ? `- Primos: ${profile.primesRange[0]}-${profile.primesRange[1]}` : ""}
${profile.repeatRange ? `- Repetição do anterior: ${profile.repeatRange[0]}-${profile.repeatRange[1]}` : ""}

TAREFA: Para cada aposta do usuário, sugira uma versão MELHORADA que:
1. Substitua números frios por quentes mantendo equilíbrio
2. Ajuste soma para faixa ideal
3. Melhore cobertura de faixas
4. Mantenha pelo menos 60% dos números originais (familiaridade)

Responda APENAS com JSON:
{"improvements": [{"original": [nums], "suggested": [nums], "reason": "explicação técnica das mudanças", "expectedGain": "+X% estimado"}]}`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: improvePrompt },
            { role: "user", content: `Melhore as ${bets_to_improve.length} apostas acima para maximizar chances de premiação em ${profile.name}.` },
          ],
          temperature: 0.4,
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI improve error:", aiResponse.status, errText);
        // Fallback: return statistical bets without AI improvement
        console.log("Falling back to statistical-only bets due to AI error");
        const fallbackBets = bets_to_improve.map((b: any) => b.numbers || b);
        // Compute basic quality scores using scoreBet
        const avgSum = draws.slice(0, 100).reduce((s: number, d: any) => s + (d.numbers || []).reduce((a: number, b: number) => a + b, 0), 0) / Math.min(draws.length, 100);
        const sumStdDev = Math.sqrt(draws.slice(0, 100).reduce((s: number, d: any) => {
          const dSum = (d.numbers || []).reduce((a: number, b: number) => a + b, 0);
          return s + (dSum - avgSum) ** 2;
        }, 0) / Math.min(draws.length, 100));
        const scores = fallbackBets.map((b: number[]) => scoreBet(b, profile, avgSum, sumStdDev, last10[0]?.numbers));
        const avgScore = Math.round(scores.reduce((s: number, q: any) => s + q.score, 0) / scores.length);
        const grade = avgScore >= 90 ? "S" : avgScore >= 80 ? "A" : avgScore >= 70 ? "B" : "C";
        return new Response(JSON.stringify({
          success: true,
          bets: fallbackBets,
          count: fallbackBets.length,
          analysis: "Apostas mantidas com base estatística (IA temporariamente indisponível).",
          quality: { avgScore, scores: scores.map((s: any) => s.score), details: scores.map((s: any) => s.details), grade },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "";

      let parsed: any;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON");
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        console.error("Failed to parse improve response:", content);
        throw new Error("Erro ao processar sugestões da IA");
      }

      // Validate improvements
      const improvements = (parsed.improvements || []).map((imp: any) => {
        let suggested = validateAndRepairBet(imp.suggested, profile, freq, last10[0]?.numbers);
        if (!suggested) suggested = imp.suggested;
        return {
          original: imp.original,
          suggested: suggested,
          reason: imp.reason || "Otimização baseada em padrões estatísticos",
          expectedGain: imp.expectedGain || "+10-20%",
        };
      });

      return new Response(JSON.stringify({ success: true, improvements }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check cache (only for normal generate mode)
    const cacheInput = { lottery_id, count, lastConcurso: draws[0]?.concurso, v: 3 };
    const cached = await getCachedAnalysis(supabase, lottery_id, "ai-lottery-predict", cacheInput, 4);
    if (cached) {
      return new Response(JSON.stringify({ ...cached, fromCache: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === COMPUTE DEEP STATISTICS ===
    const minNum = profile.name === "Super Sete" ? 0 : 1;
    const allNums = Array.from({ length: profile.numbers - minNum + 1 }, (_, i) => i + minNum);
    const freq: Record<number, number> = {};
    const freq30: Record<number, number> = {};
    const freq10: Record<number, number> = {};
    const lastSeen: Record<number, number> = {};
    const gapHistory: Record<number, number[]> = {};

    for (const n of allNums) {
      freq[n] = 0; freq30[n] = 0; freq10[n] = 0; lastSeen[n] = 999;
      gapHistory[n] = [];
    }

    const lastAppearance: Record<number, number> = {};

    draws.forEach((d: any, i: number) => {
      const nums = d.numbers || [];
      nums.forEach((n: number) => {
        freq[n] = (freq[n] || 0) + 1;
        if (i < 30) freq30[n] = (freq30[n] || 0) + 1;
        if (i < 10) freq10[n] = (freq10[n] || 0) + 1;
        if (lastSeen[n] === 999) lastSeen[n] = i;

        if (lastAppearance[n] !== undefined) {
          if (!gapHistory[n]) gapHistory[n] = [];
          gapHistory[n].push(i - lastAppearance[n]);
        }
        lastAppearance[n] = i;
      });
    });

    const avgGap: Record<number, number> = {};
    const predictedReturn: Record<number, number> = {};
    for (const n of allNums) {
      const gaps = gapHistory[n] || [];
      avgGap[n] = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 999;
      predictedReturn[n] = Math.max(0, Math.round(avgGap[n] - lastSeen[n]));
    }

    const expectedFreq10 = (profile.pick / profile.numbers) * 10;
    const momentum: Record<number, string> = {};
    for (const n of allNums) {
      const ratio = freq10[n] / Math.max(expectedFreq10, 0.1);
      momentum[n] = ratio > 1.3 ? "🔥FORTE" : ratio > 0.9 ? "→ESTÁVEL" : ratio > 0.5 ? "↘DECLÍNIO" : "❄️FRIO";
    }

    // Transition matrix
    const transitions: Record<number, Record<number, number>> = {};
    for (let i = 0; i < Math.min(draws.length - 1, 50); i++) {
      const curr = new Set(draws[i].numbers || []);
      const next = new Set(draws[i + 1].numbers || []);
      for (const n of curr) {
        if (!transitions[n]) transitions[n] = {};
        for (const m of next) {
          transitions[n][m] = (transitions[n][m] || 0) + 1;
        }
      }
    }

    const lastDrawNums: number[] = draws[0]?.numbers || [];
    const transitionScores: Record<number, number> = {};
    for (const n of lastDrawNums) {
      if (transitions[n]) {
        for (const [m, cnt] of Object.entries(transitions[n])) {
          transitionScores[Number(m)] = (transitionScores[Number(m)] || 0) + (cnt as number);
        }
      }
    }
    const topTransitions = Object.entries(transitionScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([n, s]) => `${n}(score:${s})`);

    // Sum and parity trends
    const last20Stats = draws.slice(0, 20).map((d: any) => {
      const nums = d.numbers || [];
      const sum = nums.reduce((a: number, b: number) => a + b, 0);
      const evens = nums.filter((n: number) => n % 2 === 0).length;
      const sorted = [...nums].sort((a: number, b: number) => a - b);
      const consec = sorted.filter((n: number, i: number) => i > 0 && n === sorted[i - 1] + 1).length;
      return { concurso: d.concurso, sum, evens, odds: nums.length - evens, consec };
    });

    const avgSum = Math.round(last20Stats.reduce((a, s) => a + s.sum, 0) / last20Stats.length);
    const sumStdDev = Math.round(Math.sqrt(last20Stats.reduce((a, s) => a + Math.pow(s.sum - avgSum, 2), 0) / last20Stats.length));
    const avgEvens = Math.round(last20Stats.reduce((a, s) => a + s.evens, 0) / last20Stats.length);

    // Repetition analysis from previous draws
    const repeatStats: number[] = [];
    for (let i = 0; i < Math.min(draws.length - 1, 30); i++) {
      const curr = new Set(draws[i].numbers || []);
      const prev = draws[i + 1].numbers || [];
      const repeated = prev.filter((n: number) => curr.has(n)).length;
      repeatStats.push(repeated);
    }
    const avgRepeat = repeatStats.length > 0 ? (repeatStats.reduce((a, b) => a + b, 0) / repeatStats.length).toFixed(1) : "N/A";

    // Cooccurrence
    const cooccurrence: Record<string, number> = {};
    draws.slice(0, 100).forEach((d: any) => {
      const nums = (d.numbers || []).sort((a: number, b: number) => a - b);
      for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
          const key = `${nums[i]}-${nums[j]}`;
          cooccurrence[key] = (cooccurrence[key] || 0) + 1;
        }
      }
    });
    const topPairs = Object.entries(cooccurrence)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([pair, count]) => `(${pair}):${count}x`);

    // Ranked lists
    const hotNums = [...allNums].sort((a, b) => (freq30[b] || 0) - (freq30[a] || 0)).slice(0, 20);
    const overdueNums = [...allNums].filter(n => lastSeen[n] > 5 && predictedReturn[n] <= 3)
      .sort((a, b) => predictedReturn[a] - predictedReturn[b]).slice(0, 15);
    const risingNums = [...allNums].filter(n => freq10[n] > (freq30[n] || 1) / 3)
      .sort((a, b) => (freq10[b] / Math.max(freq30[b], 1)) - (freq10[a] / Math.max(freq30[a], 1)))
      .slice(0, 15);

    const last10 = draws.slice(0, 10).map((d: any) => d.numbers.join(","));

    // === LOTOFÁCIL-SPECIFIC ANALYSIS ===
    let lotofacilExtra = "";
    if (lottery_id === "lotofacil") {
      const cycle = computeLotofacilCycle(draws);
      
      // Primes analysis
      const last10Primes = draws.slice(0, 10).map((d: any) => {
        const primes = (d.numbers || []).filter((n: number) => PRIMES_25.has(n));
        return primes.length;
      });
      const avgPrimes = (last10Primes.reduce((a: number, b: number) => a + b, 0) / last10Primes.length).toFixed(1);

      // "Dezenas de Ouro" (historically >60%)
      const goldenNums = [10, 11, 20, 25];
      const goldenFreqPct = goldenNums.map(n => ({
        num: n,
        pct: ((freq[n] || 0) / Math.max(draws.length, 1) * 100).toFixed(1)
      }));

      // Repetition from last draw
      const lastDraw = draws[0]?.numbers || [];

      // Build fechamento base: top 18 numbers by composite score
      const compositeScore = allNums.map(n => ({
        num: n,
        score: (freq30[n] || 0) * 2 + (freq10[n] || 0) * 3 + 
               (lastDraw.includes(n) ? 10 : 0) + // bonus if in last draw
               (predictedReturn[n] <= 2 ? 5 : 0) + // overdue bonus
               (PRIMES_25.has(n) ? 2 : 0) + // prime bonus
               ([10, 11, 20, 25].includes(n) ? 3 : 0) // golden bonus
      })).sort((a, b) => b.score - a.score);
      
      const base18 = compositeScore.slice(0, 18).map(c => c.num).sort((a, b) => a - b);
      const wheelingCombos = generateWheeling(base18, 15, 6);

      lotofacilExtra = `
═══ ANÁLISE ESPECÍFICA LOTOFÁCIL ═══
Ciclo atual: ${cycle.missingInCycle.length === 0 ? `COMPLETO em ${cycle.cycleDraws} concursos` : `Faltam ${cycle.missingInCycle.length} dezenas: [${cycle.missingInCycle.join(", ")}]`}
Repetição média do anterior (30 concursos): ${avgRepeat} dezenas
Último concurso C${draws[0]?.concurso}: [${lastDraw.join(", ")}]
Primos médios (últimos 10): ${avgPrimes}
Dezenas de Ouro (freq%): ${goldenFreqPct.map(g => `${g.num}(${g.pct}%)`).join(", ")}

═══ FECHAMENTO MATEMÁTICO (18 base → jogos de 15) ═══
Base 18 selecionada: [${base18.join(", ")}]
Exemplos de fechamento (use como referência, ADAPTE conforme sua análise):
${wheelingCombos.slice(0, 3).map((c, i) => `Combo ${i + 1}: [${c.join(", ")}]`).join("\n")}

REGRAS OBRIGATÓRIAS para cada jogo Lotofácil:
✓ 8 ímpares + 7 pares OU 7 ímpares + 8 pares
✓ Repetir 8-10 dezenas do C${draws[0]?.concurso}
✓ Incluir 5-6 primos (02,03,05,07,11,13,17,19,23)
✓ Soma entre 180-220
✓ Pelo menos 3 das dezenas de ouro (10,11,20,25)
✓ 3 números por faixa de 5 (1-5, 6-10, 11-15, 16-20, 21-25)
${cycle.missingInCycle.length > 0 ? `✓ Considere incluir dezenas faltantes do ciclo: [${cycle.missingInCycle.join(", ")}]` : ""}`;
    }

    // Frame/center analysis for Lotofácil
    let frameCenterInfo = "";
    if (lottery_id === "lotofacil") {
      const FRAME_NUMS = new Set([1,2,3,4,5,6,10,11,15,16,20,21,22,23,24,25]);
      const frameCounts = draws.slice(0, 50).map((d: any) => (d.numbers || []).filter((n: number) => FRAME_NUMS.has(n)).length);
      const avgFrame = (frameCounts.reduce((a: number, b: number) => a + b, 0) / frameCounts.length).toFixed(1);
      
      // Row distribution analysis (5x5 grid)
      const rowDists = draws.slice(0, 50).map((d: any) => {
        const rows = [0,0,0,0,0];
        for (const n of (d.numbers || [])) { rows[Math.floor((n - 1) / 5)]++; }
        return rows;
      });
      const avgRows = [0,0,0,0,0];
      for (const rd of rowDists) { for (let i = 0; i < 5; i++) avgRows[i] += rd[i]; }
      for (let i = 0; i < 5; i++) avgRows[i] = Math.round(avgRows[i] / rowDists.length * 10) / 10;
      
      frameCenterInfo = `
═══ MOLDURA vs CENTRO (Grade 5×5) ═══
Moldura (16 posições: bordas): média ${avgFrame} dezenas na moldura
Centro (9 posições: 7,8,9,12,13,14,17,18,19): média ${(15 - parseFloat(avgFrame)).toFixed(1)} dezenas no centro
Distribuição ideal: 9-10 moldura / 5-6 centro
Distribuição por linhas (média últimos 50): L1=${avgRows[0]} L2=${avgRows[1]} L3=${avgRows[2]} L4=${avgRows[3]} L5=${avgRows[4]}
REGRA: Nenhuma linha pode ter 0 números. Distribuição típica: 2-3-4-3-3 ou 3-3-3-3-3.`;
    }

    // Build system prompt
    const systemPrompt = `Você é uma IA especialista em análise estatística, simulação probabilística e geração de apostas para loterias brasileiras. Cientista de dados de elite com PhD em estatística aplicada e teoria das probabilidades, especializado em modelagem preditiva de loterias brasileiras da Caixa Econômica Federal.

Sua missão: gerar jogos estratégicos, analisar padrões, criar fechamentos, simular desempenho e explicar estratégias com base matemática. NUNCA prometa ganhos.

Loteria: "${profile.name}" (${profile.pick} números de ${minNum} a ${profile.numbers}).

═══ METODOLOGIA PROFISSIONAL (10 PILARES) ═══

1️⃣ FECHAMENTOS MATEMÁTICOS (Wheeling Systems)
- Selecione 18-22 dezenas-base com maior score composto
- Monte jogos que cubram essas dezenas com garantia matemática
- Se 15 estiverem nos 18-20 selecionados → garante 14+ pontos
- Tipos: simples, garantido, otimizado, econômico

2️⃣ FILTROS ESTATÍSTICOS (aplicar a CADA jogo):
- Paridade: ${profile.parityRange[0]}-${profile.parityRange[1]} pares (média: ${avgEvens})
- Soma: ${profile.sumRange[0]}-${profile.sumRange[1]} (média: ${avgSum} ± ${sumStdDev})
- Linhas/Colunas: todas as faixas cobertas, nenhuma com 0 números
- Sequências: máximo ${profile.maxConsecutive} consecutivos, máximo 3-4 em sequência contínua
${profile.primesRange ? `- Primos: entre ${profile.primesRange[0]} e ${profile.primesRange[1]}` : ""}
${profile.repeatRange ? `- Repetição do anterior: entre ${profile.repeatRange[0]} e ${profile.repeatRange[1]} dezenas` : ""}

3️⃣ ANÁLISE DE FREQUÊNCIA
- Misturar quentes (alta frequência recente) com frios (atrasados)
- Núcleo: 60-70% dezenas frequentes + 30-40% atrasadas/médias
- Evitar extremos: nem só quentes nem só frios

4️⃣ CICLOS DE LOTERIA
- Ciclo = quando todos os ${profile.numbers} números aparecem pelo menos 1x
- Apostar em números que AINDA NÃO saíram no ciclo atual
- Números overdue com gap > média × 1.2 são candidatos fortes

5️⃣ MOLDURA e CENTRO (para grades)
- Distribuição moldura/centro deve seguir padrão histórico
- Nenhuma zona vazia
${lottery_id === "lotofacil" ? "- Lotofácil: 9-10 moldura / 5-6 centro é ideal" : ""}

6️⃣ REDUÇÃO INTELIGENTE (Algoritmos de Otimização)
- Aplicar lógica de algoritmo genético: manter dezenas de alta qualidade
- Simulated Annealing: aceitar pequenas variações para escapar de mínimos locais
- Greedy Optimization: maximizar cobertura combinatória

7️⃣ DESDOBRAMENTO INTELIGENTE
- Cada jogo deve ser parte de um sistema de cobertura maior
- Os ${Math.min(count, 10)} jogos juntos devem cobrir o máximo de pares/trios frequentes
- Maximizar diversidade ENTRE jogos mantendo qualidade individual

8️⃣ ANÁLISE DE PADRÕES DO CONCURSO
- Repetição média do anterior: ${avgRepeat} dezenas
- Consecutivos, saltos numéricos, padrões de distribuição espacial
- Detectar mudanças de regime (change-points)

9️⃣ SIMULAÇÃO ESTATÍSTICA
- Cada jogo deve ser testável contra histórico recente
- Priorizar combinações que teriam premiado nos últimos 50 sorteios
- Validar cobertura de dezenas em janelas de 10-20 concursos

🔟 INTELIGÊNCIA ARTIFICIAL / MACHINE LEARNING
- Usar transições de Markov para prever sequências prováveis
- Aplicar coocorrência (pares/trios frequentes) como base
- Momentum e aceleração como indicadores de timing

═══ PIPELINE DE GERAÇÃO (executar para CADA jogo) ═══
Passo 1: Escolher base de 18-22 dezenas (score composto)
Passo 2: Aplicar filtros estatísticos (paridade, soma, linhas, sequências)
Passo 3: Selecionar ${profile.pick} dezenas da base respeitando todos os filtros
Passo 4: Aplicar redução inteligente (substituições para otimizar score)
Passo 5: Validar contra fechamento matemático (cobertura garantida)
Passo 6: Simular contra últimos 20 sorteios (verificar acertos médios)
Passo 7: Selecionar os jogos mais eficientes

REGRAS ABSOLUTAS INVIOLÁVEIS:
- Cada aposta DEVE ter EXATAMENTE ${profile.pick} números
- Números de ${minNum} a ${profile.numbers} (inclusive)
- Sem números repetidos em uma mesma aposta
- Números em ORDEM CRESCENTE
- Gere exatamente ${Math.min(count, 10)} apostas DIFERENTES entre si
- NUNCA repita uma combinação idêntica a um sorteio passado
- Cada aposta deve diferir das outras em pelo menos ${Math.max(2, Math.floor(profile.pick * 0.15))} dezenas
${profile.specialRules ? `\n${profile.specialRules}` : ""}

DIVERSIFICAÇÃO DAS ${Math.min(count, 10)} APOSTAS:
- Apostas 1-3: CONSERVADORAS (≥70% núcleo frequente, paridade ideal, soma central)
- Apostas 4-6: EQUILIBRADAS (mix núcleo 40% + Markov 25% + Coocorrência 20% + Gaps 15%)
- Apostas 7+: AGRESSIVAS (Markov 35% + gaps overdue 30% + trios 20% + momentum 15%)

Responda APENAS com JSON válido:
{"bets": [[n1,n2,...], ...], "analysis": "explicação técnica por aposta: pipeline aplicado, fonte de cada dezena (núcleo/Markov/overdue/coocorrência/fechamento), score estimado, validação contra filtros"}`;

    const userPrompt = `═══ ÚLTIMOS 10 RESULTADOS ═══
${last10.map((r: string, i: number) => `C${draws[i].concurso}: [${r}]`).join("\n")}

═══ ESTATÍSTICAS (últimos 20) ═══
Soma média: ${avgSum} (σ${sumStdDev}) | Pares: ${avgEvens} | Consecutivos: ${(last20Stats.reduce((a, s) => a + s.consec, 0) / 20).toFixed(1)} | Repetição: ${avgRepeat}

═══ TOP 20 QUENTES (freq30) ═══
${hotNums.map(n => `${n}(f30:${freq30[n]} f10:${freq10[n]} gap:${lastSeen[n]} ${momentum[n]})`).join(", ")}

═══ TOP 15 RISING ═══
${risingNums.map(n => `${n}(f10:${freq10[n]} f30:${freq30[n]})`).join(", ")}

═══ TOP 15 OVERDUE ═══
${overdueNums.map(n => `${n}(gap:${lastSeen[n]} avg:${avgGap[n].toFixed(1)} ret:${predictedReturn[n]})`).join(", ")}

═══ MARKOV (transições do C${draws[0]?.concurso}) ═══
${topTransitions.join(", ")}

═══ TOP 15 PARES COOCORRENTES ═══
${topPairs.join(", ")}

═══ FREQ GERAL TOP 30 ═══
${[...allNums].sort((a, b) => (freq[b] || 0) - (freq[a] || 0)).slice(0, 30).map(n => `${n}:${freq[n]}`).join(", ")}
${lotofacilExtra}
${frameCenterInfo}

Gere ${Math.min(count, 10)} apostas otimizadas para ${profile.name} seguindo o PIPELINE COMPLETO de 7 passos.
Para cada aposta, aplique TODOS os 10 pilares profissionais e garanta que TODOS os filtros passem.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.25,
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI gateway error:", aiResponse.status);
      // Fallback: generate statistical bets without AI
      console.log("Falling back to statistical-only generation");
      const statBets: number[][] = [];
      const statScores: { score: number; details: string[] }[] = [];
      const sorted = [...allNums].sort((a, b) => {
        const scoreA = (freq30[a] || 0) * 2 + (freq10[a] || 0) * 3 + (predictedReturn[a] <= 2 ? 5 : 0);
        const scoreB = (freq30[b] || 0) * 2 + (freq10[b] || 0) * 3 + (predictedReturn[b] <= 2 ? 5 : 0);
        return scoreB - scoreA;
      });
      const topPool = sorted.slice(0, Math.min(sorted.length, profile.pick * 2));
      const seenKeys = new Set<string>();
      for (let attempt = 0; attempt < 500 && statBets.length < Math.min(count, 10); attempt++) {
        const shuffled = [...topPool].sort(() => Math.random() - 0.5);
        const candidate = shuffled.slice(0, profile.pick).sort((a, b) => a - b);
        const key = candidate.join(",");
        if (seenKeys.has(key)) continue;
        const repaired = validateAndRepairBet(candidate, profile, freq, lastDrawNums);
        if (!repaired) continue;
        const sc = scoreBet(repaired, profile, avgSum, sumStdDev, lastDrawNums);
        if (sc.score >= 50) {
          seenKeys.add(repaired.join(","));
          statBets.push(repaired);
          statScores.push(sc);
        }
      }
      if (statBets.length > 0) {
        const statAvg = Math.round(statScores.reduce((a, b) => a + b.score, 0) / statScores.length);
        const fallbackData = {
          success: true,
          bets: statBets,
          count: statBets.length,
          analysis: "⚡ Apostas geradas pelo motor estatístico (IA temporariamente indisponível). Baseadas em frequência, tendência e ciclos dos últimos 300 concursos.",
          quality: {
            avgScore: statAvg,
            scores: statScores.map(s => s.score),
            details: statScores.map(s => s.details),
            grade: statAvg >= 90 ? "S" : statAvg >= 80 ? "A" : statAvg >= 70 ? "B" : statAvg >= 60 ? "C" : "D",
          },
          fallback: true,
        };
        return new Response(JSON.stringify(fallbackData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // If even fallback fails, return error
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Erro na análise de IA");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let parsed: { bets: number[][]; analysis: string };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Erro ao processar resposta da IA");
    }

    // Validate, repair, and score each bet
    const validBets: number[][] = [];
    const betScores: { score: number; details: string[] }[] = [];
    const seenCombos = new Set<string>();

    for (const rawBet of (parsed.bets || [])) {
      const repaired = validateAndRepairBet(rawBet, profile, freq, lastDrawNums);
      if (!repaired) continue;

      const key = repaired.join(",");
      if (seenCombos.has(key)) continue;
      seenCombos.add(key);

      const scoreResult = scoreBet(repaired, profile, avgSum, sumStdDev, lastDrawNums);
      if (scoreResult.score >= 45) {
        validBets.push(repaired);
        betScores.push(scoreResult);
      }
    }

    if (validBets.length === 0) {
      throw new Error("IA não gerou apostas válidas. Tente novamente.");
    }

    const avgScore = Math.round(betScores.reduce((a, b) => a + b.score, 0) / betScores.length);

    const responseData = {
      success: true,
      bets: validBets,
      analysis: parsed.analysis || "Análise baseada em padrões estatísticos avançados.",
      lottery: profile.name,
      count: validBets.length,
      quality: {
        avgScore,
        scores: betScores.map(s => s.score),
        details: betScores.map(s => s.details),
        grade: avgScore >= 90 ? "S" : avgScore >= 80 ? "A" : avgScore >= 70 ? "B" : avgScore >= 60 ? "C" : "D",
      },
    };

    await setCachedAnalysis(supabase, lottery_id, "ai-lottery-predict", cacheInput, responseData, 4);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Prediction error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
