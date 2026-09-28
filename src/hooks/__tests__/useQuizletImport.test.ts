import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateDeck = vi.fn();
const mockInsertCards = vi.fn();
const mockDeleteDeck = vi.fn();

vi.mock('@/lib/supabase', () => ({
  dbCreateDeck: (...args: unknown[]) => mockCreateDeck(...args),
  dbInsertCards: (...args: unknown[]) => mockInsertCards(...args),
  dbDeleteDeck: (...args: unknown[]) => mockDeleteDeck(...args),
  sb: { auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: 'tok' } } })) } },
}));

import { useQuizletImport } from '@/hooks/useQuizletImport';
import {
  loadQuizletQueue,
  QUIZLET_QUEUE_KEY,
  saveQuizletQueue,
  toBase64Url,
  toImportSet,
} from '@/lib/quizlet';

const VOCAB = {
  title: 'Ch 5 New Vocabulary',
  url: 'https://quizlet.com/826640589/ch-5-new-vocabulary-flash-cards/',
  cards: [
    { front: 'しゅみ', back: 'Hobby' },
    { front: 'あか 赤', back: 'red' },
  ],
};
const COLORS = {
  title: 'Ch5-5 Colors',
  url: 'https://quizlet.com/826640319/ch5-5-colors-flash-cards/',
  cards: [{ front: 'しろ 白', back: 'white' }],
};

const fetchMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/materials?tab=quizlet');
  mockCreateDeck.mockImplementation(async (name: string) => ({ id: `deck-${name}`, name }));
  mockInsertCards.mockResolvedValue([]);
  mockDeleteDeck.mockResolvedValue(undefined);
  fetchMock.mockResolvedValue(new Response('{}', { status: 201 }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

async function renderLoaded() {
  const hook = renderHook(() => useQuizletImport());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

describe('useQuizletImport', () => {
  it('takes a set from the URL hash, queues it and strips the hash', async () => {
    saveQuizletQueue([toImportSet(COLORS)]);
    window.history.replaceState(
      null,
      '',
      `/materials?tab=quizlet#quizlet=${toBase64Url(JSON.stringify(VOCAB))}`,
    );

    const { result } = await renderLoaded();

    expect(result.current.sets.map((s) => s.name)).toEqual(['Ch5-5 Colors', 'Ch 5 New Vocabulary']);
    expect(result.current.sets[1].cards[1]).toMatchObject({ word: '赤', reading: 'あか' });
    expect(window.location.hash).toBe('');
    expect(loadQuizletQueue()).toHaveLength(2);
  });

  it('adds a set sent to an already-open page without dropping edits', async () => {
    saveQuizletQueue([toImportSet(COLORS)]);
    const { result } = await renderLoaded();
    act(() => result.current.updateSet(COLORS.url, { name: 'Colors (edited)' }));

    act(() => {
      window.history.replaceState(
        null,
        '',
        `/materials?tab=quizlet#quizlet=${toBase64Url(JSON.stringify(VOCAB))}`,
      );
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(result.current.sets.map((s) => s.name)).toEqual([
      'Colors (edited)',
      'Ch 5 New Vocabulary',
    ]);
    expect(window.location.hash).toBe('');
  });

  it('reports a corrupt hash without losing the queue', async () => {
    saveQuizletQueue([toImportSet(COLORS)]);
    window.history.replaceState(null, '', '/materials?tab=quizlet#quizlet=broken');

    const { result } = await renderLoaded();

    expect(result.current.error).toBeTruthy();
    expect(result.current.sets).toHaveLength(1);
  });

  it('saves each included set as its own deck and empties the queue', async () => {
    saveQuizletQueue([toImportSet(VOCAB), toImportSet(COLORS)]);
    const { result } = await renderLoaded();

    act(() => result.current.updateCard(VOCAB.url, 0, { include: false }));
    await act(() => result.current.saveAll(null));

    expect(mockCreateDeck).toHaveBeenCalledWith('Ch 5 New Vocabulary', expect.any(String));
    expect(mockCreateDeck).toHaveBeenCalledWith('Ch5-5 Colors', expect.any(String));
    expect(mockCreateDeck.mock.calls[0][1]).not.toContain('quizlet.com');
    const [deckId, rows] = mockInsertCards.mock.calls[0];
    expect(deckId).toBe('deck-Ch 5 New Vocabulary');
    expect(rows).toEqual([
      expect.objectContaining({
        word: '赤',
        reading: 'あか',
        meaning: 'red',
        cardType: 'word',
        mainViewMode: 'kanji',
      }),
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.sets).toEqual([]);
    expect(result.current.saved.map((d) => d.cardCount)).toEqual([1, 1]);
    expect(loadQuizletQueue()).toEqual([]);
  });

  it('skips sets that were unticked', async () => {
    saveQuizletQueue([toImportSet(VOCAB), toImportSet(COLORS)]);
    const { result } = await renderLoaded();

    act(() => result.current.updateSet(COLORS.url, { include: false }));
    await act(() => result.current.saveAll(null));

    expect(mockCreateDeck).toHaveBeenCalledTimes(1);
    expect(result.current.sets.map((s) => s.url)).toEqual([COLORS.url]);
  });

  it('assigns each saved deck to the picked learners', async () => {
    saveQuizletQueue([toImportSet(VOCAB)]);
    const { result } = await renderLoaded();

    await act(() => result.current.saveAll({ groupId: 'g1', memberIds: ['kid'] }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/group/assignments');
    expect(JSON.parse(init.body)).toEqual({
      memberIds: ['kid'],
      deckId: 'deck-Ch 5 New Vocabulary',
      groupId: 'g1',
    });
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(result.current.saved[0].assigned).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('keeps the deck but flags it when the handout fails', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 500 }));
    saveQuizletQueue([toImportSet(VOCAB)]);
    const { result } = await renderLoaded();

    await act(() => result.current.saveAll({ groupId: 'g1', memberIds: ['kid'] }));

    expect(result.current.saved[0].assigned).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.sets).toEqual([]);
  });

  it('rolls back the empty deck and keeps the set queued when cards fail to save', async () => {
    mockInsertCards.mockRejectedValueOnce(new Error('db down'));
    saveQuizletQueue([toImportSet(VOCAB), toImportSet(COLORS)]);
    const { result } = await renderLoaded();

    await act(() => result.current.saveAll(null));

    expect(mockDeleteDeck).toHaveBeenCalledWith('deck-Ch 5 New Vocabulary');
    expect(mockCreateDeck).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeTruthy();
    expect(result.current.sets).toHaveLength(2);
    expect(loadQuizletQueue()).toHaveLength(2);
    expect(result.current.saving).toBe(false);
  });

  it('keeps review edits across the full page load a bookmarklet send causes', async () => {
    saveQuizletQueue([toImportSet(VOCAB)]);
    const first = await renderLoaded();
    act(() => first.result.current.updateSet(VOCAB.url, { name: 'Renamed' }));
    act(() => first.result.current.updateCard(VOCAB.url, 0, { include: false, reading: 'x' }));
    first.unmount();

    window.history.replaceState(
      null,
      '',
      `/materials?tab=quizlet#quizlet=${toBase64Url(JSON.stringify(COLORS))}`,
    );
    const { result } = await renderLoaded();

    expect(result.current.sets.map((s) => s.name)).toEqual(['Renamed', 'Ch5-5 Colors']);
    expect(result.current.sets[0].cards[0]).toMatchObject({ include: false, reading: 'x' });
  });

  it('follows another tab saving or removing a set', async () => {
    saveQuizletQueue([toImportSet(VOCAB), toImportSet(COLORS)]);
    const { result } = await renderLoaded();

    act(() => {
      localStorage.setItem(QUIZLET_QUEUE_KEY, JSON.stringify([toImportSet(COLORS)]));
      window.dispatchEvent(new StorageEvent('storage', { key: QUIZLET_QUEUE_KEY }));
    });

    expect(result.current.sets.map((s) => s.url)).toEqual([COLORS.url]);
  });

  it('never creates an empty deck from a set whose ticked cards have no word', async () => {
    saveQuizletQueue([toImportSet(COLORS)]);
    const { result } = await renderLoaded();

    act(() => result.current.updateCard(COLORS.url, 0, { word: '  ' }));
    await act(() => result.current.saveAll(null));

    expect(mockCreateDeck).not.toHaveBeenCalled();
  });

  it('removes a set from the list and the stored queue', async () => {
    saveQuizletQueue([toImportSet(VOCAB), toImportSet(COLORS)]);
    const { result } = await renderLoaded();

    act(() => result.current.removeSet(VOCAB.url));

    expect(result.current.sets.map((s) => s.url)).toEqual([COLORS.url]);
    expect(loadQuizletQueue().map((s) => s.url)).toEqual([COLORS.url]);
  });
});
