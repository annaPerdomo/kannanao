import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('next-intl', () => {
  const t = Object.assign((key: string) => key, {
    rich: (key: string) => key,
  });
  return { useTranslations: () => t };
});

vi.mock('@/lib/supabase', () => ({
  sb: { auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: 'tok' } } })) } },
}));

import { JoinConfirm } from '../_components/JoinConfirm';

const assign = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'location', { value: { assign }, writable: true });
});

function renderConfirm({ alreadyInAGroup = false } = {}) {
  renderWithProviders(
    <JoinConfirm
      code="ABC123"
      accountName="Kenji"
      alreadyInAGroup={alreadyInAGroup}
      onUseAnotherAccount={vi.fn()}
    />,
  );
}

describe('JoinConfirm', () => {
  it('joins with the signed-in account and lands on home', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true })));
    vi.stubGlobal('fetch', fetchMock);

    renderConfirm();
    fireEvent.click(screen.getByRole('button', { name: 'joinWithThisAccount' }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/'));

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/join/link');
    expect(JSON.parse(init.body as string)).toEqual({ code: 'ABC123' });
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('localises the refusal by code instead of navigating', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: 'This is your own invite', code: 'ownInvite' }), {
            status: 400,
          }),
      ),
    );

    renderConfirm();
    fireEvent.click(screen.getByRole('button', { name: 'joinWithThisAccount' }));

    expect(await screen.findByText('joinErrors.ownInvite')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });

  it('warns before replacing the group the account is already in', () => {
    renderConfirm({ alreadyInAGroup: true });

    expect(screen.getByText('joiningAnotherGroup')).toBeInTheDocument();
  });

  it('says nothing about leaving when the account is in no group', () => {
    renderConfirm();

    expect(screen.queryByText('joiningAnotherGroup')).not.toBeInTheDocument();
  });
});
