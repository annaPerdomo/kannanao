import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetchImagesBatch = vi.fn();

vi.mock('@/services/api', () => ({
  fetchImagesBatch: (...args: unknown[]) => mockFetchImagesBatch(...args),
  encodeUnsplashUrl: (r: { url: string }) => `${r.url}#unsplash:name=Jane`,
  IMAGE_BATCH_SIZE: 25,
}));

import { imageQueryFor, useDeckImages } from '@/hooks/useDeckImages';
import type { Flashcard } from '@/types/flashcard';

function card(i: number, overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: `card-${i}`,
    word: `語${i}`,
    reading: 'ご',
    meaning: `meaning ${i}`,
    image_query: `query ${i}`,
    example_jp: '',
    example_en: '',
    deckId: 'deck-1',
    mainViewMode: 'hiragana',
    cardType: 'word',
    position: i,
    ...overrides,
  };
}

function photo(slug: string) {
  return {
    url: `https://images.unsplash.com/${slug}`,
    downloadLocation: `https://api.unsplash.com/photos/${slug}/download`,
    photographerName: 'Jane',
    photographerUrl: 'https://unsplash.com/@jane',
    photoPageUrl: `https://unsplash.com/photos/${slug}`,
  };
}

/** Answers every query it is asked for, so a whole chunk resolves. */
function answerAll(remaining: number | null = 40, rateLimited = false) {
  return (items: { query: string }[]) => ({
    results: items.map(({ query }) => ({ query, result: photo(query) })),
    rateLimited,
    stopped: false,
    remaining,
  });
}

const answerEverything = async (items: { query: string }[]) => answerAll()(items);

beforeEach(() => vi.clearAllMocks());

describe('imageQueryFor', () => {
  it('prefers the generated search term, falls back to the English meaning', () => {
    expect(imageQueryFor(card(1))).toBe('query 1');
    expect(imageQueryFor(card(1, { image_query: '' }))).toBe('meaning 1');
    expect(imageQueryFor(card(1, { image_query: '', meaning: '' }))).toBe('');
  });
});

describe('useDeckImages', () => {
  it('counts only the cards that have no picture and something to search for', () => {
    const cards = [
      card(0),
      card(1, { imageUrl: 'https://images.unsplash.com/kept' }),
      card(2, { image_query: '', meaning: '' }),
    ];
    const { result } = renderHook(() => useDeckImages(cards, vi.fn()));

    expect(result.current.missingCount).toBe(1);
  });

  it('saves a picture for each card it finds one for', async () => {
    mockFetchImagesBatch.mockImplementation(answerEverything);
    const updateCard = vi.fn().mockResolvedValue(null);
    const { result } = renderHook(() => useDeckImages([card(0), card(1)], updateCard));

    await act(() => result.current.fetchSelectedImages());

    expect(result.current.result).toEqual({ added: 2, rateLimited: false, missed: 0 });
    expect(updateCard).toHaveBeenCalledWith('card-0', {
      imageUrl: 'https://images.unsplash.com/query 0#unsplash:name=Jane',
    });
  });

  it('leaves a card alone when Unsplash has no photo for its word', async () => {
    mockFetchImagesBatch.mockResolvedValue({
      results: [{ query: 'query 0', result: null }],
      rateLimited: false,
      stopped: false,
      remaining: 40,
    });
    const updateCard = vi.fn().mockResolvedValue(null);
    const { result } = renderHook(() => useDeckImages([card(0)], updateCard));

    await act(() => result.current.fetchSelectedImages());

    expect(updateCard).not.toHaveBeenCalled();
    expect(result.current.result).toEqual({ added: 0, rateLimited: false, missed: 0 });
  });

  it('sends the missing cards in chunks the route will accept', async () => {
    mockFetchImagesBatch.mockImplementation(answerEverything);
    const cards = Array.from({ length: 30 }, (_, i) => card(i));
    const { result } = renderHook(() => useDeckImages(cards, vi.fn().mockResolvedValue(null)));

    await act(() => result.current.fetchSelectedImages());

    expect(mockFetchImagesBatch).toHaveBeenCalledTimes(2);
    expect(mockFetchImagesBatch.mock.calls[0][0]).toHaveLength(25);
    expect(mockFetchImagesBatch.mock.calls[1][0]).toHaveLength(5);
    expect(result.current.result).toEqual({ added: 30, rateLimited: false, missed: 0 });
  });

  it('stops after a chunk that came back rate limited', async () => {
    mockFetchImagesBatch.mockImplementation(async (items: { query: string }[]) =>
      answerAll(0, true)(items),
    );
    const cards = Array.from({ length: 30 }, (_, i) => card(i));
    const { result } = renderHook(() => useDeckImages(cards, vi.fn().mockResolvedValue(null)));

    await act(() => result.current.fetchSelectedImages());

    expect(mockFetchImagesBatch).toHaveBeenCalledTimes(1);
    expect(result.current.result).toEqual({ added: 25, rateLimited: true, missed: 5 });
  });

  it('stops before a chunk the remaining allowance cannot pay for', async () => {
    mockFetchImagesBatch.mockImplementation(async (items: { query: string }[]) =>
      answerAll(1)(items),
    );
    const cards = Array.from({ length: 30 }, (_, i) => card(i));
    const { result } = renderHook(() => useDeckImages(cards, vi.fn().mockResolvedValue(null)));

    await act(() => result.current.fetchSelectedImages());

    expect(mockFetchImagesBatch).toHaveBeenCalledTimes(1);
    expect(result.current.result).toEqual({ added: 25, rateLimited: true, missed: 5 });
  });

  it('hands the newly pictured cards back for review', async () => {
    mockFetchImagesBatch.mockImplementation(answerEverything);
    const onFilled = vi.fn();
    const { result } = renderHook(() =>
      useDeckImages([card(0), card(1)], vi.fn().mockResolvedValue(null), onFilled),
    );

    await act(() => result.current.fetchSelectedImages());

    expect(onFilled).toHaveBeenCalledTimes(1);
    expect(onFilled.mock.calls[0][0]).toEqual([
      expect.objectContaining({
        id: 'card-0',
        imageUrl: 'https://images.unsplash.com/query 0#unsplash:name=Jane',
      }),
      expect.objectContaining({ id: 'card-1' }),
    ]);
  });

  it('opens no review when it found nothing', async () => {
    mockFetchImagesBatch.mockResolvedValue({
      results: [{ query: 'query 0', result: null }],
      rateLimited: false,
      stopped: false,
      remaining: 40,
    });
    const onFilled = vi.fn();
    const { result } = renderHook(() =>
      useDeckImages([card(0)], vi.fn().mockResolvedValue(null), onFilled),
    );

    await act(() => result.current.fetchSelectedImages());

    expect(onFilled).not.toHaveBeenCalled();
  });

  it('clears the last outcome on reset', async () => {
    mockFetchImagesBatch.mockImplementation(answerEverything);
    const { result } = renderHook(() => useDeckImages([card(0)], vi.fn().mockResolvedValue(null)));

    await act(() => result.current.fetchSelectedImages());
    expect(result.current.result).not.toBeNull();

    act(() => result.current.reset());
    expect(result.current.result).toBeNull();
  });

  it('ticks the cards with no picture and only those', () => {
    const cards = [card(0), card(1, { imageUrl: 'https://images.unsplash.com/kept' })];
    const { result } = renderHook(() => useDeckImages(cards, vi.fn()));

    expect([...result.current.selectedIds]).toEqual(['card-0']);
    expect(result.current.selectedCount).toBe(1);
    expect(result.current.pickable).toHaveLength(2);
  });

  it('searches only the ticked cards', async () => {
    mockFetchImagesBatch.mockImplementation(answerEverything);
    const updateCard = vi.fn().mockResolvedValue(null);
    const { result } = renderHook(() => useDeckImages([card(0), card(1)], updateCard));

    act(() => result.current.toggle('card-1'));
    await act(() => result.current.fetchSelectedImages());

    expect(mockFetchImagesBatch).toHaveBeenCalledWith([{ query: 'query 0', variety: false }]);
    expect(updateCard).toHaveBeenCalledTimes(1);
    expect(updateCard).toHaveBeenCalledWith('card-0', expect.anything());
  });

  it('asks for a different photo when a ticked card already has one', async () => {
    mockFetchImagesBatch.mockImplementation(answerEverything);
    const cards = [card(0, { imageUrl: 'https://images.unsplash.com/old' })];
    const { result } = renderHook(() => useDeckImages(cards, vi.fn().mockResolvedValue(null)));

    act(() => result.current.toggle('card-0'));
    await act(() => result.current.fetchSelectedImages());

    expect(mockFetchImagesBatch).toHaveBeenCalledWith([{ query: 'query 0', variety: true }]);
    expect(result.current.result).toEqual({ added: 1, rateLimited: false, missed: 0 });
  });

  it('searches nothing when no card is ticked', async () => {
    const { result } = renderHook(() => useDeckImages([card(0)], vi.fn()));

    act(() => result.current.selectNone());
    await act(() => result.current.fetchSelectedImages());

    expect(mockFetchImagesBatch).not.toHaveBeenCalled();
    expect(result.current.result).toBeNull();
  });

  it('ticks every searchable card on select all', () => {
    const cards = [
      card(0),
      card(1, { imageUrl: 'https://images.unsplash.com/kept' }),
      card(2, { image_query: '', meaning: '' }),
    ];
    const { result } = renderHook(() => useDeckImages(cards, vi.fn()));

    act(() => result.current.selectAll());

    expect([...result.current.selectedIds].sort()).toEqual(['card-0', 'card-1']);
  });

  it('unticks the cards that got a picture, so a retry asks only for the rest', async () => {
    mockFetchImagesBatch.mockResolvedValue({
      results: [{ query: 'query 0', result: photo('found') }],
      rateLimited: true,
      stopped: false,
      remaining: 0,
    });
    const { result } = renderHook(() =>
      useDeckImages([card(0), card(1)], vi.fn().mockResolvedValue(null)),
    );

    await act(() => result.current.fetchSelectedImages());

    expect([...result.current.selectedIds]).toEqual(['card-1']);
  });

  it('puts the ticks back on the bare cards on reset', async () => {
    const { result } = renderHook(() => useDeckImages([card(0), card(1)], vi.fn()));

    act(() => result.current.selectNone());
    expect(result.current.selectedCount).toBe(0);

    act(() => result.current.reset());
    expect([...result.current.selectedIds].sort()).toEqual(['card-0', 'card-1']);
  });

  it('surfaces a failed request and stops filling', async () => {
    mockFetchImagesBatch.mockRejectedValue(new Error('Too many requests'));
    const { result } = renderHook(() => useDeckImages([card(0)], vi.fn()));

    await act(() => result.current.fetchSelectedImages());

    await waitFor(() => expect(result.current.error).toBe('Too many requests'));
    expect(result.current.filling).toBe(false);
    expect(result.current.result).toEqual({ added: 0, rateLimited: false, missed: 1 });
  });

  it('keeps the pictures saved before a failure, and unticks those cards', async () => {
    const cards = Array.from({ length: 30 }, (_, i) => card(i));
    mockFetchImagesBatch
      .mockImplementationOnce(answerEverything)
      .mockRejectedValueOnce(new Error('Too many requests'));
    const onFilled = vi.fn();
    const { result } = renderHook(() =>
      useDeckImages(cards, vi.fn().mockResolvedValue(null), onFilled),
    );

    await act(() => result.current.fetchSelectedImages());

    expect(result.current.error).toBe('Too many requests');
    expect(result.current.result).toEqual({ added: 25, rateLimited: false, missed: 5 });
    // The 25 that were written must not be searched again — a retry would
    // replace photos that are already good and spend the allowance twice.
    expect([...result.current.selectedIds].sort()).toEqual([
      'card-25',
      'card-26',
      'card-27',
      'card-28',
      'card-29',
    ]);
    // The picker stays open on a failure so the message can be read.
    expect(onFilled).not.toHaveBeenCalled();
  });

  it('counts the cards a stopped run never looked up, instead of calling them pictureless', async () => {
    mockFetchImagesBatch.mockResolvedValue({
      results: [{ query: 'query 0', result: photo('found') }],
      rateLimited: false,
      stopped: true,
      remaining: 40,
    });
    const { result } = renderHook(() =>
      useDeckImages([card(0), card(1)], vi.fn().mockResolvedValue(null)),
    );

    await act(() => result.current.fetchSelectedImages());

    expect(result.current.result).toEqual({ added: 1, rateLimited: false, missed: 1 });
  });
});
