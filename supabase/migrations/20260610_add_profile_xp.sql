ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp INT;

ALTER TABLE public.profiles
  ALTER COLUMN xp SET DEFAULT 0;

UPDATE public.profiles
  SET xp = 0
  WHERE xp IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN xp SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_xp_non_negative'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_xp_non_negative CHECK (xp >= 0);
  END IF;
END $$;
