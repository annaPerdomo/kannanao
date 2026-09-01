import { fetchPhotos } from '@/services/cardPipeline';
import type { LessonPlan } from '@/types/lessonPlan';

/** Callers must gate this behind the "generate images" toggle — a plan that's never applied shouldn't cost an Unsplash call. */
export async function attachPlanImages(plan: LessonPlan): Promise<LessonPlan> {
  const queries = plan.decks.flatMap((deck) =>
    deck.cards.map((card) => card.imageQuery?.trim() ?? ''),
  );
  const photos = await fetchPhotos(queries);
  if (photos.size === 0) return plan;

  return {
    decks: plan.decks.map((deck) => ({
      ...deck,
      cards: deck.cards.map((card) => {
        const query = card.imageQuery?.trim();
        const imageUrl = query ? photos.get(query) : undefined;
        return imageUrl ? { ...card, imageUrl } : card;
      }),
    })),
  };
}
