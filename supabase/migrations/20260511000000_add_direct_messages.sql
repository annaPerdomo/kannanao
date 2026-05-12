-- Direct messages: bidirectional messaging between member ↔ organizer
CREATE TABLE direct_messages (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message       text        NOT NULL CHECK (length(message) <= 500),
  read_at       timestamptz,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_dm_sender_id    ON direct_messages(sender_id);
CREATE INDEX idx_dm_recipient_id ON direct_messages(recipient_id);

-- RLS policies for direct_messages
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own messages"
  ON direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can insert messages they send"
  ON direct_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update read_at"
  ON direct_messages FOR UPDATE
  USING (auth.uid() = recipient_id);

-- Push subscriptions: Web Push subscription storage per user/device
CREATE TABLE push_subscriptions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint   text        NOT NULL,
  p256dh     text        NOT NULL,
  auth       text        NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX idx_push_sub_user_id ON push_subscriptions(user_id);

-- RLS policies for push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);
