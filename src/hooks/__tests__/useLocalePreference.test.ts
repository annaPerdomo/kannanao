import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LOCALE_COOKIE } from '@/i18n/config';

const mockRefresh = vi.fn();
const mockGetUser = vi.fn();
const mockUpdateProfileLocale = vi.fn();
let activeLocale = 'en';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock('next-intl', () => ({
  useLocale: () => activeLocale,
}));

vi.mock('@/lib/supabase', () => ({
  sb: { auth: { getUser: (...args: unknown[]) => mockGetUser(...args) } },
  updateProfileLocale: (...args: unknown[]) => mockUpdateProfileLocale(...args),
}));

import { useLocalePreference } from '@/hooks/useLocalePreference';

function readCookie() {
  return document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`))?.[1] ?? null;
}

describe('useLocalePreference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeLocale = 'en';
    document.cookie = `${LOCALE_COOKIE}=; path=/; max-age=0`;
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockUpdateProfileLocale.mockResolvedValue({ error: null });
  });

  it('exposes the active locale from next-intl', () => {
    activeLocale = 'ja';
    const { result } = renderHook(() => useLocalePreference());
    expect(result.current.locale).toBe('ja');
  });

  it('writes the profile row and the cookie, then refreshes', async () => {
    const { result } = renderHook(() => useLocalePreference());

    await act(async () => {
      await result.current.setLocale('ja');
    });

    expect(mockUpdateProfileLocale).toHaveBeenCalledWith('u1', 'ja');
    expect(readCookie()).toBe('ja');
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.saved).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.saving).toBe(false);
  });

  // The ordering guarantee this hook is built around: the fallible write goes
  // first, so a DB failure can never leave the cookie claiming a language the
  // account never took. This is what a cookie-first + rollback design would have
  // had to undo — here there is simply nothing to roll back.
  it('leaves the cookie untouched when the profile write fails', async () => {
    mockUpdateProfileLocale.mockResolvedValue({ error: 'permission denied' });
    const { result } = renderHook(() => useLocalePreference());

    await act(async () => {
      await result.current.setLocale('ja');
    });

    expect(readCookie()).toBeNull();
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(result.current.error).toBe('permission denied');
    expect(result.current.saved).toBe(false);
    expect(result.current.saving).toBe(false);
  });

  it('does not strand a stale cookie when a later write fails', async () => {
    const { result } = renderHook(() => useLocalePreference());
    await act(async () => {
      await result.current.setLocale('ja');
    });
    expect(readCookie()).toBe('ja');

    mockUpdateProfileLocale.mockResolvedValue({ error: 'network' });
    await act(async () => {
      await result.current.setLocale('en');
    });

    // Still 'ja' — the failed switch to English changed nothing, rather than
    // half-applying it to the cookie only.
    expect(readCookie()).toBe('ja');
    expect(result.current.error).toBe('network');
  });

  // A user whose profiles.locale is NULL and who deliberately picks the language
  // they can already see has still made a choice, and it has to reach the row —
  // otherwise the column stays NULL and their Japanese browser overrides it at
  // the next sign-in.
  it('persists a re-pick of the language already showing', async () => {
    const { result } = renderHook(() => useLocalePreference());

    await act(async () => {
      await result.current.setLocale('en');
    });

    expect(mockUpdateProfileLocale).toHaveBeenCalledWith('u1', 'en');
    expect(readCookie()).toBe('en');
  });

  it('skips the refresh when the visible language does not change', async () => {
    const { result } = renderHook(() => useLocalePreference());

    await act(async () => {
      await result.current.setLocale('en');
    });

    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('still writes the cookie when there is no signed-in user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { result } = renderHook(() => useLocalePreference());

    await act(async () => {
      await result.current.setLocale('ja');
    });

    expect(mockUpdateProfileLocale).not.toHaveBeenCalled();
    expect(readCookie()).toBe('ja');
    expect(result.current.error).toBeNull();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('clears a previous error on the next attempt', async () => {
    mockUpdateProfileLocale.mockResolvedValue({ error: 'boom' });
    const { result } = renderHook(() => useLocalePreference());
    await act(async () => {
      await result.current.setLocale('ja');
    });
    expect(result.current.error).toBe('boom');

    mockUpdateProfileLocale.mockResolvedValue({ error: null });
    await act(async () => {
      await result.current.setLocale('ja');
    });
    expect(result.current.error).toBeNull();
    expect(result.current.saved).toBe(true);
  });
});
