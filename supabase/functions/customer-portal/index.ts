import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireUserAuth, corsHeaders } from "../_shared/auth.ts";
import { allowedOrigin } from "../_shared/billing.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireUserAuth(req);
  if (auth instanceof Response) return auth;

  try {
    if (auth.isSuperAdmin || auth.plan === "lifetime") {
      return new Response(JSON.stringify({ plan: "lifetime", subscribed: true, url: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    // Never grant portal access by matching an editable email address.
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("stripe_customer_id").eq("id", auth.userId).single();
    if (profileError) throw new Error("Billing binding unavailable");
    if (!profile?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: "Conta de pagamento não vinculada. Contate o suporte." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${allowedOrigin(req.headers.get("origin"))}/planos`,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("customer-portal error:", error);
    const msg = "Unable to open billing portal";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
