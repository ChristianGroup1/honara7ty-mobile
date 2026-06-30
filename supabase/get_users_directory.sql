-- ============================================================
-- Honara7ty — Admin User Directory RPCs (updated with memorization stats)
-- Run this entire script in the Supabase SQL Editor to update.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_users_directory(TEXT);

CREATE OR REPLACE FUNCTION public.get_users_directory(search_query TEXT DEFAULT '')
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  church TEXT,
  sect TEXT,
  xp INT,
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    u.email::TEXT,
    COALESCE(
      NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
      -- Fallback: pick the display_name set inside any devotion group
      (
        SELECT NULLIF(TRIM(dgm.display_name), '')
        FROM public.devotion_group_members dgm
        WHERE dgm.user_id = p.id
          AND dgm.display_name NOT IN ('مستخدم', 'قائد الجروب', '')
        ORDER BY dgm.joined_at ASC
        LIMIT 1
      ),
      -- Last resort: email prefix
      split_part(u.email, '@', 1)
    ) AS final_name,
    p.church,
    p.sect,
    p.xp,
    p.updated_at,
    u.created_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.id = u.id
  WHERE public.is_admin()
    AND (
      search_query = ''
      -- Case-insensitive search on name, email, church, or sect
      OR u.email ILIKE '%' || search_query || '%'
      OR p.church ILIKE '%' || search_query || '%'
      OR p.sect ILIKE '%' || search_query || '%'
      OR u.raw_user_meta_data->>'full_name' ILIKE '%' || search_query || '%'
      OR u.raw_user_meta_data->>'name' ILIKE '%' || search_query || '%'
      OR EXISTS (
        SELECT 1 
        FROM public.devotion_group_members dgm 
        WHERE dgm.user_id = p.id 
          AND dgm.display_name ILIKE '%' || search_query || '%'
      )
    )
  ORDER BY p.xp DESC, p.updated_at DESC
  LIMIT 500;
END;
$$;

-- Revoke execute from public and grant only to authenticated users
REVOKE ALL ON FUNCTION public.get_users_directory(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_users_directory(TEXT) TO authenticated;


DROP FUNCTION IF EXISTS public.get_users_by_ids(UUID[]);

-- ── RPC: Fetch specific users by their UUIDs ──────────────────────
CREATE OR REPLACE FUNCTION public.get_users_by_ids(user_ids UUID[])
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  church TEXT,
  sect TEXT,
  xp INT,
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    p.id,
    u.email::TEXT,
    COALESCE(
      NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
      (
        SELECT NULLIF(TRIM(dgm.display_name), '')
        FROM public.devotion_group_members dgm
        WHERE dgm.user_id = p.id
          AND dgm.display_name NOT IN ('مستخدم', 'قائد الجروب', '')
        ORDER BY dgm.joined_at ASC
        LIMIT 1
      ),
      split_part(u.email, '@', 1)
    ) AS full_name,
    p.church,
    p.sect,
    p.xp,
    p.updated_at,
    u.created_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.id = u.id
  WHERE p.id = ANY(user_ids)
    AND public.is_admin();
$$;

REVOKE ALL ON FUNCTION public.get_users_by_ids(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_users_by_ids(UUID[]) TO authenticated;


-- ── RPC: Registration growth monthly aggregation ──────────────────
DROP FUNCTION IF EXISTS public.get_registration_stats();

CREATE OR REPLACE FUNCTION public.get_registration_stats()
RETURNS TABLE (
  reg_month TEXT,
  reg_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT 
    to_char(u.created_at, 'YYYY-MM') AS reg_month,
    count(*)::BIGINT AS reg_count
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.id = u.id
  WHERE public.is_admin()
  GROUP BY reg_month
  ORDER BY reg_month ASC;
$$;

REVOKE ALL ON FUNCTION public.get_registration_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_registration_stats() TO authenticated;


-- ── RPC: Registration count for custom date range ─────────────────
DROP FUNCTION IF EXISTS public.get_new_registrations_count(TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.get_new_registrations_count(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;
  
  RETURN (
    SELECT count(*)::BIGINT
    FROM public.profiles p
    LEFT JOIN auth.users u ON p.id = u.id
    WHERE u.created_at >= start_date 
      AND u.created_at <= end_date
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_new_registrations_count(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_new_registrations_count(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;


-- ── RPC: Get product engagement and retention metrics ────────────
DROP FUNCTION IF EXISTS public.get_product_engagement_metrics();

CREATE OR REPLACE FUNCTION public.get_product_engagement_metrics()
RETURNS TABLE (
  total_users BIGINT,
  activated_users BIGINT,
  mau_users BIGINT,
  wau_users BIGINT,
  dau_users BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_total BIGINT;
  v_activated BIGINT;
  v_mau BIGINT;
  v_wau BIGINT;
  v_dau BIGINT;
  v_today DATE := CURRENT_DATE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  SELECT count(*)::BIGINT INTO v_total FROM public.profiles;

  SELECT count(DISTINCT user_id)::BIGINT INTO v_activated
  FROM public.devotion_log
  WHERE completed = true;

  SELECT count(DISTINCT user_id)::BIGINT INTO v_mau
  FROM public.devotion_log
  WHERE completed = true
    AND date >= (v_today - INTERVAL '30 days')::DATE;

  SELECT count(DISTINCT user_id)::BIGINT INTO v_wau
  FROM public.devotion_log
  WHERE completed = true
    AND date >= (v_today - INTERVAL '7 days')::DATE;

  SELECT count(DISTINCT user_id)::BIGINT INTO v_dau
  FROM public.devotion_log
  WHERE completed = true
    AND date = v_today;

  RETURN QUERY SELECT v_total, v_activated, v_mau, v_wau, v_dau;
END;
$$;

REVOKE ALL ON FUNCTION public.get_product_engagement_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_product_engagement_metrics() TO authenticated;


-- ── RPC: Fetch devotion logs in range bypassing PostgREST limits ────
DROP FUNCTION IF EXISTS public.get_devotion_logs_in_range(DATE, DATE);

CREATE OR REPLACE FUNCTION public.get_devotion_logs_in_range(start_date DATE, end_date DATE)
RETURNS TABLE (
  user_id UUID,
  date DATE,
  completed BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT l.user_id, l.date, l.completed
  FROM public.devotion_log l
  WHERE l.date >= start_date
    AND l.date <= end_date
    AND public.is_admin();
$$;

REVOKE ALL ON FUNCTION public.get_devotion_logs_in_range(DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_devotion_logs_in_range(DATE, DATE) TO authenticated;


-- ── RPC: Completed devotion reading details for admin insights ────
DROP FUNCTION IF EXISTS public.get_completed_reading_logs_in_range(DATE, DATE);

CREATE OR REPLACE FUNCTION public.get_completed_reading_logs_in_range(start_date DATE, end_date DATE)
RETURNS TABLE (
  user_id UUID,
  date DATE,
  reading_book TEXT,
  reading_chapter INT,
  chapters_read INT,
  selected_chapters INT[],
  reading_entries JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    l.user_id,
    l.date,
    l.reading_book,
    l.reading_chapter,
    l.chapters_read,
    l.selected_chapters,
    l.reading_entries
  FROM public.devotion_log l
  WHERE l.date >= start_date
    AND l.date <= end_date
    AND l.completed = true
    AND public.is_admin();
$$;

REVOKE ALL ON FUNCTION public.get_completed_reading_logs_in_range(DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_completed_reading_logs_in_range(DATE, DATE) TO authenticated;


-- ── RPC: Prayer note counts per user for admin insights ───────────
DROP FUNCTION IF EXISTS public.get_prayer_counts_by_user();

CREATE OR REPLACE FUNCTION public.get_prayer_counts_by_user()
RETURNS TABLE (
  user_id UUID,
  prayer_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT p.user_id, count(*)::BIGINT AS prayer_count
  FROM public.prayer_notes p
  WHERE public.is_admin()
  GROUP BY p.user_id;
$$;

REVOKE ALL ON FUNCTION public.get_prayer_counts_by_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_prayer_counts_by_user() TO authenticated;


-- ── NEW RPC: Scripture Memorization Statistics ───────────────────
DROP FUNCTION IF EXISTS public.get_memorization_stats();

CREATE OR REPLACE FUNCTION public.get_memorization_stats()
RETURNS TABLE (
  total_tests BIGINT,
  avg_score NUMERIC,
  total_verses BIGINT,
  total_time_seconds BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  RETURN QUERY
  SELECT 
    count(*)::BIGINT AS total_tests,
    COALESCE(round(avg(score * 100.0 / NULLIF(total, 0))::NUMERIC, 1), 0) AS avg_score,
    COALESCE(sum(cardinality(verses))::BIGINT, 0) AS total_verses,
    COALESCE(sum(time_seconds)::BIGINT, 0) AS total_time_seconds
  FROM public.memorization_log;
END;
$$;

REVOKE ALL ON FUNCTION public.get_memorization_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_memorization_stats() TO authenticated;
