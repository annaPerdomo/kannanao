-- The weekly schedule an organizer sets up in the Materials Builder before any
-- learner has joined. Real assignments need a member_id because completion is
-- tracked against them; these are the member-less templates that
-- catchUpGroupAssignments materializes into real rows when someone joins.

CREATE TABLE planned_assignments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id          uuid        NOT NULL REFERENCES groups(id)   ON DELETE CASCADE,
  deck_id           uuid        NOT NULL REFERENCES decks(id)    ON DELETE CASCADE,
  title             text,
  note              text,
  due_date          date,
  available_on      date,
  required_accuracy integer,
  required_mode     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  -- One template per deck per group; re-applying a plan upserts on this.
  UNIQUE(group_id, deck_id)
);

CREATE INDEX idx_planned_assignments_group_id ON planned_assignments(group_id);

-- Written and read only through API routes on the service-role client; the
-- organizer policy exists so a future client-side read doesn't need a migration.
ALTER TABLE planned_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "planned_assignments: organizer all" ON planned_assignments
  FOR ALL TO authenticated USING (organizer_id = auth.uid());
