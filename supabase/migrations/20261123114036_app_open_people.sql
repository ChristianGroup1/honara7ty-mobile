-- Admin list of who opened the app, in addition to the existing counts.

CREATE OR REPLACE FUNCTION public.get_app_open_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  today date := (timezone('Africa/Cairo', now()))::date;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  RETURN jsonb_build_object(
    'opened_today', (
      SELECT COUNT(DISTINCT user_id)
      FROM public.app_opens
      WHERE opened_on = today
    ),
    'opened_7_days', (
      SELECT COUNT(DISTINCT user_id)
      FROM public.app_opens
      WHERE opened_on >= today - 6
    ),
    'opened_30_days', (
      SELECT COUNT(DISTINCT user_id)
      FROM public.app_opens
      WHERE opened_on >= today - 29
    ),
    'versions', COALESCE((
      SELECT jsonb_agg(to_jsonb(v) ORDER BY v.users_7_days DESC, v.app_version DESC)
      FROM (
        SELECT
          app_version,
          build_number,
          platform,
          COUNT(DISTINCT user_id)::bigint AS users_7_days,
          COALESCE(SUM(open_count), 0)::bigint AS opens_7_days
        FROM public.app_opens
        WHERE opened_on >= today - 6
        GROUP BY app_version, build_number, platform
      ) v
    ), '[]'::jsonb),
    'people', COALESCE((
      SELECT jsonb_agg(to_jsonb(p) ORDER BY p.last_opened_at DESC)
      FROM (
        SELECT
          l.user_id,
          u.email::text AS email,
          COALESCE(
            NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
            NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
            (
              SELECT NULLIF(TRIM(dgm.display_name), '')
              FROM public.devotion_group_members dgm
              WHERE dgm.user_id = l.user_id
                AND dgm.display_name NOT IN ('مستخدم', 'قائد الجروب', '')
              ORDER BY dgm.joined_at ASC
              LIMIT 1
            ),
            split_part(u.email, '@', 1)
          ) AS full_name,
          l.last_opened_at,
          l.opened_on AS last_opened_on,
          t.opens_30_days,
          l.app_version,
          l.build_number,
          l.platform
        FROM (
          SELECT DISTINCT ON (user_id)
            user_id,
            app_version,
            build_number,
            platform,
            last_opened_at,
            opened_on
          FROM public.app_opens
          WHERE opened_on >= today - 29
          ORDER BY user_id, last_opened_at DESC
        ) l
        JOIN (
          SELECT user_id, COALESCE(SUM(open_count), 0)::bigint AS opens_30_days
          FROM public.app_opens
          WHERE opened_on >= today - 29
          GROUP BY user_id
        ) t ON t.user_id = l.user_id
        JOIN auth.users u ON u.id = l.user_id
        ORDER BY l.last_opened_at DESC
        LIMIT 100
      ) p
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_app_open_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_app_open_stats() TO authenticated;
