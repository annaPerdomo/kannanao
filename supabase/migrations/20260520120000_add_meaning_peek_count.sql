-- Track how many times players peek at the English meaning per sentence
alter table deck_practice_sentences
  add column meaning_peek_count int not null default 0;

-- Allow authenticated users to increment the peek count
create policy "Authenticated can update peek count"
  on deck_practice_sentences for update
  to authenticated
  using (true)
  with check (true);
