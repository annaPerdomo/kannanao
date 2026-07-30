/**
 * Pull a human-readable message out of anything thrown.
 *
 * `err instanceof Error` is not enough here: Supabase rejects a query with a
 * PostgrestError, which is a plain object (`{ message, details, hint, code }`)
 * and fails that check. Every `catch` that only tested for `Error` therefore
 * threw away the one useful line — a schema mismatch surfaced as the generic
 * "Failed to save" and looked, from the outside, like nothing happening at all.
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;

  if (typeof err === 'object' && err !== null) {
    const { message, details } = err as { message?: unknown; details?: unknown };
    if (typeof message === 'string' && message.trim()) return message;
    if (typeof details === 'string' && details.trim()) return details;
  }

  if (typeof err === 'string' && err.trim()) return err;

  return fallback;
}
