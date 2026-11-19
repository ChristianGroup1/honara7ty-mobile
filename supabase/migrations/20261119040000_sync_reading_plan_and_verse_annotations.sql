-- Personal reading plan lives on profiles so it follows the user across devices.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_reading_plan JSONB;

-- Bible reader highlights / favorites / notes
CREATE TABLE IF NOT EXISTS public.verse_annotations (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  verse_key TEXT NOT NULL,
  highlight TEXT,
  favorite BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, verse_key)
);

ALTER TABLE public.verse_annotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verse_annotations: read own rows or admin read all" ON public.verse_annotations;
DROP POLICY IF EXISTS "verse_annotations: insert own rows only" ON public.verse_annotations;
DROP POLICY IF EXISTS "verse_annotations: update own rows only" ON public.verse_annotations;
DROP POLICY IF EXISTS "verse_annotations: delete own rows only" ON public.verse_annotations;

CREATE POLICY "verse_annotations: read own rows or admin read all"
  ON public.verse_annotations
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "verse_annotations: insert own rows only"
  ON public.verse_annotations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "verse_annotations: update own rows only"
  ON public.verse_annotations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "verse_annotations: delete own rows only"
  ON public.verse_annotations
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS verse_annotations_user_updated_idx
  ON public.verse_annotations (user_id, updated_at DESC);
