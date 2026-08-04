-- A learner can be in more than one group at a time.
--
-- Until now membership was two columns on the learner's profile —
-- `organizer_id` and `group_id` — so joining a second group silently replaced
-- the first. That is wrong as soon as the same person takes, say, an advanced
-- conversation group and a business Japanese group in the same term: joining
-- the second one dropped them out of the first, took their deck shares with it,
-- and hid every assignment the first organizer had given them.
--
-- Membership moves to its own table. The profile columns stay as a pointer to
-- the learner's *primary* (most recently joined) group — they are what seeds
-- first paint and what the UI shows when nothing else names a group — but they
-- are no longer the record of who is in what.

begin;

create table if not exists public.group_members (
  group_id     uuid        not null references public.groups(id)   on delete cascade,
  member_id    uuid        not null references public.profiles(id) on delete cascade,
  -- Denormalised from groups.organizer_id: every roster query filters on it,
  -- and it lets "am I in any of this organizer's groups?" stay a single read.
  organizer_id uuid        not null references public.profiles(id) on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (group_id, member_id)
);

create index if not exists idx_group_members_member    on public.group_members (member_id);
create index if not exists idx_group_members_organizer on public.group_members (organizer_id);

comment on table public.group_members is
  'Who learns in which group. Source of truth for membership; profiles.group_id is only the primary-group pointer.';

-- Backfill from the profile columns. Learners whose organizer is known but
-- whose group never got set (possible for accounts that pre-date the groups
-- table) land in that organizer''s oldest group, which is where the groups
-- migration put everyone else.
--
-- `organizer_id` comes from the resolved group, never from the profile: an admin
-- group move only ever wrote `profiles.group_id`, so a profile can point at
-- organizer B''s group while still carrying organizer A''s id. Rosters filter on
-- both, so copying the profile''s value hides the learner from each of them.
insert into public.group_members (group_id, member_id, organizer_id)
select resolved.group_id, resolved.member_id, g.organizer_id
from (
  select
    p.id as member_id,
    coalesce(
      p.group_id,
      (select g2.id from public.groups g2 where g2.organizer_id = p.organizer_id
        order by g2.created_at limit 1)
    ) as group_id
  from public.profiles p
  where p.organizer_id is not null
) resolved
join public.groups g on g.id = resolved.group_id
on conflict (group_id, member_id) do nothing;

alter table public.group_members enable row level security;

-- Reads go through service-role API routes; these policies exist so the anon
-- client can still answer "which groups am I in?" without widening anything.
create policy "group_members: member select own" on public.group_members
  for select to authenticated
  using (member_id = auth.uid());

create policy "group_members: organizer select own groups" on public.group_members
  for select to authenticated
  using (organizer_id = auth.uid());

-- The groups row itself has to follow: a learner in two groups must be able to
-- read both, not just the one their profile happens to point at.
drop policy if exists "groups: member select own group" on public.groups;
create policy "groups: member select own group" on public.groups
  for select to authenticated
  using (
    id in (select group_id from public.group_members where member_id = auth.uid())
  );

commit;
