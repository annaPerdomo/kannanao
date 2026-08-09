-- Review backlog per learner, for the organizer dashboard.
--
-- The SRS (20260711000000) already knows when every card is next due; nothing
-- reads that at group level yet. An organizer wants one number per learner —
-- "how much review is piled up?" — which is the count of card_progress rows
-- whose next_review_at has passed.
--
-- Done in SQL for the same reason as review_reminder_candidates(): the
-- alternative is one count query per member (or pulling every row of the whole
-- roster's card_progress into the route just to count it), and the members list
-- is loaded on every visit to the group dashboard.
--
-- Both counts ride idx_card_progress_user_due (user_id, next_review_at).
-- Learners with nothing due return no row at all rather than a zero row; the
-- caller defaults the missing ids to 0, which keeps the scan proportional to
-- the backlog rather than to the roster.
CREATE OR REPLACE FUNCTION group_review_backlog(p_user_ids uuid[])
RETURNS TABLE (
  user_id          uuid,
  due_count        int,
  overdue_3d_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cp.user_id,
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE cp.next_review_at <= now() - interval '3 days')::int
  FROM card_progress cp
  WHERE cp.user_id = ANY (p_user_ids)
    AND cp.next_review_at <= now()
  GROUP BY cp.user_id;
$$;

-- SECURITY DEFINER means this reads any user's progress given their id, so it
-- must not be callable by a signed-in client. Only the group routes'
-- service-role key may run it, and they pass an id list they have already
-- verified is their own roster.
-- Superseded by 20260809010000 (SECURITY INVOKER); left as production ran it.
REVOKE EXECUTE ON FUNCTION group_review_backlog(uuid[]) FROM public;
REVOKE EXECUTE ON FUNCTION group_review_backlog(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION group_review_backlog(uuid[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION group_review_backlog(uuid[]) TO service_role;
