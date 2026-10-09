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
