-- lesson_plans.id is the client-generated apply planId (same value as decks.lesson_plan_id),
-- not a server default, so backfilled and freshly-applied rows share one id space.

CREATE TABLE lesson_plans (
  id            uuid PRIMARY KEY,
  organizer_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id      uuid NOT NULL REFERENCES groups(id)   ON DELETE CASCADE,
  title         text,
  jlpt_level    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lesson_plans_group ON lesson_plans(group_id);

CREATE TABLE lesson_plan_decks (
  plan_id   uuid NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE,
  deck_id   uuid NOT NULL REFERENCES decks(id)        ON DELETE CASCADE,
  position  integer NOT NULL,
  PRIMARY KEY (plan_id, deck_id),
  UNIQUE (plan_id, position)
);

CREATE INDEX idx_lesson_plan_decks_deck ON lesson_plan_decks(deck_id);

ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lesson_plans: organizer all" ON lesson_plans
  FOR ALL TO authenticated USING (organizer_id = auth.uid());

ALTER TABLE lesson_plan_decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lesson_plan_decks: organizer all" ON lesson_plan_decks
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM lesson_plans p WHERE p.id = plan_id AND p.organizer_id = auth.uid())
  );

-- Backfill: decks carry no group_id, so a plan's group is inferred from where
-- its decks were scheduled, picking one winning group per plan.
WITH deck_groups AS (
  SELECT d.lesson_plan_id AS plan_id, d.id AS deck_id, d.user_id AS organizer_id,
    pa.group_id, true AS has_template
  FROM decks d
  JOIN planned_assignments pa ON pa.deck_id = d.id AND pa.organizer_id = d.user_id
  WHERE d.lesson_plan_id IS NOT NULL
  UNION
  SELECT d.lesson_plan_id, d.id, d.user_id, a.group_id, false
  FROM decks d
  JOIN assignments a ON a.deck_id = d.id AND a.organizer_id = d.user_id
  WHERE d.lesson_plan_id IS NOT NULL
),
per_deck AS (
  SELECT plan_id, deck_id, organizer_id, group_id, bool_or(has_template) AS has_template
  FROM deck_groups
  GROUP BY plan_id, deck_id, organizer_id, group_id
),
group_scores AS (
  SELECT plan_id, organizer_id, group_id,
    count(*) FILTER (WHERE has_template) AS template_hits,
    count(*) AS deck_hits
  FROM per_deck
  GROUP BY plan_id, organizer_id, group_id
),
best_group AS (
  SELECT DISTINCT ON (plan_id) plan_id, organizer_id, group_id
  FROM group_scores
  ORDER BY plan_id, template_hits DESC, deck_hits DESC, group_id
)
INSERT INTO lesson_plans (id, organizer_id, group_id, title, created_at)
SELECT bg.plan_id, bg.organizer_id, bg.group_id, NULL, min(d.created_at)
FROM best_group bg
JOIN decks d ON d.lesson_plan_id = bg.plan_id
GROUP BY bg.plan_id, bg.organizer_id, bg.group_id
ON CONFLICT DO NOTHING;

-- Position ordering: each deck's template in the plan's chosen group wins;
-- failing that, its most common assignment due date there, then creation order.
WITH deck_due AS (
  SELECT
    d.lesson_plan_id AS plan_id,
    d.id AS deck_id,
    d.created_at,
    COALESCE(
      (SELECT pa.due_date FROM planned_assignments pa
       WHERE pa.deck_id = d.id AND pa.group_id = p.group_id
       LIMIT 1),
      (SELECT a.due_date FROM assignments a
       WHERE a.deck_id = d.id AND a.group_id = p.group_id
       GROUP BY a.due_date
       ORDER BY count(*) DESC, a.due_date NULLS LAST
       LIMIT 1)
    ) AS due_date
  FROM decks d
  JOIN lesson_plans p ON p.id = d.lesson_plan_id
)
INSERT INTO lesson_plan_decks (plan_id, deck_id, position)
SELECT
  plan_id,
  deck_id,
  row_number() OVER (
    PARTITION BY plan_id
    ORDER BY due_date NULLS LAST, created_at
  ) - 1
FROM deck_due
ON CONFLICT DO NOTHING;

-- One statement per table, not per-row updates matched on current dates: a
-- shifted row's new value can collide with another row's still-unshifted
-- value, double-shifting it. Nulls stay null (date + interval on null is null).
CREATE OR REPLACE FUNCTION shift_lesson_plan(
  p_plan_id uuid,
  p_organizer_id uuid,
  p_group_id uuid,
  p_from_position int,
  p_days int
) RETURNS void
LANGUAGE sql
SECURITY INVOKER
AS $$
  UPDATE assignments
  SET due_date = due_date + p_days,
      available_on = available_on + p_days
  WHERE organizer_id = p_organizer_id
    AND group_id = p_group_id
    AND deck_id IN (
      SELECT deck_id FROM lesson_plan_decks
      WHERE plan_id = p_plan_id AND position >= p_from_position
    );

  UPDATE planned_assignments
  SET due_date = due_date + p_days,
      available_on = available_on + p_days
  WHERE organizer_id = p_organizer_id
    AND group_id = p_group_id
    AND deck_id IN (
      SELECT deck_id FROM lesson_plan_decks
      WHERE plan_id = p_plan_id AND position >= p_from_position
    );
$$;

-- Only the service role calls this; no client should be able to move a group's schedule directly.
REVOKE EXECUTE ON FUNCTION shift_lesson_plan(uuid, uuid, uuid, int, int) FROM public;
REVOKE EXECUTE ON FUNCTION shift_lesson_plan(uuid, uuid, uuid, int, int) FROM anon;
REVOKE EXECUTE ON FUNCTION shift_lesson_plan(uuid, uuid, uuid, int, int) FROM authenticated;
GRANT EXECUTE ON FUNCTION shift_lesson_plan(uuid, uuid, uuid, int, int) TO service_role;
