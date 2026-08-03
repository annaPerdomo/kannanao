import { sb } from '@/lib/supabase';

/**
 * Refusals the join endpoints can return. The server sends the code alongside
 * an English `error`; the client prefers the code so the message is localised,
 * and falls back to the English text for anything it doesn't recognise.
 */
export const JOIN_ERROR_CODES = [
  'invalidCode',
  'inviteExpired',
  'inviteUsedUp',
  'ownInvite',
  'inviteTaken',
  'joinFailed',
] as const;

export type JoinErrorCode = (typeof JOIN_ERROR_CODES)[number];

export interface JoinResult {
  /** null on success. */
  code: JoinErrorCode | null;
  message: string;
}

function toCode(value: unknown): JoinErrorCode | null {
  return JOIN_ERROR_CODES.includes(value as JoinErrorCode) ? (value as JoinErrorCode) : null;
}

export async function joinWithCurrentAccount(code: string): Promise<JoinResult | null> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { code: 'joinFailed', message: '' };

  const res = await fetch('/api/join/link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code }),
  });
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    return { code: toCode(body?.code) ?? 'joinFailed', message: body?.error ?? '' };
  }
  return null;
}
