-- ============================================================
-- Honara7ty — Admin read policies
-- Run this file in the Supabase SQL Editor to add read-only admin
-- access across all user-owned app tables.
--
-- This migration is non-destructive: it does not drop tables, rows,
-- columns, or existing policies.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id    UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

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

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP FUNCTION IF EXISTS public.admin_user_directory();

CREATE OR REPLACE FUNCTION public.admin_user_directory()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    auth.users.id,
    auth.users.email::TEXT,
    COALESCE(
      auth.users.raw_user_meta_data ->> 'full_name',
      auth.users.raw_user_meta_data ->> 'name',
      split_part(auth.users.email, '@', 1)
    ) AS full_name,
    auth.users.created_at
  FROM auth.users
  WHERE public.is_admin();
$$;

GRANT EXECUTE ON FUNCTION public.admin_user_directory() TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_users'
      AND policyname = 'admin_users: own row read only'
  ) THEN
    CREATE POLICY "admin_users: own row read only"
      ON public.admin_users
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles: admin read all'
  ) THEN
    CREATE POLICY "profiles: admin read all"
      ON public.profiles
      FOR SELECT
      USING (public.is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reading_log'
      AND policyname = 'reading_log: admin read all'
  ) THEN
    CREATE POLICY "reading_log: admin read all"
      ON public.reading_log
      FOR SELECT
      USING (public.is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'prayer_notes'
      AND policyname = 'prayer_notes: admin read all'
  ) THEN
    CREATE POLICY "prayer_notes: admin read all"
      ON public.prayer_notes
      FOR SELECT
      USING (public.is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reflections'
      AND policyname = 'reflections: admin read all'
  ) THEN
    CREATE POLICY "reflections: admin read all"
      ON public.reflections
      FOR SELECT
      USING (public.is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'testimonies'
      AND policyname = 'testimonies: admin read all'
  ) THEN
    CREATE POLICY "testimonies: admin read all"
      ON public.testimonies
      FOR SELECT
      USING (public.is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'devotion_log'
      AND policyname = 'devotion_log: admin read all'
  ) THEN
    CREATE POLICY "devotion_log: admin read all"
      ON public.devotion_log
      FOR SELECT
      USING (public.is_admin());
  END IF;
END $$;
