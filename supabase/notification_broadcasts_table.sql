-- ============================================================
-- Honara7ty — Notification Broadcasts Log Table
-- Run this script in the Supabase SQL Editor.
-- ============================================================

-- Table to log every admin broadcast
CREATE TABLE IF NOT EXISTS public.notification_broadcasts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  title          TEXT        NOT NULL,
  body           TEXT        NOT NULL,
  total_tokens   INT         NOT NULL DEFAULT 0,
  sent           INT         NOT NULL DEFAULT 0,
  failed         INT         NOT NULL DEFAULT 0,
  stale_removed  INT         NOT NULL DEFAULT 0,
  no_token_users INT         NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_broadcasts ENABLE ROW LEVEL SECURITY;

-- Only admins can read broadcasts log
DROP POLICY IF EXISTS "notification_broadcasts: admin select" ON public.notification_broadcasts;
CREATE POLICY "notification_broadcasts: admin select"
  ON public.notification_broadcasts
  FOR SELECT
  USING (public.is_admin());

-- Only service role (edge function) can insert — no anon/user insert
-- (Inserts happen via service role key in the edge function)
