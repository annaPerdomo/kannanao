import type { Flashcard } from "@/types/flashcard";

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
