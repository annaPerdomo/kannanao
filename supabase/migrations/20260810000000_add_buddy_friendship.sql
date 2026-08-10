-- Buddy friendship: per-buddy hearts earned from meaningful daily practice.
--
-- Until now the equipped buddy was pure cosmetics — user_purchases /
-- user_equipped carry no per-buddy state at all. This table gives each
-- (user, buddy) pair a hearts total plus three once-per-LOCAL-day stamps,
-- one per earning source ('adventure', 'session', 'pet'). The stamps are
-- date columns holding local YYYY-MM-DD values produced client-side by
-- localDateString() (src/lib/chest.ts) — the same convention as the streak
-- and the daily chest. The server runs in UTC and cannot know the user's
-- local day, so award_friendship takes p_today from the client.
--
-- The daily-cap check is deliberately CROSS-ROW: a source pays out at most
-- once per day per USER, not per buddy. If any of the user's rows already
-- carries today's stamp for a source, the award is refused — otherwise
-- switching the equipped buddy mid-day would let each source pay out once
-- per buddy, and friendship would be farmable by cycling the closet.
--
-- RLS is own-rows-only for SELECT / INSERT / UPDATE. There is deliberately
-- NO delete policy: friendship, once earned, is never lost — buddies don't
-- forget you, and nothing in the app ever needs to remove a row.
--
-- award_friendship is SECURITY INVOKER (the default) on purpose: it runs as
-- the calling user, so the RLS policies above keep applying inside the
-- function. Like purchase_item, it is an atomicity boundary, not a security
-- one — p_points and p_today come from the client, so a clock-rolled device
-- can re-earn a day. Accepted: the whole XP economy is already
-- client-trusted, and hearts buy nothing.

CREATE TABLE buddy_friendship (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  buddy_key text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  last_adventure_date date,
  last_session_date date,
  last_pet_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, buddy_key)
);

ALTER TABLE buddy_friendship ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own buddy friendship"
  ON buddy_friendship FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own buddy friendship"
  ON buddy_friendship FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own buddy friendship"
  ON buddy_friendship FOR UPDATE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION award_friendship(
  p_buddy_key text,
  p_source text,
  p_points integer,
  p_today date
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_points integer;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('status', 'not_authenticated');
  END IF;
  IF p_source NOT IN ('adventure', 'session', 'pet') THEN
    RETURN jsonb_build_object('status', 'invalid_source');
  END IF;
  IF p_points < 1 OR p_points > 5 THEN
    RETURN jsonb_build_object('status', 'invalid_points');
  END IF;

  -- Cross-row daily cap: refuse if ANY of this user's buddies already got
  -- paid from this source today (see header — anti-farming rule).
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
  VALUES (v_user, p_buddy_key, p_points,
      CASE WHEN p_source = 'adventure' THEN p_today END,
      CASE WHEN p_source = 'session' THEN p_today END,
      CASE WHEN p_source = 'pet' THEN p_today END)
  ON CONFLICT (user_id, buddy_key) DO UPDATE
     SET points = buddy_friendship.points + p_points,
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

GRANT EXECUTE ON FUNCTION award_friendship(text, text, integer, date) TO authenticated;
