export const DEMO_USERNAME_PREFIX = 'demo-';

export function isDemoUsername(username: string | null | undefined): boolean {
  if (!username) return false;
  return username.toLowerCase().startsWith(DEMO_USERNAME_PREFIX);
}
