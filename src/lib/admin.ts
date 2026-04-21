const ADMIN_DOMAIN = 'kannanao.local';

/** Client-side admin check — uses NEXT_PUBLIC_ADMIN_USERNAME */
export function isAdminUser(email: string | undefined): boolean {
  if (!email) return false;
  const [username, domain] = email.split('@');
  if (domain !== ADMIN_DOMAIN) return false;
  return username === (process.env.NEXT_PUBLIC_ADMIN_USERNAME ?? 'test');
}

/** Server-side admin check — uses ADMIN_USERNAME (falls back to NEXT_PUBLIC_ADMIN_USERNAME) */
export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const [username, domain] = email.split('@');
  if (domain !== ADMIN_DOMAIN) return false;
  const adminUsername = process.env.ADMIN_USERNAME ?? process.env.NEXT_PUBLIC_ADMIN_USERNAME ?? 'test';
  return username === adminUsername;
}
