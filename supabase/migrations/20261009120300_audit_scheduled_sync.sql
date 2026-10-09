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

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

-- Remove agendamentos anteriores com o mesmo nome (idempotente).
SELECT cron.unschedule(jobid)
  FROM cron.job
 WHERE jobname IN ('sync-lottery-draws', 'sync-lottery-draws-alerts');

-- Sync dos resultados oficiais a cada 30 minutos.
SELECT cron.schedule(
  'sync-lottery-draws',
  '*/30 * * * *',
  $cron$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url', true)
             || '/functions/v1/sync-lottery-draws',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-service-key', current_setting('app.settings.service_role_key', true)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );
  $cron$
);

-- Varredura de alertas 10 minutos depois do sync, para que os avisos usem a
-- base já atualizada.
SELECT cron.schedule(
  'sync-lottery-draws-alerts',
  '40 * * * *',
  $cron$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url', true)
             || '/functions/v1/post-sync-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-service-key', current_setting('app.settings.service_role_key', true)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );
  $cron$
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
