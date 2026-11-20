-- One row per signed-in user, local day, app version, and platform.
-- open_count is how many times that person opened the app that day.

CREATE TABLE IF NOT EXISTS public.app_opens (
  user_id         UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  opened_on       DATE        NOT NULL,
  app_version     TEXT        NOT NULL,
  build_number    TEXT        NOT NULL DEFAULT '',
  platform        TEXT        NOT NULL,
  open_count      INTEGER     NOT NULL DEFAULT 1,
  first_opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_opened_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, opened_on, app_version, build_number, platform),
  CONSTRAINT app_opens_platform_check CHECK (platform IN ('ios', 'android', 'other')),
  CONSTRAINT app_opens_count_check CHECK (open_count > 0),
  CONSTRAINT app_opens_version_check CHECK (
    char_length(app_version) BETWEEN 1 AND 32
    AND char_length(build_number) <= 32
  )
);

ALTER TABLE public.app_opens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_opens: read own rows or admin read all"
  ON public.app_opens;
DROP POLICY IF EXISTS "app_opens: insert own rows only"
  ON public.app_opens;
DROP POLICY IF EXISTS "app_opens: update own rows only"
  ON public.app_opens;

CREATE POLICY "app_opens: read own rows or admin read all"
  ON public.app_opens
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "app_opens: insert own rows only"
  ON public.app_opens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "app_opens: update own rows only"
  ON public.app_opens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS app_opens_opened_on_idx
  ON public.app_opens (opened_on);

REVOKE ALL ON TABLE public.app_opens FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.app_opens TO authenticated;

CREATE OR REPLACE FUNCTION public.record_app_open(
  p_app_version text,
  p_build_number text,
  p_platform text,
  p_opened_on date,
  p_count integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  today date := (timezone('Africa/Cairo', now()))::date;
  v_version text := left(btrim(coalesce(p_app_version, '')), 32);
  v_build text := left(btrim(coalesce(p_build_number, '')), 32);
  v_platform text := lower(btrim(coalesce(p_platform, '')));
  v_count integer := least(greatest(coalesce(p_count, 1), 1), 100);
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF v_version = '' THEN
    RAISE EXCEPTION 'invalid version';
  END IF;
  IF v_platform NOT IN ('ios', 'android', 'other') THEN
    RAISE EXCEPTION 'invalid platform';
  END IF;
  IF p_opened_on IS NULL OR p_opened_on < today - 7 OR p_opened_on > today + 1 THEN
    RAISE EXCEPTION 'invalid date';
  END IF;

  INSERT INTO public.app_opens (
    user_id, opened_on, app_version, build_number, platform, open_count
  ) VALUES (
    uid, p_opened_on, v_version, v_build, v_platform, v_count
  )
  ON CONFLICT (user_id, opened_on, app_version, build_number, platform)
  DO UPDATE SET
    open_count = public.app_opens.open_count + v_count,
    last_opened_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.record_app_open(text, text, text, date, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_app_open(text, text, text, date, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_app_open_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_app_open_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_app_open_stats() TO authenticated;
