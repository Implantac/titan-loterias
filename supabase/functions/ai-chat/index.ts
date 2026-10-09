import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireUserAuth, corsHeaders } from "../_shared/auth.ts";

import { checkRateLimit, rateLimited, AI_RATE_LIMIT } from "../_shared/rate-limit.ts";
interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: unknown[];
  name?: string;
}

/**
 * Tool definitions — o modelo pode invocá-las durante a conversa para
 * consultar dados reais da loteria em tempo real (não só do contexto
 * pré-computado). Cada tool é resolvida server-side via service role.
 */
const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_top_numbers",
      description:
        "Retorna as N dezenas mais frequentes na modalidade informada com base em todo o histórico.",
      parameters: {
        type: "object",
        properties: {
          lottery_id: {
            type: "string",
            description: "ID da modalidade (lotofacil, megasena, quina, etc.)",
          },
          limit: {
            type: "number",
            description: "Quantidade de dezenas top a retornar (1-25)",
          },
        },
        required: ["lottery_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recent_draws",
      description:
        "Retorna os últimos N sorteios da modalidade com dezenas e concurso.",
      parameters: {
        type: "object",
        properties: {
          lottery_id: { type: "string" },
          limit: { type: "number", description: "1-50" },
        },
        required: ["lottery_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_number_delay",
      description:
        "Retorna quantos sorteios uma dezena está atrasada na modalidade.",
      parameters: {
        type: "object",
        properties: {
          lottery_id: { type: "string" },
          number: { type: "number", description: "Dezena (1..N)" },
        },
        required: ["lottery_id", "number"],
      },
    },
  },
];

async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  admin: ReturnType<typeof createClient>,
): Promise<unknown> {
  if (name === "get_top_numbers") {
    const { data, error } = await admin.rpc("get_top_numbers", {
      p_lottery_id: String(args.lottery_id ?? ""),
      p_limit: Math.min(25, Math.max(1, Number(args.limit ?? 10))),
    });
    if (error) return { error: error.message };
    return { top: data };
  }
  if (name === "get_recent_draws") {
    const { data, error } = await admin
      .from("lottery_draws")
      .select("contest_number, drawn_at, numbers")
      .eq("lottery_id", String(args.lottery_id ?? ""))
      .order("contest_number", { ascending: false })
      .limit(Math.min(50, Math.max(1, Number(args.limit ?? 10))));
    if (error) return { error: error.message };
    return { draws: data };
  }
  if (name === "get_number_delay") {
    const target = Number(args.number);
    const { data, error } = await admin
      .from("lottery_draws")
      .select("contest_number, numbers")
      .eq("lottery_id", String(args.lottery_id ?? ""))
      .order("contest_number", { ascending: false })
      .limit(500);
    if (error) return { error: error.message };
    let delay = 0;
    for (const row of data ?? []) {
      if ((row.numbers as number[])?.includes(target)) break;
      delay++;
    }
    return { number: target, delay, analyzed: data?.length ?? 0 };
  }
  return { error: `Unknown tool: ${name}` };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await requireUserAuth(req, {
      allowedPlans: ["premium", "professional", "lifetime"],
    });
    if (auth instanceof Response) return auth;
    
    // Chamadas de IA custam dinheiro: limita abuso por usuário logado.
    const rl = checkRateLimit(`ai:ai-chat:${auth.userId}`, AI_RATE_LIMIT);
    if (!rl.allowed) return rateLimited(rl.retryAfterSec, corsHeaders);

    const body = await req.json().catch(() => ({}));
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    const lotteryId: string = typeof body?.lotteryId === "string" ? body.lotteryId : "geral";
    const userContext: string = typeof body?.userContext === "string" ? body.userContext : "";

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const systemPrompt = `Você é o **Titan IA**, assistente especialista em loterias brasileiras (Mega-Sena, Lotofácil, Quina, Lotomania, Dupla Sena, Timemania, Dia de Sorte, Super Sete).

CONTEXTO ATUAL:
- Loteria selecionada pelo usuário: ${lotteryId}
${userContext ? `- Perfil de aprendizado do usuário:\n${userContext}` : ""}

FERRAMENTAS DISPONÍVEIS:
Você tem acesso a ferramentas que consultam o banco de dados em tempo real:
- \`get_top_numbers\`: dezenas mais frequentes (use antes de recomendar quentes)
- \`get_recent_draws\`: últimos sorteios reais (use para análise de repetição/tendência)
- \`get_number_delay\`: atraso exato de uma dezena (use para justificar recomendações)

**REGRA CRÍTICA:** Sempre que a pergunta envolver dezenas quentes, atrasadas, tendências recentes ou padrões observados, **INVOQUE AS FERRAMENTAS** em vez de inventar números. Cite os valores retornados literalmente.

DIRETRIZES DE RESPOSTA:
- Português do Brasil. Direto ao ponto, sem rodeios.
- Estrutura obrigatória para análises:
  1. **Diagnóstico** (1 linha)
  2. **Evidência estatística** com números reais das ferramentas
  3. **Recomendação acionável**
- Markdown rico: H2/H3, **negrito**, tabelas, listas densas, \`code\` para números.
- Dezenas em **negrito**, 2 dígitos (ex: **02, 07, 13**), uma sugestão por linha, com justificativa.
- Nunca prometa vitória. Reforce: "loterias são jogos de azar — jogue com responsabilidade".`;

    // Loop de execução com tool calling (máx 4 rodadas)
    const chatMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: String(m.content ?? "") })),
    ];

    // Fase 1: loop não-stream para resolver tool calls (máx 4 rodadas)
    for (let round = 0; round < 4; round++) {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: chatMessages,
          tools: TOOLS,
          tool_choice: "auto",
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        const text = await aiResponse.text().catch(() => "");
        console.error("AI gateway error:", status, text);
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos para continuar." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "Erro ao conectar com o gateway de IA." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await aiResponse.json();
      const choice = data.choices?.[0];
      const msg = choice?.message;
      if (!msg) break;

      const toolCalls = msg.tool_calls;
      if (Array.isArray(toolCalls) && toolCalls.length > 0) {
        // adiciona assistant message com tool_calls
        chatMessages.push({
          role: "assistant",
          content: msg.content ?? "",
          tool_calls: toolCalls,
        });
        // executa e adiciona as respostas
        for (const call of toolCalls) {
          let parsed: Record<string, unknown> = {};
          try {
            parsed = JSON.parse(call.function?.arguments ?? "{}");
          } catch { /* keep empty */ }
          const result = await executeToolCall(call.function?.name ?? "", parsed, admin);
          chatMessages.push({
            role: "tool",
            tool_call_id: call.id,
            name: call.function?.name,
            content: JSON.stringify(result),
          });
        }
        continue; // outra rodada
      }

      // Sem tool calls: adiciona o texto do assistant no histórico e sai do loop
      chatMessages.push({ role: "assistant", content: msg.content ?? "" });
      // Remove essa última mensagem do assistant — vamos re-gerar em modo stream
      // para o cliente receber SSE token-a-token com o mesmo contexto.
      chatMessages.pop();
      break;
    }

    // Fase 2: streaming SSE da resposta final (sem tools) para o cliente
    const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        stream: true,
        messages: chatMessages,
      }),
    });

    if (!finalResponse.ok || !finalResponse.body) {
      return new Response(
        JSON.stringify({ error: "Falha ao iniciar streaming final." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(finalResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
