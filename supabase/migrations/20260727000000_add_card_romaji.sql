-- Word-spaced Hepburn romaji for a card.
--
-- `main_view_mode = 'romaji'` used to be rendered by romanising the kana
-- reading at display time. That is fine for a single word (ねこ -> "neko") but
-- runs a whole phrase together with no word boundaries:
--   はじめまして、よろしくおねがいします
--   -> "hajimemashite,yoroshikuonegaishimasu"
-- Phrase cards (Travel saves in particular) need real spacing, which cannot be
-- recovered from kana, so it is stored alongside the reading instead.
--
-- Nullable and unbacked: existing cards keep falling back to the romanised
-- reading until they are edited or regenerated.
alter table public.cards add column if not exists romaji text;

comment on column public.cards.romaji is
  'Word-spaced Hepburn romaji. Falls back to romanising `reading` when empty.';
