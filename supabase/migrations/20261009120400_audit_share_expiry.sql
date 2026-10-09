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
