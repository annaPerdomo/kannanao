/**
 * Tango stickers.
 *
 * A sticker message is NOT stored as an image — it is stored as an ordinary
 * text message holding a keyword token (`:wave:`). The client renders the
 * matching artwork from `/public/stickers` whenever a message's *entire* text
 * is a single token, so the database keeps storing plain 8-byte strings and no
 * upload/storage is involved. Typing the keyword by hand works exactly like
 * picking the sticker from the picker.
 *
 * Artwork was extracted from `promo/tango-stickers.png` (one 7×5 sheet) into
 * 256×256 transparent WebPs, one per id below.
 */

export interface Sticker {
  /** Keyword; also the asset filename and the token between the colons */
  id: string;
  /** Plain-text stand-in for surfaces that can't render the artwork
   * (push notification bodies, the conversation-list preview) */
  emoji: string;
}

/** Sheet order — roughly greetings → feelings → moods → doing things. */
export const STICKERS: readonly Sticker[] = [
  { id: 'wave', emoji: '👋' },
  { id: 'happy', emoji: '😄' },
  { id: 'amazing', emoji: '🤩' },
  { id: 'heart', emoji: '💗' },
  { id: 'love', emoji: '😍' },
  { id: 'yay', emoji: '🙌' },
  { id: 'cute', emoji: '🐕' },
  { id: 'sad', emoji: '🥺' },
  { id: 'goodnight', emoji: '😴' },
  { id: 'surprised', emoji: '😲' },
  { id: 'worried', emoji: '😰' },
  { id: 'angry', emoji: '😠' },
  { id: 'phew', emoji: '😌' },
  { id: 'wink', emoji: '😉' },
  { id: 'cool', emoji: '😎' },
  { id: 'shy', emoji: '☺️' },
  { id: 'lol', emoji: '😂' },
  { id: 'blush', emoji: '😊' },
  { id: 'thinking', emoji: '🤔' },
  { id: 'dance', emoji: '🎶' },
  { id: 'fire', emoji: '🔥' },
  { id: 'study', emoji: '📖' },
  { id: 'homework', emoji: '✏️' },
  { id: 'cheer', emoji: '📣' },
  { id: 'tea', emoji: '🍵' },
  { id: 'laptop', emoji: '💻' },
  { id: 'ganbaru', emoji: '💪' },
  { id: 'party', emoji: '🎉' },
  { id: 'crying', emoji: '😭' },
  { id: 'relax', emoji: '🛋️' },
  { id: 'peek', emoji: '👀' },
  { id: 'box', emoji: '📦' },
  { id: 'thumbsup', emoji: '👍' },
  { id: 'cozy', emoji: '🛏️' },
  { id: 'hooray', emoji: '🎊' },
];

const BY_ID = new Map(STICKERS.map((s) => [s.id, s]));

/** Extra keywords people are likely to type for a sticker that already exists.
 * They resolve to the canonical id — nothing is ever *stored* as an alias
 * (ChatPanel normalizes before sending), so this is purely input convenience. */
const ALIASES: Readonly<Record<string, string>> = {
  hi: 'wave',
  hello: 'wave',
  bye: 'wave',
  ok: 'thumbsup',
  good: 'thumbsup',
  sleep: 'goodnight',
  sleepy: 'goodnight',
  cry: 'crying',
  laugh: 'lol',
  haha: 'lol',
  wow: 'amazing',
  think: 'thinking',
  ganbatte: 'ganbaru',
  gambaru: 'ganbaru',
  congrats: 'hooray',
  hug: 'heart',
};

/** `:wave:` — lowercase letters only, so real text with colons never matches. */
const TOKEN_RE = /^:([a-z]+):$/;

export function stickerToken(id: string): string {
  return `:${id}:`;
}

export function stickerSrc(id: string): string {
  return `/stickers/${id}.webp`;
}

/**
 * Resolve a message body to a sticker. Only a message whose *whole* text is
 * one token counts — `"see you :wave:"` stays plain text, so a sticker can
 * never swallow something the sender meant to say.
 */
export function parseSticker(text: string | null | undefined): Sticker | null {
  if (!text) return null;
  const match = TOKEN_RE.exec(text.trim().toLowerCase());
  if (!match) return null;
  return BY_ID.get(ALIASES[match[1]] ?? match[1]) ?? null;
}
