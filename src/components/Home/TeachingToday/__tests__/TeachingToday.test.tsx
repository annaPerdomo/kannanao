import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAssignments } from '@/hooks/useAssignments';
import { useGroupMembers } from '@/hooks/useGroup';
import type { Group } from '@/hooks/useGroups';
import { theme } from '@/theme';

import { TeachingToday } from '../index';

vi.mock('@/hooks/useGroup', () => ({ useGroupMembers: vi.fn() }));
vi.mock('@/hooks/useAssignments', () => ({ useAssignments: vi.fn() }));
vi.mock('@/hooks/useDifficultWords', () => ({ useDifficultWords: vi.fn() }));

const QUIET = { members: [], loading: false, error: null };
const QUIET_ASSIGNMENTS = { assignments: [], loading: false, error: null };
const BUSY_MEMBERS = {
  members: [
    {
      id: 'm1',
      username: 'hana',
      displayName: 'Hana',
      createdAt: new Date(Date.now() - 30 * 86_400_000).toISOString(),
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
      reviewsWaiting: null,
      reviewsOverdue3d: null,
    },
  ],
  loading: false,
  error: null,
};

function group(overrides: Partial<Group> = {}): Group {
  return {
    id: overrides.id ?? 'g1',
    organizer_id: 'o1',
    name: overrides.name ?? 'Group',
    emoji: '🌸',
    pinned: false,
    show_leaderboard: true,
    created_at: new Date().toISOString(),
    memberCount: 1,
    activeCount: 1,
    cardsStudied: 10,
    weeklyXp: 10,
    faces: [],
    ...overrides,
  };
}

function renderCard(groups: Group[]) {
  return render(
    <ThemeProvider theme={theme}>
      <TeachingToday groups={groups} />
    </ThemeProvider>,
  );
}

describe('TeachingToday', () => {
  beforeEach(() => {
    vi.mocked(useGroupMembers).mockReturnValue(
      QUIET as unknown as ReturnType<typeof useGroupMembers>,
    );
    vi.mocked(useAssignments).mockReturnValue(
      QUIET_ASSIGNMENTS as unknown as ReturnType<typeof useAssignments>,
    );
  });

  it('renders nothing with no groups', () => {
    const { container } = renderCard([]);
    expect(container).toBeEmptyDOMElement();
  });

  it('caps at 3 groups and shows a link to all groups when there are more', () => {
    const groups = [
      group({ id: 'g1', name: 'A' }),
      group({ id: 'g2', name: 'B' }),
      group({ id: 'g3', name: 'C' }),
      group({ id: 'g4', name: 'D' }),
    ];
    renderCard(groups);
    expect(screen.getByRole('link', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'B' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'C' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'D' })).not.toBeInTheDocument();
    expect(screen.getByText('All groups →')).toBeInTheDocument();
  });

  it('omits the all-groups link with 3 or fewer groups', () => {
    renderCard([group({ id: 'g1', name: 'Only' })]);
    expect(screen.queryByText('All groups →')).not.toBeInTheDocument();
  });

  it('puts pinned groups first without reordering by recency', () => {
    const older = group({
      id: 'old',
      name: 'Older pinned',
      pinned: true,
      created_at: new Date(Date.now() - 100 * 86_400_000).toISOString(),
    });
    const newer = group({ id: 'new', name: 'Newer unpinned', pinned: false });
    renderCard([newer, older]);
    const links = screen
      .getAllByRole('link')
      .filter((el) => el.getAttribute('href')?.startsWith('/group/'));
    expect(links[0]).toHaveAccessibleName('Older pinned');
    expect(links[1]).toHaveAccessibleName('Newer unpinned');
  });

  it('keeps full rows (does not collapse) when at least one group needs attention', () => {
    vi.mocked(useGroupMembers).mockImplementation(
      (groupId) =>
        (groupId === 'g1' ? BUSY_MEMBERS : QUIET) as unknown as ReturnType<typeof useGroupMembers>,
    );
    vi.mocked(useAssignments).mockReturnValue(
      QUIET_ASSIGNMENTS as unknown as ReturnType<typeof useAssignments>,
    );
    renderCard([group({ id: 'g1', name: 'Busy group' }), group({ id: 'g2', name: 'Quiet group' })]);

    expect(screen.queryByText(/on track today/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Busy group/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Quiet group/ })).toBeInTheDocument();
  });
});
