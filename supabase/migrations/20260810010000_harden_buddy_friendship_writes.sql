-- Make award_friendship the only way a hearts total can change.
--
-- 20260810000000 shipped open INSERT/UPDATE policies, and Supabase grants
-- `authenticated` full table DML by default, so a signed-in client could
-- PATCH /rest/v1/buddy_friendship with any `points` it liked and never call
-- the function at all — the daily cap and the p_points range check were
-- decorative. Hearts buy nothing yet, but the buddy-story unlocks read this
-- total, so the cap has to actually hold before that lands.
--
-- p_today still comes from the client: the server runs in UTC and cannot know
-- the user's local day. A clock-rolled device can therefore still re-earn a
-- day. That is the accepted, documented limit; an arbitrary total is not.

DROP POLICY IF EXISTS "Users can insert their own buddy friendship" ON buddy_friendship;
DROP POLICY IF EXISTS "Users can update their own buddy friendship" ON buddy_friendship;

REVOKE INSERT, UPDATE, DELETE ON buddy_friendship FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON buddy_friendship FROM anon;

-- SECURITY DEFINER so the writes above stay revoked while the function can
-- still make them. It is now a security boundary, so every read and write is
-- keyed to auth.uid() and p_points is ignored in favour of the
-- server-side table (mirrors FRIENDSHIP_POINTS in src/lib/friendship.ts). The
-- parameter stays in the signature so already-deployed clients keep working.
CREATE OR REPLACE FUNCTION award_friendship(
  p_buddy_key text,
  p_source text,
  p_points integer,
  p_today date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_award integer;
  v_points integer;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('status', 'not_authenticated');
  END IF;
  v_award := CASE p_source
               WHEN 'adventure' THEN 3
               WHEN 'session' THEN 1
               WHEN 'pet' THEN 1
             END;
  IF v_award IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid_source');
  END IF;
  -- A NULL p_today would make the cap check below never match (NULL = NULL
  -- is not true), turning the source infinitely re-earnable.
  IF p_today IS NULL OR p_buddy_key IS NULL OR p_buddy_key = '' THEN
    RETURN jsonb_build_object('status', 'invalid_args');
  END IF;

  -- Serialize per (user, source): the cap check is check-then-write, so two
  -- in-flight calls (double-tap, two tabs) would both pass and pay twice.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_user::text || ':' || p_source, 0));

  -- Cross-row daily cap: refuse if ANY of the user's buddies already got paid
  -- from this source today, so switching buddies mid-day can't double-pay.
  IF EXISTS (
    SELECT 1
      FROM buddy_friendship
     WHERE user_id = v_user
       AND CASE p_source
             WHEN 'adventure' THEN last_adventure_date
             WHEN 'session' THEN last_session_date
             ELSE last_pet_date
           END = p_today
  ) THEN
    RETURN jsonb_build_object('status', 'capped');
  END IF;

  INSERT INTO buddy_friendship (user_id, buddy_key, points,
      last_adventure_date, last_session_date, last_pet_date)
  VALUES (v_user, p_buddy_key, v_award,
      CASE WHEN p_source = 'adventure' THEN p_today END,
      CASE WHEN p_source = 'session' THEN p_today END,
      CASE WHEN p_source = 'pet' THEN p_today END)
  ON CONFLICT (user_id, buddy_key) DO UPDATE
     SET points = buddy_friendship.points + v_award,
         last_adventure_date = CASE WHEN p_source = 'adventure'
             THEN p_today ELSE buddy_friendship.last_adventure_date END,
         last_session_date = CASE WHEN p_source = 'session'
             THEN p_today ELSE buddy_friendship.last_session_date END,
         last_pet_date = CASE WHEN p_source = 'pet'
             THEN p_today ELSE buddy_friendship.last_pet_date END,
         updated_at = now()
  RETURNING points INTO v_points;

  RETURN jsonb_build_object('status', 'ok', 'points', v_points);
END;
$$;

REVOKE ALL ON FUNCTION award_friendship(text, text, integer, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION award_friendship(text, text, integer, date) TO authenticated;
