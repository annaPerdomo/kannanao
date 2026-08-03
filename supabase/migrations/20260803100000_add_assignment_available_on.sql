-- When an assignment starts showing up for the learner.
--
-- A term planned in advance (four weekly decks, say) used to land on the
-- learner's dashboard all at once: four things "assigned", none of them
-- started, which reads as a pile of homework rather than this week's work.
-- `available_on` is the date the assignment becomes visible to the member —
-- the organizer still sees it immediately, labelled with its start date.
--
-- NULL means "available now", so every existing assignment is unchanged and
-- any caller that doesn't set it keeps the old behaviour.
alter table public.assignments
  add column if not exists available_on date;

comment on column public.assignments.available_on is
  'Date the assignment starts showing for the member; null = immediately. Organizers always see it.';

-- The member list filters on (member_id, available_on) and orders by due_date.
create index if not exists idx_assignments_member_available
  on public.assignments (member_id, available_on);
