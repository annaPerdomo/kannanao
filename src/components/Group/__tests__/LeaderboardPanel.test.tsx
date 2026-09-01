import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataError } from '@/lib/dataError';
import { renderWithProviders } from '@/test/renderWithProviders';

import { LeaderboardPanel } from '../LeaderboardPanel';

describe('LeaderboardPanel', () => {
  it('shows an outage message instead of "check back" when the board failed to load', () => {
    renderWithProviders(
      <LeaderboardPanel
        entries={[]}
        loading={false}
        error={new DataError('upstream', 'gateway down')}
        visible
        onVisibilityChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Our side is having a problem')).toBeInTheDocument();
  });

  it('still shows the board when a stale error trails a non-empty list', () => {
    renderWithProviders(
      <LeaderboardPanel
        entries={[
          {
            id: 'u1',
            username: 'kenji',
            displayName: 'Kenji',
            weeklyXp: 10,
            weeklyCards: 5,
            streakDays: 1,
            level: 2,
          },
        ]}
        loading={false}
        error={new DataError('upstream', 'gateway down')}
        visible
        onVisibilityChange={vi.fn()}
      />,
    );
    expect(screen.queryByText('Our side is having a problem')).not.toBeInTheDocument();
    expect(screen.getByText('Kenji')).toBeInTheDocument();
  });
});
