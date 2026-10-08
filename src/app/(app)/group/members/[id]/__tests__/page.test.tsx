import { describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useParams: () => ({ id: 'm1' }),
}));

vi.mock('@/lib/supabase', () => ({
  sb: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { access_token: 'token' } } }),
    },
  },
}));

import { act, waitFor } from '@testing-library/react';

import LegacyMemberDetailPage from '@/app/(app)/group/members/[id]/page';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('LegacyMemberDetailPage', () => {
  it('redirects to the member’s group when one is returned', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ groupId: 'g1' }),
      }),
    );

    await act(async () => {
      renderWithProviders(<LegacyMemberDetailPage />);
    });

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/group/g1/members/m1'));
    vi.unstubAllGlobals();
  });

  it('falls back to /group when the member has no group', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ groupId: null }),
      }),
    );

    await act(async () => {
      renderWithProviders(<LegacyMemberDetailPage />);
    });

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/group'));
    vi.unstubAllGlobals();
  });
});
