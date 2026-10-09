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
