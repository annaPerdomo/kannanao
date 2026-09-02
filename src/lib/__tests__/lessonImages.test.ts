import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api', () => ({
  fetchImagesBatch: vi.fn(),
  encodeUnsplashUrl: vi.fn((r: { url: string }) => `${r.url}#unsplash:name=Ansel`),
  IMAGE_BATCH_SIZE: 25,
}));

import { encodeUnsplashUrl, fetchImagesBatch } from '@/services/api';
import type { LessonPlan, PlanCard, PlanDeck } from '@/types/lessonPlan';

import { attachPlanImages } from '../lessonImages';

function card(word: string, overrides: Partial<PlanCard> = {}): PlanCard {
  return {
    word,
    reading: word,
    meaning: 'meaning',
    exampleJp: 'example',
    exampleEn: 'example',
    jlptLevel: 'N5',
    ...overrides,
  };
}

function deck(name: string, cards: PlanCard[]): PlanDeck {
  return { name, description: '', emoji: '📘', mainViewMode: 'hiragana', cards };
}

const image = {
  url: 'https://images.example/cat.jpg',
  downloadLocation: 'https://api.example/download',
  photographerName: 'Ansel',
  photographerUrl: 'https://example/ansel',
  photoPageUrl: 'https://example/photo',
};

function answerWith(photo: typeof image | null) {
  vi.mocked(fetchImagesBatch).mockImplementation(async (items) => ({
    results: items.map(({ query }) => ({ query, result: photo })),
    rateLimited: false,
    stopped: false,
    remaining: 40,
  }));
}

beforeEach(() => {
  vi.mocked(fetchImagesBatch).mockReset();
  vi.mocked(encodeUnsplashUrl).mockClear();
});

describe('attachPlanImages', () => {
  it('fills imageUrl on cards that have an imageQuery', async () => {
    answerWith(image);
    const plan: LessonPlan = {
      decks: [deck('Food', [card('猫', { imageQuery: 'sleeping cat' })])],
    };

    const result = await attachPlanImages(plan);

    expect(result.decks[0].cards[0].imageUrl).toBe(`${image.url}#unsplash:name=Ansel`);
  });

  it('leaves cards without an imageQuery untouched', async () => {
    answerWith(image);
    const plan: LessonPlan = { decks: [deck('Food', [card('猫')])] };

    const result = await attachPlanImages(plan);

    expect(result.decks[0].cards[0].imageUrl).toBeUndefined();
    expect(fetchImagesBatch).not.toHaveBeenCalled();
  });

  it('leaves a card untouched when Unsplash has nothing for its query', async () => {
    answerWith(null);
    const plan: LessonPlan = {
      decks: [deck('Food', [card('猫', { imageQuery: 'sleeping cat' })])],
    };

    const result = await attachPlanImages(plan);

    expect(result.decks[0].cards[0].imageUrl).toBeUndefined();
  });

  it('batches distinct queries once and reuses the result for repeats', async () => {
    answerWith(image);
    const plan: LessonPlan = {
      decks: [
        deck('Food', [
          card('猫', { imageQuery: 'sleeping cat' }),
          card('子猫', { imageQuery: 'sleeping cat' }),
        ]),
      ],
    };

    await attachPlanImages(plan);

    expect(fetchImagesBatch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchImagesBatch).mock.calls[0][0]).toEqual([{ query: 'sleeping cat' }]);
  });

  it('returns the original plan unchanged when the batch call throws', async () => {
    vi.mocked(fetchImagesBatch).mockRejectedValue(new Error('rate limited'));
    const plan: LessonPlan = {
      decks: [deck('Food', [card('猫', { imageQuery: 'sleeping cat' })])],
    };

    const result = await attachPlanImages(plan);

    expect(result.decks[0].cards[0].imageUrl).toBeUndefined();
  });
});
