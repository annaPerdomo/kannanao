/**
 * Routes where the user is mid-session (answering cards, playing a review game,
 * reciting a speech). Celebrations that steal focus wait until they leave.
 */
const SESSION_ROUTES = [
  /\/deck\/[^/]+\/practice/,
  /\/deck\/[^/]+\/study/,
  /\/ohanashikai\/[^/]+\/practice/,
  // /review is the hub; every child of it (today, match, kana, …) is a session.
  /\/review\/[^/]+/,
];

export function isSessionRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return SESSION_ROUTES.some((route) => route.test(pathname));
}
