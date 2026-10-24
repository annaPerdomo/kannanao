import type { SupabaseClient } from '@supabase/supabase-js';

/** Marks an auth user created by the nightly demo reset, so it can never be adopted by mistake. */
export const DEMO_APP_METADATA = { demo: true } as const;

interface MaybeError {
  error: { message: string } | null;
}

/** Throws with the failing table named, so a wipe/insert step never silently no-ops. */
export async function mustSucceed(label: string, result: MaybeError): Promise<void> {
  if (result.error) throw new Error(`${label} failed: ${result.error.message}`);
}

/** An empty id list would make `.in(col, ids)` match nothing — safe in Postgres, but a
 * sign this reset is about to run scoped only by coincidence. Fail loudly instead. */
export function requireNonEmpty(ids: readonly string[], label: string): string[] {
  if (ids.length === 0) throw new Error(`${label}: demo id list is empty, refusing to run`);
  return [...ids];
}

export async function deleteWhereIn(
  sb: SupabaseClient,
  table: string,
  column: string,
  ids: readonly string[],
): Promise<void> {
  const result = await sb.from(table).delete().in(column, requireNonEmpty(ids, table));
  await mustSucceed(`delete ${table}`, result);
}
