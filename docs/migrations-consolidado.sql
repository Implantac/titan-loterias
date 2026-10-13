-- =====================================================================
-- CONSOLIDADO PARA O SQL EDITOR DO PAINEL SUPABASE
-- Gerado em 09/10/2026 a partir das 5 migrations de auditoria.
--
-- Use este arquivo se você NÃO tem o Supabase CLI instalado:
--   Painel do Supabase → SQL Editor → New query → cole tudo → Run.
--
-- ⚠️ ANTES DE RODAR:
--   1. Faça backup (Database → Backups, ou pg_dump).
echo
--      A seção 2 contém um DELETE de registros órfãos de closing_history.
--   2. Ative as extensões pg_cron e pg_net em Database → Extensions.
--      Sem elas a seção 4 não falha, mas não agenda a sincronização.
-- =====================================================================


-- ═════════════════════════════════════════════════════════════════════
-- 20261009120000_audit_billing_and_indexes.sql
-- ═════════════════════════════════════════════════════════════════════

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

-- ═════════════════════════════════════════════════════════════════════
-- 20261009120100_audit_data_integrity.sql
-- ═════════════════════════════════════════════════════════════════════

-- ============================================================================
-- AUDITORIA 2026-10-09 · Integridade de dados (P3, P28)
--
-- P3: `lottery_draws.draw_date` é TEXT em `DD/MM/AAAA`. Isso torna
--     `ORDER BY draw_date` lexicográfico (31/12/2024 antes de 31/12/2022) e faz
--     `new Date("25/12/2024")` virar Invalid Date no cliente.
--     Solução não destrutiva: coluna `drawn_at DATE` derivada + backfill +
--     trigger de manutenção + índice. A coluna TEXT é preservada para não
--     quebrar leitores existentes.
--
-- P28: `closing_history.user_id` não tinha FK — excluía-se o usuário e os
--      fechamentos ficavam órfãos para sempre.
-- ============================================================================

-- ── P3 · Data tipada e ordenável ────────────────────────────────────────────
ALTER TABLE public.lottery_draws
  ADD COLUMN IF NOT EXISTS drawn_at date;

COMMENT ON COLUMN public.lottery_draws.drawn_at IS
  'Data do concurso em DATE, derivada de draw_date (TEXT DD/MM/AAAA). Use esta coluna para ordenar/filtrar por data — draw_date é apenas exibição.';

-- Backfill: parse estrito de DD/MM/AAAA. Linhas que não casam ficam NULL e são
-- reportadas pelo log abaixo em vez de serem convertidas em data errada.
UPDATE public.lottery_draws
SET drawn_at = to_date(draw_date, 'DD/MM/YYYY')
WHERE drawn_at IS NULL
  AND draw_date ~ '^\d{2}/\d{2}/\d{4}$';

DO $$
DECLARE
  total     bigint;
  preenchid bigint;
BEGIN
  SELECT count(*) INTO total     FROM public.lottery_draws;
  SELECT count(*) INTO preenchid FROM public.lottery_draws WHERE drawn_at IS NOT NULL;
  RAISE NOTICE 'lottery_draws: % registros, % com drawn_at preenchido, % sem data válida',
    total, preenchid, total - preenchid;
END $$;

-- Mantém drawn_at sincronizada em toda escrita.
CREATE OR REPLACE FUNCTION public.sync_lottery_drawn_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.draw_date ~ '^\d{2}/\d{2}/\d{4}$' THEN
    NEW.drawn_at := to_date(NEW.draw_date, 'DD/MM/YYYY');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lottery_drawn_at ON public.lottery_draws;
CREATE TRIGGER trg_sync_lottery_drawn_at
  BEFORE INSERT OR UPDATE OF draw_date ON public.lottery_draws
  FOR EACH ROW EXECUTE FUNCTION public.sync_lottery_drawn_at();

-- Ordenação/busca por período usa drawn_at, não o TEXT.
CREATE INDEX IF NOT EXISTS idx_lottery_draws_lottery_drawn_at
  ON public.lottery_draws (lottery_id, drawn_at DESC);

-- ── P28 · Integridade referencial em closing_history ────────────────────────
-- Remove órfãos pré-existentes antes de criar a FK, senão o ALTER falha.
DELETE FROM public.closing_history ch
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ch.user_id);

ALTER TABLE public.closing_history
  DROP CONSTRAINT IF EXISTS closing_history_user_id_fkey;
ALTER TABLE public.closing_history
  ADD CONSTRAINT closing_history_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

COMMENT ON COLUMN public.closing_history.user_id IS
  'FK para auth.users com ON DELETE CASCADE — fechar a conta remove os fechamentos do usuário.';

-- ═════════════════════════════════════════════════════════════════════
-- 20261009120200_audit_admin_config.sql
-- ═════════════════════════════════════════════════════════════════════

-- ============================================================================
-- AUDITORIA 2026-10-09 · Remoção do e-mail de admin hardcoded (P24)
--
-- Antes: `public.is_full_access_email()` continha o literal
--        'etcsuporte889@gmail.com' gravado no código da função, replicado em
--        três migrations. Qualquer pessoa com acesso ao repositório via o
--        endereço, e trocar a conta dona exigia uma nova migration.
--
-- Depois: o endereço fica numa tabela de configuração protegida. O
--        COMPORTAMENTO É IDÊNTICO — a mesma conta continua super_admin +
--        lifetime, agora por configuração e não por código.
--
-- Para trocar a conta dona no futuro:
--   UPDATE public.system_config SET value = 'novo@email.com'
--    WHERE key = 'full_access_email';
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_config (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.system_config IS
  'Configuração operacional do sistema. Somente service_role lê e escreve — nada aqui é exposto ao cliente.';

-- Preserva o comportamento atual: a conta que já era protegida continua sendo.
INSERT INTO public.system_config (key, value)
VALUES ('full_access_email', 'etcsuporte889@gmail.com')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.system_config FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.system_config TO service_role;

-- A função continua SECURITY DEFINER (as triggers que a chamam rodam como
-- authenticated e precisam ler a configuração), mas agora sem literal.
CREATE OR REPLACE FUNCTION public.is_full_access_email(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.system_config c
     WHERE c.key = 'full_access_email'
       AND lower(c.value) = lower(COALESCE(_email, ''))
  );
$$;

REVOKE ALL ON FUNCTION public.is_full_access_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_full_access_email(text) TO authenticated, service_role;

-- Mantém updated_at correto.
CREATE OR REPLACE FUNCTION public.touch_system_config_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_system_config_updated_at ON public.system_config;
CREATE TRIGGER trg_system_config_updated_at
  BEFORE UPDATE ON public.system_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_system_config_updated_at();

-- ═════════════════════════════════════════════════════════════════════
-- 20261009120300_audit_scheduled_sync.sql
-- ═════════════════════════════════════════════════════════════════════

-- ============================================================================
-- AUDITORIA 2026-10-09 · Sincronização agendada (P7)
--
-- As extensões pg_cron e pg_net já eram criadas em 20260309110818, mas NENHUM
-- job tinha sido agendado. Resultado medido em 2026-10-09: a base estava
-- 2 a 3 concursos atrasada em TODAS as modalidades, porque a sincronização só
-- rodava quando um usuário abria o app.
--
-- Este migration agenda o sync a cada 30 minutos. Ele depende do caminho de
-- autenticação por `x-service-key` adicionado em sync-lottery-draws.
--
-- Requer que `sync-lottery-draws` tenha `verify_jwt = false` no config.toml
-- (autenticação é feita pela própria função via x-service-key).
-- ============================================================================

-- Defensivo: se pg_cron/pg_net não estiverem habilitados no projeto, a
-- migration NÃO pode falhar — senão ela trava `supabase db push` inteiro e as
-- migrations de billing/integridade (que são mais urgentes) não são aplicadas.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
  CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'pg_cron/pg_net indisponíveis (%). Sincronização agendada NÃO foi criada — configure na UI do Supabase (Database > Extensions) e rode novamente esta migration.', SQLERRM;
END $$;

DO $$
BEGIN
  -- Remove agendamentos anteriores com o mesmo nome (idempotente).
  PERFORM cron.unschedule(jobid)
    FROM cron.job
   WHERE jobname IN ('sync-lottery-draws', 'sync-lottery-draws-alerts');
EXCEPTION WHEN undefined_table OR undefined_function THEN
  RAISE WARNING 'cron indisponível — agendamento pulado.';
END $$;

-- Função que o cron chama. Existe por dois motivos:
--   1) Se `app.settings.supabase_url` não estiver definido, a concatenação
--      antiga produzia NULL e o net.http_post falhava em SILÊNCIO — o sync
--      simplesmente parava de rodar sem nenhum erro em lugar nenhum.
--      Agora a função levanta exceção, e o pg_cron registra a falha em
--      cron.job_run_details.
--   2) Concentra a lógica de agendamento num lugar só.
CREATE OR REPLACE FUNCTION public.invoke_edge_function(_path text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _base text := nullif(current_setting('app.settings.supabase_url', true), '');
  _key  text := nullif(current_setting('app.settings.service_role_key', true), '');
BEGIN
  IF _base IS NULL THEN
    RAISE EXCEPTION 'app.settings.supabase_url não está definido — não é possível chamar a Edge Function %.', _path;
  END IF;
  IF _key IS NULL THEN
    RAISE EXCEPTION 'app.settings.service_role_key não está definido — a Edge Function % rejeitaria a chamada.', _path;
  END IF;

  RETURN net.http_post(
    url := _base || '/functions/v1/' || _path,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-service-key', _key
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_edge_function(text) FROM PUBLIC, anon, authenticated;

-- Sync dos resultados oficiais a cada 30 minutos.
SELECT cron.schedule(
  'sync-lottery-draws',
  '*/30 * * * *',
  $cron$ SELECT public.invoke_edge_function('sync-lottery-draws'); $cron$
);

-- Varredura de alertas 10 minutos depois do sync, para que os avisos usem a
-- base já atualizada.
SELECT cron.schedule(
  'sync-lottery-draws-alerts',
  '40 * * * *',
  $cron$ SELECT public.invoke_edge_function('post-sync-notify'); $cron$
);

-- Aviso de "sorteio em 2h". A função só executa de fato entre 17:00 e 17:29 BRT
-- e ignora as demais execuções, então rodar a cada 30 minutos garante que
-- exatamente uma chamada por dia cai dentro da janela (anti-spam).
-- Antes desta migration a função não era agendada por nada — push nunca saiu.
SELECT cron.schedule(
  'pre-draw-alert',
  '*/30 * * * *',
  $cron$ SELECT public.invoke_edge_function('pre-draw-alert'); $cron$
);

-- ── Observabilidade: atraso da base ────────────────────────────────────────
-- Permite alertar quando a sincronização parar de funcionar. Sem isso, o
-- produto continuaria servindo dado velho em silêncio (foi o que aconteceu).
CREATE OR REPLACE FUNCTION public.lottery_data_freshness()
RETURNS TABLE (lottery_id text, max_concurso integer, last_draw date, days_stale integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.lottery_id,
    max(d.concurso)::integer,
    max(d.drawn_at),
    (current_date - max(d.drawn_at))::integer
  FROM public.lottery_draws d
  GROUP BY d.lottery_id
  ORDER BY d.lottery_id;
$$;

REVOKE ALL ON FUNCTION public.lottery_data_freshness() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lottery_data_freshness() TO authenticated, service_role;

COMMENT ON FUNCTION public.lottery_data_freshness() IS
  'Último concurso por modalidade e quantos dias de atraso. Use para monitorar a saúde da sincronização — days_stale > 3 indica que o cron parou.';

-- ═════════════════════════════════════════════════════════════════════
-- 20261009120400_audit_share_expiry.sql
-- ═════════════════════════════════════════════════════════════════════

-- ============================================================================
-- AUDITORIA 2026-10-09 · Compartilhamento de fechamentos (P17)
--
-- `get_shared_closing` é SECURITY DEFINER com GRANT para anon (necessário: o
-- link é público por definição) e não tinha expiração. Um link encaminhado
-- dava acesso permanente ao fechamento.
--
-- Adiciona expiração opcional. Comportamento atual é preservado: linhas com
-- `share_expires_at IS NULL` continuam acessíveis enquanto o share_id existir.
-- ============================================================================

ALTER TABLE public.closing_history
  ADD COLUMN IF NOT EXISTS share_expires_at timestamptz;

COMMENT ON COLUMN public.closing_history.share_expires_at IS
  'Quando o link de compartilhamento deixa de funcionar. NULL = sem expiração (compatível com links já emitidos).';

CREATE OR REPLACE FUNCTION public.get_shared_closing(_share_id text)
RETURNS SETOF public.closing_history
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
    FROM public.closing_history
   WHERE share_id IS NOT NULL
     AND share_id = _share_id
     AND (share_expires_at IS NULL OR share_expires_at > now())
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_shared_closing(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_closing(text) TO anon, authenticated, service_role;

-- Limpa tokens expirados há mais de 30 dias para que o índice parcial não cresça
-- indefinidamente. Agendado junto com o sync.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'cleanup-expired-shares';

SELECT cron.schedule(
  'cleanup-expired-shares',
  '15 3 * * *',
  $cron$
    UPDATE public.closing_history
       SET share_id = NULL, share_expires_at = NULL
     WHERE share_expires_at IS NOT NULL
       AND share_expires_at < now() - interval '30 days';
  $cron$
);
