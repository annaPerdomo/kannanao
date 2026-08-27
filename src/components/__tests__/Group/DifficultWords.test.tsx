import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const useDifficultWordsMock = vi.fn();
vi.mock('@/hooks/useDifficultWords', () => ({
  useDifficultWords: (groupId: string | null, deckId?: string | null) =>
    useDifficultWordsMock(groupId, deckId),
}));

import { DifficultWords } from '@/components/Group/DifficultWords';
import type { DifficultWord } from '@/hooks/useDifficultWords';
import { DataError } from '@/lib/dataError';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function word(overrides: Partial<DifficultWord> = {}): DifficultWord {
  return {
    cardId: 'c1',
    deckId: 'deck-1',
    deckName: 'Kanji Basics',
    deckEmoji: '📘',
    word: '覚える',
    reading: 'おぼえる',
    meaning: 'to memorize',
    reason: 'forgotten',
    learnersAffected: 3,
    learnerCount: 8,
    attemptCount: 24,
    classAccuracy: 41,
    ...overrides,
  };
}

const DECKS = [{ id: 'deck-1', name: 'Kanji Basics', emoji: '📘' }];

function mockData(words: DifficultWord[], decks = DECKS) {
  useDifficultWordsMock.mockReturnValue({
    data: { learnerCount: 8, decks, words },
    loading: false,
    error: null,
    errorMessage: null,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DifficultWords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData([]);
  });

  it('asks for the whole group by default, with no deck filter applied', () => {
    renderWithProviders(<DifficultWords groupId="group-1" />);
    expect(useDifficultWordsMock).toHaveBeenCalledWith('group-1', null);
  });

  it('points the organizer at assigning a deck when the group has none', () => {
    mockData([], []);
    renderWithProviders(<DifficultWords groupId="group-1" />);
    expect(screen.getByText(/assign a deck to this group/i)).toBeInTheDocument();
  });

  it('celebrates a group with decks but nothing tricky in them', () => {
    renderWithProviders(<DifficultWords groupId="group-1" />);
    expect(screen.getByText(/no tricky words right now/i)).toBeInTheDocument();
  });

  it('names the reason in words, not colour alone, and counts who it affects', () => {
    mockData([word()]);
    renderWithProviders(<DifficultWords groupId="group-1" />);

    expect(screen.getByText('覚える')).toBeInTheDocument();
    expect(screen.getByText('Being forgotten')).toBeInTheDocument();
    expect(screen.getByText('3 of 8 learners affected')).toBeInTheDocument();
    expect(screen.getByText('41% right')).toBeInTheDocument();
  });

  it('reveals the per-reason explanation only once the row is opened', () => {
    mockData([word()]);
    renderWithProviders(<DifficultWords groupId="group-1" />);

    const row = screen.getByRole('button', { expanded: false });
    expect(screen.getByText(/had learned this word/i)).not.toBeVisible();

    fireEvent.click(row);
    expect(screen.getByRole('button', { expanded: true })).toBeInTheDocument();
    expect(screen.getByText(/had learned this word, then missed it again/i)).toBeInTheDocument();
    expect(screen.getByText('24 answers from the group so far')).toBeInTheDocument();
  });

  it('surfaces a load failure instead of an empty-looking list', () => {
    useDifficultWordsMock.mockReturnValue({
      data: null,
      loading: false,
      error: new DataError('upstream', 'HTTP 503'),
      errorMessage: 'Nope',
    });
    renderWithProviders(<DifficultWords groupId="group-1" />);
    expect(screen.getByText('Nope')).toBeInTheDocument();
  });
});
