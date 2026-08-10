-- Fix what group_deck_readiness measures a deck against.
--
-- 20260809030000 scored every deck against the whole roster, but assignments
-- are per-member: a deck handed to five of thirty learners still left
-- 25 × card_count pairs "unseen" even when all five had mastered it, so the
-- weakest-first sort put that finished deck above one the whole group is
-- failing. The denominator is now the learners actually assigned the deck.
--
-- Two smaller corrections in the same pass:
--   * Assignments with a future `available_on` are excluded — the learner
--     cannot open the deck yet, and scoring their empty progress as 0 put next
--     term's decks at the very top of the list.
--   * The struggling-learner sample floor is capped at the deck's own length,
--     so a deck shorter than 5 cards can report struggling learners at all.
--
-- The DROP is required to rename the `member_count` output column: CREATE OR
-- REPLACE cannot change a RETURNS TABLE column name.
DROP FUNCTION IF EXISTS group_deck_readiness(uuid, uuid);

CREATE FUNCTION group_deck_readiness(p_organizer uuid, p_group uuid)
RETURNS TABLE (
  deck_id                uuid,
  deck_name              text,
  deck_emoji             text,
  card_count             int,
  -- Learners this deck is assigned to, not the group headcount: the
  -- denominator behind `unseen` and the weakest-first sort.
  learner_count          int,
  strong                 int,
  learning               int,
  unseen                 int,
  accuracy_pct           int,
  struggling_learner_ids uuid[]
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH owned AS (
    -- Ownership gate: everything below joins through this, so a group that is
    -- not the caller's yields zero rows, never another organizer's numbers.
    SELECT g.id
    FROM groups g
    WHERE g.id = p_group
      AND g.organizer_id = p_organizer
  ),
  roster AS (
    SELECT gm.member_id
    FROM group_members gm
    JOIN owned o ON o.id = gm.group_id
  ),
  -- Scope: the (deck, learner) pairs this group has actually been given,
  -- finished or not. Joining the roster drops assignments left behind by a
  -- learner who has since left, so the denominator and the progress side count
  -- the same people. Re-checking decks.user_id keeps a deck that left the
  -- organizer's hands out of the rollup, same as the difficult-words route.
  assigned AS (
    SELECT DISTINCT a.deck_id, a.member_id
    FROM assignments a
    JOIN owned o  ON o.id = a.group_id
    JOIN roster r ON r.member_id = a.member_id
    WHERE a.organizer_id = p_organizer
      AND (a.available_on IS NULL OR a.available_on <= CURRENT_DATE)
  ),
  assigned_deck AS (
    SELECT s.deck_id, COUNT(*)::int AS learners
    FROM assigned s
    GROUP BY s.deck_id
  ),
  deck AS (
    SELECT d.id, d.name, d.emoji, COUNT(c.id)::int AS card_count
    FROM decks d
    JOIN assigned_deck ad ON ad.deck_id = d.id
    LEFT JOIN cards c ON c.deck_id = d.id
    WHERE d.user_id = p_organizer
    GROUP BY d.id, d.name, d.emoji
  ),
  per_member AS (
    SELECT
      c.deck_id,
      cp.user_id,
      COUNT(*)::int AS seen_cards,
      -- Tier boundary mirrored from src/lib/cardStrength.ts
      -- (STRONG_MIN_INTERVAL_DAYS, STRONG_MIN_EASE) — the same split the
      -- members rollup shows, so the two surfaces never disagree.
      COUNT(*) FILTER (WHERE cp.interval_days >= 3 AND cp.ease >= 2.0)::int AS strong_cards,
      SUM(cp.correct_count)::bigint                                        AS correct_total,
      SUM(cp.correct_count + cp.wrong_count)::bigint                       AS attempt_total
    FROM cards c
    JOIN card_progress cp ON cp.card_id = c.id
    -- Progress only counts on the pairs above: a learner who studied the deck
    -- on their own is not part of what the group was asked to absorb.
    JOIN assigned s       ON s.deck_id = c.deck_id AND s.member_id = cp.user_id
    GROUP BY c.deck_id, cp.user_id
  ),
  rollup AS (
    SELECT
      pm.deck_id,
      SUM(pm.seen_cards)::int    AS seen_pairs,
      SUM(pm.strong_cards)::int  AS strong_pairs,
      SUM(pm.correct_total)::bigint AS correct_total,
      SUM(pm.attempt_total)::bigint AS attempt_total,
      -- Under 5 cards seen a learner is still "hasn't met the deck", not
      -- struggling; 0.6 is the same personal-accuracy line as
      -- group_difficult_words. A deck shorter than the floor uses its own
      -- length, or nobody in it could ever qualify. Ids only — names stay with
      -- the members list.
      ARRAY_AGG(pm.user_id ORDER BY pm.user_id) FILTER (
        WHERE pm.seen_cards >= LEAST(5, d.card_count)
          AND pm.attempt_total > 0
          AND pm.correct_total::real / pm.attempt_total < 0.6
      ) AS struggling
    FROM per_member pm
    JOIN deck d ON d.id = pm.deck_id
    GROUP BY pm.deck_id
  )
  SELECT
    d.id,
    d.name,
    d.emoji,
    d.card_count,
    ad.learners,
    COALESCE(r.strong_pairs, 0),
    COALESCE(r.seen_pairs, 0) - COALESCE(r.strong_pairs, 0),
    ad.learners * d.card_count - COALESCE(r.seen_pairs, 0),
    CASE WHEN COALESCE(r.attempt_total, 0) > 0
         THEN ROUND(100.0 * r.correct_total / r.attempt_total)::int
    END,
    COALESCE(r.struggling, '{}'::uuid[])
  FROM deck d
  JOIN assigned_deck ad ON ad.deck_id = d.id
  LEFT JOIN rollup r ON r.deck_id = d.id
  -- Weakest first: the top of the list is what tomorrow's lesson gets planned
  -- around. A deck with no cards in it carries no signal and sinks to the
  -- bottom rather than reading as 0% absorbed.
  ORDER BY
    COALESCE(r.strong_pairs, 0)::real / NULLIF(ad.learners * d.card_count, 0)
      ASC NULLS LAST,
    d.name ASC;
$$;

-- SECURITY INVOKER: only the service-role client may run this, and
-- service_role is RLS-exempt, so INVOKER returns the same rows without leaving
-- an "aggregate any group's progress" primitive standing behind the REVOKEs.
REVOKE EXECUTE ON FUNCTION group_deck_readiness(uuid, uuid) FROM public;
REVOKE EXECUTE ON FUNCTION group_deck_readiness(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION group_deck_readiness(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION group_deck_readiness(uuid, uuid) TO service_role;
