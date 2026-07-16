import { type Locale, LOCALE_COOKIE, parseLocale } from './config';

// A year. The cookie is the only record of the choice for a visitor who never
// signs in (the landing toggle writes it before an account exists), so it has to
// outlive the session — a session cookie would forget the pick on browser close.
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Browser-side read/write for the locale cookie. Server-side readers use their
 * own APIs against the same name — `cookies()` in src/i18n/request.ts,
 * `request.cookies` in src/middleware.ts — so LOCALE_COOKIE, not this module, is
 * the shared contract.
 *
 * `document` is deliberately not guarded here. Both callers are 'use client'
 * components acting on a user event or inside an effect, never during a server
 * render; a `typeof document === 'undefined'` bail-out would only convert a
 * genuine "this ran where it can't work" bug into a silently ignored write.
 */
export function readLocaleCookie(): Locale | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  if (!match) return null;
  // parseLocale, not resolveLocale: the latter maps anything unrecognized to
  // 'en', which would make a junk cookie indistinguishable from a real English
  // pick. Callers here need "unset or unusable" to stay its own answer.
  return parseLocale(decodeURIComponent(match[1]));
}

/**
 * Writes the locale cookie so the *server* picks it up on the next request —
 * that is the entire point of it being a cookie rather than client state.
 * src/i18n/request.ts reads it to choose the (app) group's messages, and
 * src/middleware.ts reads it to route anonymous `/` to the right landing.
 *
 * Attributes, each load-bearing:
 * - `path=/` — written from /settings, read on every route.
 * - `samesite=lax` — sent on top-level navigations, which is what the landing
 *   toggle's plain-anchor click and the middleware rewrite both depend on.
 * - no `secure` — it would drop the cookie on plain-http local dev, and the
 *   value is a two-letter public preference, not a credential.
 */
export function writeLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}
