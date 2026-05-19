-- ============================================================
-- Memorization Statistics & Goals
-- Run this in your Supabase SQL Editor.
-- ============================================================

-- 1. Memorization Log Table
CREATE TABLE IF NOT EXISTS public.memorization_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  book_id      TEXT        NOT NULL,
  chapter      INT         NOT NULL,
  verses       INT[]       NOT NULL,
  score        INT         NOT NULL,
  total        INT         NOT NULL,
  time_seconds INT         NOT NULL,
  difficulty   TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.memorization_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memorization_log: own rows only"
  ON public.memorization_log
  FOR ALL
  USING (auth.uid() = user_id);

-- 2. Memorization Goals Table
CREATE TABLE IF NOT EXISTS public.memorization_goals (
  user_id         UUID        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  target_per_week INT         NOT NULL DEFAULT 5,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.memorization_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memorization_goals: own row only"
  ON public.memorization_goals
  FOR ALL
  USING (auth.uid() = user_id);

-- Indices for performance
CREATE INDEX IF NOT EXISTS memorization_log_user_date_idx
  ON public.memorization_log (user_id, created_at DESC);
