-- Durable daily ceiling on Gemini calls spent per organizer.
--
-- The first version of this counter lived in a module-level Map, which is per
-- serverless instance: every cold start, deploy and re-routed request handed
-- out a fresh allowance, so the "30 a day" cap was really 30 per instance. A
-- spend ceiling has to survive the process, so it lives in the database and is
-- claimed atomically.

create table if not exists public.lesson_generations (
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (organizer_id, day)
);

alter table public.lesson_generations enable row level security;

comment on table public.lesson_generations is
  'Per-organizer, per-day count of AI generations spent. Written only by consume_lesson_budget().';

-- Claims `p_cost` of the day's allowance and returns the new total, or -1 when
-- the request would breach `p_cap`. The `where` on the conflict branch is what
-- makes it atomic: two concurrent requests cannot both see room for the last one.
create or replace function public.consume_lesson_budget(
  p_organizer_id uuid,
  p_day date,
  p_cost integer,
  p_cap integer
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  if p_cost <= 0 or p_cost > p_cap then
    return -1;
  end if;

  insert into public.lesson_generations as lg (organizer_id, day, count)
  values (p_organizer_id, p_day, p_cost)
  on conflict (organizer_id, day) do update
    set count = lg.count + p_cost,
        updated_at = now()
    where lg.count + p_cost <= p_cap
  returning lg.count into new_count;

  return coalesce(new_count, -1);
end;
$$;

-- Only the service role calls this; no client should be able to move the counter.
revoke all on function public.consume_lesson_budget(uuid, date, integer, integer) from public;
revoke all on function public.consume_lesson_budget(uuid, date, integer, integer) from anon;
revoke all on function public.consume_lesson_budget(uuid, date, integer, integer) from authenticated;
