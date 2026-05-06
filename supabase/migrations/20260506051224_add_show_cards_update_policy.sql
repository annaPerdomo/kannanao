-- This policy already exists in 20260505000000_add_show_cards.sql.
-- Use DROP IF EXISTS + CREATE to make this migration idempotent.
DROP POLICY IF EXISTS "Users can update own show cards" ON show_cards;
CREATE POLICY "Users can update own show cards"
  ON show_cards FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
