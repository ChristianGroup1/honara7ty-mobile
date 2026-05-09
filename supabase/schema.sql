-- ============================================================
-- Honara7ty — Supabase Database Schema
-- Run this entire file in the Supabase SQL Editor.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 0. ADMIN USERS
--    Add your auth.users id here to allow read-only admin access
--    across all user-owned app tables.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id    UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users: own row read only"
  ON public.admin_users;

CREATE POLICY "admin_users: own row read only"
  ON public.admin_users
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- 1. PROFILES
--    One row per user. Stores personal info + daily devotion time.
--    Created automatically (or on first profile-completion step).
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  church        TEXT,
  sect          TEXT,
  birth_date    TEXT,                   -- stored as "YYYY-MM-DD" string
  gender        TEXT,
  devotion_time TEXT DEFAULT '07:00',   -- stored as "HH:MM" string (e.g. "07:30")
  reading_book  TEXT,
  reading_chapter INT,
  daily_chapters_target INT DEFAULT 1,
  selected_chapters INT[],
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS selected_chapters INT[];

ALTER TABLE public.profiles
  ALTER COLUMN devotion_time SET DEFAULT '07:00';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: own row only"
  ON public.profiles;
DROP POLICY IF EXISTS "profiles: read own row or admin read all"
  ON public.profiles;
DROP POLICY IF EXISTS "profiles: insert own row only"
  ON public.profiles;
DROP POLICY IF EXISTS "profiles: update own row only"
  ON public.profiles;
DROP POLICY IF EXISTS "profiles: delete own row only"
  ON public.profiles;

CREATE POLICY "profiles: read own row or admin read all"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles: insert own row only"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: update own row only"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: delete own row only"
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = id);


-- ──────────────────────────────────────────────────────────────
-- 2. READING_LOG
--    Records every Bible chapter a user reads on a given day.
--    Used to compute reading streaks and award badges.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reading_log (
  user_id  UUID  NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  book_id  TEXT  NOT NULL,   -- Bible book identifier (e.g. "1" for Genesis)
  chapter  INT   NOT NULL,   -- chapter number read
  date     DATE  NOT NULL,   -- date of reading (YYYY-MM-DD)

  PRIMARY KEY (user_id, book_id, chapter, date)
);

ALTER TABLE public.reading_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reading_log: own rows only"
  ON public.reading_log;
DROP POLICY IF EXISTS "reading_log: read own rows or admin read all"
  ON public.reading_log;
DROP POLICY IF EXISTS "reading_log: insert own rows only"
  ON public.reading_log;
DROP POLICY IF EXISTS "reading_log: update own rows only"
  ON public.reading_log;
DROP POLICY IF EXISTS "reading_log: delete own rows only"
  ON public.reading_log;

CREATE POLICY "reading_log: read own rows or admin read all"
  ON public.reading_log
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "reading_log: insert own rows only"
  ON public.reading_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reading_log: update own rows only"
  ON public.reading_log
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reading_log: delete own rows only"
  ON public.reading_log
  FOR DELETE
  USING (auth.uid() = user_id);

-- Speed up date-range queries used for streak calculations.
CREATE INDEX IF NOT EXISTS reading_log_user_date_idx
  ON public.reading_log (user_id, date);


-- ──────────────────────────────────────────────────────────────
-- 3. PRAYER_NOTES
--    User's prayer requests. Can be marked as answered.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prayer_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  is_answered BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prayer_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prayer_notes: own rows only"
  ON public.prayer_notes;
DROP POLICY IF EXISTS "prayer_notes: read own rows or admin read all"
  ON public.prayer_notes;
DROP POLICY IF EXISTS "prayer_notes: insert own rows only"
  ON public.prayer_notes;
DROP POLICY IF EXISTS "prayer_notes: update own rows only"
  ON public.prayer_notes;
DROP POLICY IF EXISTS "prayer_notes: delete own rows only"
  ON public.prayer_notes;

CREATE POLICY "prayer_notes: read own rows or admin read all"
  ON public.prayer_notes
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "prayer_notes: insert own rows only"
  ON public.prayer_notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "prayer_notes: update own rows only"
  ON public.prayer_notes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "prayer_notes: delete own rows only"
  ON public.prayer_notes
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS prayer_notes_user_created_idx
  ON public.prayer_notes (user_id, created_at DESC);


-- ──────────────────────────────────────────────────────────────
-- 4. REFLECTIONS
--    Spiritual journal entries. One entry per day (or more).
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reflections (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  content    TEXT        NOT NULL,
  date       DATE        NOT NULL,   -- YYYY-MM-DD (entry date)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reflections: own rows only"
  ON public.reflections;
DROP POLICY IF EXISTS "reflections: read own rows or admin read all"
  ON public.reflections;
DROP POLICY IF EXISTS "reflections: insert own rows only"
  ON public.reflections;
DROP POLICY IF EXISTS "reflections: update own rows only"
  ON public.reflections;
DROP POLICY IF EXISTS "reflections: delete own rows only"
  ON public.reflections;

CREATE POLICY "reflections: read own rows or admin read all"
  ON public.reflections
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "reflections: insert own rows only"
  ON public.reflections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reflections: update own rows only"
  ON public.reflections
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reflections: delete own rows only"
  ON public.reflections
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS reflections_user_date_idx
  ON public.reflections (user_id, date DESC);


-- ──────────────────────────────────────────────────────────────
-- 5. TESTIMONIES
--    Stories of answered prayers that users can share.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.testimonies (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.testimonies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "testimonies: own rows only"
  ON public.testimonies;
DROP POLICY IF EXISTS "testimonies: read own rows or admin read all"
  ON public.testimonies;
DROP POLICY IF EXISTS "testimonies: insert own rows only"
  ON public.testimonies;
DROP POLICY IF EXISTS "testimonies: update own rows only"
  ON public.testimonies;
DROP POLICY IF EXISTS "testimonies: delete own rows only"
  ON public.testimonies;

CREATE POLICY "testimonies: read own rows or admin read all"
  ON public.testimonies
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "testimonies: insert own rows only"
  ON public.testimonies
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "testimonies: update own rows only"
  ON public.testimonies
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "testimonies: delete own rows only"
  ON public.testimonies
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS testimonies_user_created_idx
  ON public.testimonies (user_id, created_at DESC);


-- ──────────────────────────────────────────────────────────────
-- 6. DEVOTION_LOG
--    Tracks whether the user completed their daily خلوة (quiet time).
--    One row per user per day. Answered via the "سؤال اليوم المتغير"
--    card on the Home screen.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.devotion_log (
  user_id    UUID    NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  date       DATE    NOT NULL,   -- YYYY-MM-DD (local date of answer)
  completed  BOOLEAN NOT NULL DEFAULT true,
  reading_book TEXT,
  reading_chapter INT,
  chapters_read INT,
  selected_chapters INT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, date)
);

ALTER TABLE public.devotion_log
  ADD COLUMN IF NOT EXISTS selected_chapters INT[];

ALTER TABLE public.devotion_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "devotion_log: own rows only"
  ON public.devotion_log;
DROP POLICY IF EXISTS "devotion_log: read own rows or admin read all"
  ON public.devotion_log;
DROP POLICY IF EXISTS "devotion_log: insert own rows only"
  ON public.devotion_log;
DROP POLICY IF EXISTS "devotion_log: update own rows only"
  ON public.devotion_log;
DROP POLICY IF EXISTS "devotion_log: delete own rows only"
  ON public.devotion_log;

CREATE POLICY "devotion_log: read own rows or admin read all"
  ON public.devotion_log
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "devotion_log: insert own rows only"
  ON public.devotion_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "devotion_log: update own rows only"
  ON public.devotion_log
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "devotion_log: delete own rows only"
  ON public.devotion_log
  FOR DELETE
  USING (auth.uid() = user_id);
