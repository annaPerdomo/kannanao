import { availabilityToday } from './assignmentAvailability';
import type { GroupKanaCoverage } from './kanaChartPrintable';
import {
  getSet,
  HIRAGANA_SETS,
  isContextualKana,
  KANA_SETS,
  KATAKANA_SETS,
  orderKanaSets,
} from './kanaCurriculum';
import { addDaysToDate } from './lessonPlanEdits';

export type KanaCourseScript = 'hiragana' | 'katakana' | 'both';

/** Share of the group that must read a row before a course skips past it. */
export const KANA_COURSE_READY_FRACTION = 0.8;

const DAYS_PER_WEEK = 7;

export interface KanaCourseWeek {
  /** 1-based, matching the lesson set's weekNumbers convention. */
  index: number;
  dueDate: string;
  setIds: string[];
}

export interface KanaCourseResult {
  weeks: KanaCourseWeek[];
}

export interface KanaCourseDeckNeed {
  setId: string;
  firstDueDate: string;
}

const CURRICULUM_INDEX = new Map(KANA_SETS.map((set, i) => [set.id, i]));

function scriptSets(script: KanaCourseScript): typeof KANA_SETS {
  if (script === 'hiragana') return HIRAGANA_SETS;
  if (script === 'katakana') return KATAKANA_SETS;
  return [...HIRAGANA_SETS, ...KATAKANA_SETS];
}

export function rowReadFraction(setId: string, coverage: GroupKanaCoverage | undefined): number {
  const set = getSet(setId);
  if (!set || !coverage) return 0;
  // Learners who never opened Learn Kana are not evidence that the group cannot
  // read a row; counting them would restart every advanced group from あ.
  const readers = coverage.startedCount ?? coverage.learnerCount;
  if (readers === 0) return 0;
  const scanned = set.entries.filter((entry) => !isContextualKana(entry.kana));
  if (scanned.length === 0) return 1;
  return Math.min(...scanned.map((entry) => (coverage.knownByKana[entry.kana] ?? 0) / readers));
}

/** Null means every row is already read — there is nothing to skip past. */
export function suggestKanaCourseStart(
  script: KanaCourseScript,
  coverage?: GroupKanaCoverage,
): string | null {
  const sets = scriptSets(script);
  if (sets.length === 0) return null;
  if (!coverage) return sets[0].id;
  const behind = sets.find((set) => rowReadFraction(set.id, coverage) < KANA_COURSE_READY_FRACTION);
  return behind?.id ?? null;
}

export interface PlanKanaCourseArgs {
  script: KanaCourseScript;
  /** Skip everything before this row. Defaults to the coverage-suggested start, or the first row. */
  fromSetId?: string | null;
  rowsPerWeek: number;
  weeks: number;
  firstDueDate: string;
  coverage?: GroupKanaCoverage;
}

export function planKanaCourse(args: PlanKanaCourseArgs): KanaCourseResult {
  const sets = scriptSets(args.script);
  const startId = args.fromSetId ?? suggestKanaCourseStart(args.script, args.coverage);
  // No start row means either the group already reads the whole script or the
  // caller named a row this script does not contain: plan nothing, never あ.
  const startIndex = startId ? sets.findIndex((set) => set.id === startId) : -1;
  if (startIndex < 0) return { weeks: [] };
  const ordered = sets.slice(startIndex);

  const rowsPerWeek = Math.max(1, args.rowsPerWeek);
  const weeks: KanaCourseWeek[] = [];

  for (let w = 0; w < args.weeks; w += 1) {
    const chunk = ordered.slice(w * rowsPerWeek, (w + 1) * rowsPerWeek);
    if (chunk.length === 0) break;
    const dueDate = addDaysToDate(args.firstDueDate, DAYS_PER_WEEK * w);
    if (!dueDate) break;
    weeks.push({ index: w + 1, dueDate, setIds: chunk.map((set) => set.id) });
  }

  return { weeks };
}

export interface PlanKanaFromDecksArgs {
  needs: KanaCourseDeckNeed[];
  coverage?: GroupKanaCoverage;
  rowsPerWeek: number;
  /** Days a row should lead its earliest deck's due date, so the sounds land before the words do. */
  leadDays: number;
  /** Plain YYYY-MM-DD; injectable so tests are deterministic. */
  today?: string;
}

/**
 * A row two decks need is scheduled once, against the earlier deck; a week
 * landing before today, or before the week before it, rolls forward.
 */
export function planKanaFromDecks(args: PlanKanaFromDecksArgs): KanaCourseResult {
  const today = args.today ?? availabilityToday();

  const earliestDue = new Map<string, string>();
  for (const need of args.needs) {
    const current = earliestDue.get(need.setId);
    if (!current || need.firstDueDate < current) earliestDue.set(need.setId, need.firstDueDate);
  }

  const wantedIds = [...earliestDue.keys()].filter(
    (setId) => rowReadFraction(setId, args.coverage) < KANA_COURSE_READY_FRACTION,
  );

  const ordered = orderKanaSets(wantedIds).sort((a, b) => {
    const dueA = earliestDue.get(a.id)!;
    const dueB = earliestDue.get(b.id)!;
    if (dueA === dueB) return (CURRICULUM_INDEX.get(a.id) ?? 0) - (CURRICULUM_INDEX.get(b.id) ?? 0);
    return dueA < dueB ? -1 : 1;
  });

  const rowsPerWeek = Math.max(1, args.rowsPerWeek);
  const weeks: KanaCourseWeek[] = [];
  let minAllowed = today;

  for (let start = 0; start < ordered.length; start += rowsPerWeek) {
    const chunk = ordered.slice(start, start + rowsPerWeek);
    const idealDue = addDaysToDate(earliestDue.get(chunk[0].id)!, -args.leadDays) ?? today;
    const dueDate = idealDue < minAllowed ? minAllowed : idealDue;
    weeks.push({ index: weeks.length + 1, dueDate, setIds: chunk.map((set) => set.id) });
    minAllowed = addDaysToDate(dueDate, DAYS_PER_WEEK) ?? dueDate;
  }

  return { weeks };
}
