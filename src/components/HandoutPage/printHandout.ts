import {
  buildLessonPrintableHtml,
  type PrintableLabels,
  type PrintableVariant,
} from '@/lib/lessonPrintable';
import type { Flashcard } from '@/types/flashcard';
import type { PlanDeck } from '@/types/lessonPlan';

export function handoutPrintHtml(args: {
  title: string;
  heading: string;
  locale: string;
  variant: PrintableVariant;
  deckName: string;
  emoji: string | null;
  cards: Flashcard[];
  labels: PrintableLabels;
}): string {
  const deck: PlanDeck = {
    name: args.deckName,
    description: '',
    emoji: args.emoji ?? '',
    mainViewMode: args.cards[0]?.mainViewMode ?? 'hiragana',
    cards: args.cards.map((c) => ({
      word: c.word,
      reading: c.reading,
      meaning: c.meaning,
      exampleJp: c.example_jp,
      exampleEn: c.example_en,
      jlptLevel: c.jlptLevel ?? null,
    })),
  };
  return buildLessonPrintableHtml({
    title: args.title,
    locale: args.locale,
    variant: args.variant,
    weeks: [{ heading: args.heading, deck }],
    labels: args.labels,
  });
}
