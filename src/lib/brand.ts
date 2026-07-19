/**
 * Central brand identity. Change the app name or domain here and it propagates to
 * every display surface that imports these constants (titles, metadata, footer,
 * wordmarks, structured data, etc.).
 *
 * NOTE: A handful of internal identifiers intentionally do NOT derive from this file
 * because changing them would break existing data or auth:
 *   - the `kannanao.local` auth email domain (member/admin logins are stored against it)
 *   - the `kannanao-*` / `kannanao:` localStorage & sessionStorage keys (saved theme,
 *     calendar todos, push state, embed theme, dismissal flags)
 * Those are kept as legacy values on purpose. See AuthContext / ThemeContext / etc.
 */

/** The user-facing app name. */
export const APP_NAME = 'Tangodachi';

/** The wordmark: cherry-blossom emoji + name. */
export const APP_NAME_WITH_EMOJI = `🌸 ${APP_NAME}`;

/** Bare registrable domain, no scheme (e.g. for display and host matching). */
export const APP_DOMAIN = 'tangodachi.app';

/** Apex origin, no `www`. Used by the middleware apex→www redirect. */
export const APP_URL_APEX = `https://${APP_DOMAIN}`;

/** Canonical origin (with `www`). Used for metadata, sitemap, robots, OG, structured data. */
export const APP_URL = `https://www.${APP_DOMAIN}`;
