import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AssignmentCard } from '@/components/Group/AssignmentCard';
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
    decks: { id: 'd1', name: 'Animals', emoji: '🐾' },
    profiles: null,
    ...overrides,
  };
}

describe('AssignmentCard', () => {
  it('shows no goal line for a plain assignment', () => {
    renderWithProviders(<AssignmentCard assignment={assignment()} onStart={vi.fn()} />);
    expect(screen.queryByText(/Goal:/)).not.toBeInTheDocument();
  });

  it('shows the goal and best-so-far in one plain line', () => {
    renderWithProviders(
      <AssignmentCard
        assignment={assignment({
          required_accuracy: 80,
          required_mode: 'match',
          progress_accuracy: 65,
        })}
        onStart={vi.fn()}
      />,
    );
    expect(screen.getByText('🎯 Goal: 80% in Match — Best so far: 65%')).toBeInTheDocument();
  });

  it('names a kana assignment by its characters, not the missing deck', () => {
    renderWithProviders(
      <AssignmentCard
        assignment={assignment({ deck_id: null, kana_set: 'hira-ka', decks: null })}
        onStart={vi.fn()}
      />,
    );
    expect(screen.getByText('か · き · く · け · こ')).toBeInTheDocument();
    expect(screen.queryByText(/Unknown Deck/)).not.toBeInTheDocument();
  });

  it('shows the goal without best-so-far before the first qualifying attempt', () => {
    renderWithProviders(
      <AssignmentCard assignment={assignment({ required_accuracy: 70 })} onStart={vi.fn()} />,
    );
    expect(screen.getByText('🎯 Goal: 70%')).toBeInTheDocument();
  });

  it('drops the best-so-far suffix once completed', () => {
    renderWithProviders(
      <AssignmentCard
        assignment={assignment({
          required_accuracy: 80,
          progress_accuracy: 85,
          completed_at: '2026-07-10T00:00:00Z',
        })}
        onStart={vi.fn()}
      />,
    );
    expect(screen.getByText('🎯 Goal: 80%')).toBeInTheDocument();
    expect(screen.queryByText(/Best so far/)).not.toBeInTheDocument();
    // Completed cards have no Start button
    expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
  });

  it('hands the whole assignment to the quest launcher', () => {
    const onStart = vi.fn();
    const a = assignment();
    renderWithProviders(<AssignmentCard assignment={a} onStart={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    expect(onStart).toHaveBeenCalledWith(a);
  });
});
