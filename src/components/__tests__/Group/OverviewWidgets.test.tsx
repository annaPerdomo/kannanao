import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DeckReadinessPanel } from '@/components/Group/DeckReadiness';
import { PracticeStrength } from '@/components/Group/PracticeStrength';
import { ReteachNext } from '@/components/Group/ReteachNext';
import type { DeckReadiness, DeckReadinessData } from '@/hooks/useDeckReadiness';
import type { DifficultWord } from '@/hooks/useDifficultWords';
import type { GroupMember } from '@/hooks/useGroup';
import type { GroupActivity } from '@/hooks/useGroupActivity';
import { DataError } from '@/lib/dataError';
import { renderWithProviders } from '@/test/renderWithProviders';

const readinessState: {
  data: DeckReadinessData | null;
  loading: boolean;
  error: DataError | null;
  errorMessage: string | null;
} = {
  data: null,
  loading: false,
  error: null,
  errorMessage: null,
};

vi.mock('@/hooks/useDeckReadiness', () => ({
  useDeckReadiness: () => readinessState,
}));

function deck(overrides: Partial<DeckReadiness> = {}): DeckReadiness {
  return {
    deckId: 'd1',
    deckName: 'Animals',
    deckEmoji: '🐾',
    cardCount: 10,
    learnerCount: 2,
    strong: 2,
    learning: 4,
    unseen: 14,
    accuracyPct: 55,
    strugglingLearnerIds: [],
    ...overrides,
  };
}

function member(id: string, displayName: string): GroupMember {
  return {
    id,
    username: displayName.toLowerCase(),
    displayName,
    createdAt: '2026-01-01T00:00:00Z',
    level: 1,
    totalXp: 0,
    streakDays: 0,
    totalCardsStudied: 0,
    totalCorrect: 0,
    totalSessions: 0,
    lastActive: null,
    lastNudgedAt: null,
    masteryLearning: 0,
    masteryStrong: 0,
    reviewsWaiting: 0,
    reviewsOverdue3d: 0,
  };
}

describe('DeckReadinessPanel', () => {
  beforeEach(() => {
    readinessState.data = null;
    readinessState.loading = false;
    readinessState.error = null;
    readinessState.errorMessage = null;
  });

  it('says what to do about the deck in plain words', () => {
    readinessState.data = { decks: [deck({ strong: 18, learning: 1, unseen: 1 })] };
    renderWithProviders(<DeckReadinessPanel groupId="g1" members={[]} onViewLearners={vi.fn()} />);
    expect(screen.getByText('Ready to move on')).toBeInTheDocument();
    expect(screen.getByText('90% strong')).toBeInTheDocument();
  });

  it('names the learners who are struggling', () => {
    readinessState.data = { decks: [deck({ strugglingLearnerIds: ['m1', 'm2'] })] };
    renderWithProviders(
      <DeckReadinessPanel
        groupId="g1"
        members={[member('m1', 'Mika'), member('m2', 'Ken')]}
        onViewLearners={vi.fn()}
      />,
    );
    expect(screen.getByText('2 learners are finding this hard: Mika, Ken')).toBeInTheDocument();
  });

  it('still describes a deck nobody is assigned yet', () => {
    readinessState.data = { decks: [deck({ strong: 0, learning: 0, unseen: 0 })] };
    renderWithProviders(<DeckReadinessPanel groupId="g1" members={[]} onViewLearners={vi.fn()} />);
    expect(
      screen.getByRole('button', {
        name: 'Animals — 0% strong, 0% learning, 0% not started. Nobody has started yet. See learners.',
      }),
    ).toBeInTheDocument();
  });

  it('does not tell an educator to reteach a deck nobody has opened', () => {
    readinessState.data = { decks: [deck({ strong: 0, learning: 0, unseen: 20 })] };
    renderWithProviders(<DeckReadinessPanel groupId="g1" members={[]} onViewLearners={vi.fn()} />);
    expect(screen.getByText('Nobody has started yet')).toBeInTheDocument();
    expect(screen.queryByText('Needs another lesson')).not.toBeInTheDocument();
  });

  it('keeps the verdict in step with the percentage above it', () => {
    readinessState.data = { decks: [deck({ strong: 159, learning: 1, unseen: 40 })] };
    renderWithProviders(<DeckReadinessPanel groupId="g1" members={[]} onViewLearners={vi.fn()} />);
    expect(screen.getByText('80% strong')).toBeInTheDocument();
    expect(screen.getByText('Ready to move on')).toBeInTheDocument();
  });

  it('counts only the learners it can name', () => {
    readinessState.data = { decks: [deck({ strugglingLearnerIds: ['m1', 'left', 'gone'] })] };
    renderWithProviders(
      <DeckReadinessPanel groupId="g1" members={[member('m1', 'Mika')]} onViewLearners={vi.fn()} />,
    );
    expect(screen.getByText('1 learner is finding this hard: Mika')).toBeInTheDocument();
  });

  it('sends a row click to the learners tab', () => {
    const onViewLearners = vi.fn();
    readinessState.data = { decks: [deck()] };
    renderWithProviders(
      <DeckReadinessPanel groupId="g1" members={[]} onViewLearners={onViewLearners} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Animals/ }));
    expect(onViewLearners).toHaveBeenCalledTimes(1);
  });

  it('shows its own error without borrowing another widget’s', () => {
    readinessState.error = new DataError('upstream', 'HTTP 503');
    readinessState.errorMessage = 'Failed to load deck progress';
    renderWithProviders(<DeckReadinessPanel groupId="g1" members={[]} onViewLearners={vi.fn()} />);
    expect(screen.getByText('Failed to load deck progress')).toBeInTheDocument();
  });

  it('keeps the cached rows on screen when a refresh fails', () => {
    readinessState.data = { decks: [deck({ strong: 18, learning: 1, unseen: 1 })] };
    readinessState.error = new DataError('upstream', 'HTTP 503');
    readinessState.errorMessage = 'Failed to load deck progress';
    renderWithProviders(<DeckReadinessPanel groupId="g1" members={[]} onViewLearners={vi.fn()} />);
    expect(screen.getByText('Failed to load deck progress')).toBeInTheDocument();
    expect(screen.getByText('90% strong')).toBeInTheDocument();
  });
});

describe('PracticeStrength', () => {
  function activity(modeBreakdown: GroupActivity['modeBreakdown']): GroupActivity {
    return {
      days: [],
      totals: { cards: [], xp: [], correct: [], durationSecs: [] },
      members: [],
      modeBreakdown,
    };
  }

  it('replaces a thin sample with words instead of a misleading bar', () => {
    renderWithProviders(
      <PracticeStrength
        activity={activity([
          { mode: 'listen', sessions: 1, cardsStudied: 3, cardsCorrect: 0, accuracy: 0 },
        ])}
        loading={false}
        error={null}
      />,
    );
    expect(screen.getByText('Not enough practice yet')).toBeInTheDocument();
    expect(screen.queryByText('0% right')).not.toBeInTheDocument();
  });

  it('shows the accuracy for a mode with enough practice', () => {
    renderWithProviders(
      <PracticeStrength
        activity={activity([
          { mode: 'listen', sessions: 4, cardsStudied: 40, cardsCorrect: 22, accuracy: 55 },
        ])}
        loading={false}
        error={null}
      />,
    );
    expect(screen.getByText('55% right')).toBeInTheDocument();
    expect(screen.getByText('40 cards')).toBeInTheDocument();
  });

  it('collapses a long mode list instead of running down the column', () => {
    const modes = ['study', 'review', 'match', 'fill', 'recall', 'quiz', 'listen'].map(
      (mode, i) => ({
        mode,
        sessions: 4,
        cardsStudied: 40,
        cardsCorrect: 20,
        accuracy: 50 + i,
      }),
    );
    renderWithProviders(
      <PracticeStrength activity={activity(modes)} loading={false} error={null} />,
    );
    expect(screen.queryByText('Listen')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show all 7' }));
    expect(screen.getByText('Listen')).toBeInTheDocument();
  });
});

describe('ReteachNext', () => {
  function word(overrides: Partial<DifficultWord> = {}): DifficultWord {
    return {
      cardId: 'c1',
      deckId: 'd1',
      deckName: 'Animals',
      deckEmoji: '🐾',
      word: '犬',
      reading: 'いぬ',
      meaning: 'dog',
      reason: 'forgotten',
      learnersAffected: 2,
      learnerCount: 3,
      attemptCount: 12,
      classAccuracy: 40,
      ...overrides,
    };
  }

  it('shows only the first three words and both ways forward', () => {
    const onViewWords = vi.fn();
    const onOpenMaterials = vi.fn();
    renderWithProviders(
      <ReteachNext
        words={[
          word(),
          word({ cardId: 'c2', word: '猫' }),
          word({ cardId: 'c3', word: '鳥' }),
          word({ cardId: 'c4', word: '魚' }),
        ]}
        loading={false}
        error={null}
        onViewWords={onViewWords}
        onOpenMaterials={onOpenMaterials}
      />,
    );
    expect(screen.getByText('犬')).toBeInTheDocument();
    expect(screen.queryByText('魚')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /See all tricky words/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Build a review lesson' }));
    expect(onViewWords).toHaveBeenCalledTimes(1);
    expect(onOpenMaterials).toHaveBeenCalledTimes(1);
  });

  it('stays useful when the group has no tricky words', () => {
    renderWithProviders(
      <ReteachNext
        words={[]}
        loading={false}
        error={null}
        onViewWords={vi.fn()}
        onOpenMaterials={vi.fn()}
      />,
    );
    expect(screen.getByText(/No tricky words right now/)).toBeInTheDocument();
  });
});
