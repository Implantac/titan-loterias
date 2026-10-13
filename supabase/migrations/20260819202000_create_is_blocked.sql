-- -- Gerado em 2026-10-13 ao validar as 81 migrações em PostgreSQL 17.11 limpo.
-- 20260819202052 faz GRANT EXECUTE ON FUNCTION public.is_blocked(uuid), mas
-- nenhuma migração a definia. Em produção ela existe — o PostgREST confirmou a
-- assinatura ao sugerir "public.is_blocked(_user_id)".
-- Idempotente: CREATE OR REPLACE é no-op onde já existe.

CREATE OR REPLACE FUNCTION public.is_blocked(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id AND p.blocked = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_blocked(uuid) TO authenticated, service_role;
