import { toRomaji } from 'wanakana';

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

export interface FlashcardDisplayText {
  titleText: string;
  subtitleText?: string;
  /** Text to pass to TTS — always the Japanese text when available. */
  speakText: string;
}

export function getFlashcardDisplayText(card: Flashcard): FlashcardDisplayText {
  const hasReading = Boolean(card.reading?.trim());

  let titleText: string;
  let subtitleText: string | undefined;

  if (card.mainViewMode === 'kanji') {
    titleText = card.word;
    subtitleText = hasReading ? card.reading : undefined;
  } else if (card.mainViewMode === 'romaji') {
    titleText = hasReading ? toRomaji(card.reading) : card.word;
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
