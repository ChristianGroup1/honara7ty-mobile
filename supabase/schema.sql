-- ============================================================
-- Honara7ty — Supabase Database Schema
-- Run this entire file in the Supabase SQL Editor.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

ALTER TABLE public.prayer_notes
  ALTER COLUMN content DROP NOT NULL;

ALTER TABLE public.prayer_notes
  ADD COLUMN IF NOT EXISTS content_encrypted BYTEA;

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

ALTER TABLE public.reflections
  ALTER COLUMN content DROP NOT NULL;

ALTER TABLE public.reflections
  ADD COLUMN IF NOT EXISTS content_encrypted BYTEA;

ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reflections: own rows only"
  ON public.reflections
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS reflections_user_date_idx
  ON public.reflections (user_id, date DESC);

DO $$
BEGIN
  IF current_setting('app.settings.encryption_key', true) IS NULL THEN
    RAISE EXCEPTION 'Missing app.settings.encryption_key. Set it first: ALTER DATABASE <your_database_name> SET app.settings.encryption_key = ''<strong-random-secret>'';';
  END IF;
END
$$;

UPDATE public.prayer_notes
SET
  content_encrypted = pgp_sym_encrypt(content, current_setting('app.settings.encryption_key')),
  content = NULL
WHERE content IS NOT NULL;

UPDATE public.reflections
SET
  content_encrypted = pgp_sym_encrypt(content, current_setting('app.settings.encryption_key')),
  content = NULL
WHERE content IS NOT NULL;

CREATE OR REPLACE FUNCTION public.secure_list_prayer_notes()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content TEXT,
  is_answered BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    pn.id,
    pn.user_id,
    COALESCE(
      CASE
        WHEN pn.content_encrypted IS NULL THEN pn.content
        ELSE pgp_sym_decrypt(pn.content_encrypted, current_setting('app.settings.encryption_key'))::TEXT
      END,
      ''
    ) AS content,
    pn.is_answered,
    pn.created_at
  FROM public.prayer_notes pn
  WHERE pn.user_id = auth.uid()
  ORDER BY pn.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.secure_upsert_prayer_note(
  p_id UUID,
  p_content TEXT,
  p_is_answered BOOLEAN
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content TEXT,
  is_answered BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_row public.prayer_notes%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_content IS NULL THEN
    RAISE EXCEPTION 'Content is required';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.prayer_notes (
      user_id,
      content,
      content_encrypted,
      is_answered
    )
    VALUES (
      auth.uid(),
      NULL,
      pgp_sym_encrypt(p_content, current_setting('app.settings.encryption_key')),
      COALESCE(p_is_answered, false)
    )
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.prayer_notes
    SET
      content = NULL,
      content_encrypted = pgp_sym_encrypt(p_content, current_setting('app.settings.encryption_key')),
      is_answered = COALESCE(p_is_answered, false)
    WHERE id = p_id
      AND user_id = auth.uid()
    RETURNING * INTO v_row;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record unavailable';
  END IF;

  RETURN QUERY
  SELECT
    v_row.id,
    v_row.user_id,
    COALESCE(
      CASE
        WHEN v_row.content_encrypted IS NULL THEN v_row.content
        ELSE pgp_sym_decrypt(v_row.content_encrypted, current_setting('app.settings.encryption_key'))::TEXT
      END,
      ''
    ),
    v_row.is_answered,
    v_row.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.secure_delete_prayer_note(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  DELETE FROM public.prayer_notes
  WHERE id = p_id
    AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.secure_list_reflections()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content TEXT,
  date DATE,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    r.id,
    r.user_id,
    COALESCE(
      CASE
        WHEN r.content_encrypted IS NULL THEN r.content
        ELSE pgp_sym_decrypt(r.content_encrypted, current_setting('app.settings.encryption_key'))::TEXT
      END,
      ''
    ) AS content,
    r.date,
    r.created_at
  FROM public.reflections r
  WHERE r.user_id = auth.uid()
  ORDER BY r.date DESC, r.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.secure_upsert_reflection(
  p_id UUID,
  p_content TEXT,
  p_date DATE
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content TEXT,
  date DATE,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_row public.reflections%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_content IS NULL THEN
    RAISE EXCEPTION 'Content is required';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.reflections (
      user_id,
      content,
      content_encrypted,
      date
    )
    VALUES (
      auth.uid(),
      NULL,
      pgp_sym_encrypt(p_content, current_setting('app.settings.encryption_key')),
      p_date
    )
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.reflections
    SET
      content = NULL,
      content_encrypted = pgp_sym_encrypt(p_content, current_setting('app.settings.encryption_key')),
      date = p_date
    WHERE id = p_id
      AND user_id = auth.uid()
    RETURNING * INTO v_row;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record unavailable';
  END IF;

  RETURN QUERY
  SELECT
    v_row.id,
    v_row.user_id,
    COALESCE(
      CASE
        WHEN v_row.content_encrypted IS NULL THEN v_row.content
        ELSE pgp_sym_decrypt(v_row.content_encrypted, current_setting('app.settings.encryption_key'))::TEXT
      END,
      ''
    ),
    v_row.date,
    v_row.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.secure_delete_reflection(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  DELETE FROM public.reflections
  WHERE id = p_id
    AND user_id = auth.uid();
END;
$$;

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

CREATE POLICY "devotion_log: own rows only"
  ON public.devotion_log
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
