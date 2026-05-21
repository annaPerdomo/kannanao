-- Track how many times players peek at the English meaning per sentence
alter table deck_practice_sentences
  add column meaning_peek_count int not null default 0;

-- Atomic RPC to increment the peek count, scoped to a specific deck
create or replace function increment_meaning_peek(row_id uuid, p_deck_id uuid)
returns void
language sql
volatile
security definer
as $$
  update deck_practice_sentences
  set meaning_peek_count = meaning_peek_count + 1
  where id = row_id and deck_id = p_deck_id;
$$;

-- Service role can update sentences (used by API routes for edits and peek increments)
create policy "Service role can update practice sentences"
  on deck_practice_sentences for update
  to service_role
  using (true)
  with check (true);
