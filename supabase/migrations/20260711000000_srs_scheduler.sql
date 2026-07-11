-- SM-2-lite spaced-repetition scheduler.
--
-- Migration 20260710000000 added card_progress with SRS columns (next_review_at,
-- interval_days, ease) but nothing scheduled reviews — increment_card_progress
-- only bumped the counters. This migration teaches that SAME atomic statement to
-- also advance the schedule from the row's CURRENT interval_days/ease.
--
-- Why in SQL, not the client: the client fires increment_card_progress without
-- ever reading the row, so it can't compute the next interval. Doing the math
-- here — inside the INSERT … ON CONFLICT, against the row the conflict locks —
-- keeps rapid successive answers race-free and makes flip + match + recall +
-- fill all schedule reviews with zero component changes.
--
-- The curve mirrors src/lib/srs.ts (the readable, unit-tested reference). Keep
-- the two in sync; the constants (0→1→3, ease ±, floors/caps) live in exactly
-- one place here — `srs_next`.

-- Pure curve helper: given the current (interval, ease) and whether the answer
-- was correct, return the next (interval_days, ease, next_review_at). STABLE
-- because it reads now(); the OUT-parameter form returns one composite row so
-- callers can pick columns with `(srs_next(...)).col`.
CREATE OR REPLACE FUNCTION srs_next(
  p_interval real,
  p_ease real,
  p_correct boolean,
  OUT interval_days real,
  OUT ease real,
  OUT next_review_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    q.ni,
    q.ne,
    CASE
      WHEN p_correct THEN now() + (q.ni * interval '1 day')
      -- Wrong → re-shown in ~10 minutes (same session).
      ELSE now() + interval '10 minutes'
    END
  FROM (
    SELECT
      CASE
        WHEN NOT p_correct THEN 0::real                       -- wrong resets to 0
        WHEN p_interval < 1 THEN 1::real                      -- 0 → 1 day
        WHEN p_interval < 3 THEN 3::real                      -- 1 → 3 days
        ELSE LEAST(60::real, (p_interval * p_ease)::real)     -- then × ease, capped at 60
      END AS ni,
      CASE
        WHEN p_correct THEN LEAST(2.8::real, p_ease + 0.05)   -- +0.05, capped at 2.8
        ELSE GREATEST(1.3::real, p_ease - 0.2)                -- −0.2, floored at 1.3
      END AS ne
  ) AS q;
$$;

-- Atomic upsert-increment, now also advancing the schedule. On a first answer
-- (no row yet) the INSERT path schedules from the defaults (interval 0, ease
-- 2.5); on every later answer the DO UPDATE path schedules from the locked
-- row's current interval_days/ease. user_id comes from auth.uid() and
-- SECURITY INVOKER keeps RLS in force, so a client can never touch another
-- user's row.
CREATE OR REPLACE FUNCTION increment_card_progress(p_card_id uuid, p_correct boolean)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
AS $$
  INSERT INTO card_progress (
    user_id, card_id, correct_count, wrong_count, last_reviewed_at,
    interval_days, ease, next_review_at
  )
  VALUES (
    auth.uid(),
    p_card_id,
    CASE WHEN p_correct THEN 1 ELSE 0 END,
    CASE WHEN p_correct THEN 0 ELSE 1 END,
    now(),
    (srs_next(0, 2.5, p_correct)).interval_days,
    (srs_next(0, 2.5, p_correct)).ease,
    (srs_next(0, 2.5, p_correct)).next_review_at
  )
  ON CONFLICT (user_id, card_id) DO UPDATE SET
    correct_count    = card_progress.correct_count + CASE WHEN p_correct THEN 1 ELSE 0 END,
    wrong_count      = card_progress.wrong_count + CASE WHEN p_correct THEN 0 ELSE 1 END,
    last_reviewed_at = now(),
    interval_days    = (srs_next(card_progress.interval_days, card_progress.ease, p_correct)).interval_days,
    ease             = (srs_next(card_progress.interval_days, card_progress.ease, p_correct)).ease,
    next_review_at   = (srs_next(card_progress.interval_days, card_progress.ease, p_correct)).next_review_at;
$$;
