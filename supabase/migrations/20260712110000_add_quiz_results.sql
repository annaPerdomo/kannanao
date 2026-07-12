-- Graded quiz results.
--
-- Practice modes retry and re-queue wrong answers, so their session accuracy is
-- not exam-like. Quiz mode asks each card once with no retries; a row here is
-- the fixed, gradebook-ready score for one attempt. Kept separate from
-- study_sessions so a teacher's "quiz scores" view is a simple table scan and
-- can't be confused with practice sessions.

CREATE TABLE quiz_results (
  id         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users (id)     ON DELETE CASCADE,
  deck_id    uuid        NOT NULL REFERENCES decks (id)          ON DELETE CASCADE,
  score      integer     NOT NULL CHECK (score >= 0),
  total      integer     NOT NULL CHECK (total > 0),
  accuracy   integer     NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100),
  session_id uuid        REFERENCES study_sessions (id)          ON DELETE SET NULL,
  taken_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (score <= total)
);

-- Organizer "quiz scores" reads and the student's own best/latest both filter by
-- (deck, user); this index serves both.
CREATE INDEX idx_quiz_results_deck_user ON quiz_results (deck_id, user_id, taken_at DESC);

-- RLS: a student reads and writes only their own attempts. Organizer reads go
-- through the service-role client (which bypasses RLS), exactly like the other
-- group analytics tables.
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own quiz results"
  ON quiz_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz results"
  ON quiz_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);
