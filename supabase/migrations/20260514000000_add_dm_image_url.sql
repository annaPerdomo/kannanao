-- Add image support to direct messages
ALTER TABLE direct_messages ADD COLUMN image_url text;

-- Allow image-only messages (message can be null when image_url is set)
ALTER TABLE direct_messages ALTER COLUMN message DROP NOT NULL;

-- Replace the old check with one that requires at least message or image
ALTER TABLE direct_messages DROP CONSTRAINT IF EXISTS direct_messages_message_check;
ALTER TABLE direct_messages ADD CONSTRAINT dm_has_content
  CHECK (
    (message IS NOT NULL AND length(message) <= 500)
    OR image_url IS NOT NULL
  );
