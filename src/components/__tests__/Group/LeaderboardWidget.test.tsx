import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LeaderboardWidget } from '@/components/Group/LeaderboardWidget';
import type { LeaderboardEntry } from '@/hooks/useGroupLeaderboard';
import { renderWithProviders } from '@/test/renderWithProviders';

function entries(count: number): LeaderboardEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `u${i}`,
    username: `learner${i}`,
    displayName: `Learner ${i}`,
    avatar: null,
    weeklyXp: (count - i) * 100,
    weeklyCards: (count - i) * 10,
    streakDays: 0,
    level: 1,
  }));
}

describe('LeaderboardWidget', () => {
  it('shows the empty state with no entries', () => {
    renderWithProviders(<LeaderboardWidget entries={[]} />);
    expect(screen.getByText('No activity this week yet.')).toBeInTheDocument();
  });

  it('renders every entry when uncapped', () => {
    renderWithProviders(<LeaderboardWidget entries={entries(8)} />);
    expect(screen.getByText('Learner 7')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /show all/i })).not.toBeInTheDocument();
  });

  // A capped list with no way to expand hides the mid-pack learner from
  // themselves, which is the opposite of what the widget is for.
  it('offers a way out of the cap in the compact layout', () => {
    renderWithProviders(<LeaderboardWidget entries={entries(8)} compact maxVisible={5} />);
    expect(screen.queryByText('Learner 7')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show all 8' }));
    expect(screen.getByText('Learner 7')).toBeInTheDocument();
  });
});
