import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type * as GroupBarrel from '@/components/Group';
import { renderWithProviders } from '@/test/renderWithProviders';

const replaceMock = vi.fn();
const pushMock = vi.fn();
let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useParams: () => ({ groupId: 'g1' }),
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => searchParams,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isMemberAccount: false,
    displayName: 'Organizer',
    user: { email: 'org@example.com' },
    loading: false,
  }),
}));

const retryDecksMock = vi.fn();
let decks: { id: string; name: string; isShared?: boolean }[] = [];
vi.mock('@/hooks/useDecks', () => ({
  useDecks: () => ({ decks, retry: retryDecksMock }),
}));

vi.mock('@/hooks/useGroup', () => ({
  useGroupMembers: () => ({
    members: [],
    loading: false,
    error: null,
    errorMessage: null,
    stale: false,
  }),
  useGroupFeed: () => ({ feed: [], loading: false, error: null }),
}));

vi.mock('@/hooks/useGroupActivity', () => ({
  useGroupActivity: () => ({ activity: null, loading: false, errorMessage: null }),
}));

vi.mock('@/hooks/useGroupLeaderboard', () => ({
  useGroupLeaderboard: () => ({ leaderboard: [], loading: false, error: null }),
}));

vi.mock('@/hooks/useDifficultWords', () => ({
  useDifficultWords: () => ({ data: undefined, loading: false, errorMessage: null }),
}));

vi.mock('@/hooks/useEncouragements', () => ({
  useEncouragements: () => ({ sendEncouragement: vi.fn() }),
}));

vi.mock('@/hooks/useInvites', () => ({
  useInvites: () => ({
    invites: [],
    createInvite: vi.fn(),
    revokeInvite: vi.fn(),
  }),
}));

vi.mock('@/hooks/useGroups', () => ({
  useGroups: () => ({
    groups: [{ id: 'g1', name: 'Japanese 1', emoji: null, show_leaderboard: true }],
    updateGroup: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAssignments', () => ({
  useAssignments: () => ({
    assignments: [],
    loading: false,
    errorMessage: null,
    createAssignment: vi.fn(),
    updateAssignments: vi.fn(),
    deleteAssignments: vi.fn(),
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useLessonLibrary', () => ({
  LESSON_LIBRARY_CACHE_PREFIX: '/api/group/lessons',
  useLessonLibrary: () => ({ library: { units: [], loose: [] }, loading: false, refetch: vi.fn() }),
}));

vi.mock('@/lib/apiCache', () => ({ invalidateApiCache: vi.fn() }));

vi.mock('@/components/Group', async (importOriginal) => {
  const actual = await importOriginal<typeof GroupBarrel>();
  return {
    ...actual,
    GroupDashboardHeader: () => <div>header</div>,
    TabBar: () => <div>tabbar</div>,
    TabContent: () => <div>tabcontent</div>,
    GroupDashboardDialogs: ({
      assignDialog,
    }: {
      assignDialog: ReturnType<typeof GroupBarrel.useAssignDialog>;
    }) => (
      <div>
        assign-open:{String(assignDialog.open)} assign-deck:{assignDialog.preset?.deckId ?? 'none'}
      </div>
    ),
  };
});

import GroupDashboardPage from '../page';

afterEach(() => {
  vi.clearAllMocks();
  decks = [];
  searchParams = new URLSearchParams();
});

describe('GroupDashboardPage — ?assign=', () => {
  it('opens the assign dialog preselected for the deck and clears the param', () => {
    decks = [{ id: 'd1', name: 'New deck' }];
    searchParams = new URLSearchParams('tab=plan&assign=d1');
    renderWithProviders(<GroupDashboardPage />);

    expect(screen.getByText(/assign-open:true/)).toBeInTheDocument();
    expect(screen.getByText(/assign-deck:d1/)).toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledWith('/group/g1?tab=plan', { scroll: false });
    expect(retryDecksMock).not.toHaveBeenCalled();
  });

  it('retries the deck list when the assigned deck is not there yet', () => {
    decks = [];
    searchParams = new URLSearchParams('assign=d1');
    renderWithProviders(<GroupDashboardPage />);

    expect(retryDecksMock).toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith('/group/g1', { scroll: false });
  });

  it('does nothing when there is no assign param', () => {
    decks = [];
    searchParams = new URLSearchParams();
    renderWithProviders(<GroupDashboardPage />);

    expect(screen.getByText(/assign-open:false/)).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});

describe('GroupDashboardPage — ?new=1', () => {
  it('opens the new-lesson dialog and strips the param', () => {
    searchParams = new URLSearchParams('tab=lessons&new=1');
    renderWithProviders(<GroupDashboardPage />);

    expect(
      screen.getByText("Name it now, fill it in with AI or by hand, hand it out when it's ready."),
    ).toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledWith('/group/g1?tab=lessons', { scroll: false });
  });

  it('does nothing when there is no new param', () => {
    searchParams = new URLSearchParams();
    renderWithProviders(<GroupDashboardPage />);

    expect(
      screen.queryByText(
        "Name it now, fill it in with AI or by hand, hand it out when it's ready.",
      ),
    ).not.toBeInTheDocument();
  });
});
