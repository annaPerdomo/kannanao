/**
 * DB columns duplicated when a card is copied; `dbCopyCardsIntoDeck` and the
 * review-week copy both use this list. Kept out of `@/lib/supabase` ('use
 * client') — importing an array from it into a server route breaks at build.
 */
export const CARD_COPY_COLUMNS = [
  'word',
  'reading',
  'romaji',
  'meaning',
  'image_url',
  'image_credit',
  'image_query',
  'example_jp',
  'example_en',
  'main_view_mode',
  'card_type',
  'jlpt_level',
] as const;
