-- An assignment is unique per group, not per learner.
--
-- `UNIQUE(member_id, deck_id)` pre-dates groups entirely: back then a learner
-- had exactly one organizer, so "this person, this deck" named one handout. It
-- does not survive multi-group membership. A learner in an organizer's Monday
-- group and Wednesday group who is given the same deck in both had the second
-- assignment *overwrite* the first — same row, new `group_id`, new due date,
-- with the first group's completion carried across. The Monday handout vanished
-- from that group's list with no error, and because `assignments.group_id`
-- cascades, deleting the Wednesday group then deleted Monday's work too.
--
-- Widening the key to include `group_id` is strictly permissive: every pair
-- that was unique before is still unique now, so no existing row can conflict.

begin;

alter table public.assignments
  drop constraint if exists assignments_member_id_deck_id_key;

alter table public.assignments
  add constraint assignments_member_id_deck_id_group_id_key
  unique (member_id, deck_id, group_id);

-- Corrective, for databases that already ran the multi-group backfill before it
-- was fixed: it copied `organizer_id` off the profile while taking `group_id`
-- from the same profile, and an admin group move only ever wrote `group_id`. A
-- learner moved across organizers that way ended up with a membership row whose
-- organizer does not own its group, which makes them invisible to *both*
-- organizers' rosters. The group is the authority.
update public.group_members m
set organizer_id = g.organizer_id
from public.groups g
where g.id = m.group_id
  and m.organizer_id is distinct from g.organizer_id;

commit;
