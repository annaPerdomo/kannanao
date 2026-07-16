import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Locale } from '@/i18n/config';

// A file-local next-intl mock, overriding the global shim in src/test/setup.ts —
// that one hardcodes useLocale() to 'en' and stubs NextIntlClientProvider to a
// passthrough, so a real provider around this component could never change the
// locale it sees. Driving the hook directly is the only way to assert the thing
// that matters here: that the component *reacts* when the locale changes.
let mockLocale: Locale = 'en';
vi.mock('next-intl', () => ({
  useLocale: () => mockLocale,
}));

import { LocaleHtmlLang } from '@/components/LocaleHtmlLang';

describe('LocaleHtmlLang', () => {
  beforeEach(() => {
    document.documentElement.lang = 'en';
    mockLocale = 'en';
  });

  it('corrects the root lang the static shell hardcoded', () => {
    mockLocale = 'ja';
    render(<LocaleHtmlLang />);
    expect(document.documentElement.lang).toBe('ja');
  });

  // The switcher's payoff path: picking 日本語 writes the cookie and calls
  // router.refresh(), the server re-renders with the new locale, and this has to
  // follow it. If it didn't, a screen reader would keep announcing Japanese copy
  // in an English voice.
  it('follows the locale when it changes under it', () => {
    const { rerender } = render(<LocaleHtmlLang />);
    expect(document.documentElement.lang).toBe('en');

    mockLocale = 'ja';
    rerender(<LocaleHtmlLang />);

    expect(document.documentElement.lang).toBe('ja');
  });

  it('renders nothing', () => {
    const { container } = render(<LocaleHtmlLang />);
    expect(container.innerHTML).toBe('');
  });
});
