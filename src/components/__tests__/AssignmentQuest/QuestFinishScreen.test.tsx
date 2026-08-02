import { act, fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Assignment } from '@/hooks/useAssignments';
import { publishAssignmentComplete } from '@/lib/assignmentSignal';
import { renderWithProviders } from '@/test/renderWithProviders';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/components/Practice/CelebrationScreen/Particles', () => ({
  ConfettiParticles: () => null,
  FireworkParticles: () => null,
  StarParticles: () => null,
  BubbleParticles: () => null,
  EmojiRainParticles: () => null,
  HeartParticles: () => null,
  BunnyParticles: () => null,
  SparkleParticles: () => null,
}));
vi.mock('@/contexts/ShopContext', () => ({ useShopCtx: () => ({ equipped: {} }) }));
vi.mock('@/hooks/useShop', () => ({ CELEBRATION_THEMES: {}, CARD_BORDER_STYLES: {} }));

const state = vi.hoisted(() => ({
  assignments: [] as Assignment[],
  error: null as string | null,
}));
const refetch = vi.fn().mockResolvedValue(undefined);
vi.mock('@/hooks/useAssignments', () => ({
  useAssignments: () => ({
    assignments: state.assignments,
    loading: false,
    error: state.error,
    refetch,
  }),
}));

import { QuestFinishScreen } from '@/components/AssignmentQuest';

const assignment = (overrides: Partial<Assignment> = {}): Assignment =>
  ({
    id: 'a1',
    deck_id: 'd1',
    required_accuracy: 80,
    required_mode: 'match',
    progress_accuracy: null,
    completed_at: null,
    ...overrides,
  }) as Assignment;

/** The completion POST reporting in, with whatever the server closed out. */
const writeLands = async (completed: number) => {
  await act(async () => {
    publishAssignmentComplete(completed);
  });
};

beforeEach(async () => {
  refetch.mockClear();
  state.assignments = [];
  state.error = null;
  // Module state: a positive signal left over would be read as this screen's.
  publishAssignmentComplete(0);
});

describe('QuestFinishScreen', () => {
  it('waits for the completion write instead of racing it', () => {
    state.assignments = [assignment({ progress_accuracy: 70 })];
    renderWithProviders(<QuestFinishScreen assignmentId="a1" onRetry={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText(/Checking your goal/)).toBeInTheDocument();
    expect(screen.queryByText('So close!')).not.toBeInTheDocument();
  });

  it('celebrates a goal the server confirms after the screen opened', async () => {
    state.assignments = [assignment({ progress_accuracy: 90 })];
    renderWithProviders(<QuestFinishScreen assignmentId="a1" onRetry={vi.fn()} onDone={vi.fn()} />);

    state.assignments = [
      assignment({ progress_accuracy: 90, completed_at: '2026-08-02T00:00:00Z' }),
    ];
    await writeLands(1);

    expect(refetch).toHaveBeenCalled();
    expect(await screen.findByText('Assignment complete!')).toBeInTheDocument();
    expect(screen.queryByText('So close!')).not.toBeInTheDocument();
  });

  it('celebrates straight away when the assignment already reads as done', async () => {
    state.assignments = [assignment({ completed_at: '2026-08-02T00:00:00Z' })];
    renderWithProviders(<QuestFinishScreen assignmentId="a1" onRetry={vi.fn()} onDone={vi.fn()} />);
    expect(await screen.findByText('Assignment complete!')).toBeInTheDocument();
  });

  it('shows the numbers and one retry on a near miss', async () => {
    state.assignments = [assignment({ progress_accuracy: 70 })];
    const onRetry = vi.fn();
    renderWithProviders(<QuestFinishScreen assignmentId="a1" onRetry={onRetry} onDone={vi.fn()} />);
    await writeLands(0);

    expect(await screen.findByText('So close!')).toBeInTheDocument();
    expect(screen.getByText('Best so far: 70% — goal 80%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('encourages without numbers when there is no qualifying attempt yet', async () => {
    state.assignments = [assignment()];
    renderWithProviders(<QuestFinishScreen assignmentId="a1" onRetry={vi.fn()} onDone={vi.fn()} />);
    await writeLands(0);
    expect(await screen.findByText(/Give it one more go/)).toBeInTheDocument();
  });

  it('decides on its own when the write never reports in', async () => {
    vi.useFakeTimers();
    try {
      state.assignments = [assignment({ progress_accuracy: 70 })];
      renderWithProviders(
        <QuestFinishScreen assignmentId="a1" onRetry={vi.fn()} onDone={vi.fn()} />,
      );
      await act(async () => {
        vi.advanceTimersByTime(6000);
      });
    } finally {
      vi.useRealTimers();
    }
    expect(screen.getByText('So close!')).toBeInTheDocument();
  });

  it('reports a failed read as a failed read, not as a missed goal', async () => {
    state.assignments = [];
    state.error = 'failed to load';
    renderWithProviders(<QuestFinishScreen assignmentId="a1" onRetry={vi.fn()} onDone={vi.fn()} />);
    await writeLands(0);

    expect(await screen.findByText(/couldn't check your goal/)).toBeInTheDocument();
    expect(screen.queryByText('So close!')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
    expect(refetch).toHaveBeenCalled();
  });
});
