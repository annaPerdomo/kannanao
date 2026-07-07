/**
 * Pure mapping from the user's flashcards to review-game items, with the
 * starter sets from `data.ts` as fallback for accounts with no cards yet.
 */
import { getFlashcardDisplayText } from '@/lib/flashcardUtils';
import { hiraganaToKatakana, isPureKana, shuffle } from '@/lib/reviewGames';
import type { Flashcard, JlptLevel } from '@/types/flashcard';

import { KATAKANA_WORDS, VOCAB_WORDS } from './data';

/** How many words a single game session draws (keeps sessions kid-sized). */
export const MATCH_SESSION_WORDS = 30;
export const KANA_SESSION_WORDS = 15;

export interface MatchWord {
  jp: string;
  english: string;
  emoji?: string;
  speak: string;
  jlpt?: JlptLevel;
}

export interface KanaWord {
  /** The kana string the player must build */
  target: string;
  english: string;
  /** Japanese text shown as a prompt hint (kanji word or hiragana source) */
  hint?: string;
  emoji?: string;
  speak: string;
  jlpt?: JlptLevel;
}

/**
 * Word Match items from the user's cards (deduped by display text), or the
 * starter vocabulary when there are no usable cards. Returns a fresh random
 * sample per call.
 */
export function pickMatchWords(cards: Flashcard[], max = MATCH_SESSION_WORDS): MatchWord[] {
  const seen = new Set<string>();
  const fromCards: MatchWord[] = [];
  for (const card of cards) {
    const { titleText, speakText } = getFlashcardDisplayText(card);
    const jp = titleText?.trim();
    const meaning = card.meaning?.trim();
    if (!jp || !meaning || seen.has(jp)) continue;
    seen.add(jp);
    fromCards.push({ jp, english: meaning, speak: speakText, jlpt: card.jlptLevel });
  }

  const pool: MatchWord[] =
    fromCards.length >= 2
      ? fromCards
      : VOCAB_WORDS.map((w) => ({ jp: w.jp, english: w.english, emoji: w.emoji, speak: w.jp }));

  return shuffle(pool).slice(0, max);
}

/**
 * Kana Builder items: cards whose reading (or word) is pure kana and short
 * enough to build from tiles. Falls back to the katakana starter set.
 */
export function pickKanaWords(cards: Flashcard[], max = KANA_SESSION_WORDS): KanaWord[] {
  const seen = new Set<string>();
  const fromCards: KanaWord[] = [];
  for (const card of cards) {
    const reading = card.reading?.trim();
    const word = card.word?.trim();
    const target =
      reading && isPureKana(reading) ? reading : word && isPureKana(word) ? word : null;
    const meaning = card.meaning?.trim();
    if (!target || !meaning || target.length < 2 || target.length > 8 || seen.has(target)) continue;
    seen.add(target);
    fromCards.push({
      target,
      english: meaning,
      hint: word && word !== target ? word : undefined,
      speak: word || target,
      jlpt: card.jlptLevel,
    });
  }

  const pool: KanaWord[] =
    fromCards.length > 0
      ? fromCards
      : KATAKANA_WORDS.map((w) => ({
          target: hiraganaToKatakana(w.hiragana),
          english: w.english,
          hint: w.hiragana,
          emoji: w.emoji,
          speak: w.hiragana,
        }));

  return shuffle(pool).slice(0, max);
}
