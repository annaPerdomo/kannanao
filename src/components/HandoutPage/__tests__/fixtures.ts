import type { HandoutLearnerSummary } from '@/lib/handoutWords';
import type { Flashcard } from '@/types/flashcard';
import type { LessonUnitWeek } from '@/types/lessonUnit';

export function week(overrides: Partial<LessonUnitWeek> = {}): LessonUnitWeek {
  return {
    deckId: 'd1',
    deckName: 'Food',
    deckEmoji: '🍜',
    week: 1,
    title: null,
    note: null,
    dueDate: '2026-10-09',
    availableOn: '2026-10-02',
    requiredAccuracy: null,
    requiredMode: null,
    learnerCount: 2,
    finishedCount: 1,
    wordCount: 2,
    status: 'current',
    ...overrides,
  };
}

export function card(id: string, word = `word-${id}`): Flashcard {
  return {
    id,
    deckId: 'd1',
    word,
    reading: '',
    meaning: `meaning-${id}`,
    image_query: '',
    example_jp: '',
    example_en: '',
    mainViewMode: 'hiragana',
    cardType: 'word',
    position: 0,
  };
}

export function learner(overrides: Partial<HandoutLearnerSummary> = {}): HandoutLearnerSummary {
  return {
    id: 'm1',
    name: 'Hana',
    assigned: true,
    strong: 0,
    learning: 0,
    unseen: 2,
    tricky: 0,
    lastPracticedAt: null,
    ...overrides,
  };
}
