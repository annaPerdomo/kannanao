import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GeneratedCard } from '@/types/flashcard';

vi.mock('@/services/api', () => ({
  generateFlashcards: vi.fn(),
  fetchImagesBatch: vi.fn(),
  encodeUnsplashUrl: vi.fn((r: { url: string }) => `${r.url}#unsplash:name=Ansel`),
  IMAGE_BATCH_SIZE: 25,
}));

import { encodeUnsplashUrl, fetchImagesBatch, generateFlashcards } from '@/services/api';

import { alignGenerated, buildTravelCards, readingFromFurigana, withImages } from '../cardPipeline';

const generated = (over: Partial<GeneratedCard> = {}): GeneratedCard => ({
  word: '猫',
  reading: 'ねこ',
  romaji: 'neko',
  meaning: 'cat',
  image_query: 'sleeping cat',
  example_jp: '{猫|ねこ}が{好|す}きです。',
  example_en: 'I like cats.',
  card_type: 'word',
  jlpt_level: 'N5',
  ...over,
});

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
  vi.mocked(generateFlashcards).mockReset();
  vi.mocked(encodeUnsplashUrl).mockClear();
});

describe('readingFromFurigana', () => {
  it('resolves furigana markup to kana', () => {
    expect(readingFromFurigana('お{会計|かいけい}お{願|ねが}いします')).toBe(
      'おかいけいおねがいします',
    );
  });

  it('passes through text that is already kana', () => {
    expect(readingFromFurigana('ありがとうございます')).toBe('ありがとうございます');
  });

  it('keeps punctuation and katakana', () => {
    expect(readingFromFurigana('コーヒー、ください。')).toBe('コーヒー、ください。');
  });

  it('returns empty when kanji survives, rather than half-kana', () => {
    expect(readingFromFurigana('会計をお願いします')).toBe('');
  });
});

describe('withImages', () => {
  it('maps every generated field onto the app card shape', async () => {
    answerWith(image);

    const [card] = await withImages([generated()], 'deck-1', 'kanji');

    expect(card).toMatchObject({
      word: '猫',
      reading: 'ねこ',
      romaji: 'neko',
      meaning: 'cat',
      image_query: 'sleeping cat',
      example_jp: '{猫|ねこ}が{好|す}きです。',
      example_en: 'I like cats.',
      deckId: 'deck-1',
      mainViewMode: 'kanji',
      cardType: 'word',
      jlptLevel: 'N5',
    });
    expect(card.imageUrl).toContain('cat.jpg');
  });

  it('still returns a card when the image lookup fails', async () => {
    vi.mocked(fetchImagesBatch).mockRejectedValue(new Error('rate limited'));

    const [card] = await withImages([generated()], 'deck-1', 'hiragana');

    expect(card.imageUrl).toBeUndefined();
    expect(card.word).toBe('猫');
  });

  it('skips the image call when there is no query', async () => {
    const [card] = await withImages([generated({ image_query: '  ' })], 'deck-1', 'hiragana');

    expect(fetchImagesBatch).not.toHaveBeenCalled();
    expect(card.image_query).toBe('');
  });

  it('skips the image call entirely when generateImages is false', async () => {
    answerWith(image);

    const [card] = await withImages([generated()], 'deck-1', 'hiragana', false);

    expect(fetchImagesBatch).not.toHaveBeenCalled();
    expect(card.imageUrl).toBeUndefined();
  });

  it('defaults a missing jlpt level to undefined rather than null', async () => {
    answerWith(null);

    const [card] = await withImages([generated({ jlpt_level: null })], 'deck-1', 'hiragana');

    expect(card.jlptLevel).toBeUndefined();
  });

  // 60 cards used to mean 60 parallel single-photo requests, which spends the
  // images route's per-minute budget on the first few and leaves the rest bare.
  it('asks for every photo in batches instead of one request per card', async () => {
    answerWith(image);
    const cards = Array.from({ length: 30 }, (_, i) => generated({ image_query: `query ${i}` }));

    const built = await withImages(cards, 'deck-1', 'hiragana');

    expect(fetchImagesBatch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetchImagesBatch).mock.calls[0][0]).toHaveLength(25);
    expect(vi.mocked(fetchImagesBatch).mock.calls[1][0]).toHaveLength(5);
    expect(built.every((c) => c.imageUrl)).toBe(true);
  });

  it('spends one search on a query two cards share', async () => {
    answerWith(image);
    const cards = [generated(), generated({ word: '猫さん' })];

    const built = await withImages(cards, 'deck-1', 'hiragana');

    expect(vi.mocked(fetchImagesBatch).mock.calls[0][0]).toEqual([{ query: 'sleeping cat' }]);
    expect(built[0].imageUrl).toBe(built[1].imageUrl);
  });

  it('stops asking once the hourly allowance is gone', async () => {
    vi.mocked(fetchImagesBatch).mockResolvedValue({
      results: [],
      rateLimited: true,
      stopped: false,
      remaining: 0,
    });
    const cards = Array.from({ length: 30 }, (_, i) => generated({ image_query: `query ${i}` }));

    const built = await withImages(cards, 'deck-1', 'hiragana');

    expect(fetchImagesBatch).toHaveBeenCalledTimes(1);
    expect(built).toHaveLength(30);
  });
});

describe('alignGenerated', () => {
  it('matches positionally when the counts agree', () => {
    const cards = [generated({ word: 'a' }), generated({ word: 'b' })];
    expect(alignGenerated(['a', 'b'], cards)).toEqual(cards);
  });

  it('falls back to word matching and leaves holes when a card is missing', () => {
    const cards = [generated({ word: 'b' })];
    expect(alignGenerated(['a', 'b'], cards)).toEqual([undefined, cards[0]]);
  });
});

describe('buildTravelCards', () => {
  const phrase = {
    japanese: 'お{会計|かいけい}お{願|ねが}いします',
    romaji: 'okaikei onegaishimasu',
    english: 'Check, please',
  };

  // Travel pairs each generated card back to the phrase it asked about by
  // position, so it must never opt into topic expansion — one extra card would
  // shift every phrase after it onto the wrong entry.
  it('never asks /api/generate to expand topics', async () => {
    vi.mocked(generateFlashcards).mockResolvedValue([generated({ word: 'お会計お願いします' })]);
    answerWith(image);

    await buildTravelCards([phrase], 'deck-1', { mainViewMode: 'romaji', enrich: true });

    const payload = vi.mocked(generateFlashcards).mock.calls[0][0];
    expect(payload.expandTopics).toBeUndefined();
  });

  it('generates full cards and keeps the traveller-facing English as the meaning', async () => {
    vi.mocked(generateFlashcards).mockResolvedValue([
      generated({
        word: 'お会計お願いします',
        reading: 'おかいけいおねがいします',
        meaning: 'please give me the bill',
        image_query: 'restaurant bill',
        romaji: 'okaikei o negai shimasu',
        card_type: 'phrase',
        jlpt_level: 'N4',
      }),
    ]);
    answerWith(image);

    const [card] = await buildTravelCards([phrase], 'deck-1', {
      mainViewMode: 'romaji',
      enrich: true,
    });

    expect(generateFlashcards).toHaveBeenCalledWith({ pendingWords: ['お会計お願いします'] });
    expect(card).toMatchObject({
      word: 'お会計お願いします',
      reading: 'おかいけいおねがいします',
      // The traveller's own spaced romaji wins over whatever the model returned.
      romaji: 'okaikei onegaishimasu',
      meaning: 'Check, please',
      example_jp: '{猫|ねこ}が{好|す}きです。',
      cardType: 'phrase',
      jlptLevel: 'N4',
      mainViewMode: 'romaji',
      deckId: 'deck-1',
    });
    expect(card.imageUrl).toContain('cat.jpg');
  });

  it('falls back to a locally built card when generation fails', async () => {
    vi.mocked(generateFlashcards).mockRejectedValue(new Error('403'));

    const [card] = await buildTravelCards([phrase], 'deck-1', {
      mainViewMode: 'hiragana',
      enrich: true,
    });

    expect(card).toMatchObject({
      word: 'お会計お願いします',
      // Kana, never romaji — romaji here broke furigana and typed answers.
      reading: 'おかいけいおねがいします',
      romaji: 'okaikei onegaishimasu',
      meaning: 'Check, please',
      example_jp: 'お{会計|かいけい}お{願|ねが}いします',
      example_en: 'Check, please',
      cardType: 'phrase',
      mainViewMode: 'hiragana',
    });
  });

  it('does not call the paid routes for member accounts', async () => {
    const [card] = await buildTravelCards([phrase], 'deck-1', {
      mainViewMode: 'romaji',
      enrich: false,
    });

    expect(generateFlashcards).not.toHaveBeenCalled();
    expect(fetchImagesBatch).not.toHaveBeenCalled();
    expect(card.reading).toBe('おかいけいおねがいします');
    expect(card.romaji).toBe('okaikei onegaishimasu');
  });

  it('batches requests so a large save is not rejected wholesale', async () => {
    const phrases = Array.from({ length: 51 }, (_, i) => ({
      japanese: `ことば${i}`,
      romaji: `kotoba${i}`,
      english: `word ${i}`,
    }));
    vi.mocked(generateFlashcards).mockImplementation(async ({ pendingWords }) =>
      pendingWords.map((w) => generated({ word: w, image_query: '' })),
    );

    const cards = await buildTravelCards(phrases, 'deck-1', {
      mainViewMode: 'hiragana',
      enrich: true,
    });

    expect(generateFlashcards).toHaveBeenCalledTimes(2);
    expect(vi.mocked(generateFlashcards).mock.calls[0][0].pendingWords).toHaveLength(50);
    expect(vi.mocked(generateFlashcards).mock.calls[1][0].pendingWords).toHaveLength(1);
    expect(cards).toHaveLength(51);
  });

  // One withImages call for the whole save, not one per phrase: each call is a
  // batch request, and the images route allows only a few of those a minute.
  it('looks the whole save up in one batch, not one request per phrase', async () => {
    const phrases = Array.from({ length: 8 }, (_, i) => ({
      japanese: `ことば${i}`,
      romaji: `kotoba${i}`,
      english: `word ${i}`,
    }));
    vi.mocked(generateFlashcards).mockImplementation(async ({ pendingWords }) =>
      pendingWords.map((w) => generated({ word: w, image_query: `photo of ${w}` })),
    );
    answerWith(image);

    const cards = await buildTravelCards(phrases, 'deck-1', {
      mainViewMode: 'hiragana',
      enrich: true,
    });

    expect(fetchImagesBatch).toHaveBeenCalledTimes(1);
    expect(cards).toHaveLength(8);
    expect(cards.every((c) => c.imageUrl)).toBe(true);
  });

  it('keeps the local fallback for a phrase the model skipped', async () => {
    const phrases = [phrase, { japanese: 'ありがとう', romaji: 'arigatou', english: 'thanks' }];
    vi.mocked(generateFlashcards).mockResolvedValue([
      generated({ word: 'ありがとう', meaning: 'thank you' }),
    ]);
    answerWith(image);

    const cards = await buildTravelCards(phrases, 'deck-1', {
      mainViewMode: 'hiragana',
      enrich: true,
    });

    // Alignment leaves a hole for the first phrase, so it keeps its local card
    // while the second still gets the generated one — not shifted onto it.
    expect(cards[0].imageUrl).toBeUndefined();
    expect(cards[0].word).toBe('お会計お願いします');
    expect(cards[1].word).toBe('ありがとう');
    expect(cards[1].imageUrl).toContain('cat.jpg');
  });
});
