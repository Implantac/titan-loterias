import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireUserAuth } from "../_shared/auth.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface RecommendationBody {
  input: {
    lottery: { id: string; name: string; totalNumbers: number; pick: number; ticketPrice: number };
    baseSize: number;
    budget?: number;
    riskProfile?: "conservative" | "balanced" | "aggressive";
  };
  heuristic: {
    strategy: string;
    minHits: number;
    maxGames: number;
    expectedCoverage: number;
    expectedROI: number;
    rationale: string[];
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // SEGURANÇA: esta função chama um gateway de IA PAGO (ai.gateway.lovable.dev).
    // Era a única das 7 funções de IA sem nenhuma verificação de identidade —
    // qualquer pessoa na internet podia invocá-la e consumir créditos da conta.
    // Comprovado em auditoria: uma requisição anônima chegou ao gateway e voltou
    // 402 "Not enough credits". Sem gate de plano de propósito: exigir premium
    // aqui mudaria o comportamento do produto para usuários logados, e isso é
    // decisão de produto, não de segurança.
    const auth = await requireUserAuth(req);
    if (auth instanceof Response) return auth;

    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    // Entrada malformada devolvia 500 com a mensagem interna vazando
    // ("Cannot read properties of undefined (reading 'lottery')").
    const body = await req.json().catch(() => null) as RecommendationBody | null;
    const lottery = body?.input?.lottery;
    const heuristic = body?.heuristic;
    if (
      !lottery || typeof lottery.name !== "string" ||
      typeof lottery.totalNumbers !== "number" || typeof lottery.pick !== "number" ||
      typeof body?.input?.baseSize !== "number" ||
      !heuristic || typeof heuristic.strategy !== "string" ||
      typeof heuristic.minHits !== "number" || typeof heuristic.maxGames !== "number" ||
      typeof heuristic.expectedCoverage !== "number"
    ) {
      return new Response(
        JSON.stringify({ error: "Payload inválido: input.lottery, input.baseSize e heuristic são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const prompt = `Você é um analista quantitativo especialista em fechamentos de loterias brasileiras.
Modalidade: ${body.input.lottery.name} (universo ${body.input.lottery.totalNumbers}, escolhe ${body.input.lottery.pick}).
Base do usuário: ${body.input.baseSize} dezenas.
Perfil de risco: ${body.input.riskProfile ?? "balanced"}.
Orçamento: ${body.input.budget ? `R$ ${body.input.budget}` : "não informado"}.

Recomendação heurística atual:
- Estratégia: ${body.heuristic.strategy}
- Garantia mínima: ${body.heuristic.minHits}
- Jogos alvo: ${body.heuristic.maxGames}
- Cobertura esperada: ${body.heuristic.expectedCoverage}%

Gere 4 a 6 justificativas curtas em português (linguagem natural, sem markdown, uma frase por linha) explicando por que esses parâmetros fazem sentido — cite trade-offs de custo/cobertura/risco.
Retorne APENAS um JSON: { "rationale": string[] }`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você responde estritamente com JSON válido." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: "gateway", status: resp.status, detail: text.slice(0, 400) }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    let rationale: string[] = [];
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.rationale)) rationale = parsed.rationale.filter((x: unknown) => typeof x === "string").slice(0, 8);
    } catch {
      rationale = [];
    }

    return new Response(JSON.stringify({
      rationale,
      strategy: body.heuristic.strategy,
      minHits: body.heuristic.minHits,
      maxGames: body.heuristic.maxGames,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
