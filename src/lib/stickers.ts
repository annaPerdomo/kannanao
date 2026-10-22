/**
 * Chat stickers — Tango's set plus one set per study buddy.
 *
 * A sticker message is NOT stored as an image — it is stored as an ordinary
 * text message holding a keyword token (`:wave:`). The client renders the
 * matching artwork from `/public/stickers` whenever a message's *entire* text
 * is a single token, so the database keeps storing plain 8-byte strings and no
 * upload/storage is involved. Typing the keyword by hand works exactly like
 * picking the sticker from the picker.
 *
 * Tango's ids are already in message history — never rename them. Buddy sets
 * come from the gitignored scripts/extract-buddy-stickers.py. Only the picker
 * checks ownership; rendering must not, or old messages stop resolving.
 */

export interface Sticker {
  id: string;
  /** Plain-text stand-in for surfaces that can't render the artwork
   * (push notification bodies, the conversation-list preview) */
  emoji: string;
  buddyKey: string;
  /** 1-based position in a buddy set; absent for Tango's named stickers */
  number?: number;
}

export interface StickerSet {
  buddyKey: string;
  stickers: readonly Sticker[];
}

/** Sheet order — roughly greetings → feelings → moods → doing things. */
const TANGO_STICKERS: readonly Omit<Sticker, 'buddyKey'>[] = [
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

export const STICKERS: readonly Sticker[] = TANGO_STICKERS.map((s) => ({
  ...s,
  buddyKey: 'buddy_tango',
}));

const BUDDY_SETS: readonly { buddyKey: string; art: string; count: number; emoji: string }[] = [
  { buddyKey: 'buddy_bunny', art: 'bunny', count: 35, emoji: '🐰' },
  { buddyKey: 'buddy_penguin', art: 'penguin', count: 42, emoji: '🐧' },
  { buddyKey: 'buddy_pink_cat', art: 'calico', count: 35, emoji: '🐈' },
  { buddyKey: 'buddy_panda', art: 'panda', count: 35, emoji: '🐼' },
  { buddyKey: 'buddy_otter', art: 'otter', count: 35, emoji: '🦦' },
  { buddyKey: 'buddy_kappa', art: 'kappa', count: 35, emoji: '🥒' },
  { buddyKey: 'buddy_tanuki', art: 'tanuki', count: 35, emoji: '🦝' },
  { buddyKey: 'buddy_red_panda', art: 'redpanda', count: 47, emoji: '🍁' },
  { buddyKey: 'buddy_fox', art: 'fox', count: 42, emoji: '🦊' },
  { buddyKey: 'buddy_lucky_cat', art: 'luckycat', count: 35, emoji: '🐱' },
];

export const STICKER_SETS: readonly StickerSet[] = [
  { buddyKey: 'buddy_tango', stickers: STICKERS },
  ...BUDDY_SETS.map(({ buddyKey, art, count, emoji }) => ({
    buddyKey,
    stickers: Array.from({ length: count }, (_, i) => ({
      id: `${art}-${i + 1}`,
      emoji,
      buddyKey,
      number: i + 1,
    })),
  })),
];

const BY_ID = new Map(STICKER_SETS.flatMap((set) => set.stickers.map((s) => [s.id, s] as const)));

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

const TOKEN_RE = /^:([a-z]+(?:-\d{1,2})?):$/;

export function stickerToken(id: string): string {
  return `:${id}:`;
}

export function stickerSrc(id: string): string {
  const dash = id.lastIndexOf('-');
  if (dash === -1) return `/stickers/${id}.webp`;
  return `/stickers/${id.slice(0, dash)}/${id.slice(dash + 1)}.webp`;
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
