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
