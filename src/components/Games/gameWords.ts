/**
 * Pure mapping from the user's flashcards to review-game items, with the
 * starter sets from `data.ts` as fallback for accounts with no cards yet.
 *
 * Selection is due-first: cards the SRS says are due today lead every session
 * (so "played a game" advances the same schedule as "did my review"), then the
 * rest of the user's vocabulary tops the session up. Everything here is
 * side-effect-free so it can be unit tested without mocks.
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
  /** Source card id — omitted for starter-set fallback words (no SRS write). */
  cardId?: string;
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
  /** Source card id — omitted for starter-set fallback words (no SRS write). */
  cardId?: string;
}

/**
 * Order the user's cards for a game session: every due card first (in the
 * soonest-first order `getDueCards` returned them), then a random top-up from
 * the rest of their collection, excluding ids already taken. Only the top-up
 * is shuffled, so due cards always lead the session and get practiced first.
 */
export function orderDueFirst(dueCards: Flashcard[], allCards: Flashcard[]): Flashcard[] {
  const seen = new Set<string>();
  const ordered: Flashcard[] = [];
  for (const card of dueCards) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    ordered.push(card);
  }
  const topUp = shuffle(allCards.filter((card) => !seen.has(card.id)));
  return [...ordered, ...topUp];
}

/**
 * Word Match items, due-first from the user's cards (deduped by display text),
 * or the starter vocabulary when there are no usable cards yet. Due cards keep
 * their leading position; the cap trims the random top-up, never the due cards.
 */
export function pickMatchWords(
  dueCards: Flashcard[],
  allCards: Flashcard[],
  max = MATCH_SESSION_WORDS,
): MatchWord[] {
  const seen = new Set<string>();
  const fromCards: MatchWord[] = [];
  for (const card of orderDueFirst(dueCards, allCards)) {
    if (fromCards.length >= max) break;
    const { titleText, speakText } = getFlashcardDisplayText(card);
    const jp = titleText?.trim();
    const meaning = card.meaning?.trim();
    if (!jp || !meaning || seen.has(jp)) continue;
    seen.add(jp);
    fromCards.push({
      jp,
      english: meaning,
      speak: speakText,
      jlpt: card.jlptLevel,
      cardId: card.id,
    });
  }

  if (fromCards.length >= 2) return fromCards;

  // Brand-new account with no usable cards — starter vocabulary. No cardId, so
  // free play never tries to schedule a card that doesn't exist.
  return shuffle(
    VOCAB_WORDS.map((w) => ({ jp: w.jp, english: w.english, emoji: w.emoji, speak: w.jp })),
  ).slice(0, max);
}

/**
 * Kana Builder items, due-first: cards whose reading (or word) is pure kana and
 * short enough to build from tiles. Falls back to the katakana starter set.
 */
export function pickKanaWords(
  dueCards: Flashcard[],
  allCards: Flashcard[],
  max = KANA_SESSION_WORDS,
): KanaWord[] {
  const seen = new Set<string>();
  const fromCards: KanaWord[] = [];
  for (const card of orderDueFirst(dueCards, allCards)) {
    if (fromCards.length >= max) break;
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
      cardId: card.id,
    });
  }

  if (fromCards.length > 0) return fromCards;

  return shuffle(
    KATAKANA_WORDS.map((w) => ({
      target: hiraganaToKatakana(w.hiragana),
      english: w.english,
      hint: w.hiragana,
      emoji: w.emoji,
      speak: w.hiragana,
    })),
  ).slice(0, max);
}
