-- ============================================================================
-- AUDITORIA 2026-10-09 · Correções de billing e integridade (P2, P4, P23)
--
-- 1. `webhook_events`  — idempotência + trilha de auditoria de pagamentos.
--    Sem isso o stripe-webhook não tem como saber se um evento reenviado pelo
--    Stripe já foi processado.
-- 2. `profiles.stripe_customer_id` — o billing procurava o cliente no Stripe por
--    e-mail. Isso quebra quando o usuário troca de e-mail e, com e-mail nulo,
--    `customers.list({ email: undefined })` lista TODOS os clientes.
-- 3. Índices faltantes nas tabelas mais consultadas.
-- ============================================================================

-- ── 1. Idempotência e auditoria de eventos de pagamento ─────────────────────
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     text NOT NULL UNIQUE,          -- id do evento no Stripe
  event_type   text NOT NULL,
  payload      jsonb,
  processed_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.webhook_events IS
  'Eventos de webhook já processados. Garante idempotência no reenvio do Stripe e serve de trilha de auditoria de pagamentos.';

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Somente service_role (Edge Functions) lê/escreve. Nenhuma política para
-- authenticated/anon: com RLS ativo e sem policy, o acesso é negado por padrão.
REVOKE ALL ON public.webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.webhook_events TO service_role;

CREATE INDEX IF NOT EXISTS idx_webhook_events_type_time
  ON public.webhook_events (event_type, processed_at DESC);

-- ── 2. Vínculo explícito com o cliente Stripe ───────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

COMMENT ON COLUMN public.profiles.stripe_customer_id IS
  'ID do cliente no Stripe. Fonte de verdade do billing — evita resolver por e-mail.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_stripe_customer_id
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ── 3. Índices faltantes ────────────────────────────────────────────────────
-- `user_roles` é consultada em TODA chamada de Edge Function (requireUserAuth)
-- e em toda avaliação de has_role() dentro das políticas RLS.
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role    ON public.user_roles (role);

CREATE INDEX IF NOT EXISTS idx_user_roi_tracking_user
  ON public.user_roi_tracking (user_id, bet_date DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investment_simulations_user
  ON public.investment_simulations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backtest_runs_user
  ON public.backtest_runs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user
  ON public.user_favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user
  ON public.user_achievements (user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_user
  ON public.user_missions (user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created
  ON public.admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referrer
  ON public.affiliate_referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_system_insights_lottery
  ON public.system_insights (lottery_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pwa_tracking_created
  ON public.pwa_tracking (created_at DESC);
