import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { requireUserAuth, corsHeaders } from "../_shared/auth.ts";
import { allowedOrigin } from "../_shared/billing.ts";

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
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: auth.email, limit: 1 });
    if (customers.data.length === 0) throw new Error("No Stripe customer found");

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${allowedOrigin(req.headers.get("origin"))}/planos`,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("customer-portal error:", error);
    const msg = (error as Error)?.message === "No Stripe customer found"
      ? "No active subscription found"
      : "Unable to open billing portal";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
