import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

const push = vi.fn();
const replace = vi.fn();
let search = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => search,
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));

let progressState: { last_study_date: string | null } | null = { last_study_date: '2026-09-02' };
vi.mock('@/contexts/ProgressContext', () => ({
  useProgressCtx: () => ({ progress: progressState }),
}));

let assignmentsState: unknown[] = [];
let assignmentsLoading = false;
const useAssignmentsMock = vi.fn(() => ({
  assignments: assignmentsState,
  loading: assignmentsLoading,
}));
vi.mock('@/hooks/useAssignments', () => ({ useAssignments: () => useAssignmentsMock() }));

vi.mock('@/hooks/useKanaProgress', () => ({
  useKanaProgress: () => ({ byKana: null, error: 'no-kana', record: vi.fn() }),
}));

vi.mock('@/hooks/usePracticeChain', () => ({ usePracticeChain: () => null }));

vi.mock('@/components/ReviewQuest', () => ({ ReviewQuest: () => <div>quest</div> }));

const getDueCardsMock = vi.fn(async (..._args: unknown[]) => [{ id: 'c1' }]);
vi.mock('@/lib/supabase', () => ({
  getDueCards: (
    userId: string,
    limit?: number,
    deckIds?: string[],
    opts?: { priorityDeckIds?: string[] },
  ) => getDueCardsMock(userId, limit, deckIds, opts),
}));

import ReviewTodayPage from '../page';

describe('ReviewTodayPage — due-card fetch stability', () => {
  beforeEach(() => {
    window.localStorage.clear();
    getDueCardsMock.mockClear();
    push.mockClear();
    replace.mockClear();
    search = new URLSearchParams();
    assignmentsState = [];
    assignmentsLoading = false;
    progressState = { last_study_date: '2026-09-02' };
  });

  it('fetches once and does not refetch when assignments update with a new array identity', async () => {
    const { rerender } = renderWithProviders(<ReviewTodayPage />);
    await waitFor(() => expect(getDueCardsMock).toHaveBeenCalledTimes(1));

    assignmentsState = [
      {
        id: 'a1',
        deck_id: 'd1',
        kana_set: null,
        completed_at: null,
        available_on: null,
        created_at: '2026-09-01T00:00:00Z',
      },
    ];
    rerender(<ReviewTodayPage />);

    await waitFor(() => expect(screen.getByText('quest')).toBeInTheDocument());
    expect(getDueCardsMock).toHaveBeenCalledTimes(1);
  });

  it('waits for assignments to load before fetching', async () => {
    assignmentsLoading = true;
    renderWithProviders(<ReviewTodayPage />);
    expect(getDueCardsMock).not.toHaveBeenCalled();
  });
});

describe('ReviewTodayPage — bonus round cap', () => {
  beforeEach(() => {
    window.localStorage.clear();
    getDueCardsMock.mockClear();
    push.mockClear();
    replace.mockClear();
    assignmentsState = [];
    assignmentsLoading = false;
    progressState = { last_study_date: '2026-09-02' };
  });

  it('bounces to /review/done instead of fetching when today’s bonus rounds are spent', async () => {
    const { recordBonusRound } = await import('@/lib/bonusRound');
    const today = (await import('@/lib/chest')).localDateString(new Date());
    recordBonusRound(today);
    recordBonusRound(today);
    recordBonusRound(today);
    search = new URLSearchParams('bonus=1');

    renderWithProviders(<ReviewTodayPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/review/done'));
    expect(getDueCardsMock).not.toHaveBeenCalled();
  });

  it('still fetches for a bonus round while rounds remain today', async () => {
    search = new URLSearchParams('bonus=1');
    renderWithProviders(<ReviewTodayPage />);
    await waitFor(() => expect(getDueCardsMock).toHaveBeenCalledTimes(1));
    expect(replace).not.toHaveBeenCalled();
  });
});
