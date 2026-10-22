import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LessonCard } from '@/components/LearnerHome/LessonCard';
import type { Assignment } from '@/hooks/useAssignments';
import { renderWithProviders } from '@/test/renderWithProviders';

function assignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: 'a1',
    organizer_id: 'org1',
    member_id: 'm1',
    deck_id: 'd1',
    kana_set: null,
    title: null,
    note: null,
    due_date: null,
    available_on: null,
    completed_at: null,
    created_at: '2026-07-01T00:00:00Z',
    required_accuracy: null,
    required_mode: null,
    progress_accuracy: null,
    baseline_accuracy: 80,
    goal_met_at: null,
    decks: { id: 'd1', name: 'Animals', emoji: '🐾' },
    profiles: null,
    ...overrides,
  };
}

describe('LessonCard', () => {
  it('renders no words line when the assignment carries no word progress', () => {
    renderWithProviders(<LessonCard assignment={assignment()} onStart={vi.fn()} />);
    expect(screen.queryByText(/words tried/)).not.toBeInTheDocument();
  });

  it('renders the words line and a progress bar at the right value', () => {
    renderWithProviders(
      <LessonCard
        assignment={assignment({ words: { total: 5, seen: 3, known: 2 } })}
        onStart={vi.fn()}
      />,
    );
    expect(screen.getByText(/3 of 5 words tried/)).toBeInTheDocument();
    expect(screen.getByText(/2 more to learn/)).toBeInTheDocument();
    // ceil(80% of 5) = 4 cards to know; 2 known → 50%
    expect(
      screen.getByRole('progressbar', { name: 'Words known toward finishing' }),
    ).toHaveAttribute('aria-valuenow', '50');
  });

  it('shows "try the rest" when the baseline is met but not every word has been seen', () => {
    renderWithProviders(
      <LessonCard
        assignment={assignment({ words: { total: 5, seen: 4, known: 4 } })}
        onStart={vi.fn()}
      />,
    );
    expect(screen.getByText(/try the rest/)).toBeInTheDocument();
  });

  it('calls onStart when the Start button is clicked', () => {
    const onStart = vi.fn();
    const a = assignment();
    renderWithProviders(<LessonCard assignment={a} onStart={onStart} />);
    screen.getByRole('button', { name: /start/i }).click();
    expect(onStart).toHaveBeenCalledWith(a);
  });
});
