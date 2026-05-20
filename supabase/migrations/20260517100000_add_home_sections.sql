-- Add home_sections JSONB column to profiles for customizable dashboard
alter table profiles
  add column if not exists home_sections jsonb default null;

-- Migrate existing show_todo=false into home_sections so no data is lost
update profiles
  set home_sections = jsonb_build_object('todo', false)
  where show_todo = false and home_sections is null;
