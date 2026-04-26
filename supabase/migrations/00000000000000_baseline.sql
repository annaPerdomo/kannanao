-- Baseline migration: snapshot of production schema as of 2026-04-25
-- Generated from information_schema queries against the live Supabase database.
-- RLS policies are managed in the Supabase dashboard and are not captured here.

-- =============================================================================
-- profiles
-- =============================================================================
CREATE TABLE profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users (id),
  username    text        NOT NULL UNIQUE,
  display_name text,
  color_scheme text       DEFAULT 'sakura'::text,
  show_todo   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- decks
-- =============================================================================
CREATE TABLE decks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users (id),
  name        text        NOT NULL,
  description text,
  emoji       text,
  pinned      boolean     NOT NULL DEFAULT false,
  is_public   boolean     DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- =============================================================================
-- cards
-- =============================================================================
CREATE TABLE cards (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id         uuid        REFERENCES decks (id),
  word            text        NOT NULL,
  reading         text,
  meaning         text,
  image_url       text,
  image_credit    text,
  image_query     text        NOT NULL DEFAULT ''::text,
  example_jp      text,
  example_en      text,
  main_view_mode  text        NOT NULL DEFAULT 'hiragana'::text,
  card_type       text        NOT NULL DEFAULT 'word'::text,
  jlpt_level      text,
  created_at      timestamptz DEFAULT now()
);

-- =============================================================================
-- deck_shares
-- =============================================================================
CREATE TABLE deck_shares (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id     uuid        NOT NULL REFERENCES decks (id),
  owner_id    uuid        NOT NULL REFERENCES auth.users (id),
  shared_with uuid        NOT NULL REFERENCES auth.users (id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deck_id, shared_with)
);

-- =============================================================================
-- ohanashikais (speech memorization scripts)
-- =============================================================================
CREATE TABLE ohanashikais (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users (id),
  title       text        NOT NULL,
  description text,
  pinned      boolean     NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- =============================================================================
-- ohanashikai_lines
-- =============================================================================
CREATE TABLE ohanashikai_lines (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ohanashikai_id  uuid        NOT NULL REFERENCES ohanashikais (id),
  text            text        NOT NULL,
  order_index     integer     NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- =============================================================================
-- todos
-- =============================================================================
CREATE TABLE todos (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users (id),
  text             text        NOT NULL,
  completed        boolean     NOT NULL DEFAULT false,
  emoji            text        NOT NULL DEFAULT '🌸'::text,
  frequency_days   integer[]   DEFAULT '{}'::integer[],
  completed_dates  text[]      DEFAULT '{}'::text[],
  sort_order       integer,
  repeat_until_done boolean    NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- event_types (to-do calendar categories)
-- =============================================================================
CREATE TABLE event_types (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users (id),
  name        text        NOT NULL,
  emoji       text        NOT NULL,
  color       text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

-- =============================================================================
-- user_progress
-- =============================================================================
CREATE TABLE user_progress (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid    NOT NULL UNIQUE REFERENCES auth.users (id),
  total_xp            integer NOT NULL DEFAULT 0,
  level               integer NOT NULL DEFAULT 1,
  streak_days         integer NOT NULL DEFAULT 0,
  longest_streak      integer NOT NULL DEFAULT 0,
  last_study_date     date,
  total_cards_studied integer NOT NULL DEFAULT 0,
  total_correct       integer NOT NULL DEFAULT 0,
  total_sessions      integer NOT NULL DEFAULT 0,
  total_xp_spent      integer NOT NULL DEFAULT 0
);

-- =============================================================================
-- study_sessions
-- =============================================================================
CREATE TABLE study_sessions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users (id),
  deck_id        uuid        REFERENCES decks (id),
  practice_mode  text,
  cards_studied  integer     NOT NULL DEFAULT 0,
  cards_correct  integer     NOT NULL DEFAULT 0,
  xp_earned      integer     NOT NULL DEFAULT 0,
  duration_secs  integer     NOT NULL DEFAULT 0,
  started_at     timestamptz NOT NULL DEFAULT now(),
  ended_at       timestamptz
);

-- =============================================================================
-- user_achievements
-- =============================================================================
CREATE TABLE user_achievements (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users (id),
  achievement_key text        NOT NULL,
  unlocked_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_key)
);

-- =============================================================================
-- user_purchases (cosmetic shop)
-- =============================================================================
CREATE TABLE user_purchases (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users (id),
  item_key     text        NOT NULL,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_key)
);

-- =============================================================================
-- user_equipped (active cosmetics)
-- =============================================================================
CREATE TABLE user_equipped (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  uuid NOT NULL REFERENCES auth.users (id),
  slot     text NOT NULL,
  item_key text NOT NULL,
  UNIQUE (user_id, slot)
);

-- =============================================================================
-- embed_events (analytics for public deck embeds)
-- =============================================================================
CREATE TABLE embed_events (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id          text        NOT NULL,
  session_id       text        NOT NULL,
  event_type       text        NOT NULL,
  card_index       integer,
  duration_seconds integer,
  referrer         text,
  created_at       timestamptz DEFAULT now()
);

-- =============================================================================
-- waitlist
-- =============================================================================
CREATE TABLE waitlist (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL UNIQUE,
  name       text,
  message    text,
  created_at timestamptz DEFAULT now()
);
