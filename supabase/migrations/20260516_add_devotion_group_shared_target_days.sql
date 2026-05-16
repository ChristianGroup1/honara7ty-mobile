-- Add an optional target duration for shared devotion group readings.

ALTER TABLE public.devotion_groups
  ADD COLUMN IF NOT EXISTS shared_reading_book TEXT;

ALTER TABLE public.devotion_groups
  ADD COLUMN IF NOT EXISTS shared_selected_chapters INT[];

ALTER TABLE public.devotion_groups
  ADD COLUMN IF NOT EXISTS shared_target_days INT;

DROP FUNCTION IF EXISTS public.set_devotion_group_shared_reading(UUID, TEXT, INT[]);

CREATE OR REPLACE FUNCTION public.set_devotion_group_shared_reading(
  target_group_id UUID,
  reading_book_input TEXT DEFAULT NULL,
  selected_chapters_input INT[] DEFAULT NULL,
  target_days_input INT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF NOT public.is_devotion_group_leader(target_group_id) THEN
    RAISE EXCEPTION 'NOT_GROUP_LEADER';
  END IF;

  UPDATE public.devotion_groups
  SET
    shared_reading_book = NULLIF(trim(reading_book_input), ''),
    shared_selected_chapters = selected_chapters_input,
    shared_target_days = target_days_input
  WHERE id = target_group_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_devotion_group_shared_reading(UUID, TEXT, INT[], INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_devotion_group_shared_reading(UUID, TEXT, INT[], INT) TO authenticated;
