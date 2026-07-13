// Locale config shared by the server (src/i18n/request.ts) and client code
// (the language switcher, the <html lang> effect). Kept free of any server-only
// import so it is safe to pull into a 'use client' module.

export const LOCALE_COOKIE = 'NEXT_LOCALE';

export const LOCALES = ['en', 'ja'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Anything that isn't a locale we ship falls back to English. */
export function resolveLocale(value?: string | null): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE;
}

/**
 * The timezone next-intl formats server-side dates in. Without it, next-intl
 * warns on every server render and any date it formats can differ between the
 * server (UTC) and the browser (local) — a hydration mismatch waiting to happen.
 *
 * A literal, not `process.env`: this module is imported by client components, so
 * a non-NEXT_PUBLIC env var would read as undefined in the browser and disagree
 * with the server. The value mirrors REMINDER_TIMEZONE's default in
 * src/lib/reviewReminder.ts, which is already the app's server-side "local" zone.
 */
export const DEFAULT_TIME_ZONE = 'America/Los_Angeles';
