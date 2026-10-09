/**
 * Configuração centralizada de billing.
 *
 * Antes os IDs de produto/preço do Stripe estavam duplicados em
 * `stripe-webhook`, `check-subscription` e `create-checkout`, com o comentário
 * "Keep mapping in sync" — ou seja, deriva garantida e nenhum ambiente de
 * homologação possível. Agora existe uma única fonte, com override por
 * variável de ambiente para permitir staging sem tocar em código.
 */

type Plan = "premium" | "professional" | "lifetime";

/** `prod_*` → plano. Override: STRIPE_PRODUCT_PREMIUM / _PROFESSIONAL / _LIFETIME */
export const PRODUCT_TO_PLAN: Record<string, Plan> = {
  [Deno.env.get("STRIPE_PRODUCT_PREMIUM") ?? "prod_UE7roMlQFnRldw"]: "premium",
  [Deno.env.get("STRIPE_PRODUCT_PROFESSIONAL") ?? "prod_UE7sbRkUnU7ISi"]: "professional",
  [Deno.env.get("STRIPE_PRODUCT_LIFETIME") ?? "prod_UE81WPrPw7pexN"]: "lifetime",
};

export const LIFETIME_PRICE_ID =
  Deno.env.get("STRIPE_PRICE_LIFETIME") ?? "price_1TFflFCzGT9FnNQpKT7INteS";

export const PLAN_PRICES: Record<string, { price_id: string; mode: "subscription" | "payment" }> = {
  premium: {
    price_id: Deno.env.get("STRIPE_PRICE_PREMIUM") ?? "price_1TFfc9CzGT9FnNQptfREBkbH",
    mode: "subscription",
  },
  premium_annual: {
    price_id: Deno.env.get("STRIPE_PRICE_PREMIUM_ANNUAL") ?? "price_1TFl8yCzGT9FnNQpAJCMX3vY",
    mode: "subscription",
  },
  professional: {
    price_id: Deno.env.get("STRIPE_PRICE_PROFESSIONAL") ?? "price_1TFfckCzGT9FnNQp2uEvf3iM",
    mode: "subscription",
  },
  professional_annual: {
    price_id: Deno.env.get("STRIPE_PRICE_PROFESSIONAL_ANNUAL") ?? "price_1TFlIkCzGT9FnNQpi4eSk938",
    mode: "subscription",
  },
  lifetime: { price_id: LIFETIME_PRICE_ID, mode: "payment" },
};

export const PLAN_RANK: Record<string, number> = {
  free: 0,
  premium: 1,
  professional: 2,
  lifetime: 3,
};

/**
 * Origens permitidas para as URLs de retorno do checkout/portal.
 *
 * Antes usávamos `req.headers.get("origin")` direto — header controlado pelo
 * cliente virando URL de redirecionamento pós-pagamento (vetor de phishing).
 * Agora só aceitamos origens conhecidas; qualquer outra cai no default.
 */
const DEFAULT_APP_ORIGIN =
  Deno.env.get("APP_ORIGIN") ?? "https://titanloterias.lovable.app";

export function allowedOrigin(requestOrigin: string | null): string {
  const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allow = [DEFAULT_APP_ORIGIN, ...configured];
  return requestOrigin && allow.includes(requestOrigin) ? requestOrigin : DEFAULT_APP_ORIGIN;
}
