import type { PlanDeck } from '@/types/lessonPlan';

import { availabilityToday } from './assignmentAvailability';
import { KANA_COURSE_READY_FRACTION, type KanaCourseResult } from './kanaCourse';
import {
  getSet,
  isContextualKana,
  kanaSetForChar,
  orderKanaSets,
  segmentReading,
} from './kanaCurriculum';
import type { ReadingStage } from './kanaProficiency';
import {
  addDaysToDate,
  cardIsBlank,
  deckIsSkipped,
  includedCards,
  weekNumbers,
} from './lessonPlanEdits';

export interface KanaGroupMember {
  id: string;
  name: string;
  started: boolean;
}

export interface GroupKanaReadiness {
  members: KanaGroupMember[];
  /**
   * Kana at least one started member cannot read yet, as indexes into
   * `members` — a just-started group owes an entry per character, and repeating
   * uuids there costs tens of kilobytes per plan. Absent means the group reads it.
   */
  shakyBy: Record<string, number[]>;
  /** Each started member's stage per track. Absent when the caller never computed it. */
  stages?: GroupKanaReadingStages;
}

export interface GroupKanaReadingStages {
  hiragana: ReadingStage[];
  katakana: ReadingStage[];
}

/** Answers below this and a member counts as untried: a couple of taps is not a reading level. */
export const KANA_SIGNAL_MIN_ANSWERS = 5;

/** One lesson can only lean on so many rows before "also assign these" stops being one decision. */
export const MAX_COMPANION_KANA_SETS = 6;

/** A whole lesson set's schedule: MAX_LESSON_KANA_ROWS_PER_WEEK across a term of weeks. */
export const MAX_COMPANION_KANA_ROWS = 32;

export interface KanaGap {
  kana: string;
  setId: string | null;
  shaky: KanaGroupMember[];
  untried: KanaGroupMember[];
}

/** No data is not the same as not mastered: a group that never opened Learn Kana has no rows, and flagging every card for them reads as broken. */
export function hasKanaSignal(readiness: GroupKanaReadiness | null | undefined): boolean {
  return !!readiness && readiness.members.some((m) => m.started);
}

export function readingKanaGaps(reading: string, readiness: GroupKanaReadiness): KanaGap[] {
  const untried = readiness.members.filter((m) => !m.started);
  const seen = new Set<string>();
  const gaps: KanaGap[] = [];

  for (const kana of segmentReading(reading)) {
    if (seen.has(kana)) continue;
    seen.add(kana);

    const behind = readiness.shakyBy[kana];
    if (!behind || behind.length === 0) continue;

    gaps.push({
      kana,
      setId: kanaSetForChar(kana),
      shaky: behind.map((i) => readiness.members[i]).filter((m): m is KanaGroupMember => !!m),
      untried,
    });
  }

  return gaps;
}

export function gapSetIds(gaps: KanaGap[]): string[] {
  const ids = new Set(gaps.map((gap) => gap.setId).filter((id): id is string => !!id));
  return orderKanaSets(ids).map((set) => set.id);
}

/** Gaps per deck, per card, index-aligned with every card so the review rows can read them off. */
export function planKanaGaps(
  decks: PlanDeck[],
  readiness: GroupKanaReadiness | null | undefined,
): KanaGap[][][] {
  if (!hasKanaSignal(readiness)) return decks.map((deck) => (deck.cards ?? []).map(() => []));
  // The generator leaves `reading` empty when the word is already kana, so the
  // word itself is the reading. segmentReading drops kanji, so this is safe.
  return decks.map((deck) =>
    (deck.cards ?? []).map((card) => readingKanaGaps(card.reading || card.word || '', readiness!)),
  );
}

/** Capped here so the callout, the apply route and the printable all name the same rows. */
export function companionSetIds(decks: PlanDeck[], perDeck: KanaGap[][][]): string[] {
  const gaps = decks.flatMap((deck, d) =>
    deckIsSkipped(deck)
      ? []
      : (deck.cards ?? []).flatMap((card, c) =>
          card.excluded || cardIsBlank(card) ? [] : (perDeck[d]?.[c] ?? []),
        ),
  );
  return gapSetIds(gaps).slice(0, MAX_COMPANION_KANA_SETS);
}

/** The educator's answer to "can your group already read this?", one per script. */
export const KANA_READING_ANSWERS = ['not-yet', 'learning', 'yes'] as const;
export type KanaReadingAnswer = (typeof KANA_READING_ANSWERS)[number];

export function isKanaReadingAnswer(value: unknown): value is KanaReadingAnswer {
  return (KANA_READING_ANSWERS as readonly unknown[]).includes(value);
}

/** Used until the educator answers, or when a track has no data to prefill from. */
export const DEFAULT_KANA_READING_ANSWER: KanaReadingAnswer = 'learning';

export interface ReadingLevelInput {
  hiragana: KanaReadingAnswer;
  katakana: KanaReadingAnswer;
}

/**
 * The answer the review step preselects, before the educator overrides it.
 * Counted as a share, not unanimously: one new joiner must not put a fluent
 * class back to the start, and two fluent starters must not speak for twenty.
 */
export function prefillReadingLevelAnswer(stages: ReadingStage[]): KanaReadingAnswer {
  if (stages.length === 0) return DEFAULT_KANA_READING_ANSWER;
  const share = (stage: ReadingStage) => stages.filter((s) => s === stage).length / stages.length;
  if (share('reads') >= KANA_COURSE_READY_FRACTION) return 'yes';
  if (share('new') >= KANA_COURSE_READY_FRACTION) return 'not-yet';
  return 'learning';
}

/** Sounds land this many days ahead of the deck that needs them, never before today. */
export const KANA_LEAD_DAYS = 3;

/** A week full of brand-new sounds still hands out only this many rows; the rest wait for next week. */
export const MAX_LESSON_KANA_ROWS_PER_WEEK = 4;

const LESSON_KANA_DAYS_PER_WEEK = 7;

type TrackGapPolicy = 'all' | 'none' | 'data';

// The educator's answer settles a track outright; only 'learning' with real
// signal defers to the data, which is what hasKanaSignal already gates on.
function trackGapPolicy(hasSignal: boolean, answer: KanaReadingAnswer): TrackGapPolicy {
  if (answer === 'yes') return 'none';
  if (answer === 'not-yet') return 'all';
  return hasSignal ? 'data' : 'all';
}

/**
 * A row is scheduled once, in the first week that needs it. Shares
 * planKanaCourse's week shape so both kana schedules read the same way.
 */
export function planLessonKana(
  decks: PlanDeck[],
  readiness: GroupKanaReadiness | null | undefined,
  readingLevel: ReadingLevelInput,
  firstDueDate: string,
  today: string = availabilityToday(),
): KanaCourseResult {
  const hasSignal = hasKanaSignal(readiness);
  const weeks = weekNumbers(decks);
  const scheduled = new Set<string>();
  const pending: string[] = [];
  const result: KanaCourseResult['weeks'] = [];

  decks.forEach((deck, deckIndex) => {
    const weekIndex = weeks[deckIndex];
    if (weekIndex == null) return;
    const deckDueDate = addDaysToDate(firstDueDate, LESSON_KANA_DAYS_PER_WEEK * (weekIndex - 1));
    if (!deckDueDate) return;

    const neededThisWeek = new Set<string>();
    for (const card of includedCards(deck)) {
      const reading = card.reading || card.word || '';
      for (const kana of segmentReading(reading)) {
        if (isContextualKana(kana)) continue;
        const setId = kanaSetForChar(kana);
        if (!setId || scheduled.has(setId)) continue;
        const track = getSet(setId)?.track;
        if (!track) continue;

        const policy = trackGapPolicy(hasSignal, readingLevel[track]);
        if (policy === 'none') continue;
        if (policy === 'all') {
          neededThisWeek.add(setId);
          continue;
        }
        // 'learning' with signal: only rows a started member is still behind on.
        const behind = readiness?.shakyBy[kana];
        if (behind && behind.length > 0) neededThisWeek.add(setId);
      }
    }

    for (const set of orderKanaSets(neededThisWeek)) {
      scheduled.add(set.id);
      pending.push(set.id);
    }
    if (pending.length === 0) return;

    const idealDue = addDaysToDate(deckDueDate, -KANA_LEAD_DAYS) ?? deckDueDate;
    const dueDate = idealDue < today ? today : idealDue;
    result.push({
      index: weekIndex,
      dueDate,
      setIds: pending.splice(0, MAX_LESSON_KANA_ROWS_PER_WEEK),
    });
  });

  // Demand outlasting the plan's own weeks runs on past it a week at a time.
  // Dumping it on the last week would hand a beginner the whole chart on one day.
  while (pending.length > 0 && result.length > 0) {
    const last = result[result.length - 1];
    const dueDate = addDaysToDate(last.dueDate, LESSON_KANA_DAYS_PER_WEEK);
    if (!dueDate) break;
    result.push({
      index: last.index + 1,
      dueDate,
      setIds: pending.splice(0, MAX_LESSON_KANA_ROWS_PER_WEEK),
    });
  }

  return { weeks: result };
}
