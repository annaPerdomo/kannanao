-- Same-sitting answers don't grow ease, including repeat misses in a retry loop.
-- An early correct answer keeps the current interval instead of interval×ease;
-- an overdue one gets half credit for the overdue time. src/lib/srs.ts mirrors this.

DROP FUNCTION IF EXISTS srs_next(real, real, boolean);

CREATE OR REPLACE FUNCTION srs_next(
  p_interval real,
  p_ease real,
  p_correct boolean,
  p_last_reviewed timestamptz DEFAULT NULL,
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
      ELSE now() + interval '10 minutes'
    END
  FROM (
    SELECT
      CASE
        WHEN NOT p_correct THEN 0::real
        WHEN p_interval < 1 THEN 1::real
        WHEN e.elapsed IS NOT NULL AND e.elapsed < 0.5 THEN p_interval
        WHEN p_interval < 3 AND (e.elapsed IS NULL OR e.elapsed <= p_interval) THEN 3::real
        WHEN p_interval >= 3 AND e.elapsed IS NOT NULL AND e.elapsed >= 0.5 AND e.elapsed < p_interval
          THEN LEAST(60::real, GREATEST(p_interval, (e.elapsed * p_ease)::real))
        ELSE LEAST(
          60::real,
          GREATEST(
            3::real,
            (
              CASE WHEN e.elapsed IS NULL OR e.elapsed <= p_interval
                   THEN p_interval
                   ELSE p_interval + ((e.elapsed - p_interval) / 2)::real
              END
            ) * p_ease
          )
        )
      END AS ni,
      CASE
        WHEN p_correct AND e.elapsed IS NOT NULL AND e.elapsed < 0.5 THEN p_ease
        WHEN p_correct THEN LEAST(2.8::real, p_ease + 0.05)
        WHEN NOT p_correct AND p_interval <= 1 AND e.elapsed IS NOT NULL AND e.elapsed < 0.5 THEN p_ease
        ELSE GREATEST(1.3::real, p_ease - 0.2)
      END AS ne
    FROM (
      SELECT
        CASE WHEN p_last_reviewed IS NULL THEN NULL
             ELSE EXTRACT(EPOCH FROM (now() - p_last_reviewed)) / 86400.0
        END AS elapsed
    ) e
  ) AS q;
$$;

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
    last_lapse_at    = CASE
                         WHEN NOT p_correct AND card_progress.interval_days >= 7 THEN now()
                         ELSE card_progress.last_lapse_at
                       END,
    interval_days    = (srs_next(card_progress.interval_days, card_progress.ease, p_correct, card_progress.last_reviewed_at)).interval_days,
    ease             = (srs_next(card_progress.interval_days, card_progress.ease, p_correct, card_progress.last_reviewed_at)).ease,
    next_review_at   = (srs_next(card_progress.interval_days, card_progress.ease, p_correct, card_progress.last_reviewed_at)).next_review_at;
$$;

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
    interval_days    = (srs_next(kana_progress.interval_days, kana_progress.ease, p_correct, kana_progress.last_reviewed_at)).interval_days,
    ease             = (srs_next(kana_progress.interval_days, kana_progress.ease, p_correct, kana_progress.last_reviewed_at)).ease,
    next_review_at   = (srs_next(kana_progress.interval_days, kana_progress.ease, p_correct, kana_progress.last_reviewed_at)).next_review_at;
$$;
