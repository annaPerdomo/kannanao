-- Drop group_review_backlog from SECURITY DEFINER to SECURITY INVOKER, as
-- group_item_analysis (20260712000000) already does.
--
-- Only the service-role client calls it, and service_role is RLS-exempt, so
-- INVOKER returns the same rows without leaving a "any user's due counts by
-- uuid" primitive standing behind nothing but the REVOKEs below.
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
  WHERE cp.user_id = ANY (p_user_ids)
    AND cp.next_review_at <= now()
  GROUP BY cp.user_id;
$$;

-- CREATE OR REPLACE preserves the existing ACL; restated so the grants read off
-- this file rather than the last one.
REVOKE EXECUTE ON FUNCTION group_review_backlog(uuid[]) FROM public;
REVOKE EXECUTE ON FUNCTION group_review_backlog(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION group_review_backlog(uuid[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION group_review_backlog(uuid[]) TO service_role;
