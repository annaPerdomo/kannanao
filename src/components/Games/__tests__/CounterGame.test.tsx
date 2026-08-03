import { fireEvent, screen } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import type * as CountersData from '../countersData';

const mockStartSession = vi.fn().mockResolvedValue('session-1');
const mockRecordAnswer = vi.fn().mockResolvedValue(undefined);
const mockEndSession = vi.fn().mockResolvedValue(undefined);

vi.mock('@/hooks/useProgress', () => ({
  useProgress: () => ({
    startSession: mockStartSession,
    recordAnswer: mockRecordAnswer,
    endSession: mockEndSession,
    addBonusXp: vi.fn(),
  }),
  XP_PER_WRONG: 2,
}));

vi.mock('@/contexts/XpAnimationContext', () => ({
  useXpAnimation: () => ({ pendingXp: [], triggerXpEarned: vi.fn(), dismissXpEvent: vi.fn() }),
}));

// Two fixed rounds so the assertions don't depend on the random round builder.
vi.mock('../countersData', async (importOriginal) => {
  const actual = await importOriginal<typeof CountersData>();
  return {
    ...actual,
    buildCounterRounds: () => [
      {
        item: { id: 'apple', emoji: '🍎', series: 'tsu' as const },
        count: 3,
        answer: 'みっつ',
        options: ['みっつ', 'ふたつ', 'よっつ', 'さんまい'],
      },
      {
        item: { id: 'boy', emoji: '👦', series: 'nin' as const },
        count: 2,
        answer: 'ふたり',
        options: ['ふたり', 'ひとり', 'さんにん', 'にまい'],
      },
    ],
  };
});

import { CounterGame } from '../CounterGame';

/** Tap a chip and let the session promises inside useGameSession settle. */
async function tap(label: string) {
  await act(async () => {
    fireEvent.click(screen.getByText(label));
  });
}

describe('CounterGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('renders one emoji per thing with a countable label', () => {
    renderWithProviders(<CounterGame />);
    const block = screen.getByRole('img', { name: '3 apples' });
    expect(block.textContent).toBe('🍎🍎🍎');
    expect(screen.getByText('いくつ ですか。')).toBeInTheDocument();
  });

  it('advances to the next round after a correct tap', async () => {
    renderWithProviders(<CounterGame />);
    await tap('みっつ');
    expect(mockRecordAnswer).toHaveBeenCalledWith('session-1', true, undefined, undefined);

    act(() => vi.advanceTimersByTime(1600));
    expect(screen.getByRole('img', { name: '2 boys' })).toBeInTheDocument();
    expect(screen.getByText('なんにん ですか。')).toBeInTheDocument();
  });

  it('shows the correct reading after a wrong tap', async () => {
    renderWithProviders(<CounterGame />);
    await tap('さんまい');

    expect(screen.getByText('みっつ — 3 apples')).toBeInTheDocument();
    expect(mockRecordAnswer).toHaveBeenCalledWith('session-1', false, undefined, undefined);
  });

  it('ends the session once the last round is answered', async () => {
    renderWithProviders(<CounterGame />);
    await tap('みっつ');
    act(() => vi.advanceTimersByTime(1600));
    await tap('ふたり');
    await act(async () => {
      vi.advanceTimersByTime(1600);
    });

    expect(mockEndSession).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({ cardsStudied: 2, cardsCorrect: 2 }),
    );
  });
});
