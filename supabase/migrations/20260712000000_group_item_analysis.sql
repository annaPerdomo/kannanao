-- Class-level item analysis for teacher analytics.
--
-- Answers "which words is the whole class missing?" for one shared deck, in a
-- single aggregate query. Looping every member's card_progress in JS would be
-- O(members × cards); this grouping runs once in Postgres instead.
--
-- Called only through the service-role client from an organizer-authenticated
-- route (GET /api/group/item-analysis), which first verifies the deck belongs
-- to the organizer. p_organizer_id scopes the counts to that organizer's own
-- members, so a caller can never aggregate another group's progress. Kept
-- SECURITY INVOKER: it runs as service_role (RLS-exempt) when the route calls
-- it, so no elevated grant is needed.

CREATE OR REPLACE FUNCTION group_item_analysis(p_organizer_id uuid, p_deck_id uuid)
RETURNS TABLE (
  card_id          uuid,
  word             text,
  reading          text,
  meaning          text,
  attempt_count    bigint,
  correct_total    bigint,
  wrong_total      bigint,
  struggling_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    c.id AS card_id,
    c.word,
    c.reading,
    c.meaning,
    -- Only members who actually answered this card have a card_progress row.
    COUNT(cp.user_id) AS attempt_count,
    COALESCE(SUM(cp.correct_count), 0) AS correct_total,
    COALESCE(SUM(cp.wrong_count), 0) AS wrong_total,
    -- Attempting members whose personal accuracy on this card is below 60%.
    COUNT(cp.user_id) FILTER (
      WHERE (cp.correct_count + cp.wrong_count) > 0
        AND cp.correct_count::real / (cp.correct_count + cp.wrong_count) < 0.6
    ) AS struggling_count
  FROM cards c
  LEFT JOIN card_progress cp
    ON cp.card_id = c.id
    AND cp.user_id IN (SELECT id FROM profiles WHERE organizer_id = p_organizer_id)
  WHERE c.deck_id = p_deck_id
  GROUP BY c.id, c.word, c.reading, c.meaning
  -- Worst-first: most strugglers, then most total wrong answers.
  ORDER BY struggling_count DESC, wrong_total DESC, c.word ASC;
$$;
