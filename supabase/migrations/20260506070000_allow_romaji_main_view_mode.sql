-- Allow 'romaji' as a valid main_view_mode for cards.
-- The existing CHECK constraint only permits 'hiragana' and 'kanji'.
ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_main_view_mode_check;
ALTER TABLE cards ADD CONSTRAINT cards_main_view_mode_check
  CHECK (main_view_mode IN ('hiragana', 'kanji', 'romaji'));
