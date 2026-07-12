-- Mastery criteria for assignments. Both criteria are optional; an assignment
-- with null criteria keeps the existing behavior (complete on any study of the
-- assigned deck). required_mode is validated in the API layer against the
-- deck-tied SessionMode values so new modes don't need a migration.
ALTER TABLE assignments
  ADD COLUMN required_accuracy integer
    CHECK (required_accuracy >= 0 AND required_accuracy <= 100),
  ADD COLUMN required_mode text,
  ADD COLUMN progress_accuracy integer
    CHECK (progress_accuracy >= 0 AND progress_accuracy <= 100);

COMMENT ON COLUMN assignments.required_accuracy IS 'Minimum session accuracy (0-100) required to complete; null = any study completes';
COMMENT ON COLUMN assignments.required_mode IS 'SessionMode the qualifying session must use; null = any mode';
COMMENT ON COLUMN assignments.progress_accuracy IS 'Best qualifying-session accuracy so far, for student feedback';
