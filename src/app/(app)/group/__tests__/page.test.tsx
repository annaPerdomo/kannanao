import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

const pushMock = vi.fn();
const replaceMock = vi.fn();
let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => searchParams,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isMemberAccount: false, loading: false }),
}));

let groups: { id: string; name: string; emoji: string | null; memberCount: number }[] = [];
vi.mock('@/hooks/useGroups', () => ({
  useGroups: () => ({
    groups,
    loading: false,
    error: null,
    errorMessage: null,
    createGroup: vi.fn(),
    pinGroup: vi.fn(),
  }),
}));

import GroupListPage from '../page';

afterEach(() => {
  vi.clearAllMocks();
  groups = [];
  searchParams = new URLSearchParams();
  localStorage.clear();
});

describe('GroupListPage — ?next=quizlet', () => {
  it('forwards straight to the only group', () => {
    groups = [{ id: 'g1', name: 'Japanese 1', emoji: null, memberCount: 2 }];
    searchParams = new URLSearchParams('next=quizlet');
    renderWithProviders(<GroupListPage />);
    expect(replaceMock).toHaveBeenCalledWith('/group/g1/add/quizlet');
  });

  it('shows a banner and routes each card to add/quizlet when there are several', () => {
    groups = [
      { id: 'g1', name: 'Japanese 1', emoji: null, memberCount: 2 },
      { id: 'g2', name: 'Japanese 2', emoji: null, memberCount: 3 },
    ];
    searchParams = new URLSearchParams('next=quizlet');
    renderWithProviders(<GroupListPage />);
    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.getByText('Pick the group to import into')).toBeInTheDocument();

    screen.getByText('Japanese 1').click();
    expect(pushMock).toHaveBeenCalledWith('/group/g1/add/quizlet');
    expect(localStorage.getItem('tangodachi.quizletGroup')).toBe('g1');
  });

  it('forwards to the remembered group when there are several', () => {
    groups = [
      { id: 'g1', name: 'Japanese 1', emoji: null, memberCount: 2 },
      { id: 'g2', name: 'Japanese 2', emoji: null, memberCount: 3 },
    ];
    localStorage.setItem('tangodachi.quizletGroup', 'g2');
    searchParams = new URLSearchParams('next=quizlet');
    renderWithProviders(<GroupListPage />);
    expect(replaceMock).toHaveBeenCalledWith('/group/g2/add/quizlet');
  });

  it('ignores a remembered group that no longer exists', () => {
    groups = [
      { id: 'g1', name: 'Japanese 1', emoji: null, memberCount: 2 },
      { id: 'g2', name: 'Japanese 2', emoji: null, memberCount: 3 },
    ];
    localStorage.setItem('tangodachi.quizletGroup', 'gone');
    searchParams = new URLSearchParams('next=quizlet');
    renderWithProviders(<GroupListPage />);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('goes to the group page as usual without ?next=quizlet', () => {
    groups = [{ id: 'g1', name: 'Japanese 1', emoji: null, memberCount: 2 }];
    renderWithProviders(<GroupListPage />);
    expect(replaceMock).not.toHaveBeenCalled();
    screen.getByText('Japanese 1').click();
    expect(pushMock).toHaveBeenCalledWith('/group/g1');
  });
});
