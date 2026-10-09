alter table public.lesson_plan_decks
  add column kana_sets text[] not null default '{}';
