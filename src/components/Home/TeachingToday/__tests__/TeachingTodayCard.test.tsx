import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useGroups } from '@/hooks/useGroups';
import { theme } from '@/theme';

import { TeachingTodayCard } from '../TeachingTodayCard';

vi.mock('@/hooks/useGroups', () => ({ useGroups: vi.fn() }));
vi.mock('@/hooks/useGroup', () => ({
  useGroupMembers: vi.fn(() => ({ members: [], loading: false, error: null })),
}));
vi.mock('@/hooks/useAssignments', () => ({
  useAssignments: vi.fn(() => ({ assignments: [], loading: false, error: null })),
}));
vi.mock('@/hooks/useDifficultWords', () => ({ useDifficultWords: vi.fn() }));

describe('TeachingTodayCard', () => {
  it('fetches its own groups and renders regardless of the home "groups" section toggle', () => {
    vi.mocked(useGroups).mockReturnValue({
      groups: [
        {
          id: 'g1',
          organizer_id: 'o1',
          name: 'Tuesday club',
          emoji: '🌸',
          pinned: false,
          show_leaderboard: true,
          created_at: new Date().toISOString(),
          memberCount: 1,
          activeCount: 1,
          cardsStudied: 1,
          weeklyXp: 1,
          faces: [],
        },
      ],
      loading: false,
      error: null,
    } as unknown as ReturnType<typeof useGroups>);

    render(
      <ThemeProvider theme={theme}>
        <TeachingTodayCard />
      </ThemeProvider>,
    );

    expect(useGroups).toHaveBeenCalledWith(true);
    expect(screen.getByRole('link', { name: 'Tuesday club' })).toBeInTheDocument();
  });
});
