-- Multi-group support: organizers can create multiple named groups.
-- Each member belongs to exactly one group. Existing organizers get a
-- default "My Group" with their current members migrated into it.

BEGIN;

-- 1. Create groups table
CREATE TABLE groups (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  emoji         text        NOT NULL DEFAULT '📚',
  pinned        boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_groups_organizer_id ON groups(organizer_id);

-- 2. Add group_id columns (nullable initially for backfill)
ALTER TABLE profiles       ADD COLUMN group_id uuid REFERENCES groups(id) ON DELETE SET NULL;
ALTER TABLE invite_codes   ADD COLUMN group_id uuid REFERENCES groups(id) ON DELETE CASCADE;
ALTER TABLE assignments    ADD COLUMN group_id uuid REFERENCES groups(id) ON DELETE CASCADE;
ALTER TABLE encouragements ADD COLUMN group_id uuid REFERENCES groups(id) ON DELETE CASCADE;

CREATE INDEX idx_profiles_group_id       ON profiles(group_id);
CREATE INDEX idx_invite_codes_group_id   ON invite_codes(group_id);
CREATE INDEX idx_assignments_group_id    ON assignments(group_id);
CREATE INDEX idx_encouragements_group_id ON encouragements(group_id);

-- 3. Backfill: create a default group for every organizer with members
INSERT INTO groups (organizer_id, name, pinned)
SELECT DISTINCT p.id, 'My Group', true
FROM profiles p
WHERE p.account_type = 'organizer'
  AND EXISTS (SELECT 1 FROM profiles m WHERE m.organizer_id = p.id);

-- 4. Set group_id on existing rows
UPDATE profiles p
  SET group_id = g.id
  FROM groups g
  WHERE g.organizer_id = p.organizer_id
    AND p.account_type = 'member';

UPDATE invite_codes ic
  SET group_id = g.id
  FROM groups g
  WHERE g.organizer_id = ic.organizer_id;

UPDATE assignments a
  SET group_id = g.id
  FROM groups g
  WHERE g.organizer_id = a.organizer_id;

UPDATE encouragements e
  SET group_id = g.id
  FROM groups g
  WHERE g.organizer_id = e.organizer_id;

-- 5. Make group_id NOT NULL on tables where it must be set
-- (profiles.group_id stays nullable — organizers don't belong to a group)
ALTER TABLE invite_codes   ALTER COLUMN group_id SET NOT NULL;
ALTER TABLE assignments    ALTER COLUMN group_id SET NOT NULL;
ALTER TABLE encouragements ALTER COLUMN group_id SET NOT NULL;

-- 6. RLS for groups table
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "groups: organizer select" ON groups FOR SELECT TO authenticated
  USING (organizer_id = auth.uid());
CREATE POLICY "groups: organizer insert" ON groups FOR INSERT TO authenticated
  WITH CHECK (organizer_id = auth.uid());
CREATE POLICY "groups: organizer update" ON groups FOR UPDATE TO authenticated
  USING (organizer_id = auth.uid());
CREATE POLICY "groups: organizer delete" ON groups FOR DELETE TO authenticated
  USING (organizer_id = auth.uid());

COMMIT;
