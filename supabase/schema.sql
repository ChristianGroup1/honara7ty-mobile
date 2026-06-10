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
  reading_entries JSONB,
  xp            INT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

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

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS selected_chapters INT[];

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reading_entries JSONB;

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
  reading_entries JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, date)
);

ALTER TABLE public.devotion_log
  ADD COLUMN IF NOT EXISTS selected_chapters INT[];

ALTER TABLE public.devotion_log
  ADD COLUMN IF NOT EXISTS reading_entries JSONB;

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


-- ──────────────────────────────────────────────────────────────
-- 7. DEVOTION GROUPS
--    Small accountability groups. Leaders can see member devotion
--    completion and send in-app reminder records.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.devotion_groups (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  invite_code TEXT        NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 8)),
  shared_reading_book TEXT,
  shared_selected_chapters INT[],
  shared_target_days INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.devotion_groups
  ADD COLUMN IF NOT EXISTS shared_reading_book TEXT;

ALTER TABLE public.devotion_groups
  ADD COLUMN IF NOT EXISTS shared_selected_chapters INT[];

ALTER TABLE public.devotion_groups
  ADD COLUMN IF NOT EXISTS shared_target_days INT;

CREATE TABLE IF NOT EXISTS public.devotion_group_members (
  group_id         UUID        NOT NULL REFERENCES public.devotion_groups (id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role             TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'leader', 'member')),
  display_name     TEXT        NOT NULL DEFAULT 'مستخدم',
  joined_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reminded_at TIMESTAMPTZ,

  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.devotion_group_reminders (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID        NOT NULL REFERENCES public.devotion_groups (id) ON DELETE CASCADE,
  sender_id    UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  recipient_id UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  message      TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at      TIMESTAMPTZ
);

ALTER TABLE public.devotion_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devotion_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devotion_group_reminders ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS devotion_group_members_user_idx
  ON public.devotion_group_members (user_id);

CREATE INDEX IF NOT EXISTS devotion_group_reminders_recipient_idx
  ON public.devotion_group_reminders (recipient_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.is_devotion_group_member(target_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.devotion_group_members
    WHERE group_id = target_group_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_devotion_group_leader(target_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.devotion_group_members
    WHERE group_id = target_group_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'leader')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_group_devotion(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = target_user_id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.devotion_group_members viewer
      JOIN public.devotion_group_members target
        ON target.group_id = viewer.group_id
      WHERE viewer.user_id = auth.uid()
        AND target.user_id = target_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.add_owner_to_devotion_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.devotion_group_members (group_id, user_id, role, display_name)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'قائد الجروب')
  ON CONFLICT (group_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS devotion_groups_add_owner_member
  ON public.devotion_groups;

CREATE TRIGGER devotion_groups_add_owner_member
AFTER INSERT ON public.devotion_groups
FOR EACH ROW
EXECUTE FUNCTION public.add_owner_to_devotion_group();

CREATE OR REPLACE FUNCTION public.join_devotion_group_by_code(
  code TEXT,
  member_display_name TEXT DEFAULT 'مستخدم'
)
RETURNS TABLE (group_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_group_id UUID;
BEGIN
  SELECT id INTO matched_group_id
  FROM public.devotion_groups
  WHERE invite_code = upper(trim(code));

  IF matched_group_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_INVITE_CODE';
  END IF;

  INSERT INTO public.devotion_group_members (
    group_id,
    user_id,
    role,
    display_name
  )
  VALUES (
    matched_group_id,
    auth.uid(),
    'member',
    COALESCE(NULLIF(trim(member_display_name), ''), 'مستخدم')
  )
  ON CONFLICT (group_id, user_id) DO UPDATE
    SET display_name = EXCLUDED.display_name;

  RETURN QUERY SELECT matched_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_devotion_group(
  group_name TEXT,
  owner_display_name TEXT DEFAULT 'قائد الجروب'
)
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  name TEXT,
  invite_code TEXT,
  shared_reading_book TEXT,
  shared_selected_chapters INT[],
  shared_target_days INT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_group public.devotion_groups%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF NULLIF(trim(group_name), '') IS NULL THEN
    RAISE EXCEPTION 'GROUP_NAME_REQUIRED';
  END IF;

  INSERT INTO public.devotion_groups (owner_id, name)
  VALUES (auth.uid(), trim(group_name))
  RETURNING * INTO inserted_group;

  INSERT INTO public.devotion_group_members (
    group_id,
    user_id,
    role,
    display_name
  )
  VALUES (
    inserted_group.id,
    auth.uid(),
    'owner',
    COALESCE(NULLIF(trim(owner_display_name), ''), 'قائد الجروب')
  )
  ON CONFLICT (group_id, user_id) DO UPDATE
    SET role = 'owner',
        display_name = EXCLUDED.display_name;

  RETURN QUERY
  SELECT
    inserted_group.id,
    inserted_group.owner_id,
    inserted_group.name,
    inserted_group.invite_code,
    inserted_group.shared_reading_book,
    inserted_group.shared_selected_chapters,
    inserted_group.shared_target_days,
    inserted_group.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_devotion_group(
  invite_code_input TEXT,
  member_display_name TEXT DEFAULT 'مستخدم'
)
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  name TEXT,
  invite_code TEXT,
  shared_reading_book TEXT,
  shared_selected_chapters INT[],
  shared_target_days INT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_group public.devotion_groups%ROWTYPE;
  normalized_invite_code TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  normalized_invite_code := upper(regexp_replace(trim(invite_code_input), '\s+', '', 'g'));

  IF normalized_invite_code = '' THEN
    RAISE EXCEPTION 'INVALID_INVITE_CODE';
  END IF;

  SELECT *
  INTO matched_group
  FROM public.devotion_groups
  WHERE devotion_groups.invite_code = normalized_invite_code;

  IF matched_group.id IS NULL THEN
    RAISE EXCEPTION 'INVALID_INVITE_CODE';
  END IF;

  INSERT INTO public.devotion_group_members (
    group_id,
    user_id,
    role,
    display_name
  )
  VALUES (
    matched_group.id,
    auth.uid(),
    'member',
    COALESCE(NULLIF(trim(member_display_name), ''), 'مستخدم')
  )
  ON CONFLICT (group_id, user_id) DO UPDATE
    SET display_name = EXCLUDED.display_name;

  RETURN QUERY
  SELECT
    matched_group.id,
    matched_group.owner_id,
    matched_group.name,
    matched_group.invite_code,
    matched_group.shared_reading_book,
    matched_group.shared_selected_chapters,
    matched_group.shared_target_days,
    matched_group.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.my_devotion_groups()
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  name TEXT,
  invite_code TEXT,
  shared_reading_book TEXT,
  shared_selected_chapters INT[],
  shared_target_days INT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    devotion_groups.id,
    devotion_groups.owner_id,
    devotion_groups.name,
    devotion_groups.invite_code,
    devotion_groups.shared_reading_book,
    devotion_groups.shared_selected_chapters,
    devotion_groups.shared_target_days,
    devotion_groups.created_at
  FROM public.devotion_group_members
  JOIN public.devotion_groups
    ON devotion_groups.id = devotion_group_members.group_id
  WHERE devotion_group_members.user_id = auth.uid()
  ORDER BY devotion_groups.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.set_devotion_group_shared_reading(
  target_group_id UUID,
  reading_book_input TEXT DEFAULT NULL,
  selected_chapters_input INT[] DEFAULT NULL,
  target_days_input INT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF NOT public.is_devotion_group_leader(target_group_id) THEN
    RAISE EXCEPTION 'NOT_GROUP_LEADER';
  END IF;

  UPDATE public.devotion_groups
  SET
    shared_reading_book = NULLIF(trim(reading_book_input), ''),
    shared_selected_chapters = selected_chapters_input,
    shared_target_days = target_days_input
  WHERE id = target_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_devotion_group_member(
  target_group_id UUID,
  target_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_role TEXT;
  target_member_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT role INTO requester_role
  FROM public.devotion_group_members
  WHERE group_id = target_group_id
    AND user_id = auth.uid();

  IF requester_role NOT IN ('owner', 'leader') THEN
    RAISE EXCEPTION 'NOT_GROUP_ADMIN';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'CANNOT_MANAGE_SELF';
  END IF;

  SELECT role INTO target_member_role
  FROM public.devotion_group_members
  WHERE group_id = target_group_id
    AND user_id = target_user_id;

  IF target_member_role IS NULL THEN
    RAISE EXCEPTION 'MEMBER_NOT_FOUND';
  END IF;

  IF target_member_role = 'owner' THEN
    RAISE EXCEPTION 'CANNOT_MANAGE_OWNER';
  END IF;

  DELETE FROM public.devotion_group_members
  WHERE group_id = target_group_id
    AND user_id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_devotion_group_member_role(
  target_group_id UUID,
  target_user_id UUID,
  target_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_role TEXT;
  target_member_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF target_role NOT IN ('leader', 'member') THEN
    RAISE EXCEPTION 'INVALID_MEMBER_ROLE';
  END IF;

  SELECT role INTO requester_role
  FROM public.devotion_group_members
  WHERE group_id = target_group_id
    AND user_id = auth.uid();

  IF requester_role NOT IN ('owner', 'leader') THEN
    RAISE EXCEPTION 'NOT_GROUP_ADMIN';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'CANNOT_MANAGE_SELF';
  END IF;

  SELECT role INTO target_member_role
  FROM public.devotion_group_members
  WHERE group_id = target_group_id
    AND user_id = target_user_id;

  IF target_member_role IS NULL THEN
    RAISE EXCEPTION 'MEMBER_NOT_FOUND';
  END IF;

  IF target_member_role = 'owner' THEN
    RAISE EXCEPTION 'CANNOT_MANAGE_OWNER';
  END IF;

  UPDATE public.devotion_group_members
  SET role = target_role
  WHERE group_id = target_group_id
    AND user_id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.is_devotion_group_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_devotion_group_leader(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_group_devotion(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_devotion_groups() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_devotion_group(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_devotion_group_shared_reading(UUID, TEXT, INT[], INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_devotion_group_member(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_devotion_group_member_role(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_devotion_group(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_devotion_group_by_code(TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_devotion_group_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_devotion_group_leader(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_group_devotion(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_devotion_groups() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_devotion_group(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_devotion_group_shared_reading(UUID, TEXT, INT[], INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_devotion_group_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_devotion_group_member_role(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_devotion_group(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_devotion_group_by_code(TEXT, TEXT) TO authenticated;

DROP POLICY IF EXISTS "devotion_groups: select members only"
  ON public.devotion_groups;
DROP POLICY IF EXISTS "devotion_groups: insert own groups"
  ON public.devotion_groups;
DROP POLICY IF EXISTS "devotion_groups: update owner only"
  ON public.devotion_groups;
DROP POLICY IF EXISTS "devotion_groups: delete owner only"
  ON public.devotion_groups;

CREATE POLICY "devotion_groups: select members only"
  ON public.devotion_groups
  FOR SELECT
  USING (public.is_devotion_group_member(id));

CREATE POLICY "devotion_groups: insert own groups"
  ON public.devotion_groups
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "devotion_groups: update owner only"
  ON public.devotion_groups
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "devotion_groups: delete owner only"
  ON public.devotion_groups
  FOR DELETE
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "devotion_group_members: select group members"
  ON public.devotion_group_members;
DROP POLICY IF EXISTS "devotion_group_members: update self or leader"
  ON public.devotion_group_members;
DROP POLICY IF EXISTS "devotion_group_members: update leader only"
  ON public.devotion_group_members;
DROP POLICY IF EXISTS "devotion_group_members: delete self or leader"
  ON public.devotion_group_members;

CREATE POLICY "devotion_group_members: select group members"
  ON public.devotion_group_members
  FOR SELECT
  USING (public.is_devotion_group_member(group_id));

CREATE POLICY "devotion_group_members: update leader only"
  ON public.devotion_group_members
  FOR UPDATE
  USING (public.is_devotion_group_leader(group_id) AND role <> 'owner')
  WITH CHECK (public.is_devotion_group_leader(group_id) AND role <> 'owner');

CREATE POLICY "devotion_group_members: delete self or leader"
  ON public.devotion_group_members
  FOR DELETE
  USING (
    (auth.uid() = user_id AND role <> 'owner')
    OR (public.is_devotion_group_leader(group_id) AND role <> 'owner')
  );

DROP POLICY IF EXISTS "devotion_group_reminders: select participants"
  ON public.devotion_group_reminders;
DROP POLICY IF EXISTS "devotion_group_reminders: insert leaders only"
  ON public.devotion_group_reminders;
DROP POLICY IF EXISTS "devotion_group_reminders: update recipient read state"
  ON public.devotion_group_reminders;

CREATE POLICY "devotion_group_reminders: select participants"
  ON public.devotion_group_reminders
  FOR SELECT
  USING (
    auth.uid() = sender_id
    OR auth.uid() = recipient_id
    OR public.is_devotion_group_leader(group_id)
  );

CREATE POLICY "devotion_group_reminders: insert leaders only"
  ON public.devotion_group_reminders
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND public.is_devotion_group_leader(group_id)
    AND EXISTS (
      SELECT 1
      FROM public.devotion_group_members
      WHERE group_id = devotion_group_reminders.group_id
        AND user_id = devotion_group_reminders.recipient_id
    )
  );

CREATE POLICY "devotion_group_reminders: update recipient read state"
  ON public.devotion_group_reminders
  FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "devotion_log: read own rows, group leader, or admin"
  ON public.devotion_log;
DROP POLICY IF EXISTS "devotion_log: read own rows or admin read all"
  ON public.devotion_log;

CREATE POLICY "devotion_log: read own rows, group leader, or admin"
  ON public.devotion_log
  FOR SELECT
  USING (public.can_view_group_devotion(user_id));


-- ──────────────────────────────────────────────────────────────
-- 8. USER PUSH TOKENS
--    Device tokens used by Supabase Edge Functions to send real
--    push notifications through FCM/APNs.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  token      TEXT        NOT NULL UNIQUE,
  platform   TEXT        NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS user_push_tokens_user_idx
  ON public.user_push_tokens (user_id);

DROP POLICY IF EXISTS "user_push_tokens: own rows only"
  ON public.user_push_tokens;
DROP POLICY IF EXISTS "user_push_tokens: select own rows"
  ON public.user_push_tokens;
DROP POLICY IF EXISTS "user_push_tokens: insert own rows"
  ON public.user_push_tokens;
DROP POLICY IF EXISTS "user_push_tokens: update own rows"
  ON public.user_push_tokens;
DROP POLICY IF EXISTS "user_push_tokens: delete own rows"
  ON public.user_push_tokens;

CREATE POLICY "user_push_tokens: select own rows"
  ON public.user_push_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_push_tokens: insert own rows"
  ON public.user_push_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_push_tokens: update own rows"
  ON public.user_push_tokens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_push_tokens: delete own rows"
  ON public.user_push_tokens
  FOR DELETE
  USING (auth.uid() = user_id);
