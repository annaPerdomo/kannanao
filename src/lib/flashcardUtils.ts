import { toRomaji } from 'wanakana';

import { shuffle } from '@/lib/reviewGames';
import type { Flashcard, JlptLevel } from '@/types/flashcard';

/** XP earned (and HP displayed) per card, scaled by JLPT difficulty. */
export function cardXp(jlptLevel?: JlptLevel | null): number {
  switch (jlptLevel) {
    case 'N1':
      return 120;
    case 'N2':
      return 100;
    case 'N3':
      return 80;
    case 'N4':
      return 60;
    case 'N5':
      return 40;
    default:
      return 40;
  }
}

/**
 * Multiple-choice options for a card: its meaning plus up to three distractor
 * meanings drawn at random from the rest of the pool, all shuffled. Shared by
 * the Guess-It practice mode and the review Boss Round so the distractor logic
 * lives in one place.
 */
export function buildMeaningChoices(correct: Flashcard, pool: Flashcard[]): string[] {
  // Dedupe by meaning text: a pool with synonyms (two cards meaning "cold")
  // used to produce two identical options — one graded wrong — plus duplicate
  // React keys in every choice grid.
  const seen = new Set<string>([correct.meaning.trim()]);
  const candidates: string[] = [];
  for (const c of pool) {
    if (c.id === correct.id) continue;
    const meaning = c.meaning?.trim();
    if (!meaning || seen.has(meaning)) continue;
    seen.add(meaning);
    candidates.push(meaning);
  }
  return shuffle([...shuffle(candidates).slice(0, 3), correct.meaning]);
}

/**
 * Shrinks a title's font size as its character count grows, so long words
 * stay on one line inside the card's fixed width instead of wrapping.
 */
export function titleFontSize(text: string, baseRem: number, minRem: number): string {
  const len = text.length;
  let scale = 1;
  if (len > 8) scale = 0.55;
  else if (len > 6) scale = 0.65;
  else if (len > 4) scale = 0.8;
  const size = Math.round(Math.max(minRem, baseRem * scale) * 100) / 100;
  return `${size}rem`;
}

/**
 * Romaji for the front of a card.
 *
 * Prefers the stored, word-spaced romaji. Romanising the kana reading is only
 * readable for a single word — a whole phrase comes back as one unbroken run
 * ("hajimemashite,yoroshikuonegaishimasu") because kana carries no word
 * boundaries. Cards written before the `romaji` column existed still take that
 * path, so at least give the punctuation room to breathe.
 */
export function romajiFor(card: Pick<Flashcard, 'romaji' | 'reading'>): string {
  const stored = card.romaji?.trim();
  if (stored) return stored;
  return toRomaji(card.reading)
    .replace(/([,.!?;:])(?=\S)/g, '$1 ')
    .trim();
}

export interface FlashcardDisplayText {
  titleText: string;
  subtitleText?: string;
  /** Text to pass to TTS — always the Japanese text when available. */
  speakText: string;
}

export function getFlashcardDisplayText(card: Flashcard): FlashcardDisplayText {
  const hasReading = Boolean(card.reading?.trim());
  const hasRomaji = hasReading || Boolean(card.romaji?.trim());

  let titleText: string;
  let subtitleText: string | undefined;

  if (card.mainViewMode === 'kanji') {
    titleText = card.word;
    subtitleText = hasReading ? card.reading : undefined;
  } else if (card.mainViewMode === 'romaji') {
    titleText = hasRomaji ? romajiFor(card) : card.word;
    subtitleText = card.word;
  } else {
    // hiragana
    titleText = hasReading ? card.reading : card.word;
    subtitleText = undefined;
  }

  // TTS should always speak the Japanese text (card.word), not romaji
  const speakText = card.word;

  return {
    titleText,
    subtitleText,
    speakText,
  };
}
