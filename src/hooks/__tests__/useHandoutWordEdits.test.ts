import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HandoutWords } from '@/hooks/useHandoutWords';
import type { Flashcard } from '@/types/flashcard';

const { dbUpdateCard, dbDeleteCard, dbInsertCards, dbCopyCardsIntoDeck, invalidateApiCache } =
  vi.hoisted(() => ({
    dbUpdateCard: vi.fn(),
    dbDeleteCard: vi.fn(),
    dbInsertCards: vi.fn(),
    dbCopyCardsIntoDeck: vi.fn(),
    invalidateApiCache: vi.fn(),
  }));

vi.mock('@/lib/supabase', () => ({
  dbUpdateCard,
  dbDeleteCard,
  dbInsertCards,
  dbCopyCardsIntoDeck,
}));
vi.mock('@/lib/apiCache', () => ({ invalidateApiCache }));
vi.mock('@/hooks/useLessonLibrary', () => ({ LESSON_LIBRARY_CACHE_PREFIX: '/api/group/lessons' }));

import { useHandoutWordEdits } from '@/hooks/useHandoutWordEdits';

function card(id: string, word = `word-${id}`): Flashcard {
  return {
    id,
    deckId: 'd1',
    word,
    reading: '',
    meaning: '',
    image_query: '',
    example_jp: '',
    example_en: '',
    mainViewMode: 'hiragana',
    cardType: 'word',
    position: 0,
  };
}

function initial(): HandoutWords {
  return {
    deck: { id: 'd1', name: 'Food', emoji: null },
    learnerCount: 2,
    words: [
      { card: card('c1'), seenCount: 1, strongCount: 1, trickyCount: 0 },
      { card: card('c2'), seenCount: 0, strongCount: 0, trickyCount: 0 },
    ],
    learner: null,
  };
}

const refetch = vi.fn();

function setup() {
  return renderHook(() => {
    const [data, setData] = useState<HandoutWords>(initial);
    const edits = useHandoutWordEdits({
      deckId: 'd1',
      mutate: (update) => setData((prev) => update(prev)),
      refetch,
    });
    return { data, edits };
  });
}

const ids = (data: HandoutWords) => data.words.map((w) => w.card.id);

describe('useHandoutWordEdits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refetch.mockResolvedValue(undefined);
  });

  it('updates a word in place, keeps its insight, and refreshes the lesson caches', async () => {
    dbUpdateCard.mockResolvedValue(card('c1', '犬'));
    const { result } = setup();

    let ok = false;
    await act(async () => {
      ok = await result.current.edits.updateWord(card('c1', '犬'));
    });

    expect(ok).toBe(true);
    expect(result.current.data.words[0]).toMatchObject({ card: { word: '犬' }, seenCount: 1 });
    expect(invalidateApiCache).toHaveBeenCalledWith('/api/group/lessons');
    expect(refetch).toHaveBeenCalled();
  });

  it('rolls the word back and sets error when the update fails', async () => {
    dbUpdateCard.mockResolvedValue(null);
    const { result } = setup();

    let ok = true;
    await act(async () => {
      ok = await result.current.edits.updateWord(card('c1', '犬'));
    });

    expect(ok).toBe(false);
    expect(result.current.data.words[0].card.word).toBe('word-c1');
    expect(result.current.edits.error).toBeTruthy();
  });

  it('removes a word, restoring it when the delete fails', async () => {
    dbDeleteCard.mockRejectedValueOnce(new Error('nope')).mockResolvedValueOnce(undefined);
    const { result } = setup();

    await act(async () => {
      await result.current.edits.removeWord('c1');
    });
    expect(ids(result.current.data)).toEqual(['c1', 'c2']);

    await act(async () => {
      await result.current.edits.removeWord('c1');
    });
    expect(ids(result.current.data)).toEqual(['c2']);
    expect(dbDeleteCard).toHaveBeenLastCalledWith('c1');
  });

  it('appends added words as unseen, writing them into this deck', async () => {
    dbInsertCards.mockResolvedValue([card('c3')]);
    const { result } = setup();
    const { id: _id, position: _pos, deckId: _deck, ...fields } = card('c3');

    await act(async () => {
      await result.current.edits.addWords([fields]);
    });

    expect(dbInsertCards).toHaveBeenCalledWith('d1', [expect.objectContaining({ deckId: 'd1' })]);
    expect(result.current.data.words[2]).toEqual({
      card: card('c3'),
      seenCount: 0,
      strongCount: 0,
      trickyCount: 0,
    });
  });

  it('reports an error when the insert writes nothing', async () => {
    dbInsertCards.mockResolvedValue([]);
    const { result } = setup();
    const { id: _id, position: _pos, deckId: _deck, ...fields } = card('c3');

    let ok = true;
    await act(async () => {
      ok = await result.current.edits.addWords([fields]);
    });
    expect(ok).toBe(false);
    expect(ids(result.current.data)).toEqual(['c1', 'c2']);
  });

  it('copies existing cards into the deck', async () => {
    dbCopyCardsIntoDeck.mockResolvedValue([card('c4')]);
    const { result } = setup();

    await act(async () => {
      await result.current.edits.copyWords([card('x1')]);
    });

    expect(dbCopyCardsIntoDeck).toHaveBeenCalledWith('d1', [card('x1')]);
    expect(ids(result.current.data)).toEqual(['c1', 'c2', 'c4']);
  });
});
