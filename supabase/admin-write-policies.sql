-- ============================================================
-- Honara7ty — Admin Write and Moderation Policies
-- Run this script in the Supabase SQL Editor.
-- ============================================================

-- 1. Profiles Update Policy (allows admin to adjust XP)
DROP POLICY IF EXISTS "profiles: admin update all" ON public.profiles;
CREATE POLICY "profiles: admin update all"
  ON public.profiles
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. Prayer Notes Delete Policy (allows admin to delete for moderation)
DROP POLICY IF EXISTS "prayer_notes: admin delete all" ON public.prayer_notes;
CREATE POLICY "prayer_notes: admin delete all"
  ON public.prayer_notes
  FOR DELETE
  USING (public.is_admin());

-- 3. Reflections Delete Policy (allows admin to delete for moderation)
DROP POLICY IF EXISTS "reflections: admin delete all" ON public.reflections;
CREATE POLICY "reflections: admin delete all"
  ON public.reflections
  FOR DELETE
  USING (public.is_admin());

-- 4. Testimonies Delete Policy (allows admin to delete for moderation)
DROP POLICY IF EXISTS "testimonies: admin delete all" ON public.testimonies;
CREATE POLICY "testimonies: admin delete all"
  ON public.testimonies
  FOR DELETE
  USING (public.is_admin());

-- 5. Devotion Groups Delete Policy (allows admin to dissolve groups)
DROP POLICY IF EXISTS "devotion_groups: admin delete all" ON public.devotion_groups;
CREATE POLICY "devotion_groups: admin delete all"
  ON public.devotion_groups
  FOR DELETE
  USING (public.is_admin());

-- 6. Push Tokens Select Policy (allows admin to view all tokens for broadcast dashboard)
DROP POLICY IF EXISTS "user_push_tokens: admin select all" ON public.user_push_tokens;
CREATE POLICY "user_push_tokens: admin select all"
  ON public.user_push_tokens
  FOR SELECT
  USING (public.is_admin());

-- 7. Notification Broadcasts Recipients Table
--    Logs every individual user who was sent a broadcast notification.
CREATE TABLE IF NOT EXISTS public.notification_broadcast_recipients (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID        NOT NULL REFERENCES public.notification_broadcasts(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       TEXT        NOT NULL CHECK (status IN ('sent', 'failed', 'stale')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nbr_broadcast_idx ON public.notification_broadcast_recipients (broadcast_id);
CREATE INDEX IF NOT EXISTS nbr_user_idx     ON public.notification_broadcast_recipients (user_id);

ALTER TABLE public.notification_broadcast_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_broadcast_recipients: admin select" ON public.notification_broadcast_recipients;
CREATE POLICY "notification_broadcast_recipients: admin select"
  ON public.notification_broadcast_recipients
  FOR SELECT
  USING (public.is_admin());
