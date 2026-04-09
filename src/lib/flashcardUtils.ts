import type { Flashcard, JlptLevel } from "@/types/flashcard";

/** XP earned (and HP displayed) per card, scaled by JLPT difficulty. */
export function cardXp(jlptLevel?: JlptLevel | null): number {
  switch (jlptLevel) {
    case 'N1': return 120;
    case 'N2': return 100;
    case 'N3': return 80;
    case 'N4': return 60;
    case 'N5': return 40;
    default:   return 40;
  }
}

export interface FlashcardDisplayText {
  titleText: string;
  subtitleText?: string;
}

export function getFlashcardDisplayText(card: Flashcard): FlashcardDisplayText {
  const hasReading = Boolean(card.reading?.trim());

  const titleText =
    card.mainViewMode === "kanji"
      ? card.word
      : hasReading
      ? card.reading
      : card.word;

  const subtitleText =
    card.mainViewMode === "kanji" && hasReading
      ? card.reading
      : undefined;

  return {
    titleText,
    subtitleText,
  };
}
