-- Add per-group leaderboard visibility toggle
ALTER TABLE groups ADD COLUMN show_leaderboard boolean NOT NULL DEFAULT true;
