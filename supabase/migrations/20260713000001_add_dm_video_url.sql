-- Add video support to direct messages
ALTER TABLE direct_messages ADD COLUMN video_url text;

-- Replace the image-or-message check with one that also allows video-only messages
ALTER TABLE direct_messages DROP CONSTRAINT IF EXISTS dm_has_content;
ALTER TABLE direct_messages ADD CONSTRAINT dm_has_content
  CHECK (
    (message IS NOT NULL AND length(message) <= 500)
    OR image_url IS NOT NULL
    OR video_url IS NOT NULL
  );
