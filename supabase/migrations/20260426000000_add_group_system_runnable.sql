-- =============================================================================
-- Group System Migration — Run this ONCE before deploying the group features.
--
-- Usage:
--   Option A (Supabase CLI):  supabase db push
--   Option B (SQL Editor):    Paste this entire file into the Supabase SQL Editor and run
--   Option C (psql):          psql $DATABASE_URL -f this_file.sql
--
-- Safe to run: uses IF NOT EXISTS / IF EXISTS checks where possible.
-- Tables created: invite_codes, assignments, encouragements
-- Columns added to profiles: account_type, organizer_id, show_leaderboard
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. profiles: add account_type, organizer_id, show_leaderboard
-- ─────────────────────────────────────────────────────────────────────────────

-- account_type: 'organizer' (full access) or 'member' (limited)
-- Default 'organizer' so all existing accounts keep full access.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'account_type'
  ) THEN
    ALTER TABLE profiles
      ADD COLUMN account_type text NOT NULL DEFAULT 'organizer'
        CHECK (account_type IN ('organizer', 'member'));
  END IF;
END $$;

-- organizer_id: FK to the organizer's profile. NULL = standalone organizer.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'organizer_id'
  ) THEN
    ALTER TABLE profiles
      ADD COLUMN organizer_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- show_leaderboard: per-organizer toggle for group leaderboard visibility.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'show_leaderboard'
  ) THEN
    ALTER TABLE profiles
      ADD COLUMN show_leaderboard boolean NOT NULL DEFAULT true;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_organizer_id ON profiles(organizer_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. invite_codes: QR invite codes with usage limits and expiry
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invite_codes (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text        UNIQUE NOT NULL,
  organizer_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label         text,
  max_uses      int         DEFAULT 1,
  times_used    int         DEFAULT 0,
  expires_at    timestamptz,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_organizer_id ON invite_codes(organizer_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. assignments: organizer-assigned decks with due dates
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assignments (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deck_id       uuid        NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  title         text,
  note          text,
  due_date      date,
  completed_at  timestamptz,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(member_id, deck_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_member_id ON assignments(member_id);
CREATE INDEX IF NOT EXISTS idx_assignments_organizer_id ON assignments(organizer_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. encouragements: motivational messages from organizer to member
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS encouragements (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message       text        NOT NULL,
  emoji         text        DEFAULT '⭐',
  read_at       timestamptz,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_encouragements_member_id ON encouragements(member_id);
CREATE INDEX IF NOT EXISTS idx_encouragements_organizer_id ON encouragements(organizer_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Done! Verify with:
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' ORDER BY ordinal_position;
--   SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('invite_codes', 'assignments', 'encouragements');
-- ─────────────────────────────────────────────────────────────────────────────

COMMIT;
