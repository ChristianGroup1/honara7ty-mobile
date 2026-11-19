INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('voice-recordings', 'voice-recordings', false, 20971520, ARRAY['audio/mp4', 'audio/aac', 'audio/m4a'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users can upload their own voice recordings" ON storage.objects;
CREATE POLICY "Users can upload their own voice recordings"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'voice-recordings'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Users can read their own voice recordings" ON storage.objects;
CREATE POLICY "Users can read their own voice recordings"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'voice-recordings'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Users can update their own voice recordings" ON storage.objects;
CREATE POLICY "Users can update their own voice recordings"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'voice-recordings'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'voice-recordings'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Users can delete their own voice recordings" ON storage.objects;
CREATE POLICY "Users can delete their own voice recordings"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'voice-recordings'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
