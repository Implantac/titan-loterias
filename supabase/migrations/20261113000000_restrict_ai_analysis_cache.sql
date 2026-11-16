-- Restringe o cache das Edge Functions ao serviço. Revisar em homologação
-- antes de aplicar em produção: a migração não deve ser executada pelo frontend.
-- O cliente público não consulta esta tabela; Edge Functions usam service_role.
ALTER TABLE public.ai_analysis_cache ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_analysis_cache FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_analysis_cache TO service_role;

DROP POLICY IF EXISTS "Anyone can read AI cache" ON public.ai_analysis_cache;
DROP POLICY IF EXISTS "Service role can manage cache" ON public.ai_analysis_cache;
DROP POLICY IF EXISTS "Service role can delete expired cache" ON public.ai_analysis_cache;
DROP POLICY IF EXISTS "Service role can insert cache" ON public.ai_analysis_cache;
DROP POLICY IF EXISTS "Service role can update cache" ON public.ai_analysis_cache;

-- Service role normalmente contorna RLS, mas o escopo explícito evita que
-- políticas com nome "Service role" concedam acesso a outros papéis.
CREATE POLICY "service_role manages AI cache" ON public.ai_analysis_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);
