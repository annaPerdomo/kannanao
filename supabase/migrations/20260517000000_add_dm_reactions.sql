-- Add emoji reactions to direct messages
-- Format: {"❤️": ["userId1", "userId2"], "😂": ["userId1"]}
ALTER TABLE direct_messages ADD COLUMN reactions jsonb DEFAULT '{}' NOT NULL;

-- Allow both sender and recipient to update (reactions from either side, read_at from recipient)
DROP POLICY IF EXISTS "Recipients can update read_at" ON direct_messages;
CREATE POLICY "Participants can update messages"
  ON direct_messages FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Grant column-level UPDATE on reactions (read_at grant already exists)
GRANT UPDATE (reactions) ON direct_messages TO authenticated;
