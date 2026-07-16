import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Locale, LOCALE_COOKIE } from '@/i18n/config';

const mockRefresh = vi.fn();
let profileLocale: Locale | null = null;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profileLocale }),
}));

import { LocaleSync } from '@/components/LocaleSync';

function setCookie(value: string | null) {
  document.cookie = value
    ? `${LOCALE_COOKIE}=${value}; path=/`
    : `${LOCALE_COOKIE}=; path=/; max-age=0`;
}

function readCookie() {
  return document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`))?.[1] ?? null;
}

describe('LocaleSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profileLocale = null;
    setCookie(null);
  });

  it('adopts the account language when the device disagrees', async () => {
    profileLocale = 'ja';
    setCookie('en');

    render(<LocaleSync />);

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(readCookie()).toBe('ja');
  });

  it('adopts the account language when the device has no cookie at all', async () => {
    profileLocale = 'ja';

    render(<LocaleSync />);

    await waitFor(() => expect(readCookie()).toBe('ja'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the cookie already agrees', async () => {
    profileLocale = 'ja';
    setCookie('ja');

    render(<LocaleSync />);

    await waitFor(() => expect(readCookie()).toBe('ja'));
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  // The precedence rule that makes the landing toggle work: an account that has
  // never chosen a language does not get a vote, so the device's pick stands.
  it('leaves the device pick alone when the account has no explicit locale', async () => {
    profileLocale = null;
    setCookie('ja');

    render(<LocaleSync />);

    await waitFor(() => expect(mockRefresh).not.toHaveBeenCalled());
    expect(readCookie()).toBe('ja');
  });

  it('syncs once, not once per render', async () => {
    profileLocale = 'ja';
    setCookie('en');

    const { rerender } = render(<LocaleSync />);
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));

    setCookie('en'); // simulate the cookie not yet having reached the server
    rerender(<LocaleSync />);

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders nothing', () => {
    const { container } = render(<LocaleSync />);
    expect(container.innerHTML).toBe('');
  });
});
