-- Group system: organizer/member accounts, invite codes, assignments, encouragements.
-- Existing accounts default to 'organizer' so nothing breaks.

-- New profile columns for the organizer/member relationship
ALTER TABLE profiles
  ADD COLUMN account_type text NOT NULL DEFAULT 'organizer'
    CHECK (account_type IN ('organizer', 'member')),
  ADD COLUMN organizer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN show_leaderboard boolean NOT NULL DEFAULT true;

CREATE INDEX idx_profiles_organizer_id ON profiles(organizer_id);

-- Invite codes: organizers generate these for QR-based member onboarding
CREATE TABLE invite_codes (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text        UNIQUE NOT NULL,
  organizer_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label         text,
  max_uses      int         DEFAULT 1,
  times_used    int         DEFAULT 0,
  expires_at    timestamptz,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_invite_codes_code ON invite_codes(code);
CREATE INDEX idx_invite_codes_organizer_id ON invite_codes(organizer_id);

-- Assignments: organizers assign specific decks to members with optional due dates
CREATE TABLE assignments (
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

CREATE INDEX idx_assignments_member_id ON assignments(member_id);
CREATE INDEX idx_assignments_organizer_id ON assignments(organizer_id);

-- Encouragements: short messages an organizer can send to a member
CREATE TABLE encouragements (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message       text        NOT NULL,
  emoji         text        DEFAULT '⭐',
  read_at       timestamptz,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_encouragements_member_id ON encouragements(member_id);
CREATE INDEX idx_encouragements_organizer_id ON encouragements(organizer_id);
