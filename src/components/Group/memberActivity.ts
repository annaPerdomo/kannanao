/** Days since a member last studied; `Infinity` for someone who never has. */
export function daysSinceActive(lastActive: string | null, now = Date.now()): number {
  if (!lastActive) return Infinity;
  return (now - new Date(lastActive).getTime()) / 86_400_000;
}

/** Must match the overview's "active this week", so the two counts split one roster. */
export const STALE_DAYS = 7;

/** Colors mirror the design mock's swatches. */
export function recencyDotColor(lastActive: string | null, now = Date.now()): string {
  if (!lastActive) return '#9CA3AF';
  const days = daysSinceActive(lastActive, now);
  if (days < 1) return '#22C55E';
  if (days < 3) return '#EAB308';
  return '#9CA3AF';
}
