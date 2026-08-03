-- study_sessions has carried only its primary key since the baseline, but four
-- group routes now read it the same way — leaderboard, feed, groups, and the new
-- activity charts — each as "these members, since this date, newest first". On a
-- table that grows a row per practice session forever that is four seq scans on
-- one dashboard paint.
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_started
  ON study_sessions (user_id, started_at DESC);
