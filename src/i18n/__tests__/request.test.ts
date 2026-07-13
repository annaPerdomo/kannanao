import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_TIME_ZONE, resolveLocale } from '../config';

const getCookie = vi.fn();

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ get: getCookie }),
}));

// Under vitest, `next-intl/server` resolves to the react-client build, whose
// getRequestConfig throws ("not supported in Client Components"). The real
// react-server build just returns the callback it's handed — which is what we
// want to invoke here.
vi.mock('next-intl/server', () => ({
  getRequestConfig: (createRequestConfig: unknown) => createRequestConfig,
}));

// Stand in for a half-translated ja.json: one key present, the rest missing.
vi.mock('@/messages/ja.json', () => ({
  default: { Common: { close: '閉じる' } },
}));

type Config = {
  locale: string;
  messages: Record<string, Record<string, string>>;
  timeZone: string;
};

/** Invokes the getRequestConfig callback the way next-intl does per request. */
async function loadConfig(): Promise<Config> {
  const { default: getConfig } = await import('../request');
  return (await getConfig({ requestLocale: Promise.resolve(undefined) })) as unknown as Config;
}

describe('resolveLocale', () => {
  it('accepts the locales we ship', () => {
    expect(resolveLocale('ja')).toBe('ja');
    expect(resolveLocale('en')).toBe('en');
  });

  it('falls back to English for missing or unknown values', () => {
    expect(resolveLocale(undefined)).toBe('en');
    expect(resolveLocale(null)).toBe('en');
    expect(resolveLocale('')).toBe('en');
    expect(resolveLocale('fr')).toBe('en');
    expect(resolveLocale('JA')).toBe('en');
  });
});

describe('getRequestConfig', () => {
  beforeEach(() => {
    vi.resetModules();
    getCookie.mockReset();
  });

  it('defaults to English when no locale cookie is set', async () => {
    getCookie.mockReturnValue(undefined);

    const config = await loadConfig();

    expect(getCookie).toHaveBeenCalledWith('NEXT_LOCALE');
    expect(config.locale).toBe('en');
    expect(config.messages.Common.close).toBe('Close');
    expect(config.timeZone).toBe(DEFAULT_TIME_ZONE);
  });

  it('switches to Japanese when the cookie says so', async () => {
    getCookie.mockReturnValue({ value: 'ja' });

    const config = await loadConfig();

    expect(config.locale).toBe('ja');
    expect(config.messages.Common.close).toBe('閉じる');
  });

  // The whole point of the deepmerge: extraction lands keys in en.json long
  // before the translation pass fills ja.json, so an untranslated key must
  // render its English copy rather than throw a MISSING_MESSAGE error.
  it('falls back to English for keys Japanese has not translated yet', async () => {
    getCookie.mockReturnValue({ value: 'ja' });

    const config = await loadConfig();

    expect(config.messages.Common.cancel).toBe('Cancel');
    expect(config.messages.Common.somethingWentWrong).toBe('Something went wrong');
  });

  it('ignores a locale we do not ship', async () => {
    getCookie.mockReturnValue({ value: 'fr' });

    const config = await loadConfig();

    expect(config.locale).toBe('en');
    expect(config.messages.Common.close).toBe('Close');
  });
});
