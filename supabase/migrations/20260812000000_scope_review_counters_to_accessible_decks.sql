-- Scope the server-side due counters to decks the learner can access.
--
-- The client fix (getAccessibleDeckIds in src/lib/supabase.ts) made games and
-- due counts ignore card_progress rows on decks the user can't study — own
-- decks plus assignments that have started. These two functions still counted
-- raw card_progress rows, so a member with stray rows on foreign decks (from
-- the pre-fix leak, or a since-revoked assignment) saw "0 due" in the app while
-- the organizer dashboard showed a permanent backlog and the daily cron pushed
-- "N reviews waiting" forever. Same access model on both sides ends that.
--
-- The accessibility predicate mirrors getAccessibleDeckIds exactly:
--   * the learner owns the deck, or
--   * an assignment for it names the learner and has started.
-- "Has started" compares available_on against today in America/Los_Angeles —
-- a matched pair with DEFAULT_TIME_ZONE in src/i18n/config.ts, for the same
-- reason availabilityToday() pins it there: server and client must agree on
-- which calendar day it is, or counts flip at midnight in the wrong timezone.

CREATE OR REPLACE FUNCTION group_review_backlog(p_user_ids uuid[])
RETURNS TABLE (
  user_id          uuid,
  due_count        int,
  overdue_3d_count int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    cp.user_id,
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE cp.next_review_at <= now() - interval '3 days')::int
  FROM card_progress cp
  JOIN cards c ON c.id = cp.card_id
  WHERE cp.user_id = ANY (p_user_ids)
    AND cp.next_review_at <= now()
    AND (
      EXISTS (
        SELECT 1 FROM decks d
        WHERE d.id = c.deck_id AND d.user_id = cp.user_id
      )
      OR EXISTS (
        SELECT 1 FROM assignments a
        WHERE a.deck_id = c.deck_id
          AND a.member_id = cp.user_id
          AND (a.available_on IS NULL
               OR a.available_on <= (now() AT TIME ZONE 'America/Los_Angeles')::date)
      )
    )
  GROUP BY cp.user_id;
$$;

-- CREATE OR REPLACE preserves the existing ACL; restated so the grants read off
-- this file rather than the last one.
REVOKE EXECUTE ON FUNCTION group_review_backlog(uuid[]) FROM public;
REVOKE EXECUTE ON FUNCTION group_review_backlog(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION group_review_backlog(uuid[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION group_review_backlog(uuid[]) TO service_role;

-- Same predicate inside the reminder cron's due count. Stays SECURITY DEFINER
-- as shipped (20260713000000); only the service-role key may execute it either
-- way, per the grants below.
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
    JOIN cards c ON c.id = cp.card_id
    WHERE cp.user_id = p.id
      AND cp.next_review_at <= now()
      AND (
        EXISTS (
          SELECT 1 FROM decks dk
          WHERE dk.id = c.deck_id AND dk.user_id = p.id
        )
        OR EXISTS (
          SELECT 1 FROM assignments a
          WHERE a.deck_id = c.deck_id
            AND a.member_id = p.id
            AND (a.available_on IS NULL
                 OR a.available_on <= (now() AT TIME ZONE 'America/Los_Angeles')::date)
        )
      )
  ) d ON TRUE
  WHERE EXISTS (SELECT 1 FROM push_subscriptions s WHERE s.user_id = p.id);
$$;

REVOKE EXECUTE ON FUNCTION review_reminder_candidates() FROM public;
REVOKE EXECUTE ON FUNCTION review_reminder_candidates() FROM anon;
REVOKE EXECUTE ON FUNCTION review_reminder_candidates() FROM authenticated;
GRANT EXECUTE ON FUNCTION review_reminder_candidates() TO service_role;
