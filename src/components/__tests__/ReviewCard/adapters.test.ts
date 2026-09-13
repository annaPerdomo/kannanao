import { describe, expect, it } from 'vitest';

import { pendingToReview, reviewPatchToPending } from '@/components/ReviewCard';
import type { PendingCard } from '@/components/ReviewCardsDialog';

function pendingCard(over: Partial<PendingCard> = {}): PendingCard {
  return {
    word: '猫',
    reading: 'ねこ',
    meaning: 'cat',
    image_query: 'cat',
    example_jp: '{猫|ねこ}がいる。',
    example_en: 'There is a cat.',
    mainViewMode: 'kanji',
    cardType: 'word',
    ...over,
  };
}

describe('pendingToReview / reviewPatchToPending', () => {
  it('maps every renamed field to the review shape', () => {
    const card = pendingCard({ imageUrl: 'https://example.com/cat.png', jlptLevel: 'N5' });
    expect(pendingToReview(card)).toEqual({
      word: '猫',
      reading: 'ねこ',
      meaning: 'cat',
      exampleJp: '{猫|ねこ}がいる。',
      exampleEn: 'There is a cat.',
      imageQuery: 'cat',
      imageUrl: 'https://example.com/cat.png',
      jlptLevel: 'N5',
    });
  });

  it('defaults a missing image or JLPT level to null', () => {
    const card = pendingCard();
    expect(pendingToReview(card).imageUrl).toBeNull();
    expect(pendingToReview(card).jlptLevel).toBeNull();
  });

  it('round-trips a patch back to the PendingCard field names', () => {
    const patch = reviewPatchToPending({
      word: '犬',
      reading: 'いぬ',
      meaning: 'dog',
      exampleJp: '{犬|いぬ}がいる。',
      exampleEn: 'There is a dog.',
      imageQuery: 'dog',
      imageUrl: 'https://example.com/dog.png',
      jlptLevel: 'N4',
    });
    expect(patch).toEqual({
      word: '犬',
      reading: 'いぬ',
      meaning: 'dog',
      example_jp: '{犬|いぬ}がいる。',
      example_en: 'There is a dog.',
      image_query: 'dog',
      imageUrl: 'https://example.com/dog.png',
      jlptLevel: 'N4',
    });
  });

  it('converts a null imageUrl or jlptLevel patch to undefined', () => {
    expect(reviewPatchToPending({ imageUrl: null })).toEqual({ imageUrl: undefined });
    expect(reviewPatchToPending({ jlptLevel: null })).toEqual({ jlptLevel: undefined });
  });
});
