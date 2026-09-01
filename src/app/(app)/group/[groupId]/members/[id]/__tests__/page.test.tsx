import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ groupId: 'g1', id: 'm1' }),
}));

const mockUseMemberDetail = vi.fn();

vi.mock('@/hooks/useGroup', () => ({
  useMemberDetail: (...args: unknown[]) => mockUseMemberDetail(...args),
}));

vi.mock('@/hooks/useEncouragements', () => ({
  useEncouragements: () => ({ sendEncouragement: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isMemberAccount: false, loading: false }),
}));

vi.mock('@/components/Group', () => ({
  MemberDetail: ({ detail }: { detail: { member: { username: string } } | null }) => (
    <div>member-detail:{detail?.member.username}</div>
  ),
}));

import MemberDetailPage from '@/app/(app)/group/[groupId]/members/[id]/page';
import { DataError } from '@/lib/dataError';
import { renderWithProviders } from '@/test/renderWithProviders';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MemberDetailPage', () => {
  it('shows a retryable error instead of a blank page when the fetch fails', () => {
    const refetch = vi.fn();
    mockUseMemberDetail.mockReturnValue({
      detail: null,
      loading: false,
      error: new DataError('upstream', 'gateway down'),
      refetch,
    });

    renderWithProviders(<MemberDetailPage />);

    expect(screen.getByText('Our side is having a problem')).toBeInTheDocument();
    expect(screen.queryByText(/member-detail:/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('navigates back to the group on the error state’s back button', () => {
    mockUseMemberDetail.mockReturnValue({
      detail: null,
      loading: false,
      error: new DataError('upstream', 'gateway down'),
      refetch: vi.fn(),
    });

    renderWithProviders(<MemberDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(pushMock).toHaveBeenCalledWith('/group/g1');
  });

  it('renders the member detail once it loads', () => {
    mockUseMemberDetail.mockReturnValue({
      detail: { member: { username: 'kenji' } },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<MemberDetailPage />);

    expect(screen.getByText('member-detail:kenji')).toBeInTheDocument();
    expect(screen.queryByText('Our side is having a problem')).not.toBeInTheDocument();
  });

  it('shows the loading state while the fetch is still in flight', () => {
    mockUseMemberDetail.mockReturnValue({
      detail: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<MemberDetailPage />);

    expect(screen.queryByText('Our side is having a problem')).not.toBeInTheDocument();
    expect(screen.queryByText(/member-detail:/)).not.toBeInTheDocument();
  });
});
