ALTER TABLE public.devotion_log
  ADD COLUMN IF NOT EXISTS reading_entries JSONB;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reading_entries JSONB;

