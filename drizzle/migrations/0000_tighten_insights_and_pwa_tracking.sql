DROP POLICY IF EXISTS "Everyone can view insights" ON public.system_insights;
CREATE POLICY "Active users can view insights" ON public.system_insights FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND NOT public.is_blocked(auth.uid()));

DROP POLICY IF EXISTS "Anyone can insert PWA tracking" ON public.pwa_tracking;
CREATE POLICY "Insert own PWA tracking" ON public.pwa_tracking FOR INSERT TO anon, authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND char_length(event_type) BETWEEN 1 AND 64
  AND (platform IS NULL OR char_length(platform) <= 64)
);