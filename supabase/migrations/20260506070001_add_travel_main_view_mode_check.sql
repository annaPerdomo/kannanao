-- Add CHECK constraint to travel_main_view_mode to match the valid TravelDisplayMode values.
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_travel_main_view_mode_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_travel_main_view_mode_check
  CHECK (travel_main_view_mode IN ('hiragana', 'romaji', 'kanji'));
