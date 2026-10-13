-- ============================================================================
-- Bucket de avatares — a funcionalidade nunca funcionou em produção
--
-- `src/pages/PerfilPage.tsx` faz upload da foto do perfil com
-- `supabase.storage.from("avatars")`. Verificado em produção:
--
--   GET /storage/v1/bucket          → []            (nenhum bucket existe)
--   GET /storage/v1/bucket/avatars  → NoSuchBucket  ("Bucket not found")
--
-- Ou seja, todo envio de avatar falhava com o toast "Erro ao enviar avatar".
-- É o único uso de Storage em todo o código, então nada mais é afetado.
--
-- O bucket fica em `storage.buckets`, portanto dá para criá-lo por migration
-- em vez de depender de clique no painel.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,                      -- a URL pública é gravada em profiles.avatar_url
  5 * 1024 * 1024,           -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── Políticas: cada usuário mexe apenas na própria pasta ───────────────────
-- O caminho é `${user.id}/avatar.<ext>` (ver handleAvatarUpload), então a
-- restrição é pelo primeiro segmento do caminho.

DROP POLICY IF EXISTS "avatars_select_own" ON storage.objects;
CREATE POLICY "avatars_select_own" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Leitura pública: a foto de perfil é exibida para o próprio usuário e pode
-- aparecer em telas compartilhadas. Escrita continua restrita ao dono.
