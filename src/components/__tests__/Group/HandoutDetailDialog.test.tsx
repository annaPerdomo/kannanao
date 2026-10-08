import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HandoutDetailDialog } from '@/components/Group/HandoutDetailDialog';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { HandoutRef } from '@/types/handout';

const mockUseDeckWords = vi.fn();
const mockUseHandoutWords = vi.fn();
const mockUseGroupMembers = vi.fn();

vi.mock('@/hooks/useDeckWords', () => ({
  useDeckWords: (...args: unknown[]) => mockUseDeckWords(...args),
}));

vi.mock('@/hooks/useHandoutWords', () => ({
  useHandoutWords: (...args: unknown[]) => mockUseHandoutWords(...args),
}));

vi.mock('@/hooks/useGroup', () => ({
  useGroupMembers: (...args: unknown[]) => mockUseGroupMembers(...args),
}));

function card(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    word: '犬',
    reading: 'いぬ',
    meaning: 'dog',
    image_query: '',
    example_jp: '',
    example_en: '',
    mainViewMode: 'hiragana',
    cardType: 'word',
    deckId: 'deck-1',
    position: 0,
    ...overrides,
  };
}

function deckHandout(overrides: Partial<HandoutRef> = {}): HandoutRef {
  return {
    deckId: 'deck-1',
    kanaSet: null,
    name: 'Animals',
    emoji: '🐾',
    note: 'Review before the quiz',
    availableOn: null,
    dueDate: '2026-10-01',
    requiredAccuracy: 80,
    requiredMode: 'study',
    ...overrides,
  };
}

describe('HandoutDetailDialog', () => {
  beforeEach(() => {
    mockUseDeckWords.mockReset();
    mockUseDeckWords.mockReturnValue({ words: [], loading: false, error: null });
    mockUseHandoutWords.mockReset();
    mockUseHandoutWords.mockReturnValue({ data: null, loading: false, error: null });
    mockUseGroupMembers.mockReset();
    mockUseGroupMembers.mockReturnValue({ members: [] });
  });

  it('renders title, goal, note and word rows for a deck handout', () => {
    mockUseDeckWords.mockReturnValue({
      words: [
        {
          id: 'c1',
          word: '犬',
          reading: 'いぬ',
          meaning: 'dog',
          image_query: '',
          example_jp: '',
          example_en: '',
          mainViewMode: 'hiragana',
          cardType: 'word',
          deckId: 'deck-1',
          position: 0,
        },
      ],
      loading: false,
      error: null,
    });

    renderWithProviders(<HandoutDetailDialog open onClose={vi.fn()} handout={deckHandout()} />);

    expect(screen.getByText('🐾 Animals')).toBeInTheDocument();
    expect(screen.getByText(/80%/)).toBeInTheDocument();
    expect(screen.getByText(/Review before the quiz/)).toBeInTheDocument();
    expect(screen.getByText('犬')).toBeInTheDocument();
    expect(screen.getByText('いぬ')).toBeInTheDocument();
    expect(screen.getByText('dog')).toBeInTheDocument();
  });

  it('renders characters for a kana handout', () => {
    renderWithProviders(
      <HandoutDetailDialog
        open
        onClose={vi.fn()}
        handout={deckHandout({
          deckId: null,
          kanaSet: 'hira-a',
          name: 'あ・い・う・え・お',
          emoji: null,
          requiredAccuracy: null,
          requiredMode: null,
        })}
      />,
    );

    expect(screen.getByText('あ')).toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();
  });

  it('shows the empty-deck message', () => {
    renderWithProviders(<HandoutDetailDialog open onClose={vi.fn()} handout={deckHandout()} />);

    expect(screen.getByText('This deck has no words yet.')).toBeInTheDocument();
  });

  it('shows the error alert', () => {
    mockUseDeckWords.mockReturnValue({ words: [], loading: false, error: 'boom' });

    renderWithProviders(<HandoutDetailDialog open onClose={vi.fn()} handout={deckHandout()} />);

    expect(screen.getByText("Couldn't load the words. Try again.")).toBeInTheDocument();
  });

  it('renders the plain word list when no groupId is given', () => {
    renderWithProviders(<HandoutDetailDialog open onClose={vi.fn()} handout={deckHandout()} />);

    expect(mockUseHandoutWords).not.toHaveBeenCalled();
    expect(mockUseDeckWords).toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: 'Open full page' })).not.toBeInTheDocument();
  });

  it('renders the group summary and per-word chips when groupId is given', () => {
    mockUseHandoutWords.mockReturnValue({
      data: {
        deck: { id: 'deck-1', name: 'Animals', emoji: '🐾' },
        learnerCount: 2,
        words: [{ card: card(), seenCount: 2, strongCount: 2, trickyCount: 0 }],
        learner: null,
      },
      loading: false,
      error: null,
    });

    renderWithProviders(
      <HandoutDetailDialog open onClose={vi.fn()} handout={deckHandout()} groupId="g1" />,
    );

    expect(screen.getByText(/Learners have met 1 of 1 words/)).toBeInTheDocument();
    expect(screen.getByText('2/2 seen')).toBeInTheDocument();
    expect(screen.getByText('2 strong')).toBeInTheDocument();
    expect(screen.queryByText(/tricky/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open full page' })).toHaveAttribute(
      'href',
      `/group/g1/handout/${deckHandout().deckId}`,
    );
  });

  it('shows the empty-deck message even with groupId and no learners', () => {
    mockUseHandoutWords.mockReturnValue({
      data: {
        deck: { id: 'deck-1', name: 'Animals', emoji: '🐾' },
        learnerCount: 0,
        words: [],
        learner: null,
      },
      loading: false,
      error: null,
    });

    renderWithProviders(
      <HandoutDetailDialog open onClose={vi.fn()} handout={deckHandout()} groupId="g1" />,
    );

    expect(screen.getByText('This deck has no words yet.')).toBeInTheDocument();
    expect(
      screen.queryByText('No learners in this group yet, so there is nothing to track.'),
    ).not.toBeInTheDocument();
  });

  it('shows noLearnersYet when the group has no learners', () => {
    mockUseHandoutWords.mockReturnValue({
      data: {
        deck: { id: 'deck-1', name: 'Animals', emoji: '🐾' },
        learnerCount: 0,
        words: [{ card: card(), seenCount: 0, strongCount: 0, trickyCount: 0 }],
        learner: null,
      },
      loading: false,
      error: null,
    });

    renderWithProviders(
      <HandoutDetailDialog open onClose={vi.fn()} handout={deckHandout()} groupId="g1" />,
    );

    expect(
      screen.getByText('No learners in this group yet, so there is nothing to track.'),
    ).toBeInTheDocument();
  });

  function learnerInsight(overrides: Record<string, unknown> = {}) {
    return {
      card: card(),
      strength: 'new',
      correctCount: 0,
      wrongCount: 0,
      lastReviewedAt: null,
      nextReviewAt: null,
      intervalDays: 0,
      ease: 2.5,
      tricky: false,
      ...overrides,
    };
  }

  it('renders the learner summary and up-next chips weakest-first when memberId is given', () => {
    mockUseHandoutWords.mockReturnValue({
      data: {
        deck: { id: 'deck-1', name: 'Animals', emoji: '🐾' },
        learnerCount: 1,
        words: [],
        learner: [
          learnerInsight({
            card: card({ id: 'strong', word: 'strong-word' }),
            strength: 'strong',
            correctCount: 5,
            wrongCount: 0,
            intervalDays: 3,
            ease: 2.5,
            lastReviewedAt: '2026-10-01T00:00:00Z',
            nextReviewAt: '2026-10-05',
          }),
          learnerInsight({
            card: card({ id: 'learning', word: 'learning-word' }),
            strength: 'learning',
            correctCount: 1,
            wrongCount: 1,
            intervalDays: 1,
            ease: 2.3,
            lastReviewedAt: '2026-10-02T00:00:00Z',
            nextReviewAt: '2026-10-03',
          }),
          learnerInsight({ card: card({ id: 'unseen', word: 'unseen-word' }) }),
        ],
      },
      loading: false,
      error: null,
    });

    renderWithProviders(
      <HandoutDetailDialog
        open
        onClose={vi.fn()}
        handout={deckHandout({ requiredMode: 'match' })}
        groupId="g1"
        memberId="m1"
        memberName="Naomi"
      />,
    );

    expect(
      screen.getByText(/Naomi: 1 strong · 1 still learning · 1 not yet seen/),
    ).toBeInTheDocument();

    const upNext = screen.getByText(/Up next in Practice/).parentElement;
    const chipLabels = Array.from(upNext?.querySelectorAll('.MuiChip-label') ?? []).map(
      (el) => el.textContent,
    );
    expect(chipLabels).toEqual(['learning-word', 'unseen-word', 'strong-word']);
    expect(screen.getByText('The goal round uses every word in this week.')).toBeInTheDocument();

    const wordNames = screen
      .getAllByText(/^(strong-word|learning-word|unseen-word)$/)
      .map((el) => el.textContent);
    expect(wordNames).toEqual([
      'learning-word',
      'unseen-word',
      'strong-word',
      'learning-word',
      'unseen-word',
      'strong-word',
    ]);
  });

  it('switches from the group view to one learner and back', () => {
    mockUseGroupMembers.mockReturnValue({
      members: [{ id: 'm1', username: 'naomi', displayName: 'Naomi' }],
    });
    mockUseHandoutWords.mockImplementation((args: { memberId?: string | null }) => {
      if (args.memberId) {
        return {
          data: {
            deck: { id: 'deck-1', name: 'Animals', emoji: '🐾' },
            learnerCount: 1,
            words: [],
            learner: [learnerInsight()],
          },
          loading: false,
          error: null,
        };
      }
      return {
        data: {
          deck: { id: 'deck-1', name: 'Animals', emoji: '🐾' },
          learnerCount: 1,
          words: [{ card: card(), seenCount: 1, strongCount: 0, trickyCount: 0 }],
          learner: null,
        },
        loading: false,
        error: null,
      };
    });

    renderWithProviders(
      <HandoutDetailDialog open onClose={vi.fn()} handout={deckHandout()} groupId="g1" />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'See one learner' }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Choose a learner' }));
    fireEvent.click(screen.getByText('Naomi'));

    expect(
      screen.getByText(/Naomi: 0 strong · 0 still learning · 1 not yet seen/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to the group' }));

    expect(screen.getByText(/Learners have met 1 of 1 words/)).toBeInTheDocument();
  });
});
