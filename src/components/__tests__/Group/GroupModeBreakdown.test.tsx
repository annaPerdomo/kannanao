import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GroupModeBreakdown } from '@/components/Group/GroupCharts';
import type { GroupActivityModeStat } from '@/hooks/useGroupActivity';
import { renderWithProviders } from '@/test/renderWithProviders';

function stat(
  mode: string,
  cardsStudied: number,
  extra: Partial<GroupActivityModeStat> = {},
): GroupActivityModeStat {
  return { mode, sessions: 2, cardsStudied, cardsCorrect: cardsStudied, accuracy: 90, ...extra };
}

describe('GroupModeBreakdown', () => {
  it('names each row with the counts the tooltip carries', () => {
    renderWithProviders(<GroupModeBreakdown modes={[stat('listen', 40, { sessions: 5 })]} />);

    expect(
      screen.getByRole('img', { name: 'Listen — 40 cards in 5 sessions, 90% accuracy' }),
    ).toBeInTheDocument();
  });

  it('leaves the accuracy off a sample too small to mean anything', () => {
    renderWithProviders(<GroupModeBreakdown modes={[stat('quiz', 3, { sessions: 1 })]} />);

    expect(screen.getByRole('img', { name: 'Quiz — 3 cards in 1 session' })).toBeInTheDocument();
  });

  it('collapses past six modes and reveals the rest on click', () => {
    const modes = ['study', 'review', 'match', 'fill', 'recall', 'quiz', 'listen', 'reading'].map(
      (mode, i) => stat(mode, 100 - i),
    );
    renderWithProviders(<GroupModeBreakdown modes={modes} />);

    expect(screen.getAllByRole('img')).toHaveLength(6);

    fireEvent.click(screen.getByRole('button', { name: 'Show all 8' }));
    expect(screen.getAllByRole('img')).toHaveLength(8);
  });

  it('shows the empty state when nothing was practised', () => {
    renderWithProviders(<GroupModeBreakdown modes={[stat('study', 0)]} />);

    expect(screen.getByText('No practice sessions in this window.')).toBeInTheDocument();
  });
});
