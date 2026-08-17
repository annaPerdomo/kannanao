-- Per-user buddy state: the day's greeting claim and the rolling word window.
--
-- Both of these shipped in localStorage first, which was wrong twice over: the
-- greeting stamp was device-global, so on a shared device the second account to
-- sign in that day got no greeting at all, and the word window silently reset
-- whenever the learner opened the app on another device.
--
-- One row per user, not per buddy: switching the equipped buddy must not
-- re-greet the day or forget the words. Hearts stay in buddy_friendship, which
-- is per (user, buddy) because a total belongs to a buddy.
--
-- Like buddy_friendship, direct DML is revoked and the two RPCs below are the
-- only writers. Neither is an economy boundary — a greeting and a word list buy
-- nothing — but both need to be atomic: the greeting claim is a check-then-set
-- that two tabs would both win, and the word merge is a read-modify-write that
-- would lose entries to last-writer-wins.
--
-- Local dates come from the client (localDateString, src/lib/chest.ts): the
-- server runs in UTC and cannot know the reader's local day.

CREATE TABLE buddy_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  last_greeted_date date,
  recent_words jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE buddy_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own buddy state"
  ON buddy_state FOR SELECT
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON buddy_state FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON buddy_state FROM anon;

-- Claims today's greeting for the calling user, returning true only to the
-- caller that actually took it. The DO UPDATE ... WHERE is what makes it a
-- claim: a conflicting row already stamped with p_today updates nothing and
-- returns no row, so a second tab (or a second mount) gets false.
CREATE OR REPLACE FUNCTION claim_buddy_greeting(p_today date)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_claimed boolean;
BEGIN
  IF v_user IS NULL OR p_today IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO buddy_state (user_id, last_greeted_date)
  VALUES (v_user, p_today)
  ON CONFLICT (user_id) DO UPDATE
     SET last_greeted_date = p_today,
         updated_at = now()
   WHERE buddy_state.last_greeted_date IS DISTINCT FROM p_today
  RETURNING true INTO v_claimed;

  RETURN COALESCE(v_claimed, false);
END;
$$;

REVOKE ALL ON FUNCTION claim_buddy_greeting(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_buddy_greeting(date) TO authenticated;

-- Merges p_words in front of the stored window, newest first, de-duplicated by
-- word and capped, and returns the new window. Merging here rather than
-- client-side keeps two devices ending a session at once from overwriting each
-- other, and rebuilds every entry as {word, reading} so a client cannot park
-- arbitrary JSON in the row. Mirrors mergeWords() in src/lib/buddyWords.ts.
CREATE OR REPLACE FUNCTION remember_buddy_words(p_words jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_cap constant integer := 10;
  v_max_len constant integer := 64;
  v_max_input constant integer := 50;
  v_existing jsonb;
  v_next jsonb;
BEGIN
  IF v_user IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT recent_words INTO v_existing FROM buddy_state WHERE user_id = v_user;
  v_existing := COALESCE(v_existing, '[]'::jsonb);

  IF jsonb_typeof(p_words) <> 'array'
     OR jsonb_array_length(p_words) = 0
     OR jsonb_array_length(p_words) > v_max_input THEN
    RETURN v_existing;
  END IF;

  WITH combined AS (
    -- The offset is what makes incoming outrank existing in the DISTINCT ON
    -- below, so a word studied again moves back to the front of the window.
    SELECT e.value AS entry, e.ordinality AS ord
      FROM jsonb_array_elements(p_words) WITH ORDINALITY AS e(value, ordinality)
    UNION ALL
    SELECT e.value, 1000000 + e.ordinality
      FROM jsonb_array_elements(v_existing) WITH ORDINALITY AS e(value, ordinality)
  ),
  cleaned AS (
    SELECT left(btrim(entry ->> 'word'), v_max_len) AS word,
           NULLIF(left(btrim(COALESCE(entry ->> 'reading', '')), v_max_len), '') AS reading,
           ord
      FROM combined
     WHERE jsonb_typeof(entry) = 'object'
       AND NULLIF(btrim(COALESCE(entry ->> 'word', '')), '') IS NOT NULL
  ),
  deduped AS (
    -- Newest position wins, but the reading survives: the same word can arrive
    -- from a deck that never filled one in, and the buddy speaks the kana.
    SELECT word,
           (array_agg(reading ORDER BY (reading IS NULL), ord))[1] AS reading,
           min(ord) AS ord
      FROM cleaned
     GROUP BY word
  ),
  capped AS (
    SELECT word, reading, ord FROM deduped ORDER BY ord LIMIT v_cap
  )
  SELECT COALESCE(
           jsonb_agg(
             jsonb_strip_nulls(jsonb_build_object('word', word, 'reading', reading))
             ORDER BY ord
           ),
           '[]'::jsonb)
    INTO v_next
    FROM capped;

  INSERT INTO buddy_state (user_id, recent_words)
  VALUES (v_user, v_next)
  ON CONFLICT (user_id) DO UPDATE
     SET recent_words = v_next,
         updated_at = now();

  RETURN v_next;
END;
$$;

REVOKE ALL ON FUNCTION remember_buddy_words(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION remember_buddy_words(jsonb) TO authenticated;
