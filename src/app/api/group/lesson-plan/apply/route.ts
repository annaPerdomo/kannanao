import { type NextRequest, NextResponse } from 'next/server';

import { isGoalMode } from '@/lib/assignmentMastery';
import { KNOWN_WORD_CAP, type KnownWord } from '@/lib/knownWords';
import { CARDS_MAX, PLAN_TEXT_MAX } from '@/lib/lessonPrompts';
import { logger } from '@/lib/logger';
import type { ApplyDeckResult, LessonPlan, PlanDeck } from '@/types/lessonPlan';

import { rateLimit } from '../../../_lib/rateLimit';
import { generateDeckSentences } from '../../_lib/generateDeckSentences';
import { consumeLessonBudget } from '../../_lib/lessonBudget';
import { isMemberOfGroup } from '../../_lib/membership';
import { requireGroupAccess } from '../../_lib/requireGroupAccess';
import { getServiceSupabase } from '../../_lib/serviceSupabase';
import { loadStudiedVocabulary } from '../../_lib/studiedVocabulary';

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

/** Decks an earlier run of this plan already created, in creation order. */
async function decksForPlan(
  organizerId: string,
  planId: string,
): Promise<{ id: string; name: string; card_count: number | null }[]> {
  const { data } = await getServiceSupabase()
    .from('decks')
    .select('id, name, card_count')
    .eq('user_id', organizerId)
    .eq('lesson_plan_id', planId)
    .order('position', { ascending: true });

  return (data ?? []) as { id: string; name: string; card_count: number | null }[];
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
  const { groupId, memberId, plan, firstDueDate, requiredAccuracy, requiredMode, planId } = (body ??
    {}) as {
    groupId?: string;
    memberId?: string;
    plan?: LessonPlan;
    firstDueDate?: string;
    requiredAccuracy?: number | null;
    requiredMode?: string | null;
    planId?: string;
  };

  if (!groupId || !memberId) {
    return NextResponse.json({ error: 'groupId and memberId are required.' }, { status: 400 });
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
  const oversized = decks.find((d) => (d.cards?.length ?? 0) > CARDS_MAX);
  if (oversized) {
    return NextResponse.json(
      { error: `A deck can hold at most ${CARDS_MAX} cards.` },
      { status: 400 },
    );
  }
  // In *this* group, not merely somewhere on the organizer's roster: the
  // assignment carries group_id and cascades when that group is deleted, so a
  // mismatched pair would quietly take the learner's work with it.
  if (!(await isMemberOfGroup(memberId, groupId))) {
    return NextResponse.json({ error: 'Learner not found in this group.' }, { status: 403 });
  }

  // Decks this plan already created, from a run that died part way. They are
  // created in plan order, so the first N plan decks are the ones that landed.
  const alreadyCreated = planId ? await decksForPlan(organizerId, planId) : [];

  // Each deck still to create costs one sentence-generation call. A retry that
  // only has sentences left to fill in still costs a slot, never zero.
  const overBudget = await consumeLessonBudget(
    organizerId,
    Math.max(1, decks.length - alreadyCreated.length),
  );
  if (overBudget) return overBudget;

  const basePosition = await nextDeckPosition(organizerId);
  const results: ApplyDeckResult[] = [];
  const deckIdsInOrder: string[] = [];

  for (const [index, deck] of decks.entries()) {
    const existing = alreadyCreated[index];
    if (existing) {
      results.push({
        name: existing.name,
        deckId: existing.id,
        status: 'created',
        cardCount: existing.card_count ?? 0,
        assigned: true,
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
      memberId,
      planId: planId ?? null,
      dueDate: dueDateFor(firstDueDate, index),
      availableOn: availableOnFor(firstDueDate, index),
      requiredAccuracy: requiredAccuracy ?? null,
      requiredMode: requiredMode ?? null,
    });
    results.push(result);
    if (result.status === 'created' && result.deckId) deckIdsInOrder.push(result.deckId);
  }

  // Decks carried over from a failed run are included: generateDeckSentences
  // returns early when a set already exists, so this fills the gaps without
  // paying for the ones that finished.
  const sentenceResults = await generateSentencesInOrder(deckIdsInOrder, memberId, organizerId);

  logger.info('Lesson plan applied', {
    route: 'POST /api/group/lesson-plan/apply',
    organizerId,
    memberId,
    planId: planId ?? null,
    deckCount: decks.length,
    cardCount: decks.reduce((n, d) => n + (d.cards?.length ?? 0), 0),
    resumed: alreadyCreated.length,
    created: deckIdsInOrder.length - alreadyCreated.length,
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
  memberId: string;
  planId: string | null;
  dueDate: string | null;
  availableOn: string | null;
  requiredAccuracy: number | null;
  requiredMode: string | null;
}): Promise<ApplyDeckResult> {
  const { deck, index, position, organizerId, groupId, memberId, planId, dueDate, availableOn } =
    args;
  const sb = getServiceSupabase();
  const name = (deck.name ?? '').trim() || `Week ${index + 1}`;
  const { data: created, error: deckError } = await sb
    .from('decks')
    .insert({
      user_id: organizerId,
      name: name.slice(0, 200),
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

  const { error: assignError } = await sb.from('assignments').insert({
    organizer_id: organizerId,
    group_id: groupId,
    member_id: memberId,
    deck_id: deckId,
    title: `Week ${index + 1} — ${name}`.slice(0, 200),
    note: (deck.description ?? '').trim().slice(0, 500) || null,
    due_date: dueDate,
    available_on: availableOn,
    required_accuracy: args.requiredAccuracy,
    required_mode: args.requiredMode,
  });

  if (assignError) {
    logger.error('Failed to assign lesson deck', {
      route: 'POST /api/group/lesson-plan/apply',
      deckId,
      error: assignError.message,
    });
  }

  return {
    name,
    deckId,
    status: 'created',
    cardCount: cardRows.length,
    assigned: !assignError,
    error: assignError ? 'The deck was created but could not be assigned.' : undefined,
  };
}

/** Decks in plan order, each one's words feeding the next one's prompt. */
async function generateSentencesInOrder(
  deckIds: string[],
  memberId: string,
  organizerId: string,
): Promise<{ deckId: string; status: string; error?: string }[]> {
  if (deckIds.length === 0) return [];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return deckIds.map((deckId) => ({ deckId, status: 'failed', error: 'No API key.' }));

  const studied = await loadStudiedVocabulary(memberId);
  const carried: KnownWord[] = [];
  const out: { deckId: string; status: string; error?: string }[] = [];

  for (const deckId of deckIds) {
    try {
      const outcome = await generateDeckSentences({
        deckId,
        memberId,
        knownWords: [...carried, ...studied].slice(0, KNOWN_WORD_CAP),
        apiKey,
        ownerId: organizerId,
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
