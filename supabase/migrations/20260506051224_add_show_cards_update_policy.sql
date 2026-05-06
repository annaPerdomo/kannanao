CREATE POLICY "Users can update own show cards"
  ON show_cards FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
