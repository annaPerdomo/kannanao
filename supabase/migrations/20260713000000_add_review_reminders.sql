-- Daily review-due push reminders.
--
-- Push already works (push_subscriptions + web-push) but only ever fires when a
-- human sends something — a direct message or an encouragement. Nothing pulls a
-- student back on their own. The SRS (20260711000000) now knows exactly which
-- cards are due, so a once-a-day cron can nudge the students who have work
-- waiting, and only them.
--
-- This migration adds the two pieces of state that job needs, plus the one query
-- that makes it cheap.

-- The settings switch. Default ON, deliberately: a user with no push
-- subscription never receives a reminder anyway, so "default true" means "on for
-- anyone who has granted notifications" without a backfill, and without a second
-- column tracking whether the user has ever seen the toggle.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS review_reminders boolean NOT NULL DEFAULT true;

-- The exactly-once-per-day guard. Vercel Hobby fires a daily cron only "within
-- the hour" and may retry a failed invocation; the endpoint can also be hit by
-- hand with the secret. Without this column any of those would double-notify.
--
-- CONVENTION WARNING: unlike user_progress.last_study_date and last_chest_date —
-- which the CLIENT writes as a local-calendar YYYY-MM-DD — this column is written
-- by the SERVER in the app's reminder timezone (REMINDER_TIMEZONE in
-- src/lib/reviewReminder.ts). It is only ever compared against a date computed in
-- that same timezone, never against last_study_date.
ALTER TABLE user_progress
  ADD COLUMN IF NOT EXISTS last_reminder_date date;

-- Everything the reminder job needs in order to decide, for every user who could
-- possibly receive a reminder (i.e. has at least one registered device), in a
-- single round trip.
--
-- Done in SQL because the alternative is two queries per user — a due count and a
-- progress row — which for a class of 30 is 60 round trips inside one function
-- invocation, on a free tier that bills active CPU.
--
-- Users with the toggle OFF are deliberately still returned rather than filtered
-- here: the job counts them in its skip summary, and every eligibility rule then
-- lives in one unit-tested place (selectReminders) instead of being split across
-- SQL and TypeScript.
--
-- EXISTS rather than a join on push_subscriptions: a user with three devices is
-- still one candidate, and must not be counted — or notified — three times.
-- The due-count subquery rides idx_card_progress_user_due (user_id, next_review_at).
CREATE OR REPLACE FUNCTION review_reminder_candidates()
RETURNS TABLE (
  user_id            uuid,
  due_count          bigint,
  reminders_enabled  boolean,
  last_study_date    date,
  last_reminder_date date,
  streak_days        integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    COALESCE(d.due_count, 0),
    p.review_reminders,
    up.last_study_date,
    up.last_reminder_date,
    COALESCE(up.streak_days, 0)
  FROM profiles p
  LEFT JOIN user_progress up ON up.user_id = p.id
  LEFT JOIN LATERAL (
    SELECT count(*) AS due_count
    FROM card_progress cp
    WHERE cp.user_id = p.id
      AND cp.next_review_at <= now()
  ) d ON TRUE
  WHERE EXISTS (SELECT 1 FROM push_subscriptions s WHERE s.user_id = p.id);
$$;

-- SECURITY DEFINER means this reads every user's progress, so it must not be
-- callable by a signed-in client. Only the cron job's service-role key may run it.
REVOKE EXECUTE ON FUNCTION review_reminder_candidates() FROM public;
REVOKE EXECUTE ON FUNCTION review_reminder_candidates() FROM anon;
REVOKE EXECUTE ON FUNCTION review_reminder_candidates() FROM authenticated;
GRANT EXECUTE ON FUNCTION review_reminder_candidates() TO service_role;
