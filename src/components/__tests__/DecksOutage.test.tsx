// Lives here, not in src/pages/__tests__: everything under src/pages is a
// legacy Pages Router route, and a test file there fails `next build` as a page.
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const useDecksMock = vi.fn();
vi.mock('@/hooks/useDecks', () => ({ useDecks: () => useDecksMock() }));

const authState = { user: { id: 'u1' } as { id: string } | null, isMemberAccount: false };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));

vi.mock('@/components/CreateDeckDialog', () => ({ CreateDeckDialog: () => null }));
vi.mock('@/components/ShareEmbedDialog', () => ({ ShareEmbedDialog: () => null }));

import { DataError } from '@/lib/dataError';
import Decks from '@/pages/Decks';
import type { Deck } from '@/types/deck';

function makeDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: 'deck-1',
    name: 'Kanji Basics',
    description: '',
    createdAt: Date.now(),
    cardCount: 3,
    ownerId: 'u1',
    isShared: false,
    emoji: '📘',
    pinned: false,
    isPublic: false,
    position: 0,
    ...overrides,
  };
}

function decksState(overrides: Record<string, unknown> = {}) {
  return {
    decks: [],
    loading: false,
    error: null,
    retry: vi.fn(),
    deleteDeck: vi.fn(),
    pinDeck: vi.fn(),
    setDeckPublic: vi.fn(),
    updateDeckEmoji: vi.fn(),
    reorderDecks: vi.fn(),
    ...overrides,
  };
}

describe('the deck library during an outage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = { id: 'u1' };
    authState.isMemberAccount = false;
  });

  it('shows the error state, not "no decks yet", when the library failed to load', () => {
    useDecksMock.mockReturnValue(
      decksState({ error: new DataError('upstream', 'gateway down', { status: 503 }) }),
    );

    renderWithProviders(<Decks />);

    expect(screen.getByText('Our side is having a problem')).toBeInTheDocument();
    expect(screen.queryByText('No decks yet!')).not.toBeInTheDocument();
  });

  it('shows the friendly empty state, not an error, for a learner with genuinely no decks', () => {
    useDecksMock.mockReturnValue(decksState({ decks: [], error: null }));

    renderWithProviders(<Decks />);

    expect(screen.getByText('No decks yet!')).toBeInTheDocument();
    expect(screen.queryByText('Our side is having a problem')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('the deck library in its ordinary states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = { id: 'u1' };
    authState.isMemberAccount = false;
  });

  it('shows the loading state while the library is still coming in', () => {
    useDecksMock.mockReturnValue(decksState({ loading: true }));
    renderWithProviders(<Decks />);
    expect(screen.queryByText('No decks yet!')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeInTheDocument();
  });

  it('renders a deck the learner owns', () => {
    useDecksMock.mockReturnValue(decksState({ decks: [makeDeck()] }));
    renderWithProviders(<Decks />);
    expect(screen.getByText('Kanji Basics')).toBeInTheDocument();
    expect(screen.queryByText('No decks yet!')).not.toBeInTheDocument();
  });

  it('separates pinned decks from the rest', () => {
    useDecksMock.mockReturnValue(
      decksState({
        decks: [
          makeDeck({ id: 'a', name: 'Pinned One', pinned: true }),
          makeDeck({ id: 'b', name: 'Plain One' }),
        ],
      }),
    );
    renderWithProviders(<Decks />);
    expect(screen.getByText('Pinned One')).toBeInTheDocument();
    expect(screen.getByText('Plain One')).toBeInTheDocument();
  });

  it('offers reordering once there is more than one deck', () => {
    useDecksMock.mockReturnValue(
      decksState({ decks: [makeDeck({ id: 'a' }), makeDeck({ id: 'b', name: 'Second' })] }),
    );
    renderWithProviders(<Decks />);
    const reorder = screen.getByRole('button', { name: /reorder/i });
    fireEvent.click(reorder);
    expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
  });

  it('opens the create-deck flow from the new deck button', () => {
    useDecksMock.mockReturnValue(decksState({ decks: [makeDeck()] }));
    renderWithProviders(<Decks />);
    expect(screen.getByRole('button', { name: /new deck/i })).toBeInTheDocument();
  });

  it('renders the sortable grid while reordering', () => {
    useDecksMock.mockReturnValue(
      decksState({ decks: [makeDeck({ id: 'a' }), makeDeck({ id: 'b', name: 'Second' })] }),
    );
    renderWithProviders(<Decks />);

    fireEvent.click(screen.getByRole('button', { name: /reorder/i }));
    expect(screen.getByText('Kanji Basics')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('tells a member their organizer has not shared anything yet', () => {
    authState.isMemberAccount = true;
    useDecksMock.mockReturnValue(decksState({ decks: [] }));
    renderWithProviders(<Decks />);

    expect(screen.getByText('No decks shared yet!')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /new deck/i })).not.toBeInTheDocument();
  });

  it("marks another owner's deck as shared rather than editable", () => {
    useDecksMock.mockReturnValue(
      decksState({ decks: [makeDeck({ ownerId: 'someone-else', isShared: true })] }),
    );
    renderWithProviders(<Decks />);

    expect(screen.getByText('Kanji Basics')).toBeInTheDocument();
  });
});
