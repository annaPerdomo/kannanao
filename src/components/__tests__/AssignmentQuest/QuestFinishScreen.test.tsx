import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Assignment } from '@/hooks/useAssignments';
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

const state = vi.hoisted(() => ({ assignments: [] as Assignment[] }));
const refetch = vi.fn().mockResolvedValue(undefined);
vi.mock('@/hooks/useAssignments', () => ({
  useAssignments: () => ({ assignments: state.assignments, refetch }),
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

beforeEach(() => {
  refetch.mockClear();
  state.assignments = [];
});

describe('QuestFinishScreen', () => {
  it('re-reads the assignment rather than trusting the client', () => {
    renderWithProviders(<QuestFinishScreen assignmentId="a1" onRetry={vi.fn()} onDone={vi.fn()} />);
    expect(refetch).toHaveBeenCalled();
    expect(screen.getByText(/Checking your goal/)).toBeInTheDocument();
  });

  it('celebrates once the server says the assignment is done', async () => {
    state.assignments = [assignment({ completed_at: '2026-08-02T00:00:00Z' })];
    renderWithProviders(<QuestFinishScreen assignmentId="a1" onRetry={vi.fn()} onDone={vi.fn()} />);
    expect(await screen.findByText('Assignment complete!')).toBeInTheDocument();
  });

  it('shows the numbers and one retry on a near miss', async () => {
    state.assignments = [assignment({ progress_accuracy: 70 })];
    const onRetry = vi.fn();
    renderWithProviders(<QuestFinishScreen assignmentId="a1" onRetry={onRetry} onDone={vi.fn()} />);

    expect(await screen.findByText('So close!')).toBeInTheDocument();
    expect(screen.getByText('Best so far: 70% — goal 80%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('encourages without numbers when there is no qualifying attempt yet', async () => {
    state.assignments = [assignment()];
    renderWithProviders(<QuestFinishScreen assignmentId="a1" onRetry={vi.fn()} onDone={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/Give it one more go/)).toBeInTheDocument());
  });
});
