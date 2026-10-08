import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

const pushMock = vi.fn();
const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

const authState = {
  user: { id: 'u1', email: 'organizer@example.com' },
  loading: false,
  displayName: 'Organizer',
  updateDisplayName: vi.fn(),
  session: { access_token: 'token' },
  signOut: vi.fn(),
  isMemberAccount: false,
  reviewReminders: false,
  updateReviewReminders: vi.fn(),
};
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));

vi.mock('@/hooks/useLocalePreference', () => ({
  useLocalePreference: () => ({
    locale: 'en',
    setLocale: vi.fn(),
    saving: false,
    error: null,
    saved: false,
  }),
}));

import SettingsPage from '../page';

describe('SettingsPage — Invites section', () => {
  beforeEach(() => {
    pushMock.mockClear();
    authState.isMemberAccount = false;
  });

  it('does not render the old create-invite flow', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.queryByText('Create Invite Link')).not.toBeInTheDocument();
    expect(screen.queryByText(/QR code/i)).not.toBeInTheDocument();
  });

  it('points organizers to their groups instead', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText("Invite learners from each group's page.")).toBeInTheDocument();
    screen.getByRole('button', { name: 'Go to my groups' }).click();
    expect(pushMock).toHaveBeenCalledWith('/group');
  });

  it('hides the Invites section entirely for a member account', () => {
    authState.isMemberAccount = true;
    renderWithProviders(<SettingsPage />);
    expect(screen.queryByText('Go to my groups')).not.toBeInTheDocument();
  });
});
