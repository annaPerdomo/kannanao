/**
 * Round a series maximum up to a clean axis ceiling (10, 20, 50, 100, 250 …) so
 * the ticks read as round numbers instead of "37" and "74". The axis labels the
 * midpoint too, so the ceiling must also halve into a whole number: counts are
 * integers and a "12.5 cards" tick reads as a bug.
 */
export function axisCeiling(max: number): number {
  if (max <= 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = step * magnitude;
    if (candidate >= max && Number.isInteger(candidate / 2)) return candidate;
  }
  return 10 * magnitude;
}

/**
 * Cut points for the heatmap ramp: the quartiles of every day anyone studied.
 *
 * Scaling to the busiest cell instead would wash out a whole class behind one
 * outlier — a member doing a steady 20 cards a day next to someone's 200 would
 * read as "did nothing". Quartiles spread the four steps across the group's
 * actual distribution.
 */
export function heatThresholds(values: number[]): [number, number, number] {
  const active = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (active.length === 0) return [0, 0, 0];
  const at = (p: number) => active[Math.floor(p * (active.length - 1))];
  return [at(0.25), at(0.5), at(0.75)];
}

/**
 * Which step of the four-step ramp a cell lands on. 0 means "nothing happened"
 * and gets the neutral track, never a tint — an empty day must not read as a
 * small amount. With no spread at all, every studied day gets the same mid step.
 */
export function heatLevel(value: number, thresholds: [number, number, number]): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0) return 0;
  const [q1, q2, q3] = thresholds;
  if (q1 === q3) return 3;
  if (value <= q1) return 1;
  if (value <= q2) return 2;
  if (value <= q3) return 3;
  return 4;
}
