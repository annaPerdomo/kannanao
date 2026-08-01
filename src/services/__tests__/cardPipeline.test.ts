import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GeneratedCard } from '@/types/flashcard';

vi.mock('@/services/api', () => ({
  generateFlashcards: vi.fn(),
  fetchImage: vi.fn(),
  triggerUnsplashDownload: vi.fn(),
  encodeUnsplashUrl: vi.fn((r: { url: string }) => `${r.url}#unsplash:name=Ansel`),
}));

import { encodeUnsplashUrl, fetchImage, generateFlashcards } from '@/services/api';

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

beforeEach(() => {
  vi.mocked(fetchImage).mockReset();
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
    vi.mocked(fetchImage).mockResolvedValue(image);

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
    vi.mocked(fetchImage).mockRejectedValue(new Error('rate limited'));

    const [card] = await withImages([generated()], 'deck-1', 'hiragana');

    expect(card.imageUrl).toBeUndefined();
    expect(card.word).toBe('猫');
  });

  it('skips the image call when there is no query', async () => {
    const [card] = await withImages([generated({ image_query: '  ' })], 'deck-1', 'hiragana');

    expect(fetchImage).not.toHaveBeenCalled();
    expect(card.image_query).toBe('');
  });

  it('defaults a missing jlpt level to undefined rather than null', async () => {
    vi.mocked(fetchImage).mockResolvedValue(null);

    const [card] = await withImages([generated({ jlpt_level: null })], 'deck-1', 'hiragana');

    expect(card.jlptLevel).toBeUndefined();
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
    vi.mocked(fetchImage).mockResolvedValue(image);

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
    expect(fetchImage).not.toHaveBeenCalled();
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
});
