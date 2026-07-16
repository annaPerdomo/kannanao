import { beforeEach, describe, expect, it } from 'vitest';

import { LOCALE_COOKIE, parseLocale, resolveLocale } from '@/i18n/config';
import { readLocaleCookie, writeLocaleCookie } from '@/i18n/localeCookie';

function clearCookies() {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  });
}

describe('parseLocale', () => {
  it('returns the locale for values we ship', () => {
    expect(parseLocale('en')).toBe('en');
    expect(parseLocale('ja')).toBe('ja');
  });

  // The whole reason parseLocale exists next to resolveLocale: "never chose"
  // has to stay distinguishable from "chose English", or a NULL profile column
  // would silently out-rank a Japanese device.
  it('returns null — not English — for absent or unknown values', () => {
    expect(parseLocale(null)).toBeNull();
    expect(parseLocale(undefined)).toBeNull();
    expect(parseLocale('')).toBeNull();
    expect(parseLocale('fr')).toBeNull();
    expect(parseLocale('EN')).toBeNull();
  });
});

describe('resolveLocale', () => {
  it('falls back to English for anything unrecognized', () => {
    expect(resolveLocale('ja')).toBe('ja');
    expect(resolveLocale('fr')).toBe('en');
    expect(resolveLocale(null)).toBe('en');
  });
});

describe('locale cookie', () => {
  beforeEach(clearCookies);

  it('reads back what it writes', () => {
    writeLocaleCookie('ja');
    expect(readLocaleCookie()).toBe('ja');

    writeLocaleCookie('en');
    expect(readLocaleCookie()).toBe('en');
  });

  it('returns null when the cookie is not set', () => {
    expect(readLocaleCookie()).toBeNull();
  });

  it('writes under the name the server reads', () => {
    writeLocaleCookie('ja');
    expect(document.cookie).toContain(`${LOCALE_COOKIE}=ja`);
  });

  it('sets path=/ so a write from /settings is read on every route', () => {
    let written = '';
    const spy = { set: (v: string) => (written = v) };
    Object.defineProperty(document, 'cookie', { get: () => '', set: spy.set, configurable: true });
    writeLocaleCookie('ja');
    expect(written).toContain('path=/');
    expect(written).toContain('samesite=lax');
    // Long-lived: the cookie is the only record of the pick for a visitor who
    // never signs in, so a session cookie would lose it on browser close.
    expect(written).toMatch(/max-age=\d{7,}/);
    // @ts-expect-error — restore jsdom's real cookie jar for the other tests
    delete document.cookie;
  });

  it('ignores a junk cookie value rather than reading it as English', () => {
    document.cookie = `${LOCALE_COOKIE}=klingon; path=/`;
    expect(readLocaleCookie()).toBeNull();
  });

  it('does not confuse a cookie whose name merely ends in the locale name', () => {
    document.cookie = `MY_${LOCALE_COOKIE}=ja; path=/`;
    expect(readLocaleCookie()).toBeNull();
  });
});
