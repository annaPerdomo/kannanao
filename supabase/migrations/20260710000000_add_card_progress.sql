-- Per-card progress tracking.
--
-- Foundation for spaced repetition, cumulative review, and teacher analytics.
-- Aggregates (user_progress / study_sessions) can't answer "which words does
-- this student know?" — this table records every graded answer per (user, card).
-- History can't be backfilled, so this ships before the semester starts.

CREATE TABLE card_progress (
  user_id          uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  card_id          uuid        NOT NULL REFERENCES cards (id)      ON DELETE CASCADE,
  correct_count    integer     NOT NULL DEFAULT 0,
  wrong_count      integer     NOT NULL DEFAULT 0,
  last_reviewed_at timestamptz,
  -- SRS fields consumed by a later work item; defaults only for now.
  next_review_at   timestamptz NOT NULL DEFAULT now(),
  interval_days    real        NOT NULL DEFAULT 0,
  ease             real        NOT NULL DEFAULT 2.5,
  PRIMARY KEY (user_id, card_id)
);

-- Covers the "what's due for this user?" query the SRS work item will run.
CREATE INDEX idx_card_progress_user_due ON card_progress (user_id, next_review_at);

-- RLS: a user reads and writes only their own rows. Organizer reads happen
-- later through the service-role client (which bypasses RLS).
ALTER TABLE card_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own card progress"
  ON card_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own card progress"
  ON card_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own card progress"
  ON card_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Atomic upsert-increment for a single graded answer. A plain client-side
-- .upsert() can't increment a counter without a read-modify-write race, so the
-- increment happens in one statement here. SECURITY INVOKER keeps RLS in force;
-- user_id comes from auth.uid() so a client can never write another user's row.
CREATE OR REPLACE FUNCTION increment_card_progress(p_card_id uuid, p_correct boolean)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
AS $$
  INSERT INTO card_progress (user_id, card_id, correct_count, wrong_count, last_reviewed_at)
  VALUES (
    auth.uid(),
    p_card_id,
    CASE WHEN p_correct THEN 1 ELSE 0 END,
    CASE WHEN p_correct THEN 0 ELSE 1 END,
    now()
  )
  ON CONFLICT (user_id, card_id) DO UPDATE SET
    correct_count    = card_progress.correct_count + CASE WHEN p_correct THEN 1 ELSE 0 END,
    wrong_count      = card_progress.wrong_count + CASE WHEN p_correct THEN 0 ELSE 1 END,
    last_reviewed_at = now();
$$;
