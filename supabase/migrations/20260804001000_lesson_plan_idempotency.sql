-- Makes "create decks & assign" safe to press twice.
--
-- Applying a plan creates up to eight decks, their cards, their assignments and
-- then one Gemini call per deck. If that run dies half way — function timeout,
-- dropped connection — the organizer is left looking at a plan and an enabled
-- button, and pressing it used to duplicate every deck that had already landed.
-- Stamping the plan on the deck lets a retry pick up where it stopped.
alter table public.decks
  add column if not exists lesson_plan_id uuid;

comment on column public.decks.lesson_plan_id is
  'The lesson-plan apply run that created this deck; lets a retried apply skip decks it already made.';

create index if not exists idx_decks_lesson_plan
  on public.decks (user_id, lesson_plan_id)
  where lesson_plan_id is not null;
