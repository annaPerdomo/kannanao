import { type NextRequest, NextResponse } from 'next/server';

import { isGoalMode } from '@/lib/assignmentMastery';
import { KNOWN_WORD_CAP, type KnownWord } from '@/lib/knownWords';
import {
  CARDS_MAX,
  isJlptLevel,
  type JlptLevel,
  PLAN_TEXT_MAX,
  STYLE_NOTES_MAX,
} from '@/lib/lessonPrompts';
import { logger } from '@/lib/logger';
import type { ApplyDeckResult, LessonPlan, PlanDeck } from '@/types/lessonPlan';

import { rateLimit } from '../../../_lib/rateLimit';
import { generateDeckSentences } from '../../_lib/generateDeckSentences';
import { consumeLessonBudget } from '../../_lib/lessonBudget';
import { requireGroupAccess } from '../../_lib/requireGroupAccess';
import { getServiceSupabase } from '../../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 3 };
const MAX_DECKS = 8;
const DAYS_PER_WEEK = 7;

/**
 * Eight decks, eight sets of cards and eight sequential Gemini calls do not fit
 * in the platform default. Without this the run is killed mid-plan and the
 * organizer is left with a half-created term.
 */
export const maxDuration = 60;

/** Half the pool is reserved for earlier decks in this plan, half for older study history. */
const CARRIED_CAP = Math.floor(KNOWN_WORD_CAP / 2);

/** Week N is due a week after week N-1. Dates are plain YYYY-MM-DD, so stay in UTC. */
function dueDateFor(firstDueDate: string, weekIndex: number): string | null {
  return shiftDays(firstDueDate, weekIndex * DAYS_PER_WEEK);
}

/**
 * Week N starts showing a week before it is due — i.e. when week N-1 falls due.
 * Without this the learner opens the app to a whole term marked "assigned",
 * which reads as a pile of homework instead of this week's work.
 */
function availableOnFor(firstDueDate: string, weekIndex: number): string | null {
  return shiftDays(firstDueDate, (weekIndex - 1) * DAYS_PER_WEEK);
}

function shiftDays(date: string, days: number): string | null {
  const start = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(start)) return null;
  return new Date(start + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ExistingDeck {
  id: string;
  name: string;
  card_count: number | null;
}

/** Decks an earlier run of this plan already created, in creation order. */
async function decksForPlan(organizerId: string, planId: string): Promise<ExistingDeck[]> {
  const { data } = await getServiceSupabase()
    .from('decks')
    .select('id, name, card_count')
    .eq('user_id', organizerId)
    .eq('lesson_plan_id', planId)
    .order('position', { ascending: true });

  return (data ?? []) as ExistingDeck[];
}

function deckNameFor(deck: PlanDeck, index: number): string {
  return ((deck.name ?? '').trim() || `Week ${index + 1}`).slice(0, 200);
}

/**
 * Matches decks a failed run left behind to the plan entries that produced
 * them, by name.
 *
 * Not by position: the apply loop does not stop at the first failure, so a run
 * that created week 1, failed on week 2 and created week 3 leaves two decks
 * whose order says nothing about which weeks they are — matched by index,
 * week 3 would be reported as week 2 and a duplicate of week 3 created under
 * it. Names may legally repeat within a plan, so each is consumed once.
 */
function matchExistingDecks(decks: PlanDeck[], existing: ExistingDeck[]): (ExistingDeck | null)[] {
  const byName = new Map<string, ExistingDeck[]>();
  for (const deck of existing) {
    const queue = byName.get(deck.name) ?? [];
    queue.push(deck);
    byName.set(deck.name, queue);
  }

  return decks.map((deck, index) => byName.get(deckNameFor(deck, index))?.shift() ?? null);
}

async function nextDeckPosition(organizerId: string): Promise<number> {
  const { data } = await getServiceSupabase()
    .from('decks')
    .select('position')
    .eq('user_id', organizerId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  return ((data?.position as number | undefined) ?? -1) + 1;
}

/**
 * POST — turn an approved plan into decks, cards and a weekly assignment
 * schedule, then generate each deck's Kotoba Bubble sentences in plan order so
 * week 2's sentences already know week 1's words.
 *
 * Every deck reports its own status: a deck created without cards is reported,
 * never hidden.
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const {
    groupId,
    plan,
    firstDueDate,
    requiredAccuracy,
    requiredMode,
    planId,
    withSentences = true,
    level,
    styleNotes,
  } = (body ?? {}) as {
    groupId?: string;
    plan?: LessonPlan;
    firstDueDate?: string;
    requiredAccuracy?: number | null;
    requiredMode?: string | null;
    planId?: string;
    /** Kotoba Bubble sentences alongside the decks — one Gemini call each. */
    withSentences?: boolean;
    level?: string;
    styleNotes?: string;
  };

  if (!groupId) {
    return NextResponse.json({ error: 'groupId is required.' }, { status: 400 });
  }

  const access = await requireGroupAccess(req, groupId);
  if (access instanceof NextResponse) return access;
  const organizerId = access.organizer.id;

  const decks = plan?.decks;
  if (!Array.isArray(decks) || decks.length === 0) {
    return NextResponse.json({ error: 'The plan has no decks.' }, { status: 400 });
  }
  if (decks.length > MAX_DECKS) {
    return NextResponse.json(
      { error: `A plan can hold at most ${MAX_DECKS} decks.` },
      { status: 400 },
    );
  }
  if (!firstDueDate || dueDateFor(firstDueDate, 0) === null) {
    return NextResponse.json({ error: 'firstDueDate must be a valid date.' }, { status: 400 });
  }
  if (
    requiredAccuracy != null &&
    (!Number.isInteger(requiredAccuracy) || requiredAccuracy < 0 || requiredAccuracy > 100)
  ) {
    return NextResponse.json(
      { error: 'requiredAccuracy must be an integer between 0 and 100.' },
      { status: 400 },
    );
  }
  if (requiredMode != null && !isGoalMode(requiredMode)) {
    return NextResponse.json({ error: 'requiredMode is not a valid goal mode.' }, { status: 400 });
  }
  if (planId != null && !UUID_RE.test(planId)) {
    return NextResponse.json({ error: 'planId must be a UUID.' }, { status: 400 });
  }
  if (level !== undefined && !isJlptLevel(level)) {
    return NextResponse.json(
      { error: 'level must be one of N5, N4, N3, N2, N1.' },
      { status: 400 },
    );
  }
  if (styleNotes !== undefined && typeof styleNotes !== 'string') {
    return NextResponse.json({ error: 'styleNotes must be a string.' }, { status: 400 });
  }
  const trimmedStyleNotes = (styleNotes ?? '').trim().slice(0, STYLE_NOTES_MAX);
  const oversized = decks.find((d) => (d.cards?.length ?? 0) > CARDS_MAX);
  if (oversized) {
    return NextResponse.json(
      { error: `A deck can hold at most ${CARDS_MAX} cards.` },
      { status: 400 },
    );
  }
  // The organizer never appears in group_members, so "everyone but the
  // organizer" is automatic. Late joiners come in via the schedule saved below.
  const { data: memberRows, error: membersError } = await getServiceSupabase()
    .from('group_members')
    .select('member_id')
    .eq('group_id', groupId);

  if (membersError) {
    logger.error('Failed to load group members for apply', {
      route: 'POST /api/group/lesson-plan/apply',
      groupId,
      error: membersError.message,
    });
    return NextResponse.json({ error: 'Could not load the group roster.' }, { status: 500 });
  }
  const memberIds = (memberRows ?? []).map((r) => r.member_id as string);

  const alreadyCreated = planId ? await decksForPlan(organizerId, planId) : [];
  const resumed = matchExistingDecks(decks, alreadyCreated);

  // Each deck still to create costs one sentence-generation call. A retry that
  // only has sentences left to fill in still costs a slot, never zero.
  const overBudget = await consumeLessonBudget(
    organizerId,
    Math.max(1, decks.length - resumed.filter(Boolean).length),
  );
  if (overBudget) return overBudget;

  const basePosition = await nextDeckPosition(organizerId);
  const results: ApplyDeckResult[] = [];
  const deckIdsInOrder: string[] = [];

  for (const [index, deck] of decks.entries()) {
    const existing = resumed[index];
    if (existing) {
      // A run reports 'created' even when only the assignment failed, so this
      // is written again rather than assumed.
      const assignError = await assignDeck({
        deckId: existing.id,
        name: existing.name,
        index,
        organizerId,
        groupId,
        memberIds,
        description: deck.description,
        dueDate: dueDateFor(firstDueDate, index),
        availableOn: availableOnFor(firstDueDate, index),
        requiredAccuracy: requiredAccuracy ?? null,
        requiredMode: requiredMode ?? null,
      });
      results.push({
        name: existing.name,
        deckId: existing.id,
        status: 'created',
        cardCount: existing.card_count ?? 0,
        assigned: memberIds.length > 0 ? !assignError : undefined,
        error: assignError ? 'The deck was created but could not be assigned.' : undefined,
      });
      deckIdsInOrder.push(existing.id);
      continue;
    }

    const result = await createDeck({
      deck,
      index,
      position: basePosition + index,
      organizerId,
      groupId,
      memberIds,
      planId: planId ?? null,
      dueDate: dueDateFor(firstDueDate, index),
      availableOn: availableOnFor(firstDueDate, index),
      requiredAccuracy: requiredAccuracy ?? null,
      requiredMode: requiredMode ?? null,
    });
    results.push(result);
    if (result.status === 'created' && result.deckId) deckIdsInOrder.push(result.deckId);
  }

  await savePlannedSchedule({
    organizerId,
    groupId,
    firstDueDate,
    requiredAccuracy: requiredAccuracy ?? null,
    requiredMode: requiredMode ?? null,
    decks,
    results,
  });

  // Decks carried over from a failed run are included: generateDeckSentences
  // returns early when a set already exists, so this fills the gaps without
  // paying for the ones that finished.
  const sentenceResults = withSentences
    ? await generateSentencesInOrder(deckIdsInOrder, organizerId, {
        level: isJlptLevel(level) ? level : undefined,
        styleNotes: trimmedStyleNotes || undefined,
      })
    : [];

  logger.info('Lesson plan applied', {
    route: 'POST /api/group/lesson-plan/apply',
    organizerId,
    memberCount: memberIds.length,
    planId: planId ?? null,
    deckCount: decks.length,
    cardCount: decks.reduce((n, d) => n + (d.cards?.length ?? 0), 0),
    resumed: resumed.filter(Boolean).length,
    created: deckIdsInOrder.length - resumed.filter(Boolean).length,
    failed: results.filter((r) => r.status === 'failed').length,
  });

  return NextResponse.json({ results, sentenceResults });
}

/** One deck, its cards and its assignment. Each step reports rather than throws. */
async function createDeck(args: {
  deck: PlanDeck;
  index: number;
  position: number;
  organizerId: string;
  groupId: string;
  memberIds: string[];
  planId: string | null;
  dueDate: string | null;
  availableOn: string | null;
  requiredAccuracy: number | null;
  requiredMode: string | null;
}): Promise<ApplyDeckResult> {
  const { deck, index, position, organizerId, groupId, memberIds, planId, dueDate, availableOn } =
    args;
  const sb = getServiceSupabase();
  const name = deckNameFor(deck, index);
  const { data: created, error: deckError } = await sb
    .from('decks')
    .insert({
      user_id: organizerId,
      name,
      description: (deck.description ?? '').trim().slice(0, 500) || null,
      emoji: deck.emoji || null,
      position,
      lesson_plan_id: planId,
    })
    .select('id')
    .single();

  if (deckError || !created) {
    logger.error('Failed to create lesson deck', {
      route: 'POST /api/group/lesson-plan/apply',
      error: deckError?.message,
    });
    return { name, status: 'failed', error: 'Could not create the deck.' };
  }

  const deckId = created.id as string;
  const viewMode = deck.mainViewMode ?? 'hiragana';
  // The plan arrives from the browser, not from the generator that produced it,
  // so every field is bounded here rather than trusted.
  const cardRows = (deck.cards ?? []).map((card, i) => ({
    deck_id: deckId,
    word: (card.word ?? '').slice(0, PLAN_TEXT_MAX),
    reading: (card.reading ?? '').slice(0, PLAN_TEXT_MAX),
    meaning: (card.meaning ?? '').slice(0, PLAN_TEXT_MAX),
    example_jp: (card.exampleJp ?? '').slice(0, PLAN_TEXT_MAX),
    example_en: (card.exampleEn ?? '').slice(0, PLAN_TEXT_MAX),
    image_query: '',
    jlpt_level: card.jlptLevel ?? null,
    main_view_mode: viewMode,
    position: i,
  }));

  if (cardRows.length > 0) {
    const { error: cardsError } = await sb.from('cards').insert(cardRows);
    if (cardsError) {
      logger.error('Failed to create lesson cards', {
        route: 'POST /api/group/lesson-plan/apply',
        deckId,
        error: cardsError.message,
      });
      return {
        name,
        deckId,
        status: 'failed',
        cardCount: 0,
        error: 'The deck was created but its cards could not be saved.',
      };
    }
  }

  const assignError = await assignDeck({
    deckId,
    name,
    index,
    organizerId,
    groupId,
    memberIds,
    description: deck.description,
    dueDate,
    availableOn,
    requiredAccuracy: args.requiredAccuracy,
    requiredMode: args.requiredMode,
  });

  return {
    name,
    deckId,
    status: 'created',
    cardCount: cardRows.length,
    assigned: memberIds.length > 0 ? !assignError : undefined,
    error: assignError ? 'The deck was created but could not be assigned.' : undefined,
  };
}

/**
 * The weekly schedule, as one member-less template per deck. Joining the group
 * turns each still-open template into a real assignment (catchUpGroupAssignments),
 * so late joiners get the same term. Logged on failure, never thrown — the decks
 * themselves already exist.
 */
async function savePlannedSchedule(args: {
  organizerId: string;
  groupId: string;
  firstDueDate: string | null;
  requiredAccuracy: number | null;
  requiredMode: string | null;
  decks: PlanDeck[];
  results: ApplyDeckResult[];
}): Promise<void> {
  const rows = args.results
    .map((result, index) => ({ result, deck: args.decks[index], index }))
    .filter(({ result }) => result.status === 'created' && result.deckId)
    .map(({ result, deck, index }) => ({
      organizer_id: args.organizerId,
      group_id: args.groupId,
      deck_id: result.deckId as string,
      title: `Week ${index + 1} — ${result.name}`.slice(0, 200),
      note: (deck?.description ?? '').trim().slice(0, 500) || null,
      due_date: args.firstDueDate ? dueDateFor(args.firstDueDate, index) : null,
      available_on: args.firstDueDate ? availableOnFor(args.firstDueDate, index) : null,
      required_accuracy: args.requiredAccuracy,
      required_mode: args.requiredMode,
    }));

  if (rows.length === 0) return;

  const { error } = await getServiceSupabase()
    .from('planned_assignments')
    .upsert(rows, { onConflict: 'group_id,deck_id' });

  if (error) {
    logger.error('Failed to save planned schedule', {
      route: 'POST /api/group/lesson-plan/apply',
      groupId: args.groupId,
      error: error.message,
    });
  }
}

async function assignDeck(args: {
  deckId: string;
  name: string;
  index: number;
  organizerId: string;
  groupId: string;
  memberIds: string[];
  description?: string;
  dueDate: string | null;
  availableOn: string | null;
  requiredAccuracy: number | null;
  requiredMode: string | null;
}): Promise<string | null> {
  if (args.memberIds.length === 0) return null;

  const rows = args.memberIds.map((memberId) => ({
    organizer_id: args.organizerId,
    group_id: args.groupId,
    member_id: memberId,
    deck_id: args.deckId,
    title: `Week ${args.index + 1} — ${args.name}`.slice(0, 200),
    note: (args.description ?? '').trim().slice(0, 500) || null,
    due_date: args.dueDate,
    available_on: args.availableOn,
    required_accuracy: args.requiredAccuracy,
    required_mode: args.requiredMode,
  }));

  const { error } = await getServiceSupabase()
    .from('assignments')
    .upsert(rows, { onConflict: 'member_id,deck_id,group_id' });

  if (error) {
    logger.error('Failed to assign lesson deck', {
      route: 'POST /api/group/lesson-plan/apply',
      deckId: args.deckId,
      memberCount: args.memberIds.length,
      error: error.message,
    });
  }

  return error?.message ?? null;
}

/**
 * Decks in plan order, each one's words feeding the next one's prompt, so week
 * 2's sentences can build on week 1's.
 */
async function generateSentencesInOrder(
  deckIds: string[],
  organizerId: string,
  pitch: { level?: JlptLevel; styleNotes?: string } = {},
): Promise<{ deckId: string; status: string; error?: string }[]> {
  if (deckIds.length === 0) return [];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return deckIds.map((deckId) => ({ deckId, status: 'failed', error: 'No API key.' }));

  const carried: KnownWord[] = [];
  const out: { deckId: string; status: string; error?: string }[] = [];

  for (const deckId of deckIds) {
    try {
      const outcome = await generateDeckSentences({
        deckId,
        knownWords: [...carried].slice(0, KNOWN_WORD_CAP),
        apiKey,
        ownerId: organizerId,
        level: pitch.level,
        styleNotes: pitch.styleNotes,
      });

      out.push(
        outcome.status === 'failed'
          ? { deckId, status: 'failed', error: outcome.error }
          : { deckId, status: outcome.status },
      );

      carried.unshift(
        ...outcome.deckWords.map((w) => ({ ...w, correctCount: 0, lastReviewedAt: null })),
      );
      carried.splice(CARRIED_CAP);
    } catch (err) {
      logger.error('Lesson sentence generation threw', {
        route: 'POST /api/group/lesson-plan/apply',
        deckId,
        error: err instanceof Error ? err.message : String(err),
      });
      out.push({ deckId, status: 'failed', error: 'Generation failed.' });
    }
  }

  return out;
}
