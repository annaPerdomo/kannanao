'use client';
import { useLocale } from 'next-intl';
import { useEffect } from 'react';

// The root layout is a static, data-free shell, so it hardcodes <html lang="en">
// and can't be allowed to read the locale cookie. This runs inside the (app)
// providers (which are per-request) and corrects the attribute on the client,
// keeping screen readers and browser translation heuristics honest without
// costing the landing page its static prerender.
export function LocaleHtmlLang() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
