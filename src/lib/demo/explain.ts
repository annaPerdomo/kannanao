import { countStrengths } from '@/lib/cardStrength';
import { BASE_REVIEW_CAP } from '@/lib/dailyPractice';
import { endingItems } from '@/lib/grammarEndings';
import { MIN_SENTENCES } from '@/lib/mixedPractice';
import type { ChainLeg, ChainMode } from '@/lib/practiceChain';
import type { CardProgress } from '@/lib/supabase';

import { DEMO_CARDS, demoAssignment } from './deck';
import type { DemoCardChange, DemoDayPlan } from './simulate';

export type ReasonKey =
  | 'review'
  | 'reviewCapRaised'
  | 'kana'
  | 'newWords'
  | 'recall'
  | 'strongWords'
  | 'sentences'
  | 'endings'
  | 'assignment'
  | 'practice';

export const REASON_KEYS: readonly ReasonKey[] = [
  'review',
  'reviewCapRaised',
  'kana',
  'newWords',
  'recall',
  'strongWords',
  'sentences',
  'endings',
  'assignment',
  'practice',
];

export interface LegReason {
  leg: ChainLeg;
  reason: ReasonKey;
  values: Record<string, number>;
}

const CARD_BY_ID = new Map(DEMO_CARDS.map((card) => [card.id, card]));

function reasonForLeg(
  leg: ChainLeg,
  day: DemoDayPlan,
  counts: ReturnType<typeof countStrengths>,
  assignmentMode: string | null,
): LegReason {
  if (leg.mode === 'review') {
    if (day.dueCount > BASE_REVIEW_CAP) {
      return {
        leg,
        reason: 'reviewCapRaised',
        values: { count: day.reviewCardIds.length, cap: day.reviewCap },
      };
    }
    return { leg, reason: 'review', values: { count: day.reviewCardIds.length } };
  }
  if (leg.mode === 'kana-journey') return { leg, reason: 'kana', values: {} };
  if (leg.step === 'warmup') return { leg, reason: 'newWords', values: { count: counts.new } };
  if (leg.mode === 'recall') {
    return { leg, reason: 'recall', values: { count: day.sessionCardIds.length } };
  }
  if (leg.mode === 'kotoba-bubble') {
    return { leg, reason: 'sentences', values: { min: MIN_SENTENCES } };
  }
  if (leg.mode === 'endings') {
    const legCards = (leg.cardIds ?? day.sessionCardIds).flatMap((id) => {
      const card = CARD_BY_ID.get(id);
      return card ? [card] : [];
    });
    return { leg, reason: 'endings', values: { count: endingItems(legCards).length } };
  }
  if (leg.step === 'goal') {
    if (assignmentMode != null && leg.mode === assignmentMode) {
      return { leg, reason: 'assignment', values: {} };
    }
    return { leg, reason: 'strongWords', values: { count: counts.strong } };
  }
  return { leg, reason: 'practice', values: {} };
}

export function explainPlan(day: DemoDayPlan, progress: CardProgress[]): LegReason[] {
  const counts = countStrengths(day.sessionCardIds, progress);
  const assignmentMode = demoAssignment(new Date(day.now)).required_mode;
  return day.plan.map((leg) => reasonForLeg(leg, day, counts, assignmentMode));
}

export function droppedLegs(day: DemoDayPlan): ChainLeg[] {
  const keptModes = new Set(day.plan.map((leg) => leg.mode));
  return day.offered.filter((leg) => !keptModes.has(leg.mode));
}

export function diffPlans(
  before: ChainLeg[],
  after: ChainLeg[],
): { added: ChainMode[]; removed: ChainMode[] } {
  const countOf = (legs: ChainLeg[]) => {
    const map = new Map<ChainMode, number>();
    for (const leg of legs) map.set(leg.mode, (map.get(leg.mode) ?? 0) + 1);
    return map;
  };
  const beforeCounts = countOf(before);
  const afterCounts = countOf(after);

  const added: ChainMode[] = [];
  for (const [mode, count] of afterCounts) {
    const extra = count - (beforeCounts.get(mode) ?? 0);
    for (let i = 0; i < extra; i++) added.push(mode);
  }
  const removed: ChainMode[] = [];
  for (const [mode, count] of beforeCounts) {
    const extra = count - (afterCounts.get(mode) ?? 0);
    for (let i = 0; i < extra; i++) removed.push(mode);
  }
  return { added, removed };
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export interface NextReviewTime {
  unit: 'minute' | 'hour' | 'day';
  value: number;
}

export function describeNext(change: DemoCardChange, now: Date): NextReviewTime {
  const diffMs = Date.parse(change.after.nextReviewAt) - now.getTime();
  const minutes = Math.round(diffMs / MINUTE_MS);
  if (Math.abs(diffMs) < HOUR_MS) return { unit: 'minute', value: minutes };
  const hours = Math.round(diffMs / HOUR_MS);
  if (Math.abs(diffMs) < DAY_MS) return { unit: 'hour', value: hours };
  return { unit: 'day', value: Math.round(diffMs / DAY_MS) };
}
