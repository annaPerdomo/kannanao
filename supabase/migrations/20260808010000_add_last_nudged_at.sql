-- Track when an organizer last sent an encouragement/nudge to a member, so
-- the dashboard can show "last nudged Nd ago" instead of nudging blind.
ALTER TABLE profiles ADD COLUMN last_nudged_at timestamptz;
