CREATE OR REPLACE FUNCTION public.remove_devotion_group_member(
  target_group_id UUID,
  target_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_role TEXT;
  target_member_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT role INTO requester_role
  FROM public.devotion_group_members
  WHERE group_id = target_group_id
    AND user_id = auth.uid();

  IF requester_role NOT IN ('owner', 'leader') THEN
    RAISE EXCEPTION 'NOT_GROUP_ADMIN';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'CANNOT_MANAGE_SELF';
  END IF;

  SELECT role INTO target_member_role
  FROM public.devotion_group_members
  WHERE group_id = target_group_id
    AND user_id = target_user_id;

  IF target_member_role IS NULL THEN
    RAISE EXCEPTION 'MEMBER_NOT_FOUND';
  END IF;

  IF target_member_role = 'owner' THEN
    RAISE EXCEPTION 'CANNOT_MANAGE_OWNER';
  END IF;

  DELETE FROM public.devotion_group_members
  WHERE group_id = target_group_id
    AND user_id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_devotion_group_member_role(
  target_group_id UUID,
  target_user_id UUID,
  target_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_role TEXT;
  target_member_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF target_role NOT IN ('leader', 'member') THEN
    RAISE EXCEPTION 'INVALID_MEMBER_ROLE';
  END IF;

  SELECT role INTO requester_role
  FROM public.devotion_group_members
  WHERE group_id = target_group_id
    AND user_id = auth.uid();

  IF requester_role NOT IN ('owner', 'leader') THEN
    RAISE EXCEPTION 'NOT_GROUP_ADMIN';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'CANNOT_MANAGE_SELF';
  END IF;

  SELECT role INTO target_member_role
  FROM public.devotion_group_members
  WHERE group_id = target_group_id
    AND user_id = target_user_id;

  IF target_member_role IS NULL THEN
    RAISE EXCEPTION 'MEMBER_NOT_FOUND';
  END IF;

  IF target_member_role = 'owner' THEN
    RAISE EXCEPTION 'CANNOT_MANAGE_OWNER';
  END IF;

  UPDATE public.devotion_group_members
  SET role = target_role
  WHERE group_id = target_group_id
    AND user_id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_devotion_group_member(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_devotion_group_member_role(UUID, UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.remove_devotion_group_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_devotion_group_member_role(UUID, UUID, TEXT) TO authenticated;

DROP POLICY IF EXISTS "devotion_group_members: update leader only"
  ON public.devotion_group_members;
DROP POLICY IF EXISTS "devotion_group_members: delete self or leader"
  ON public.devotion_group_members;

CREATE POLICY "devotion_group_members: update leader only"
  ON public.devotion_group_members
  FOR UPDATE
  USING (public.is_devotion_group_leader(group_id) AND role <> 'owner')
  WITH CHECK (public.is_devotion_group_leader(group_id) AND role <> 'owner');

CREATE POLICY "devotion_group_members: delete self or leader"
  ON public.devotion_group_members
  FOR DELETE
  USING (
    (auth.uid() = user_id AND role <> 'owner')
    OR (public.is_devotion_group_leader(group_id) AND role <> 'owner')
  );
