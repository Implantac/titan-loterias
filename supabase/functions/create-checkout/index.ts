import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireUserAuth, corsHeaders } from "../_shared/auth.ts";
import { PLAN_PRICES, allowedOrigin } from "../_shared/billing.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireUserAuth(req);
  if (auth instanceof Response) return auth;

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

    // A customer lookup by email can select a different account. Binding must
    // exist in the authenticated profile before any payment session is issued.
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("stripe_customer_id").eq("id", auth.userId).single();
    if (profileError || !profile) throw new Error("Billing binding unavailable");
    let customerId: string = profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: auth.email, metadata: { user_id: auth.userId } },
        { idempotencyKey: `titan-customer-${auth.userId}` });
      const { data: bound, error: bindError } = await admin.from("profiles")
        .update({ stripe_customer_id: customer.id }).eq("id", auth.userId)
        .is("stripe_customer_id", null).select("stripe_customer_id").single();
      if (bindError || bound?.stripe_customer_id !== customer.id)
        throw new Error("Could not bind Stripe customer to account");
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
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
