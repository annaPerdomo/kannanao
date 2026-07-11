-- Daily chest: the once-per-day reward for clearing the due queue.
--
-- One nullable date per user tracks the last local day a chest was opened, so
-- the chest can fire at most once per day and stays consistent across devices
-- (the check is server-persisted, not client-only). Uses the same local-date
-- convention as last_study_date — the client writes a local YYYY-MM-DD string.

ALTER TABLE user_progress
  ADD COLUMN IF NOT EXISTS last_chest_date date;
