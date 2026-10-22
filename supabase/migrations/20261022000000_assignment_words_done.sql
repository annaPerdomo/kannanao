-- baseline_accuracy: the share of a deck's words whose latest answer was right, checked across every
-- card in the deck. Distinct from required_accuracy, which grades one session in one practice mode.
ALTER TABLE assignments ADD COLUMN baseline_accuracy integer NOT NULL DEFAULT 80 CHECK (baseline_accuracy BETWEEN 0 AND 100);
ALTER TABLE assignments ADD COLUMN goal_met_at timestamptz;
ALTER TABLE planned_assignments ADD COLUMN baseline_accuracy integer NOT NULL DEFAULT 80 CHECK (baseline_accuracy BETWEEN 0 AND 100);
