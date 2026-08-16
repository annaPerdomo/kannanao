export interface BuddyWord {
  word: string;
  reading?: string;
}

export const RECENT_WORD_CAP = 10;
export const SAMPLE_SIZE = 3;

/** Per user: signing out of one account must not hand its words to the next. */
const STORAGE_PREFIX = 'kannanao:buddy-words:';

interface WordSource {
  word?: string | null;
  reading?: string | null;
}

function toBuddyWord(value: unknown): BuddyWord | null {
  if (!value || typeof value !== 'object') return null;
  const { word, reading } = value as WordSource;
  if (typeof word !== 'string' || word.trim() === '') return null;
  const cleaned: BuddyWord = { word: word.trim() };
  if (typeof reading === 'string' && reading.trim() !== '') cleaned.reading = reading.trim();
  return cleaned;
}

export function buddyWordText(word: BuddyWord): string {
  return word.reading?.trim() || word.word;
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

function storageKey(userId: string | null | undefined): string | null {
  return userId ? STORAGE_PREFIX + userId : null;
}

/** Newest first — callers name `[0]` as the most recent word. */
export function recentWords(userId: string | null | undefined): BuddyWord[] {
  const key = storageKey(userId);
  if (!key || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const words: BuddyWord[] = [];
    const seen = new Set<string>();
    for (const entry of parsed) {
      const word = toBuddyWord(entry);
      if (!word || seen.has(word.word)) continue;
      seen.add(word.word);
      words.push(word);
    }
    return words.slice(0, RECENT_WORD_CAP);
  } catch {
    return [];
  }
}

export function rememberWords(
  userId: string | null | undefined,
  words: readonly unknown[],
): BuddyWord[] {
  const key = storageKey(userId);
  if (!key) return [];

  const incoming: BuddyWord[] = [];
  for (const entry of words) {
    const word = toBuddyWord(entry);
    if (word) incoming.push(word);
  }
  const existing = recentWords(userId);
  if (!incoming.length) return existing;

  const merged: BuddyWord[] = [];
  const seen = new Set<string>();
  for (const word of [...incoming, ...existing]) {
    if (seen.has(word.word)) continue;
    seen.add(word.word);
    merged.push(word);
  }
  const next = merged.slice(0, RECENT_WORD_CAP);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Storage can be blocked (Safari private mode); the words just won't stick.
    }
  }
  return next;
}

export function clearWords(userId: string | null | undefined): void {
  const key = storageKey(userId);
  if (!key || typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage can be blocked; nothing to clean up then.
  }
}
