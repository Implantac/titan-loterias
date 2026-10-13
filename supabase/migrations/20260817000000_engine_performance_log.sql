-- IF NOT EXISTS: a tabela já é criada em 20260729010400. Sem isto o replay
-- falha com 'relation already exists' e quebra qualquer ambiente novo.
CREATE TABLE IF NOT EXISTS public.engine_performance_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    lottery_id text NOT NULL,
    preset_hash text NOT NULL,
    config jsonb NOT NULL DEFAULT '{}'::jsonb,
    generated_at timestamptz NOT NULL DEFAULT now(),
    evaluated_concurso int,
    avg_hits real,
    max_hits int,
    tiers_hit jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Grant privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engine_performance_log TO authenticated;
GRANT ALL ON public.engine_performance_log TO service_role;

-- Enable RLS
ALTER TABLE public.engine_performance_log ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage their own performance logs"
ON public.engine_performance_log
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_engine_perf_user_lottery ON public.engine_performance_log(user_id, lottery_id);
CREATE INDEX IF NOT EXISTS idx_engine_perf_preset ON public.engine_performance_log(preset_hash);
