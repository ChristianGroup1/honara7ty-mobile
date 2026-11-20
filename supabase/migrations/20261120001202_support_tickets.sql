-- Support tickets opened from the app, plus login-screen problem reports.

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        REFERENCES auth.users (id) ON DELETE CASCADE,
  contact_email TEXT,
  subject       TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'open',
  source        TEXT        NOT NULL DEFAULT 'app',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT support_tickets_owner_check CHECK (
    user_id IS NOT NULL OR contact_email IS NOT NULL
  ),
  CONSTRAINT support_tickets_status_check CHECK (
    status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')
  ),
  CONSTRAINT support_tickets_source_check CHECK (source IN ('app', 'login')),
  CONSTRAINT support_tickets_subject_check CHECK (
    char_length(btrim(subject)) BETWEEN 3 AND 120
  ),
  CONSTRAINT support_tickets_email_check CHECK (
    contact_email IS NULL OR char_length(contact_email) BETWEEN 5 AND 200
  )
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  UUID        NOT NULL REFERENCES public.support_tickets (id) ON DELETE CASCADE,
  author_id  UUID        REFERENCES auth.users (id) ON DELETE SET NULL,
  body       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT support_messages_body_check CHECK (
    char_length(btrim(body)) BETWEEN 1 AND 2000
  )
);

CREATE INDEX IF NOT EXISTS support_tickets_user_updated_idx
  ON public.support_tickets (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS support_tickets_status_updated_idx
  ON public.support_tickets (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS support_messages_ticket_created_idx
  ON public.support_messages (ticket_id, created_at);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_tickets: read own or admin"
  ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets: insert own open ticket"
  ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets: admin updates status"
  ON public.support_tickets;

CREATE POLICY "support_tickets: read own or admin"
  ON public.support_tickets
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "support_tickets: insert own open ticket"
  ON public.support_tickets
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'open'
    AND source = 'app'
    AND char_length(btrim(subject)) BETWEEN 3 AND 120
  );

CREATE POLICY "support_tickets: admin updates status"
  ON public.support_tickets
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "support_messages: read own ticket or admin"
  ON public.support_messages;
DROP POLICY IF EXISTS "support_messages: write on open ticket or admin"
  ON public.support_messages;

CREATE POLICY "support_messages: read own ticket or admin"
  ON public.support_messages
  FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.support_tickets
      WHERE support_tickets.id = support_messages.ticket_id
        AND support_tickets.user_id = auth.uid()
    )
  );

CREATE POLICY "support_messages: write on open ticket or admin"
  ON public.support_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND char_length(btrim(body)) BETWEEN 1 AND 2000
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.support_tickets
        WHERE support_tickets.id = support_messages.ticket_id
          AND support_tickets.user_id = auth.uid()
          AND support_tickets.status <> 'closed'
      )
    )
  );

REVOKE ALL ON TABLE public.support_tickets FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.support_messages FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.support_tickets TO authenticated;
GRANT SELECT, INSERT ON TABLE public.support_messages TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_support_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_tickets
  SET updated_at = now(),
      status = CASE
        WHEN status = 'closed' THEN status
        WHEN status IN ('waiting', 'resolved') AND NEW.author_id = user_id THEN 'open'
        ELSE status
      END
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_messages_touch_ticket ON public.support_messages;
CREATE TRIGGER support_messages_touch_ticket
  AFTER INSERT ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_support_ticket();

REVOKE ALL ON FUNCTION public.touch_support_ticket() FROM PUBLIC, anon, authenticated;

-- Login-screen reports have no session, so the insert runs inside the function.
-- p_id lets a queued offline report retry without creating a second ticket.
DROP FUNCTION IF EXISTS public.submit_login_report(text, text);
DROP FUNCTION IF EXISTS public.submit_login_report(text, text, uuid);

CREATE OR REPLACE FUNCTION public.submit_login_report(
  p_email text,
  p_message text,
  p_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_message text := btrim(coalesce(p_message, ''));
  v_id uuid := COALESCE(p_id, gen_random_uuid());
BEGIN
  IF v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     OR char_length(v_email) > 200 THEN
    RAISE EXCEPTION 'invalid email';
  END IF;
  IF char_length(v_message) < 8 OR char_length(v_message) > 2000 THEN
    RAISE EXCEPTION 'invalid message';
  END IF;

  INSERT INTO public.support_tickets (
    id, user_id, contact_email, subject, status, source
  ) VALUES (
    v_id, auth.uid(), v_email, 'مشكلة في تسجيل الدخول', 'open', 'login'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.support_messages (id, ticket_id, author_id, body)
  VALUES (v_id, v_id, auth.uid(), v_message)
  ON CONFLICT (id) DO NOTHING;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_login_report(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_login_report(text, text, uuid) TO anon, authenticated;

-- After the person signs in, attach earlier login reports sent from the same email.
CREATE OR REPLACE FUNCTION public.claim_support_tickets()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_count integer;
BEGIN
  IF auth.uid() IS NULL OR v_email = '' THEN
    RETURN 0;
  END IF;

  UPDATE public.support_tickets
  SET user_id = auth.uid(),
      updated_at = now()
  WHERE user_id IS NULL
    AND lower(contact_email) = v_email;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_support_tickets() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_support_tickets() TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'support_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'support_tickets'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
    END IF;
  END IF;
END $$;
