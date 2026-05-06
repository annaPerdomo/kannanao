-- Add travel_main_view_mode column to profiles for persisting the user's
-- preferred display mode in Travel Mode (mirrors MainViewMode: hiragana/romaji/kanji).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS travel_main_view_mode text NOT NULL DEFAULT 'romaji';
