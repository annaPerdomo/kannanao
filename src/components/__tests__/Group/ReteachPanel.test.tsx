import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { Deck } from '@/types/deck';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const useItemAnalysisMock = vi.fn();
vi.mock('@/hooks/useItemAnalysis', () => ({
  useItemAnalysis: (deckId: string | null) => useItemAnalysisMock(deckId),
}));

import { ReteachPanel, reteachSentence } from '@/components/Group/ReteachPanel';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function deck(id: string, name: string): Deck {
  return { id, name, createdAt: 0, cardCount: 10, ownerId: 'org-1', emoji: '📗', position: 0 };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

// reteachSentence is the panel's core copy logic — the MUI Select menu itself
// is left untested (portal + ResizeObserver don't render meaningfully in jsdom,
// and per the testing guide we skip MUI rendering details).
describe('reteachSentence', () => {
  it('says "all" when every attempting student is struggling', () => {
    expect(reteachSentence(3, 3)).toBe('All 3 students who tried it keep missing this word.');
  });

  it('uses singular grammar for a lone attempting student', () => {
    expect(reteachSentence(1, 1)).toBe('All 1 student who tried it keep missing this word.');
  });

  it('gives an "N of M" fraction when only some are struggling', () => {
    expect(reteachSentence(2, 5)).toBe('2 of 5 students who tried it keep missing this word.');
  });
});

describe('ReteachPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useItemAnalysisMock.mockReturnValue({ analysis: null, loading: false, error: null });
  });

  it('renders nothing when the organizer has no decks', () => {
    const { container } = renderWithProviders(<ReteachPanel decks={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('prompts to pick a deck and stays idle before a deck is chosen', () => {
    renderWithProviders(<ReteachPanel decks={[deck('deck-1', 'N5')]} />);
    expect(screen.getByText(/pick a deck to see which words/i)).toBeInTheDocument();
    // Idle: the hook is called with a null deckId until the teacher picks one.
    expect(useItemAnalysisMock).toHaveBeenCalledWith(null);
  });
});
