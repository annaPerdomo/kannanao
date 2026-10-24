export const DAY_MS = 86_400_000;

export function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
