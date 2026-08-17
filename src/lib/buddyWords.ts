export interface BuddyWord {
  word: string;
  reading?: string;
}

export const RECENT_WORD_CAP = 10;
export const SAMPLE_SIZE = 3;

/** Mirrors remember_buddy_words: an over-long entry is truncated, not dropped. */
export const MAX_WORD_LENGTH = 64;

interface WordSource {
  word?: string | null;
  reading?: string | null;
}

function clip(value: string): string {
  return value.slice(0, MAX_WORD_LENGTH);
}

export function toBuddyWord(value: unknown): BuddyWord | null {
  if (!value || typeof value !== 'object') return null;
  const { word, reading } = value as WordSource;
  if (typeof word !== 'string' || word.trim() === '') return null;
  const cleaned: BuddyWord = { word: clip(word.trim()) };
  if (typeof reading === 'string' && reading.trim() !== '') cleaned.reading = clip(reading.trim());
  return cleaned;
}

export function buddyWordText(word: BuddyWord): string {
  return word.reading?.trim() || word.word;
}

/** Parses a `recent_words` column, dropping anything that isn't a usable word. */
export function normalizeWords(value: unknown): BuddyWord[] {
  if (!Array.isArray(value)) return [];
  const words: BuddyWord[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const word = toBuddyWord(entry);
    if (!word || seen.has(word.word)) continue;
    seen.add(word.word);
    words.push(word);
  }
  return words.slice(0, RECENT_WORD_CAP);
}

export function sampleBuddyWords(cards: readonly unknown[], limit = SAMPLE_SIZE): BuddyWord[] {
  const seen = new Set<string>();
  const pool: BuddyWord[] = [];
  for (const card of cards) {
    const word = toBuddyWord(card);
    if (!word || seen.has(word.word)) continue;
    seen.add(word.word);
    pool.push(word);
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.max(0, limit));
}

/**
 * Newest first, de-duplicated by word, capped — the optimistic twin of the
 * remember_buddy_words RPC. Both must agree, or the window visibly reshuffles
 * when the server's answer replaces the local guess.
 */
export function mergeWords(
  incoming: readonly unknown[],
  existing: readonly BuddyWord[],
): BuddyWord[] {
  const merged: BuddyWord[] = [];
  const byWord = new Map<string, BuddyWord>();
  for (const entry of [...incoming, ...existing]) {
    const word = toBuddyWord(entry);
    if (!word) continue;
    const kept = byWord.get(word.word);
    if (kept) {
      // Newest position wins, but the reading survives: the same word can
      // arrive from a deck that never filled one in.
      if (!kept.reading && word.reading) kept.reading = word.reading;
      continue;
    }
    byWord.set(word.word, word);
    merged.push(word);
  }
  return merged.slice(0, RECENT_WORD_CAP);
}
