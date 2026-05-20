-- Allow members to SELECT their own group row so loadProfile can join
-- groups to read show_leaderboard for the member's dashboard.
CREATE POLICY "groups: member select own group" ON groups FOR SELECT TO authenticated
  USING (id IN (SELECT group_id FROM profiles WHERE id = auth.uid()));
