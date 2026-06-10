CREATE TABLE IF NOT EXISTS public.devotion_group_prayer_requests (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id            UUID        NOT NULL REFERENCES public.devotion_groups (id) ON DELETE CASCADE,
  author_id           UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  author_display_name TEXT        NOT NULL,
  content             TEXT        NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 1000),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.devotion_group_prayer_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS devotion_group_prayer_requests_group_created_idx
  ON public.devotion_group_prayer_requests (group_id, created_at DESC);

DROP POLICY IF EXISTS "devotion_group_prayer_requests: select group members"
  ON public.devotion_group_prayer_requests;
DROP POLICY IF EXISTS "devotion_group_prayer_requests: insert group members"
  ON public.devotion_group_prayer_requests;
DROP POLICY IF EXISTS "devotion_group_prayer_requests: update own requests"
  ON public.devotion_group_prayer_requests;
DROP POLICY IF EXISTS "devotion_group_prayer_requests: delete own or leader"
  ON public.devotion_group_prayer_requests;

CREATE POLICY "devotion_group_prayer_requests: select group members"
  ON public.devotion_group_prayer_requests
  FOR SELECT
  USING (public.is_devotion_group_member(group_id));

CREATE POLICY "devotion_group_prayer_requests: insert group members"
  ON public.devotion_group_prayer_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND public.is_devotion_group_member(group_id)
  );

CREATE POLICY "devotion_group_prayer_requests: update own requests"
  ON public.devotion_group_prayer_requests
  FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (
    auth.uid() = author_id
    AND public.is_devotion_group_member(group_id)
  );

CREATE POLICY "devotion_group_prayer_requests: delete own or leader"
  ON public.devotion_group_prayer_requests
  FOR DELETE
  USING (
    auth.uid() = author_id
    OR public.is_devotion_group_leader(group_id)
  );
