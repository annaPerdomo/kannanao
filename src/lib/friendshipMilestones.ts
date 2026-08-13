/**
 * Derived from `points` alone and never persisted, so the award_friendship RPC
 * (5 ❤️/day, per-source daily caps) stays the only source of truth.
 */

import { buddyFacts } from './buddyPhrases';
import { clampPoints, LEVEL_THRESHOLDS } from './friendship';

export type MilestoneKind = 'fact' | 'memory';

export interface Milestone {
  atPoints: number;
  kind: MilestoneKind;
  /** memory milestones: the level reached (2..5) */
  level?: number;
  /** fact milestones: index into the buddy's facts[] */
  factIndex?: number;
}

export const MINOR_MILESTONES = [5, 10, 25, 32, 55, 68, 100, 120];

export function allMilestones(): Milestone[] {
  const minors: Milestone[] = MINOR_MILESTONES.map((atPoints, factIndex) => ({
    atPoints,
    kind: 'fact',
    factIndex,
  }));
  const majors: Milestone[] = LEVEL_THRESHOLDS.slice(1).map((atPoints, i) => ({
    atPoints,
    kind: 'memory',
    level: i + 2,
  }));
  return [...minors, ...majors].sort((a, b) => a.atPoints - b.atPoints);
}

export function nextMilestone(points: number): Milestone | null {
  const earned = clampPoints(points);
  return allMilestones().find((milestone) => milestone.atPoints > earned) ?? null;
}

export function heartsToNext(points: number): number | null {
  const next = nextMilestone(points);
  return next ? next.atPoints - clampPoints(points) : null;
}

/** An upper bound, not a count of authored facts — to render, use `unlockedFacts`. */
export function unlockedFactCount(points: number): number {
  const earned = clampPoints(points);
  return MINOR_MILESTONES.filter((atPoints) => atPoints <= earned).length;
}

export function unlockedFacts(copy: unknown, points: number): string[] {
  return buddyFacts(copy).slice(0, unlockedFactCount(points)).filter(Boolean);
}
