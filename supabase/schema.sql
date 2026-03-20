-- ============================================================
-- Honara7ty — Supabase Database Schema
-- Run this entire file in the Supabase SQL Editor.
-- ============================================================

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
  devotion_time TEXT,                   -- stored as "HH:MM" string (e.g. "07:30")
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Each user can only read/write their own profile row.
CREATE POLICY "profiles: own row only"
  ON public.profiles
  FOR ALL
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


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

CREATE POLICY "reading_log: own rows only"
  ON public.reading_log
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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

CREATE POLICY "prayer_notes: own rows only"
  ON public.prayer_notes
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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

CREATE POLICY "reflections: own rows only"
  ON public.reflections
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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

CREATE POLICY "testimonies: own rows only"
  ON public.testimonies
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS testimonies_user_created_idx
  ON public.testimonies (user_id, created_at DESC);
