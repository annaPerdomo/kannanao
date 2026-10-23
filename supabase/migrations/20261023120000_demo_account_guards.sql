-- The shared demo password yields a real JWT that can write via PostgREST, skipping API guards.
-- Demo identity is auth app_metadata.demo (set only by the reset); apply before DEMO_PASSWORD is set.

begin;

create or replace function public.is_demo_session() returns boolean
language sql stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'demo')::boolean, false);
$$;

create or replace function public.is_demo_user(uid uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select (u.raw_app_meta_data ->> 'demo')::boolean from auth.users u where u.id = uid),
    false
  );
$$;

revoke execute on function public.is_demo_user(uuid) from public;
revoke execute on function public.is_demo_user(uuid) from anon;
grant execute on function public.is_demo_user(uuid) to authenticated;
grant execute on function public.is_demo_user(uuid) to service_role;

-- "profiles: own update" has no column limits, so only a trigger can pin a demo session's identity.
create or replace function public.guard_demo_profile_changes() returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' or auth.jwt() is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and public.is_demo_session() then
    if new.username is distinct from old.username
      or new.account_type is distinct from old.account_type
      or new.organizer_id is distinct from old.organizer_id
      or new.group_id is distinct from old.group_id
      or new.display_name is distinct from old.display_name
    then
      raise exception 'Demo accounts cannot change their own identity.';
    end if;
  end if;

  if not public.is_demo_session()
    and new.username ilike 'demo-%'
    and (tg_op = 'INSERT' or new.username is distinct from old.username)
  then
    raise exception 'The demo- username prefix is reserved.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_demo_profile_changes on public.profiles;
create trigger guard_demo_profile_changes
  before insert or update on public.profiles
  for each row execute function public.guard_demo_profile_changes();

-- invite_codes: a demo organizer's PostgREST write cannot create a real invite.
drop policy if exists "invite_codes: organizer insert" on public.invite_codes;
create policy "invite_codes: organizer insert" on public.invite_codes
  for insert to authenticated
  with check (organizer_id = auth.uid() and not public.is_demo_session());

-- assignments/encouragements: a demo organizer may only touch demo members of its own groups.
drop policy if exists "assignments: organizer all" on public.assignments;
create policy "assignments: organizer all" on public.assignments
  for all to authenticated
  using (organizer_id = auth.uid())
  with check (
    organizer_id = auth.uid()
    and (
      not public.is_demo_session()
      or (
        public.is_demo_user(member_id)
        and group_id in (select g.id from public.groups g where g.organizer_id = auth.uid())
      )
    )
  );

drop policy if exists "encouragements: organizer all" on public.encouragements;
create policy "encouragements: organizer all" on public.encouragements
  for all to authenticated
  using (organizer_id = auth.uid())
  with check (
    organizer_id = auth.uid()
    and (
      not public.is_demo_session()
      or (
        public.is_demo_user(member_id)
        and group_id in (select g.id from public.groups g where g.organizer_id = auth.uid())
      )
    )
  );

-- direct_messages: demo <-> real messaging is blocked both directions.
drop policy if exists "Users can insert messages they send" on public.direct_messages;
create policy "Users can insert messages they send"
  on public.direct_messages for insert
  with check (
    auth.uid() = sender_id
    and public.is_demo_session() = public.is_demo_user(recipient_id)
  );

-- deck_shares: a demo owner may only share with a demo learner.
drop policy if exists "deck_shares: owner insert" on public.deck_shares;
create policy "deck_shares: owner insert" on public.deck_shares
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and (not public.is_demo_session() or public.is_demo_user(shared_with))
  );

commit;
