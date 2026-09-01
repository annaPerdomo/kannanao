import { type NextRequest, NextResponse } from 'next/server';

import {
  DOCUMENT_MAX_BYTES,
  DOCUMENT_MAX_TOTAL_BYTES,
} from '@/components/MaterialsBuilder/constants';
import { normalizeFurigana } from '@/lib/furigana';
import type { GroupKanaReadiness } from '@/lib/kanaGaps';
import { rankKnownWords } from '@/lib/knownWords';
import {
  isLessonDocumentMimeType,
  LESSON_DOCUMENTS_BUCKET,
  ownsLessonDocumentPath,
} from '@/lib/lessonDocuments';
import {
  buildLessonPlanPrompt,
  CARDS_DEFAULT,
  CARDS_MAX,
  CARDS_MIN,
  DEFAULT_LEVEL,
  GOAL_MAX,
  GOAL_MIN,
  isJlptLevel,
  STYLE_NOTES_MAX,
} from '@/lib/lessonPrompts';
import { splitKnownCards } from '@/lib/lessonWarmUp';
import { logger } from '@/lib/logger';
import type { LessonPlan, WarmUpWord } from '@/types/lessonPlan';

import { rateLimit } from '../../_lib/rateLimit';
import { type OrganizerProfile, requireOrganizerAccount } from '../../_lib/requireOrganizerAccount';
import { getGroupKnownKana } from '../_lib/groupKnownKana';
import { getGroupKnownWords } from '../_lib/groupKnownWords';
import { consumeLessonBudget } from '../_lib/lessonBudget';
import { requireGroupAccess } from '../_lib/requireGroupAccess';
import { getServiceSupabase } from '../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 3 };

const WEEKS_MIN = 1;
const WEEKS_MAX = 8;

/** Bounds the storage downloads a single request can trigger; the size caps bound legitimate use. */
const DOCUMENT_MAX_COUNT = 24;

interface LessonDocumentInput {
  path: string;
  mimeType: string;
}

type InlineDataPart = { inline_data: { mime_type: string; data: string } };

/**
 * The sizes checked here are the real ones: the client's are advisory, and
 * storage's own file_size_limit knows nothing about the combined cap.
 */
async function loadDocumentParts(
  documents: LessonDocumentInput[],
  organizerId: string,
): Promise<InlineDataPart[] | NextResponse> {
  const parts: InlineDataPart[] = [];
  let totalBytes = 0;

  try {
    const storage = getServiceSupabase().storage.from(LESSON_DOCUMENTS_BUCKET);

    for (const doc of documents) {
      const { data: blob, error } = await storage.download(doc.path);
      if (error || !blob) {
        return NextResponse.json(
          { error: 'A reference document has expired — please attach it again.' },
          { status: 400 },
        );
      }
      if (blob.size > DOCUMENT_MAX_BYTES) {
        return NextResponse.json({ error: 'A reference document is too large.' }, { status: 400 });
      }
      totalBytes += blob.size;
      if (totalBytes > DOCUMENT_MAX_TOTAL_BYTES) {
        return NextResponse.json(
          { error: 'Combined reference documents are too large.' },
          { status: 400 },
        );
      }
      parts.push({
        inline_data: {
          mime_type: doc.mimeType,
          data: Buffer.from(await blob.arrayBuffer()).toString('base64'),
        },
      });
    }
  } catch (err) {
    logger.error('Failed to read reference documents', {
      route: 'POST /api/group/lesson-plan',
      organizerId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Failed to read the reference files.' }, { status: 500 });
  }

  return parts;
}

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

// imageQuery is always requested, even with images off for this plan, so a
// card can get a picture later via per-card regenerate without a fresh Gemini call.
const PLAN_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    decks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          emoji: { type: 'string' },
          mainViewMode: { type: 'string', enum: ['hiragana', 'kanji', 'romaji'] },
          cards: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                word: { type: 'string' },
                reading: { type: 'string' },
                meaning: { type: 'string' },
                exampleJp: { type: 'string' },
                exampleEn: { type: 'string' },
                jlptLevel: {
                  type: 'string',
                  enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
                  nullable: true,
                },
                imageQuery: { type: 'string' },
              },
              required: [
                'word',
                'reading',
                'meaning',
                'exampleJp',
                'exampleEn',
                'jlptLevel',
                'imageQuery',
              ],
            },
          },
        },
        required: ['name', 'description', 'emoji', 'mainViewMode', 'cards'],
      },
    },
  },
  required: ['decks'],
};

/**
 * POST — draft a multi-week lesson plan for a group.
 *
 * Writes nothing: a plan the organizer rejects must cost tokens and nothing else.
 * `/api/group/lesson-plan/apply` is what turns an approved plan into decks.
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const { goal, weeks, cardsPerDeck, documents, level, styleNotes, groupId } = (body ?? {}) as {
    goal?: string;
    weeks?: number;
    cardsPerDeck?: number;
    documents?: LessonDocumentInput[];
    level?: string;
    styleNotes?: string;
    groupId?: string;
  };

  if (groupId !== undefined && (typeof groupId !== 'string' || groupId.trim().length === 0)) {
    return NextResponse.json({ error: 'groupId must be a non-empty string.' }, { status: 400 });
  }

  let organizer: OrganizerProfile;
  if (groupId) {
    const access = await requireGroupAccess(req, groupId);
    if (access instanceof NextResponse) return access;
    organizer = access.organizer;
  } else {
    const access = await requireOrganizerAccount(req);
    if (access instanceof NextResponse) return access;
    organizer = access;
  }

  const trimmedGoal = typeof goal === 'string' ? goal.trim() : '';
  if (trimmedGoal.length < GOAL_MIN || trimmedGoal.length > GOAL_MAX) {
    return NextResponse.json(
      { error: `Describe what to cover in ${GOAL_MIN}–${GOAL_MAX} characters.` },
      { status: 400 },
    );
  }
  if (!Number.isInteger(weeks) || (weeks as number) < WEEKS_MIN || (weeks as number) > WEEKS_MAX) {
    return NextResponse.json(
      { error: `weeks must be between ${WEEKS_MIN} and ${WEEKS_MAX}.` },
      { status: 400 },
    );
  }
  const cards = cardsPerDeck ?? CARDS_DEFAULT;
  if (!Number.isInteger(cards) || cards < CARDS_MIN || cards > CARDS_MAX) {
    return NextResponse.json(
      { error: `cardsPerDeck must be between ${CARDS_MIN} and ${CARDS_MAX}.` },
      { status: 400 },
    );
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
  const jlptLevel = isJlptLevel(level) ? level : DEFAULT_LEVEL;
  const trimmedStyleNotes = (styleNotes ?? '').trim();
  if (trimmedStyleNotes.length > STYLE_NOTES_MAX) {
    return NextResponse.json(
      { error: `styleNotes must be at most ${STYLE_NOTES_MAX} characters.` },
      { status: 400 },
    );
  }
  if (documents !== undefined) {
    if (!Array.isArray(documents) || documents.length > DOCUMENT_MAX_COUNT) {
      return NextResponse.json(
        { error: `documents must be an array of at most ${DOCUMENT_MAX_COUNT} files.` },
        { status: 400 },
      );
    }
    for (const doc of documents) {
      if (typeof doc !== 'object' || doc === null || !isLessonDocumentMimeType(doc.mimeType)) {
        return NextResponse.json(
          { error: 'Each document must be a PDF or plain text file.' },
          { status: 400 },
        );
      }
      if (!ownsLessonDocumentPath(doc.path, organizer.id)) {
        return NextResponse.json(
          { error: 'A reference document could not be found — please attach it again.' },
          { status: 400 },
        );
      }
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  const documentParts = await loadDocumentParts(documents ?? [], organizer.id);
  if (documentParts instanceof NextResponse) return documentParts;

  let pool: WarmUpWord[] = [];
  let kanaReadiness: GroupKanaReadiness | null = null;
  if (groupId) {
    // Reading data is a bonus signal on the review step, so a failure there
    // costs the chips, never the plan the organizer is waiting for.
    const [readiness, words] = await Promise.all([
      getGroupKnownKana(groupId, organizer.id).catch((err) => {
        logger.error("Failed to load the group's kana progress", {
          route: 'POST /api/group/lesson-plan',
          groupId,
          error: err instanceof Error ? err.message : String(err),
        });
        return null;
      }),
      getGroupKnownWords(groupId, organizer.id).catch((err) => {
        logger.error("Failed to load the group's known words", {
          route: 'POST /api/group/lesson-plan',
          groupId,
          error: err instanceof Error ? err.message : String(err),
        });
        return null;
      }),
    ]);

    if (words === null) {
      return NextResponse.json(
        { error: "Could not load the group's existing words." },
        { status: 500 },
      );
    }
    kanaReadiness = readiness;
    pool = words;
  }

  const overBudget = await consumeLessonBudget(organizer.id);
  if (overBudget) return overBudget;

  try {
    const documentCount = documentParts.length;

    const parts: Array<Record<string, unknown>> = [...documentParts];
    parts.push({
      text: buildLessonPlanPrompt({
        goal: trimmedGoal,
        weeks: weeks as number,
        cardsPerDeck: cards,
        knownWords: rankKnownWords(
          pool.map((w) => ({
            word: w.word,
            reading: w.reading,
            meaning: w.meaning,
            correctCount: 0,
            lastReviewedAt: null,
          })),
        ),
        documentCount,
        level: jlptLevel,
        styleNotes: trimmedStyleNotes || undefined,
      }),
    });

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          response_mime_type: 'application/json',
          response_schema: PLAN_RESPONSE_SCHEMA,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('Gemini API error', {
        route: 'POST /api/group/lesson-plan',
        status: response.status,
        body: data,
      });
      return NextResponse.json({ error: 'Failed to build the plan.' }, { status: 502 });
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    let plan: LessonPlan;
    try {
      plan = JSON.parse(rawText);
    } catch {
      plan = { decks: [] };
    }

    if (!Array.isArray(plan.decks) || plan.decks.length === 0) {
      return NextResponse.json(
        { error: 'The plan came back empty. Please try again.' },
        { status: 502 },
      );
    }

    plan.decks = plan.decks.map((deck) => ({
      ...deck,
      cards: (deck.cards ?? []).map((card) => ({
        ...card,
        exampleJp: normalizeFurigana(card.exampleJp ?? ''),
      })),
    }));

    const { plan: filteredPlan, warmUp } = splitKnownCards(plan, pool);

    logger.info('Lesson plan generated', {
      route: 'POST /api/group/lesson-plan',
      organizerId: organizer.id,
      groupId: groupId ?? null,
      weeks,
      cardsPerDeck: cards,
      level: jlptLevel,
      styleNoteChars: trimmedStyleNotes.length,
      documentCount,
      knownWordCount: pool.length,
      warmUpCount: warmUp.length,
      deckCount: filteredPlan.decks.length,
      cardCount: filteredPlan.decks.reduce((n, d) => n + (d.cards?.length ?? 0), 0),
      promptTokens: data.usageMetadata?.promptTokenCount ?? null,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? null,
    });

    return NextResponse.json({
      plan: filteredPlan,
      warmUp,
      knownWords: pool,
      kanaReadiness,
    });
  } catch (err) {
    logger.error('Unhandled error', {
      route: 'POST /api/group/lesson-plan',
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Failed to build the plan.' }, { status: 500 });
  }
}
