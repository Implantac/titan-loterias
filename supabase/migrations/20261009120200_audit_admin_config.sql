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
