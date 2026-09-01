-- Kana is built-in content, not a deck, so a kana review has no card row to key
-- on and cannot go through card_progress. Mirrors that table, keyed by the
-- character, and reuses srs_next() so both schedules stay one curve.

CREATE TABLE kana_progress (
  user_id          uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  -- Combination sounds ('きゃ') are two codepoints. The check fences the RPC's
  -- otherwise unvalidated `p_kana` argument.
  kana             text        NOT NULL CHECK (char_length(kana) BETWEEN 1 AND 2),
  correct_count    integer     NOT NULL DEFAULT 0,
  wrong_count      integer     NOT NULL DEFAULT 0,
  last_reviewed_at timestamptz,
  next_review_at   timestamptz NOT NULL DEFAULT now(),
  interval_days    real        NOT NULL DEFAULT 0,
  ease             real        NOT NULL DEFAULT 2.5,
  PRIMARY KEY (user_id, kana)
);

CREATE INDEX idx_kana_progress_user_due ON kana_progress (user_id, next_review_at);

ALTER TABLE kana_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own kana progress"
  ON kana_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own kana progress"
  ON kana_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own kana progress"
  ON kana_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- SECURITY INVOKER keeps RLS in force and user_id comes from auth.uid(), so a
-- client can never write another user's row. Keep in step with
-- increment_card_progress, which this is modeled on.
CREATE OR REPLACE FUNCTION increment_kana_progress(p_kana text, p_correct boolean)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
AS $$
  INSERT INTO kana_progress (
    user_id, kana, correct_count, wrong_count, last_reviewed_at,
    interval_days, ease, next_review_at
  )
  VALUES (
    auth.uid(),
    p_kana,
    CASE WHEN p_correct THEN 1 ELSE 0 END,
    CASE WHEN p_correct THEN 0 ELSE 1 END,
    now(),
    (srs_next(0, 2.5, p_correct)).interval_days,
    (srs_next(0, 2.5, p_correct)).ease,
    (srs_next(0, 2.5, p_correct)).next_review_at
  )
  ON CONFLICT (user_id, kana) DO UPDATE SET
    correct_count    = kana_progress.correct_count + CASE WHEN p_correct THEN 1 ELSE 0 END,
    wrong_count      = kana_progress.wrong_count + CASE WHEN p_correct THEN 0 ELSE 1 END,
    last_reviewed_at = now(),
    interval_days    = (srs_next(kana_progress.interval_days, kana_progress.ease, p_correct)).interval_days,
    ease             = (srs_next(kana_progress.interval_days, kana_progress.ease, p_correct)).ease,
    next_review_at   = (srs_next(kana_progress.interval_days, kana_progress.ease, p_correct)).next_review_at;
$$;
