-- Create an event type table for user-defined calendar event categories
create extension if not exists "pgcrypto";

create table if not exists event_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  emoji text not null,
  color text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists event_types_user_id_idx on event_types (user_id);
