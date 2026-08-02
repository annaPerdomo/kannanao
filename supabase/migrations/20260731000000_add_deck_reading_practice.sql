-- Per-deck switch for the kanji Reading practice mode (kanji → kana reading).
-- Kana comes long before kanji, so DEFAULT false locks every existing deck.
--
-- The app reads decks with select('*') and falls back to false when the column
-- is missing, so shipping this migration late only means "still locked" — never
-- a broken deck page.
alter table public.decks
  add column if not exists reading_practice boolean not null default false;
