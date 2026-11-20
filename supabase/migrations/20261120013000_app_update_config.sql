-- Soft (optional) app update config — no forced lockout by default.
CREATE TABLE IF NOT EXISTS public.app_update_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  latest_version text NOT NULL DEFAULT '2.0.0',
  android_store_url text NOT NULL
    DEFAULT 'https://play.google.com/store/apps/details?id=com.honara7ty.app',
  ios_store_url text NOT NULL
    DEFAULT 'https://apps.apple.com/app/id000000000',
  message_ar text NOT NULL
    DEFAULT 'فيه نسخة أحدث من التطبيق — حدّث وقت ما تحب، ومش لازم دلوقتي.',
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_update_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_update_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app update config"
  ON public.app_update_config;
CREATE POLICY "Anyone can read app update config"
  ON public.app_update_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE INSERT, UPDATE, DELETE ON public.app_update_config FROM anon, authenticated;
GRANT SELECT ON public.app_update_config TO anon, authenticated;
