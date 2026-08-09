-- Per-deck readiness rollup for the group Overview tab: which decks has this
-- group absorbed, and which need another lesson?
--
-- One scan, grouped twice: first per (deck, learner) so "struggling" can be
-- judged against each learner's own accuracy, then per deck for the tier
-- counts the tab charts. The alternative is a round trip per assigned deck
-- from the route, on a tab that loads with the dashboard.
--
-- Unlike group_review_backlog, this takes (organizer, group) rather than a
-- pre-verified id list: the roster, the assigned decks, and the ownership
-- check all live in one place, so the function cannot be pointed at a group
-- the caller does not own.
CREATE OR REPLACE FUNCTION group_deck_readiness(p_organizer uuid, p_group uuid)
RETURNS TABLE (
  deck_id                uuid,
  deck_name              text,
  deck_emoji             text,
  card_count             int,
  member_count           int,
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
  headcount AS (
    SELECT COUNT(*)::int AS members FROM roster
  ),
  -- Scope: decks with at least one assignment in the group, finished or not —
  -- that is how a deck reaches these learners at all. Re-checking decks.user_id
  -- keeps a deck that left the organizer's hands out of the rollup, same as the
  -- difficult-words route.
  assigned AS (
    SELECT DISTINCT a.deck_id
    FROM assignments a
    JOIN owned o ON o.id = a.group_id
    WHERE a.organizer_id = p_organizer
  ),
  deck AS (
    SELECT d.id, d.name, d.emoji, COUNT(c.id)::int AS card_count
    FROM decks d
    JOIN assigned s ON s.deck_id = d.id
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
    JOIN assigned s     ON s.deck_id = c.deck_id
    JOIN card_progress cp ON cp.card_id = c.id
    JOIN roster r       ON r.member_id = cp.user_id
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
      -- group_difficult_words. Ids only — names stay with the members list.
      ARRAY_AGG(pm.user_id ORDER BY pm.user_id) FILTER (
        WHERE pm.seen_cards >= 5
          AND pm.attempt_total > 0
          AND pm.correct_total::real / pm.attempt_total < 0.6
      ) AS struggling
    FROM per_member pm
    GROUP BY pm.deck_id
  )
  SELECT
    d.id,
    d.name,
    d.emoji,
    d.card_count,
    hc.members,
    COALESCE(r.strong_pairs, 0),
    COALESCE(r.seen_pairs, 0) - COALESCE(r.strong_pairs, 0),
    hc.members * d.card_count - COALESCE(r.seen_pairs, 0),
    CASE WHEN COALESCE(r.attempt_total, 0) > 0
         THEN ROUND(100.0 * r.correct_total / r.attempt_total)::int
    END,
    COALESCE(r.struggling, '{}'::uuid[])
  FROM deck d
  CROSS JOIN headcount hc
  LEFT JOIN rollup r ON r.deck_id = d.id
  -- Weakest first: the top of the list is what tomorrow's lesson gets planned
  -- around. A deck with no pairs at all (no cards, or an empty group) carries
  -- no signal and sinks to the bottom.
  ORDER BY
    COALESCE(r.strong_pairs, 0)::real / NULLIF(hc.members * d.card_count, 0)
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
