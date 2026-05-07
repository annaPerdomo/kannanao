-- Add position columns for reordering decks and cards

ALTER TABLE decks ADD COLUMN position integer;
ALTER TABLE cards ADD COLUMN position integer;

-- Backfill existing decks: assign position by created_at order per user
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) - 1 AS pos
  FROM decks
)
UPDATE decks SET position = ranked.pos FROM ranked WHERE decks.id = ranked.id;

-- Backfill existing cards: assign position by created_at order per deck
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY deck_id ORDER BY created_at ASC) - 1 AS pos
  FROM cards
)
UPDATE cards SET position = ranked.pos FROM ranked WHERE cards.id = ranked.id;

-- Set NOT NULL after backfill
ALTER TABLE decks ALTER COLUMN position SET NOT NULL;
ALTER TABLE decks ALTER COLUMN position SET DEFAULT 0;

ALTER TABLE cards ALTER COLUMN position SET NOT NULL;
ALTER TABLE cards ALTER COLUMN position SET DEFAULT 0;
