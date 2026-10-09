// Stripe webhook — receives subscription/checkout events and syncs profiles.plan
// Public endpoint (no JWT). Signature is verified with STRIPE_WEBHOOK_SECRET.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { PRODUCT_TO_PLAN, LIFETIME_PRICE_ID, PLAN_RANK } from "../_shared/billing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const log = (step: string, details?: unknown) => {
  const suffix = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${suffix}`);
};


const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" }) : null;
const admin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

async function getEmailForCustomer(customerId: string): Promise<string | null> {
  if (!stripe) return null;
  try {
    const cust = await stripe.customers.retrieve(customerId);
    if (cust && !("deleted" in cust && cust.deleted)) {
      return (cust as Stripe.Customer).email ?? null;
    }
  } catch (e) {
    log("customer.retrieve failed", { customerId, error: (e as Error).message });
  }
  return null;
}

async function computePlanForCustomer(customerId: string): Promise<"free" | "premium" | "professional" | "lifetime"> {
  if (!stripe) return "free";

  let detected: "free" | "premium" | "professional" | "lifetime" = "free";

  // Active subscriptions → highest ranked plan
  const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 10 });
  for (const sub of subs.data) {
    const productId = sub.items.data[0]?.price.product as string | undefined;
    if (!productId) continue;
    const plan = PRODUCT_TO_PLAN[productId];
    if (plan && PLAN_RANK[plan] > PLAN_RANK[detected]) detected = plan;
  }

  // Lifetime one-time purchases
  if (detected !== "professional" && detected !== "lifetime") {
    const sessions = await stripe.checkout.sessions.list({ customer: customerId, limit: 100 });
    for (const session of sessions.data) {
      if (session.payment_status !== "paid" || session.mode !== "payment") continue;
      const items = await stripe.checkout.sessions.listLineItems(session.id);
      if (items.data.some((li) => li.price?.id === LIFETIME_PRICE_ID)) {
        detected = "lifetime";
        break;
      }
    }
  }

  return detected;
}

/**
 * Atualiza o plano do perfil. Retorna `false` quando a escrita falhou — o caller
 * DEVE propagar isso como HTTP 500 para que o Stripe reenvie o evento.
 *
 * Também persiste `stripe_customer_id` quando disponível: procurar cliente por
 * e-mail é frágil (usuário pode trocar de e-mail) e, quando o e-mail é nulo,
 * `stripe.customers.list({ email: undefined })` lista TODOS os clientes.
 */
async function syncPlanByEmail(email: string, plan: string, customerId?: string | null) {
  const payload: Record<string, unknown> = { plan };
  if (customerId) payload.stripe_customer_id = customerId;

  const { error, count } = await admin
    .from("profiles")
    .update(payload, { count: "exact" })
    .eq("email", email);

  if (error) {
    log("profiles.update failed", { email, plan, error: error.message });
    return false;
  }
  if (!count) {
    // Nenhum perfil com esse e-mail: não há o que atualizar. Não é falha de
    // infraestrutura, então não vale forçar retry eterno do Stripe.
    log("WARN no profile matched email — plan not applied", { email, plan });
    return false;
  }
  log("profile plan synced", { email, plan, rows: count });
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!stripe || !webhookSecret) {
    log("ERROR missing config", { hasStripeKey: !!stripe, hasWebhookSecret: !!webhookSecret });
    return new Response(
      JSON.stringify({ error: "Webhook not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    log("ERROR missing signature");
    return new Response(JSON.stringify({ error: "Missing stripe-signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    // constructEventAsync is required in Deno (Web Crypto, no Node crypto)
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    log("ERROR signature verification failed", { message: (err as Error).message });
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  log("event received", { id: event.id, type: event.type });

  // ── Idempotência ────────────────────────────────────────────────────────
  // O Stripe reenvia eventos. Sem este controle, o mesmo evento pode ser
  // processado várias vezes e não há trilha de auditoria de pagamento.
  try {
    const { data: already } = await admin
      .from("webhook_events")
      .select("id")
      .eq("event_id", event.id)
      .maybeSingle();
    if (already) {
      log("event already processed — skipping", { id: event.id });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    // Tabela ausente não pode impedir o processamento; apenas perdemos a
    // deduplicação. O log fica para diagnóstico.
    log("WARN idempotency lookup failed", { message: (err as Error).message });
  }

  try {
    let syncFailed = false;

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = (session.customer as string) || null;
        const email = session.customer_details?.email || session.customer_email || (customerId ? await getEmailForCustomer(customerId) : null);
        if (!email) {
          log("no email on checkout session", { sessionId: session.id });
          break;
        }
        const plan = customerId ? await computePlanForCustomer(customerId) : "free";
        if (!(await syncPlanByEmail(email, plan, customerId))) syncFailed = true;
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const email = await getEmailForCustomer(customerId);
        if (!email) {
          log("no email for customer", { customerId });
          break;
        }
        const plan = event.type === "customer.subscription.deleted" ? "free" : await computePlanForCustomer(customerId);
        if (!(await syncPlanByEmail(email, plan, customerId))) syncFailed = true;
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const email = await getEmailForCustomer(customerId);
        if (email) {
          const plan = await computePlanForCustomer(customerId);
          if (!(await syncPlanByEmail(email, plan, customerId))) syncFailed = true;
        }
        break;
      }

      default:
        log("event ignored", { type: event.type });
    }

    // CRÍTICO: se a atualização do plano falhou, NÃO podemos responder 200.
    // O Stripe consideraria o evento entregue e nunca reenviaria — o cliente
    // pagaria e ficaria preso no plano free. Respondendo 500 o Stripe reprocessa
    // com backoff automático.
    if (syncFailed) {
      log("ERROR plan sync failed — returning 500 so Stripe retries", { id: event.id });
      return new Response(JSON.stringify({ error: "Plan sync failed; retry scheduled" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("webhook_events").insert({
      event_id: event.id,
      event_type: event.type,
      processed_at: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) log("WARN webhook_events insert failed", { message: error.message });
    });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    log("ERROR handler failed", { message: (err as Error).message });
    return new Response(JSON.stringify({ error: "Handler failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
