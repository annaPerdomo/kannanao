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

/** Percent correct per day, or `null` on a zero-card day — a day nobody studied has no accuracy. */
export function dailyAccuracy(cards: number[], correct: number[]): Array<number | null> {
  return cards.map((c, i) => (c > 0 ? Math.round(((correct[i] ?? 0) / c) * 100) : null));
}

export interface LinePoint {
  /** Percent across the plot width (0-100), for an SVG viewBox 0 0 100 100. */
  x: number;
  /** Percent down from the top (100 - value), so higher accuracy sits higher. */
  y: number;
}

/**
 * Contiguous runs of plottable points, split wherever a day has no accuracy —
 * a null day breaks the line rather than interpolating across it.
 */
export function lineSegments(values: Array<number | null>): LinePoint[][] {
  const segments: LinePoint[][] = [];
  let current: LinePoint[] = [];
  values.forEach((value, i) => {
    if (value === null) {
      if (current.length) segments.push(current);
      current = [];
      return;
    }
    current.push({ x: ((i + 0.5) / values.length) * 100, y: 100 - value });
  });
  if (current.length) segments.push(current);
  return segments;
}
