-- Admin-only product-health snapshot used by the web dashboard.
-- Run through the Supabase migration workflow before deploying the dashboard.

CREATE OR REPLACE FUNCTION public.get_admin_insight_snapshot()
RETURNS TABLE (
  dau_users BIGINT,
  wau_users BIGINT,
  mau_users BIGINT,
  inactive_7_days BIGINT,
  inactive_14_days BIGINT,
  inactive_30_days BIGINT,
  retention_7_eligible BIGINT,
  retention_7_returned BIGINT,
  retention_30_eligible BIGINT,
  retention_30_returned BIGINT,
  new_prayers_7_days BIGINT,
  unanswered_prayers_14_days BIGINT,
  reflections_7_days BIGINT,
  missing_name BIGINT,
  missing_church BIGINT,
  missing_birth_date BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH activity AS (
    SELECT user_id, date AS activity_date FROM public.devotion_log WHERE completed
    UNION
    SELECT user_id, date AS activity_date FROM public.reading_log
    UNION
    SELECT user_id, created_at::date AS activity_date FROM public.prayer_notes
    UNION
    SELECT user_id, COALESCE(date, created_at::date) AS activity_date FROM public.reflections
  ),
  users AS (
    SELECT p.id, u.created_at::date AS joined_on, p.church, p.birth_date,
      COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''), NULLIF(TRIM(u.raw_user_meta_data->>'name'), '')) AS name
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
  ),
  last_activity AS (
    SELECT user_id, MAX(activity_date) AS activity_date FROM activity GROUP BY user_id
  ),
  retention AS (
    SELECT u.id, u.joined_on,
      EXISTS (SELECT 1 FROM activity a WHERE a.user_id = u.id AND a.activity_date BETWEEN u.joined_on + 7 AND u.joined_on + 13) AS returned_day_7,
      EXISTS (SELECT 1 FROM activity a WHERE a.user_id = u.id AND a.activity_date BETWEEN u.joined_on + 30 AND u.joined_on + 36) AS returned_day_30
    FROM users u
  )
  SELECT
    (SELECT COUNT(DISTINCT user_id) FROM activity WHERE activity_date = CURRENT_DATE),
    (SELECT COUNT(DISTINCT user_id) FROM activity WHERE activity_date >= CURRENT_DATE - 6),
    (SELECT COUNT(DISTINCT user_id) FROM activity WHERE activity_date >= CURRENT_DATE - 29),
    (SELECT COUNT(*) FROM users u LEFT JOIN last_activity l ON l.user_id = u.id WHERE l.activity_date IS NULL OR l.activity_date < CURRENT_DATE - 6),
    (SELECT COUNT(*) FROM users u LEFT JOIN last_activity l ON l.user_id = u.id WHERE l.activity_date IS NULL OR l.activity_date < CURRENT_DATE - 13),
    (SELECT COUNT(*) FROM users u LEFT JOIN last_activity l ON l.user_id = u.id WHERE l.activity_date IS NULL OR l.activity_date < CURRENT_DATE - 29),
    (SELECT COUNT(*) FROM retention WHERE joined_on <= CURRENT_DATE - 13),
    (SELECT COUNT(*) FROM retention WHERE joined_on <= CURRENT_DATE - 13 AND returned_day_7),
    (SELECT COUNT(*) FROM retention WHERE joined_on <= CURRENT_DATE - 36),
    (SELECT COUNT(*) FROM retention WHERE joined_on <= CURRENT_DATE - 36 AND returned_day_30),
    (SELECT COUNT(*) FROM public.prayer_notes WHERE created_at::date >= CURRENT_DATE - 6),
    (SELECT COUNT(*) FROM public.prayer_notes WHERE NOT is_answered AND created_at::date < CURRENT_DATE - 13),
    (SELECT COUNT(*) FROM public.reflections WHERE created_at::date >= CURRENT_DATE - 6),
    (SELECT COUNT(*) FROM users WHERE name IS NULL),
    (SELECT COUNT(*) FROM users WHERE NULLIF(TRIM(church), '') IS NULL),
    (SELECT COUNT(*) FROM users WHERE NULLIF(TRIM(birth_date), '') IS NULL);
$$;

REVOKE ALL ON FUNCTION public.get_admin_insight_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_insight_snapshot() TO authenticated;
