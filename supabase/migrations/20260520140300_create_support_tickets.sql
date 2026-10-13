-- -- Gerado em 2026-10-13 ao validar as 81 migrações em PostgreSQL 17.11 limpo.
-- support_tickets é usada por 8 migrações posteriores mas nunca foi criada no
-- versionamento: existia em produção por ter sido criada fora dele. Sem este
-- arquivo um ambiente novo quebra em cascata a partir de 20260520140357.
-- Idempotente: em produção a tabela já existe, então isto é no-op.
-- Schema copiado de src/integrations/supabase/types.ts (snapshot do banco real).

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  email      text NOT NULL,
  subject    text NOT NULL,
  message    text NOT NULL,
  protocol   text NOT NULL,
  status     text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status  ON public.support_tickets(status);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
