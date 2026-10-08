import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Assignment } from '@/hooks/useAssignments';
import { useAssignments } from '@/hooks/useAssignments';
import { useDifficultWords } from '@/hooks/useDifficultWords';
import type { GroupMember } from '@/hooks/useGroup';
import { useGroupMembers } from '@/hooks/useGroup';
import type { Group } from '@/hooks/useGroups';
import { theme } from '@/theme';

import { TeachingTodayRow } from '../TeachingTodayRow';

vi.mock('@/hooks/useGroup', () => ({ useGroupMembers: vi.fn() }));
vi.mock('@/hooks/useAssignments', () => ({ useAssignments: vi.fn() }));
vi.mock('@/hooks/useDifficultWords', () => ({ useDifficultWords: vi.fn() }));

const DAY = 86_400_000;

function group(overrides: Partial<Group> = {}): Group {
  return {
    id: 'g1',
    organizer_id: 'o1',
    name: 'Tuesday club',
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

function member(overrides: Partial<GroupMember> = {}): GroupMember {
  return {
    id: 'm1',
    username: 'hana',
    displayName: 'Hana',
    createdAt: new Date().toISOString(),
    level: 1,
    totalXp: 0,
    streakDays: 0,
    totalCardsStudied: 0,
    totalCorrect: 0,
    totalSessions: 0,
    lastActive: new Date().toISOString(),
    lastNudgedAt: null,
    masteryLearning: 0,
    masteryStrong: 0,
    reviewsWaiting: null,
    reviewsOverdue3d: null,
    ...overrides,
  };
}

function assignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: 'a1',
    organizer_id: 'o1',
    member_id: 'm1',
    deck_id: 'd1',
    kana_set: null,
    title: null,
    note: null,
    due_date: null,
    available_on: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    required_accuracy: null,
    required_mode: null,
    progress_accuracy: null,
    decks: { id: 'd1', name: 'Food', emoji: null },
    ...overrides,
  };
}

function mockHooks({
  members = [],
  membersLoading = false,
  membersError = null,
  assignments = [],
  assignmentsLoading = false,
  assignmentsError = null,
}: {
  members?: GroupMember[];
  membersLoading?: boolean;
  membersError?: unknown;
  assignments?: Assignment[];
  assignmentsLoading?: boolean;
  assignmentsError?: unknown;
}) {
  vi.mocked(useGroupMembers).mockReturnValue({
    members,
    loading: membersLoading,
    error: membersError,
    errorMessage: membersError ? 'error' : null,
    stale: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useGroupMembers>);
  vi.mocked(useAssignments).mockReturnValue({
    assignments,
    loading: assignmentsLoading,
    error: assignmentsError,
    errorMessage: assignmentsError ? 'error' : null,
    stale: false,
    refetch: vi.fn(),
    fetchAssignments: vi.fn(),
    createAssignment: vi.fn(),
  } as unknown as ReturnType<typeof useAssignments>);
}

function renderRow(g: Group = group()) {
  return render(
    <ThemeProvider theme={theme}>
      <TeachingTodayRow group={g} />
    </ThemeProvider>,
  );
}

describe('TeachingTodayRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the top attention item sentence', () => {
    mockHooks({
      members: [member({ id: 'm1', displayName: 'Hana', reviewsWaiting: 25, reviewsOverdue3d: 5 })],
    });
    renderRow();
    expect(screen.getByText('Hana has 25 reviews waiting')).toBeInTheDocument();
  });

  it('shows This week for a deck handout due in 3 days, when something else is the headline', () => {
    // An inactive learner outranks a due-soon handout, so the handout isn't
    // already named in the headline and the sub-line can safely show it.
    mockHooks({
      members: [
        member({
          id: 'm1',
          lastActive: null,
          createdAt: new Date(Date.now() - 30 * DAY).toISOString(),
        }),
      ],
      assignments: [assignment({ due_date: new Date(Date.now() + 3 * DAY).toISOString() })],
    });
    renderRow();
    expect(screen.getByText('This week: Food')).toBeInTheDocument();
  });

  it('does not show This week for a deck handout due in 10 days', () => {
    mockHooks({
      assignments: [assignment({ due_date: new Date(Date.now() + 10 * DAY).toISOString() })],
    });
    renderRow();
    expect(screen.queryByText(/This week:/)).not.toBeInTheDocument();
  });

  it("skips This week when it would just repeat the headline's own due-soon handout", () => {
    mockHooks({
      assignments: [assignment({ due_date: new Date(Date.now() + 3 * DAY).toISOString() })],
    });
    renderRow();
    expect(screen.getByText(/Food is due in 3 days/)).toBeInTheDocument();
    expect(screen.queryByText(/This week:/)).not.toBeInTheDocument();
  });

  it('drops a due-soon batch with no deck name instead of showing a blank This week', () => {
    mockHooks({
      assignments: [
        assignment({
          due_date: new Date(Date.now() + 3 * DAY).toISOString(),
          decks: null,
        }),
      ],
    });
    renderRow();
    expect(screen.queryByText(/This week:/)).not.toBeInTheDocument();
  });

  it('shows the quiet state when there are no attention items', () => {
    mockHooks({});
    renderRow();
    expect(screen.getByText('All caught up')).toBeInTheDocument();
  });

  it('shows a muted error line when a hook errors, without blocking the row', () => {
    mockHooks({ membersError: new Error('boom') });
    renderRow(group({ name: 'Study club' }));
    expect(screen.getByText("Couldn't load Study club")).toBeInTheDocument();
  });

  it('never calls useDifficultWords — that scan is too expensive for this card', () => {
    mockHooks({});
    renderRow();
    expect(useDifficultWords).not.toHaveBeenCalled();
  });
});
