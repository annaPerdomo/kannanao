import type {
  LessonLibrary,
  LessonUnit,
  LessonUnitWeek,
  LessonWeekStatus,
} from '@/types/lessonUnit';

/** UTC math only — these are plain 'YYYY-MM-DD' strings, so local time would drift near midnight. */
export function shiftDate(date: string | null, days: number): string | null {
  if (date === null) return null;
  const start = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(start)) return null;
  return new Date(start + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const WEEK_DAYS = 7;

/** Due a week after the unit's last week, or a week from today when there is no last week or it already passed. */
export function nextWeekDates(
  lastDueDate: string | null,
  today: string,
): { dueDate: string; availableOn: string } {
  const base = lastDueDate !== null && lastDueDate >= today ? lastDueDate : today;
  const dueDate = shiftDate(base, WEEK_DAYS) ?? base;
  const availableOn = shiftDate(dueDate, -WEEK_DAYS) ?? dueDate;
  return { dueDate, availableOn };
}

/** Preserves each week's gap from the source's first due date, so a shifted holiday week survives the copy. */
export function rebaseSchedule(
  weeks: { dueDate: string | null; availableOn: string | null }[],
  firstDueDate: string,
): { dueDate: string; availableOn: string }[] {
  const sourceFirstDue = weeks.find((w) => w.dueDate !== null)?.dueDate ?? null;

  const result: { dueDate: string; availableOn: string }[] = [];
  let previousDue: string | null = null;
  for (const week of weeks) {
    let dueDate: string;
    if (week.dueDate !== null && sourceFirstDue !== null) {
      const offsetDays = Math.round(
        (Date.parse(`${week.dueDate}T00:00:00Z`) - Date.parse(`${sourceFirstDue}T00:00:00Z`)) /
          (24 * 60 * 60 * 1000),
      );
      dueDate = shiftDate(firstDueDate, offsetDays) ?? firstDueDate;
    } else if (previousDue !== null) {
      dueDate = shiftDate(previousDue, WEEK_DAYS) ?? previousDue;
    } else {
      dueDate = firstDueDate;
    }

    let availableOn: string;
    if (week.availableOn !== null && week.dueDate !== null) {
      const gapDays = Math.round(
        (Date.parse(`${week.dueDate}T00:00:00Z`) - Date.parse(`${week.availableOn}T00:00:00Z`)) /
          (24 * 60 * 60 * 1000),
      );
      availableOn = shiftDate(dueDate, -gapDays) ?? dueDate;
    } else {
      availableOn = shiftDate(dueDate, -WEEK_DAYS) ?? dueDate;
    }
    if (availableOn > dueDate) availableOn = dueDate;

    result.push({ dueDate, availableOn });
    previousDue = dueDate;
  }
  return result;
}

export function weekStatus(
  availableOn: string | null,
  dueDate: string | null,
  today: string,
): LessonWeekStatus {
  if (availableOn && availableOn > today) return 'upcoming';
  if (dueDate && dueDate < today) return 'past';
  return 'current';
}

export function lessonStatus(args: {
  handedOut: boolean;
  availableOn: string | null;
  dueDate: string | null;
  today: string;
}): LessonWeekStatus {
  if (!args.handedOut) return 'draft';
  return weekStatus(args.availableOn, args.dueDate, args.today);
}

interface ScheduleFields {
  title: string | null;
  note: string | null;
  due_date: string | null;
  available_on: string | null;
  required_accuracy: number | null;
  required_mode: string | null;
}

const EMPTY_SCHEDULE: ScheduleFields = {
  title: null,
  note: null,
  due_date: null,
  available_on: null,
  required_accuracy: null,
  required_mode: null,
};

function scheduleKey(fields: ScheduleFields): string {
  return JSON.stringify([
    fields.title,
    fields.note,
    fields.due_date,
    fields.available_on,
    fields.required_accuracy,
    fields.required_mode,
  ]);
}

function mostCommonSchedule(rows: ScheduleFields[]): ScheduleFields | null {
  if (rows.length === 0) return null;
  const counts = new Map<string, { fields: ScheduleFields; count: number }>();
  for (const row of rows) {
    const key = scheduleKey(row);
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, { fields: row, count: 1 });
  }

  let best: { fields: ScheduleFields; count: number } | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) {
      best = entry;
      continue;
    }
    if (entry.count === best.count) {
      const bestDue = best.fields.due_date ?? '9999-99-99';
      const dueCandidate = entry.fields.due_date ?? '9999-99-99';
      if (dueCandidate < bestDue) best = entry;
    }
  }
  return best?.fields ?? null;
}

export function buildLessonLibrary(input: {
  plans: { id: string; title: string | null; jlpt_level: string | null; created_at: string }[];
  planDecks: {
    plan_id: string;
    deck_id: string;
    position: number;
    kana_sets?: string[] | null;
  }[];
  decks: { id: string; name: string; emoji: string | null }[];
  cardCounts?: Record<string, number>;
  templates: {
    deck_id: string;
    title: string | null;
    note: string | null;
    due_date: string | null;
    available_on: string | null;
    required_accuracy: number | null;
    required_mode: string | null;
  }[];
  assignments: {
    deck_id: string | null;
    title: string | null;
    note: string | null;
    due_date: string | null;
    available_on: string | null;
    required_accuracy: number | null;
    required_mode: string | null;
    completed_at: string | null;
  }[];
  today: string;
}): LessonLibrary {
  const { plans, planDecks, decks, cardCounts = {}, templates, assignments, today } = input;

  const deckById = new Map(decks.map((d) => [d.id, d]));
  const templateByDeck = new Map(templates.map((t) => [t.deck_id, t]));
  const kanaSetsByDeck = new Map(planDecks.map((pd) => [pd.deck_id, pd.kana_sets ?? []]));

  const assignmentsByDeck = new Map<string, typeof assignments>();
  for (const row of assignments) {
    if (!row.deck_id) continue;
    const list = assignmentsByDeck.get(row.deck_id) ?? [];
    list.push(row);
    assignmentsByDeck.set(row.deck_id, list);
  }

  function scheduleFor(deckId: string): ScheduleFields {
    const template = templateByDeck.get(deckId);
    if (template) return template;
    const rows = assignmentsByDeck.get(deckId) ?? [];
    return mostCommonSchedule(rows.map((r) => ({ ...r }))) ?? EMPTY_SCHEDULE;
  }

  function weekFor(deckId: string, week: number | null): LessonUnitWeek | null {
    const deck = deckById.get(deckId);
    if (!deck) return null;
    const schedule = scheduleFor(deckId);
    const rows = assignmentsByDeck.get(deckId) ?? [];
    const handedOut = templateByDeck.has(deckId) || rows.length > 0;
    return {
      deckId,
      deckName: deck.name,
      deckEmoji: deck.emoji,
      week,
      title: schedule.title,
      note: schedule.note,
      dueDate: schedule.due_date,
      availableOn: schedule.available_on,
      requiredAccuracy: schedule.required_accuracy,
      requiredMode: schedule.required_mode,
      learnerCount: rows.length,
      finishedCount: rows.filter((r) => r.completed_at).length,
      wordCount: cardCounts[deckId] ?? 0,
      status: lessonStatus({
        handedOut,
        availableOn: schedule.available_on,
        dueDate: schedule.due_date,
        today,
      }),
      kanaSets: kanaSetsByDeck.get(deckId) ?? [],
      handedOut,
    };
  }

  const plannedDeckIds = new Set(planDecks.map((pd) => pd.deck_id));

  const units: LessonUnit[] = plans
    .map((plan) => {
      const ordered = planDecks
        .filter((pd) => pd.plan_id === plan.id)
        .sort((a, b) => a.position - b.position);
      const weeks = ordered
        .map((pd, index) => weekFor(pd.deck_id, index + 1))
        .filter((w): w is LessonUnitWeek => w !== null);
      return {
        id: plan.id,
        title: plan.title,
        level: plan.jlpt_level,
        createdAt: plan.created_at,
        weeks,
      };
    })
    .filter((unit) => unit.weeks.length > 0)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));

  const scheduledDeckIds = new Set<string>([
    ...templates.map((t) => t.deck_id),
    ...assignments.filter((a) => a.deck_id).map((a) => a.deck_id as string),
  ]);

  const loose = [...scheduledDeckIds]
    .filter((deckId) => !plannedDeckIds.has(deckId))
    .map((deckId) => weekFor(deckId, null))
    .filter((w): w is LessonUnitWeek => w !== null)
    .sort((a, b) => {
      const dueA = a.dueDate ?? '9999-99-99';
      const dueB = b.dueDate ?? '9999-99-99';
      return dueA < dueB ? -1 : dueA > dueB ? 1 : 0;
    });

  return { units, loose };
}

export function currentWeekSummary(unit: LessonUnit): {
  current: number | null;
  total: number;
  lastFinished: { finished: number; learners: number } | null;
} {
  const total = unit.weeks.length;
  const currentWeek =
    unit.weeks.find((w) => w.status === 'current') ??
    unit.weeks.find((w) => w.status === 'upcoming');
  const current = currentWeek?.week ?? null;

  const previousWeek = current != null ? unit.weeks.find((w) => w.week === current - 1) : null;
  const lastFinished =
    previousWeek && previousWeek.learnerCount > 0
      ? { finished: previousWeek.finishedCount, learners: previousWeek.learnerCount }
      : null;

  return { current, total, lastFinished };
}

const WHITESPACE_RE = /\s+/g;
const GOAL_TITLE_MAX = 60;

export function unitTitleFromGoal(goal: string): string | null {
  const firstLine = goal
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return null;
  const collapsed = firstLine.replace(WHITESPACE_RE, ' ').trim();
  if (!collapsed) return null;
  if (collapsed.length > GOAL_TITLE_MAX) return `${collapsed.slice(0, GOAL_TITLE_MAX - 1)}…`;
  return collapsed;
}

export interface LocatedWeek {
  unit: LessonUnit | null;
  week: LessonUnitWeek;
  previous: LessonUnitWeek | null;
  next: LessonUnitWeek | null;
}

export function locateWeek(library: LessonLibrary | null, deckId: string): LocatedWeek | null {
  if (!library) return null;
  for (const unit of library.units) {
    const index = unit.weeks.findIndex((w) => w.deckId === deckId);
    if (index === -1) continue;
    return {
      unit,
      week: unit.weeks[index],
      previous: unit.weeks[index - 1] ?? null,
      next: unit.weeks[index + 1] ?? null,
    };
  }
  const loose = library.loose.find((w) => w.deckId === deckId);
  return loose ? { unit: null, week: loose, previous: null, next: null } : null;
}

export function handoutPagePath(groupId: string, deckId: string): string {
  return `/group/${encodeURIComponent(groupId)}/handout/${encodeURIComponent(deckId)}`;
}
