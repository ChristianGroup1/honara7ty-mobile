ALTER TABLE public.prayer_notes
  ADD COLUMN IF NOT EXISTS audio_uri TEXT,
  ADD COLUMN IF NOT EXISTS audio_duration_ms INTEGER;

ALTER TABLE public.reflections
  ADD COLUMN IF NOT EXISTS audio_uri TEXT,
  ADD COLUMN IF NOT EXISTS audio_duration_ms INTEGER;
