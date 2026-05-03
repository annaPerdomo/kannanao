-- Enable RLS on the group tables + event_types.
-- The group tables (invite_codes, assignments, encouragements) are only
-- accessed server-side via the service role, so these policies are a
-- safety net. event_types is hit from the client, so its policies matter.

BEGIN;

-- event_types
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_types: owner select"  ON event_types FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "event_types: owner insert"  ON event_types FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "event_types: owner update"  ON event_types FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "event_types: owner delete"  ON event_types FOR DELETE TO authenticated USING (user_id = auth.uid());

-- invite_codes (organizer-only)
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invite_codes: organizer select" ON invite_codes FOR SELECT TO authenticated USING (organizer_id = auth.uid());
CREATE POLICY "invite_codes: organizer insert" ON invite_codes FOR INSERT TO authenticated WITH CHECK (organizer_id = auth.uid());
CREATE POLICY "invite_codes: organizer delete" ON invite_codes FOR DELETE TO authenticated USING (organizer_id = auth.uid());

-- assignments (organizer manages, member reads/updates own)
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignments: organizer all"  ON assignments FOR ALL    TO authenticated USING (organizer_id = auth.uid());
CREATE POLICY "assignments: member select"  ON assignments FOR SELECT TO authenticated USING (member_id = auth.uid());
CREATE POLICY "assignments: member update"  ON assignments FOR UPDATE TO authenticated USING (member_id = auth.uid());

-- encouragements (organizer sends, member reads/marks read)
ALTER TABLE encouragements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "encouragements: organizer all"  ON encouragements FOR ALL    TO authenticated USING (organizer_id = auth.uid());
CREATE POLICY "encouragements: member select"  ON encouragements FOR SELECT TO authenticated USING (member_id = auth.uid());
CREATE POLICY "encouragements: member update"  ON encouragements FOR UPDATE TO authenticated USING (member_id = auth.uid());

COMMIT;
