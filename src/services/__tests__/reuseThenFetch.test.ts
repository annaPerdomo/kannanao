import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Flashcard, GeneratedCard } from '@/types/flashcard';

vi.mock('@/services/api', () => ({
  generateFlashcards: vi.fn(),
  fetchImagesBatch: vi.fn(),
  encodeUnsplashUrl: vi.fn((r: { url: string }) => `${r.url}#unsplash:name=Ansel`),
  IMAGE_BATCH_SIZE: 25,
}));

vi.mock('@/lib/supabase', () => ({
  dbFindCardsByWords: vi.fn(),
}));

import { dbFindCardsByWords } from '@/lib/supabase';
import { fetchImagesBatch } from '@/services/api';

import { reuseThenFetch, withImages } from '../cardPipeline';

function generated(word: string, over: Partial<GeneratedCard> = {}): GeneratedCard {
  return {
    word,
    reading: 'よみ',
    romaji: 'yomi',
    meaning: 'fresh meaning',
    image_query: `fresh query for ${word}`,
    example_jp: `{${word}|よみ}です`,
    example_en: 'fresh example',
    card_type: 'word',
    jlpt_level: 'N5',
    ...over,
  } as GeneratedCard;
}

function saved(word: string, over: Partial<Flashcard> = {}): Flashcard {
  return {
    id: `id-${word}`,
    deckId: 'old-deck',
    position: 3,
    word,
    reading: 'ねこ',
    romaji: 'neko',
    meaning: 'the meaning I fixed',
    image_query: 'my query',
    example_jp: 'my sentence',
    example_en: 'my translation',
    imageUrl: 'https://example.com/mine.jpg',
    mainViewMode: 'romaji',
    cardType: 'word',
    ...over,
  } as Flashcard;
}

const match = (word: string, deckName = 'Japanese Level 1', over?: Partial<Flashcard>) =>
  new Map([[word, { card: saved(word, over), deckName }]]);

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
  vi.mocked(dbFindCardsByWords).mockReset().mockResolvedValue(new Map());
});

describe('reuseThenFetch', () => {
  it('reuses a match from another deck without spending an image fetch on it', async () => {
    vi.mocked(dbFindCardsByWords).mockResolvedValue(match('猫', 'Japanese Level 1'));
    answerWith(image);

    const [card] = await reuseThenFetch([generated('猫')], 'deck-1', 'hiragana');

    expect(card).toMatchObject({
      word: '猫',
      meaning: 'the meaning I fixed',
      reusedFrom: 'Japanese Level 1',
      showingFresh: false,
    });
    expect(card.alternate).toMatchObject({
      word: '猫',
      meaning: 'fresh meaning',
      deckId: 'deck-1',
    });
    expect(fetchImagesBatch).not.toHaveBeenCalled();
  });

  it('ignores a match already in the target deck and fetches a fresh image instead', async () => {
    vi.mocked(dbFindCardsByWords).mockResolvedValue(match('猫', 'This Deck', { deckId: 'deck-1' }));
    answerWith(image);

    const [card] = await reuseThenFetch([generated('猫')], 'deck-1', 'hiragana');

    expect(card.reusedFrom).toBeUndefined();
    expect(card.alternate).toBeUndefined();
    expect(card.imageUrl).toContain('cat.jpg');
    expect(fetchImagesBatch).toHaveBeenCalledTimes(1);
  });

  it('preserves input order when reused and fresh cards interleave', async () => {
    const existing = new Map([...match('犬', 'Deck A'), ...match('鳥', 'Deck B')]);
    vi.mocked(dbFindCardsByWords).mockResolvedValue(existing);
    answerWith(image);

    const cards = await reuseThenFetch(
      [generated('犬'), generated('猫'), generated('鳥'), generated('魚')],
      'deck-1',
      'hiragana',
    );

    expect(cards.map((c) => c.word)).toEqual(['犬', '猫', '鳥', '魚']);
    expect(cards[0].reusedFrom).toBe('Deck A');
    expect(cards[2].reusedFrom).toBe('Deck B');
    expect(cards[1].reusedFrom).toBeUndefined();
    expect(cards[1].imageUrl).toContain('cat.jpg');
    expect(cards[3].reusedFrom).toBeUndefined();
    expect(cards[3].imageUrl).toContain('cat.jpg');
  });

  it('degrades to plain withImages behavior when nothing is known', async () => {
    answerWith(image);
    const generatedCards = [generated('猫'), generated('犬')];

    const viaReuse = await reuseThenFetch(generatedCards, 'deck-1', 'hiragana');
    answerWith(image);
    const viaWithImages = await withImages(generatedCards, 'deck-1', 'hiragana');

    expect(viaReuse).toEqual(viaWithImages);
  });
});
