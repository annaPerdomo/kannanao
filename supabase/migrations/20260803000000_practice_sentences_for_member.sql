-- Per-learner Kotoba Bubble sentence sets.
-- null = the shared set every member sees (existing behaviour, unchanged).
-- non-null = a set personalised to one learner's studied vocabulary.

alter table deck_practice_sentences
  add column if not exists for_member_id uuid references profiles(id) on delete cascade;

create unique index if not exists idx_practice_sentences_deck_member
  on deck_practice_sentences (
    deck_id,
    coalesce(for_member_id, '00000000-0000-0000-0000-000000000000'::uuid),
    conversation_group,
    sort_order
  );

create index if not exists idx_practice_sentences_member
  on deck_practice_sentences (for_member_id)
  where for_member_id is not null;
