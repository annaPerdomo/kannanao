-- Track user login events for admin analytics
CREATE TABLE login_events (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  logged_in_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast per-user queries
CREATE INDEX idx_login_events_user_id ON login_events (user_id, logged_in_at DESC);

-- RLS: users can only insert their own login events
ALTER TABLE login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own login events"
  ON login_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own login events"
  ON login_events FOR SELECT
  USING (auth.uid() = user_id);
