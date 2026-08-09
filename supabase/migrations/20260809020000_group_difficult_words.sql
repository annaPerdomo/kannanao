-- Group-wide "difficult words", plus the lapse timestamp that powers it.
--
-- Replaces group_item_analysis (20260712000000), which could only scan one deck
-- and only saw raw correct/wrong counts. Accuracy alone can't spot a word that
-- WAS learned and then slipped: right ten times and wrong once still reads as
-- 91%. The SRS knows — it resets interval_days to 0 on a wrong answer — but
-- nothing recorded that the reset happened.

-- ─── Part 1: lapse timestamp ─────────────────────────────────────────────────

-- A timestamp rather than a counter: a lifetime counter only grows, so within a
-- semester every word anyone ever missed once would outrank the deck introduced
-- this week, and the tab would silt up into history.
ALTER TABLE card_progress
  ADD COLUMN IF NOT EXISTS last_lapse_at timestamptz;

-- No backfill is possible: only the current interval survives in the row, not
-- the history of resets. Null for everyone on deploy day, so the "being
-- forgotten" signal warms up over the following weeks rather than arriving full.
COMMENT ON COLUMN card_progress.last_lapse_at IS
  'When a card the learner had held for a week or more was last reset by a wrong answer. Not backfillable — null for every pre-existing row.';

-- Same atomic statement 20260711000000 last touched; only the new column is
-- added, the curve is untouched. The DO UPDATE path reads
-- card_progress.interval_days — the value BEFORE this answer — so "was this card
-- mature?" is asked of the interval the learner had actually held, not the 0 it
-- is about to be reset to.
--
-- The 7-day floor is what separates a lapse from ordinary early practice: a
-- card still bouncing around the 0→1→3 day steps is being learned, not
-- forgotten. Mirrored in src/lib/srs.ts as LAPSE_INTERVAL_DAYS.
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
    interval_days    = (srs_next(card_progress.interval_days, card_progress.ease, p_correct)).interval_days,
    ease             = (srs_next(card_progress.interval_days, card_progress.ease, p_correct)).ease,
    next_review_at   = (srs_next(card_progress.interval_days, card_progress.ease, p_correct)).next_review_at;
$$;

-- ─── Part 2: the group query ─────────────────────────────────────────────────

-- The primary key is (user_id, card_id), so it can't serve a join that arrives
-- from the card side. Every difficult-words scan does exactly that.
CREATE INDEX IF NOT EXISTS idx_card_progress_card ON card_progress (card_id);

-- Called only through the service-role client from an organizer-authenticated
-- route (GET /api/group/difficult-words), which has already verified that the
-- group is the caller's and that every deck id belongs to them. Taking the
-- learner ids as an argument — rather than deriving them from an organizer id
-- as group_item_analysis does — matches group_review_backlog and is what makes
-- the result group-scoped: profiles.organizer_id is only a pointer to a
-- learner's primary group, so it cannot narrow this to one group's roster.
--
-- SECURITY INVOKER: service_role is RLS-exempt, so it returns the same rows
-- without leaving an "aggregate any users' progress by uuid" primitive standing
-- behind nothing but the REVOKEs below.
--
-- The three counts are the three reasons a word lands on the list, one column
-- each so the route can label the row without re-deriving anything:
--   lapse_learner_count → "being forgotten"  (held a week, then missed, lately)
--   low_ease_count      → "keeps getting missed"  (chronic, ease bottoming out)
--   struggling_count    → "new & shaky"  (personal accuracy under 60%)
CREATE OR REPLACE FUNCTION group_difficult_words(p_user_ids uuid[], p_deck_ids uuid[])
RETURNS TABLE (
  card_id             uuid,
  deck_id             uuid,
  word                text,
  reading             text,
  meaning             text,
  attempt_count       bigint,
  learner_count       bigint,
  struggling_count    bigint,
  low_ease_count      bigint,
  lapse_learner_count bigint,
  avg_ease            real,
  class_accuracy      int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH agg AS (
    SELECT
      c.id      AS card_id,
      c.deck_id AS deck_id,
      c.word    AS word,
      c.reading AS reading,
      c.meaning AS meaning,
      SUM(cp.correct_count + cp.wrong_count)::bigint AS attempt_count,
      -- Inner join, so this is "learners who have answered this card", not the
      -- whole roster — the denominator the UI shows next to the affected count.
      COUNT(*)::bigint AS learner_count,
      COUNT(*) FILTER (
        WHERE (cp.correct_count + cp.wrong_count) > 0
          AND cp.correct_count::real / (cp.correct_count + cp.wrong_count) < 0.6
      )::bigint AS struggling_count,
      COUNT(*) FILTER (WHERE cp.ease <= 1.6)::bigint AS low_ease_count,
      -- Windowed: a lapse the learner has since worked back through is history,
      -- not something to reteach this week.
      COUNT(*) FILTER (
        WHERE cp.last_lapse_at > now() - interval '30 days'
      )::bigint AS lapse_learner_count,
      AVG(cp.ease)::real AS avg_ease,
      CASE
        WHEN SUM(cp.correct_count + cp.wrong_count) > 0
          THEN ROUND(100.0 * SUM(cp.correct_count) / SUM(cp.correct_count + cp.wrong_count))::int
        ELSE 0
      END AS class_accuracy
    FROM cards c
    JOIN card_progress cp
      ON cp.card_id = c.id
     AND cp.user_id = ANY (p_user_ids)
    WHERE c.deck_id = ANY (p_deck_ids)
    GROUP BY c.id, c.deck_id, c.word, c.reading, c.meaning
  )
  SELECT
    a.card_id, a.deck_id, a.word, a.reading, a.meaning,
    a.attempt_count, a.learner_count, a.struggling_count, a.low_ease_count,
    a.lapse_learner_count, a.avg_ease, a.class_accuracy
  FROM agg a
  -- One of the three reasons must hold, or the word isn't difficult. Mirrored
  -- in deriveReason() (src/lib/difficultWords.ts), which labels the rows.
  WHERE a.lapse_learner_count > 0
     OR (a.avg_ease <= 1.6 AND a.attempt_count >= 4)
     OR a.struggling_count > 0
  ORDER BY
    a.lapse_learner_count DESC,
    a.avg_ease ASC,
    (a.struggling_count::real / a.learner_count) DESC,
    a.word ASC
  -- A teacher acts on a handful of words; the rest is transfer cost.
  LIMIT 50;
$$;

REVOKE EXECUTE ON FUNCTION group_difficult_words(uuid[], uuid[]) FROM public;
REVOKE EXECUTE ON FUNCTION group_difficult_words(uuid[], uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION group_difficult_words(uuid[], uuid[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION group_difficult_words(uuid[], uuid[]) TO service_role;

-- Its caller is gone, and unlike the above it never had its default PUBLIC
-- execute grant revoked — leaving it leaves an unused, ungated surface.
DROP FUNCTION IF EXISTS group_item_analysis(uuid, uuid);
