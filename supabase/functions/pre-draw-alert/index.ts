import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // SEGURANÇA: esta função dispara push para TODOS os assinantes. Era pública
    // — qualquer pessoa na internet podia invocá-la. Agora exige a service key,
    // que é o que o pg_cron usa para chamá-la.
    if (req.headers.get("x-service-key") !== supabaseKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const currentHour = now.getUTCHours() - 3; // BRT
    const currentMinute = now.getUTCMinutes();

    // Sorteios costumam ser às 20h BRT; o aviso vai ~2h antes.
    //
    // ANTI-SPAM: a janela era 17h-19h inteiras. Como o cron roda a cada 30
    // minutos, isso dispararia o mesmo aviso até 6x por dia para cada usuário
    // (o comentário original dizia "Logic would go here" — nunca foi feita).
    // Restringindo à primeira metade da hora 17, exatamente uma execução do
    // cron (17:00) cai dentro da janela.
    const inWindow = currentHour === 17 && currentMinute < 30;
    if (!inWindow) {
      return new Response(JSON.stringify({ success: true, message: "Outside alert window" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // A tabela correta é `push_subscriptions` (criada na migration
    // 20260727230529). Aqui estava `user_push_subscriptions`, que NUNCA existiu:
    // a função quebrava com erro de relação inexistente sempre que entrava na
    // janela. Também faltava respeitar o `enabled` — enviaria para quem
    // desativou as notificações.
    const { data: subscribers, error: subError } = await supabase
      .from("push_subscriptions")
      .select("user_id, endpoint, auth, p256dh, categories")
      .eq("enabled", true)
      .contains("categories", { pre_draw: true });

    if (subError) throw subError;
    if (!subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Trigger notification for each subscriber
    // Reusing the send-push function logic via internal fetch
    let notified = 0;
    for (const sub of subscribers) {
      // Check if already notified today for this category (anti-spam)
      // Logic would go here (e.g., checking a temporary 'alerts_fired' table)
      
      await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-service-key": supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          subscription: {
            endpoint: sub.endpoint,
            keys: { auth: sub.auth, p256dh: sub.p256dh },
          },
          payload: {
            title: "🎯 Sorteio em 2h!",
            body: "O Titan detectou pressão no Ciclo 1-25. Confira os sinais no Painel de Comando antes de apostar.",
            url: "/comando",
            icon: "/icon-192.png",
          },
        }),
      }).catch(console.error);
      notified++;
    }

    return new Response(JSON.stringify({ success: true, notified }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
