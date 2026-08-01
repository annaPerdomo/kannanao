-- Per-deck switch for the kanji Reading practice mode (kanji → kana reading).
-- Learners work through hiragana and katakana long before kanji, so the mode
-- stays off until the deck's owner turns it on: DEFAULT false locks every
-- existing deck, and only the owner (an organizer) can flip it.
--
-- The app reads decks with select('*') and falls back to false when the column
-- is missing, so shipping this migration late only means "still locked" — never
-- a broken deck page.
alter table public.decks
  add column if not exists reading_practice boolean not null default false;
