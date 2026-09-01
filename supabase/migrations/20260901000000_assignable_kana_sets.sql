-- A kana row becomes assignable like a deck: an assignment now names EITHER a
-- deck or a kana set, never both, never neither.
--
-- UNIQUE(member_id, deck_id, group_id) is deliberately kept rather than swapped
-- for a partial index. PostgREST emits a bare `ON CONFLICT (cols)` and Postgres
-- cannot infer a partial index without the matching WHERE clause, so making the
-- deck key partial would break every existing deck upsert. Kana rows carry a
-- NULL deck_id and so never collide under it; they get their own partial unique
-- index and the API upserts them by hand.
--
-- `kana_set` is the raw curriculum key from src/lib/kanaCurriculum.ts with no FK
-- — the curriculum is a TS module, not a table. Validation lives in the API,
-- same as required_mode against GOAL_MODES.

begin;

alter table public.assignments
  alter column deck_id drop not null;

alter table public.assignments
  add column if not exists kana_set text;

alter table public.assignments
  drop constraint if exists assignments_deck_xor_kana;

alter table public.assignments
  add constraint assignments_deck_xor_kana
  check ((deck_id is not null) <> (kana_set is not null));

create unique index if not exists assignments_member_id_kana_set_group_id_key
  on public.assignments (member_id, kana_set, group_id)
  where kana_set is not null;

-- Which row a kana session drilled. Only a set-scoped session records one; a
-- mixed review leaves it null and can never complete a kana assignment.
alter table public.study_sessions
  add column if not exists kana_set text;

commit;
