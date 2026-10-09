import type { PendingCard } from '@/components/ReviewCardsDialog';
import type { QuizletDraftCard } from '@/lib/quizlet';
import { mainViewModeFor } from '@/lib/quizlet';
import type { Flashcard, GeneratedCard, JlptLevel } from '@/types/flashcard';
import type { PlanCard } from '@/types/lessonPlan';

const WEEK_ORDINAL_RE = /^(?:Week\s*\d+|第\d+週)\s*[—–-]\s*/u;

/** Fixed goal for a textbook-page upload — the page travels as an attached document because the route caps `goal` at GOAL_MAX. */
export function pageTextGoal(): string {
  return 'Pick the vocabulary a learner needs from the attached textbook page.';
}

/** The lesson title with its week-ordinal prefix stripped, for prefilling the AI goal field. */
export function goalFromLessonTitle(title: string | null): string {
  if (!title) return '';
  return title.replace(WEEK_ORDINAL_RE, '').trim();
}

/** Drops excluded cards and maps the rest onto `GeneratedCard`s for `reuseThenFetch`. */
export function planCardsToGenerated(cards: PlanCard[]): GeneratedCard[] {
  return cards
    .filter((card) => !card.excluded)
    .map((card) => ({
      word: card.word,
      reading: card.reading,
      meaning: card.meaning,
      image_query: card.imageQuery ?? '',
      example_jp: card.exampleJp,
      example_en: card.exampleEn,
      card_type: 'word',
      jlpt_level: (card.jlptLevel ?? null) as JlptLevel | null,
    }));
}

export function quizletCardsToPending(cards: QuizletDraftCard[]): PendingCard[] {
  return cards.map((card) => ({
    word: card.word,
    reading: card.reading,
    meaning: card.meaning,
    example_jp: card.exampleJp,
    example_en: card.exampleEn,
    image_query: card.imageQuery,
    imageUrl: card.imageUrl ?? undefined,
    jlptLevel: (card.jlptLevel ?? undefined) as JlptLevel | undefined,
    mainViewMode: mainViewModeFor(card.word, card.reading),
    cardType: card.cardType,
  }));
}

/** Fills only the card's empty fields from a freshly generated card; the teacher's own entries always win. */
export function fillEmptyFields(card: Flashcard, generated: GeneratedCard): Flashcard {
  return {
    ...card,
    reading: card.reading.trim() ? card.reading : (generated.reading ?? ''),
    romaji: card.romaji?.trim() ? card.romaji : (generated.romaji ?? card.romaji),
    meaning: card.meaning.trim() ? card.meaning : (generated.meaning ?? ''),
    example_jp: card.example_jp.trim() ? card.example_jp : (generated.example_jp ?? ''),
    example_en: card.example_en.trim() ? card.example_en : (generated.example_en ?? ''),
    jlptLevel: card.jlptLevel ?? generated.jlpt_level ?? undefined,
  };
}
