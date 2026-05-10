-- Travel feature usage tracking
create table if not exists travel_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  feature text not null,       -- scenario, show_card, phrases, culture, katakana, listening, daily_phrase, emergency, food_menu, hub
  action text not null,        -- view, start, respond, generate, browse, complete
  metadata jsonb default '{}', -- e.g. { "category": "restaurant" }
  created_at timestamptz default now() not null
);

-- Index for admin queries: feature breakdown & time-series
create index idx_travel_events_created on travel_events (created_at desc);
-- Index for per-user queries
create index idx_travel_events_user on travel_events (user_id, created_at desc);

-- RLS
alter table travel_events enable row level security;

-- Users can insert their own events
create policy "Users can insert own travel events"
  on travel_events for insert
  with check (auth.uid() = user_id);

-- Users can read their own events (not needed for analytics but good practice)
create policy "Users can read own travel events"
  on travel_events for select
  using (auth.uid() = user_id);
