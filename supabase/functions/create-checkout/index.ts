import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { requireUserAuth, corsHeaders } from "../_shared/auth.ts";
import { PLAN_PRICES, allowedOrigin } from "../_shared/billing.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireUserAuth(req);
  if (auth instanceof Response) return auth;

  // GUARD: `stripe.customers.list({ email: undefined })` NÃO filtra — ele lista
  // TODOS os clientes da conta e `data[0]` seria um assinante qualquer, aplicando
  // o plano/portal de outra pessoa a este usuário. Cadastro por telefone existe
  // neste produto, então e-mail nulo é um caminho alcançável.
  if (!auth.email) {
    return new Response(
      JSON.stringify({ error: "Conta sem e-mail associado. Adicione um e-mail no seu perfil para gerenciar o plano." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    if (auth.isSuperAdmin || auth.plan === "lifetime") {
      return new Response(JSON.stringify({ plan: "lifetime", subscribed: true, url: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { planId } = await req.json();
    const planConfig = PLAN_PRICES[planId];
    if (!planConfig) throw new Error(`Invalid plan: ${planId}`);

    const origin = allowedOrigin(req.headers.get("origin"));

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: auth.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : auth.email,
      line_items: [{ price: planConfig.price_id, quantity: 1 }],
      mode: planConfig.mode,
      success_url: `${origin}/payment-success?plan=${planId}`,
      cancel_url: `${origin}/planos`,
      metadata: { user_id: auth.userId, plan_id: planId },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("create-checkout error:", error);
    return new Response(JSON.stringify({ error: "Unable to create checkout session" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
