import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateDeckFlow } from '@/components/CreateDeckDialog/useCreateDeckFlow';

const createDeck = vi.fn();
const pinDeck = vi.fn();
const setDeckReadingPractice = vi.fn();

vi.mock('@/hooks/useDecks', () => ({
  useDecks: () => ({ createDeck, pinDeck, setDeckReadingPractice }),
}));

vi.mock('@/hooks/useGenerateFlashcards', () => ({
  useGenerateFlashcards: () => ({
    generating: false,
    error: null,
    generate: vi.fn().mockResolvedValue([]),
  }),
}));

function renderFlow() {
  return renderHook(() => useCreateDeckFlow(vi.fn()));
}

beforeEach(() => {
  vi.clearAllMocks();
  createDeck.mockResolvedValue({ id: 'deck1', name: 'Kanji deck' });
});

describe('useCreateDeckFlow reading practice', () => {
  it('follows the main view mode while the toggle is untouched', () => {
    const { result } = renderFlow();
    expect(result.current.readingPractice).toBe(false);

    act(() => result.current.setMainViewMode('kanji'));
    expect(result.current.readingPractice).toBe(true);
    expect(result.current.readingAuto).toBe(true);

    act(() => result.current.setMainViewMode('hiragana'));
    expect(result.current.readingPractice).toBe(false);
  });

  it('stops auto-syncing once the user flips the toggle themselves', () => {
    const { result } = renderFlow();

    act(() => result.current.setMainViewMode('kanji'));
    act(() => result.current.setReadingPractice(false));
    expect(result.current.readingAuto).toBe(false);

    act(() => result.current.setMainViewMode('romaji'));
    act(() => result.current.setMainViewMode('kanji'));
    expect(result.current.readingPractice).toBe(false);
  });

  it('marks a manual turn-on as user-chosen, not automatic', () => {
    const { result } = renderFlow();

    act(() => result.current.setReadingPractice(true));
    expect(result.current.readingPractice).toBe(true);
    expect(result.current.readingAuto).toBe(false);
  });

  it('unlocks reading practice on the created deck when enabled', async () => {
    const { result } = renderFlow();

    act(() => result.current.setName('Kanji deck'));
    act(() => result.current.setMainViewMode('kanji'));
    await act(() => result.current.handleCreate());

    expect(createDeck).toHaveBeenCalledWith('Kanji deck', undefined);
    expect(setDeckReadingPractice).toHaveBeenCalledWith('deck1', true);
  });

  it('leaves reading practice locked when the toggle is off', async () => {
    const { result } = renderFlow();

    act(() => result.current.setName('Kana deck'));
    await act(() => result.current.handleCreate());

    expect(createDeck).toHaveBeenCalled();
    expect(setDeckReadingPractice).not.toHaveBeenCalled();
  });
});
