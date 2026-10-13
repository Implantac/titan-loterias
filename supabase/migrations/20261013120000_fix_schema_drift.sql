-- -- Gerado em 2026-10-13 ao validar as 81 migrações em PostgreSQL 17.11 limpo.
-- engine_performance_log era legível pela chave anônima:
--   GET /rest/v1/engine_performance_log?select=*&limit=1  (chave anon) → HTTP 200
-- Cada usuário passa a ver só os seus registros.
-- A criação duplicada da tabela foi resolvida em 20260817000000 (IF NOT EXISTS).

ALTER TABLE public.engine_performance_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "engine_perf_log_select_own" ON public.engine_performance_log;
CREATE POLICY "engine_perf_log_select_own"
  ON public.engine_performance_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "engine_perf_log_insert_own" ON public.engine_performance_log;
CREATE POLICY "engine_perf_log_insert_own"
  ON public.engine_performance_log
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

REVOKE ALL ON public.engine_performance_log FROM anon;
