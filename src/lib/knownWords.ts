/**
 * The vocabulary pool a sentence generator is allowed to lean on: words the
 * learner has actually answered correctly, not words that merely sit in a deck.
 */

export interface KnownWord {
  word: string;
  reading: string;
  meaning: string;
  correctCount: number;
  lastReviewedAt?: string | null;
}

export const KNOWN_WORD_CAP = 120;

/** Rank studied words: most-practised first, then most recently reviewed. Cap. */
export function rankKnownWords(rows: KnownWord[], cap = KNOWN_WORD_CAP): KnownWord[] {
  return [...rows]
    .sort((a, b) => {
      if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
      const aTime = a.lastReviewedAt ? Date.parse(a.lastReviewedAt) : 0;
      const bTime = b.lastReviewedAt ? Date.parse(b.lastReviewedAt) : 0;
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
    })
    .slice(0, Math.max(0, cap));
}

/** Words to EXCLUDE — the deck being generated for, so its own words stay the target. */
export function excludeDeckWords(pool: KnownWord[], deckWords: string[]): KnownWord[] {
  const excluded = new Set(deckWords.filter(Boolean));
  return pool.filter((w) => !excluded.has(w.word) && !excluded.has(w.reading));
}
