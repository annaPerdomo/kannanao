-- Practice sentences for Kotoba Bubble game mode
-- Generated once per deck via Gemini, shared with all group members
create table deck_practice_sentences (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references decks(id) on delete cascade,
  sentence_jp text not null,
  sentence_en text not null,
  target_particle text not null,
  particle_index int not null,
  distractors text[] not null default '{}',
  sentence_type text not null check (sentence_type in ('question', 'response', 'statement')),
  conversation_group int not null,
  sort_order int not null,
  source_card_ids uuid[] default '{}',
  created_at timestamptz not null default now()
);

create index idx_practice_sentences_deck on deck_practice_sentences(deck_id);

-- RLS: any authenticated user can read sentences for decks they have access to
alter table deck_practice_sentences enable row level security;

create policy "Anyone can read practice sentences"
  on deck_practice_sentences for select
  to authenticated
  using (true);

create policy "Service role can insert practice sentences"
  on deck_practice_sentences for insert
  to service_role
  with check (true);

create policy "Service role can delete practice sentences"
  on deck_practice_sentences for delete
  to service_role
  using (true);
