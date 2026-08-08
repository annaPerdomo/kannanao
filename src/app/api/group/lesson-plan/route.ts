import { type NextRequest, NextResponse } from 'next/server';

import {
  DOCUMENT_MAX_BYTES,
  DOCUMENT_MAX_TOTAL_BYTES,
} from '@/components/MaterialsBuilder/constants';
import { normalizeFurigana } from '@/lib/furigana';
import {
  buildLessonPlanPrompt,
  CARDS_DEFAULT,
  CARDS_MAX,
  CARDS_MIN,
  DEFAULT_LEVEL,
  isJlptLevel,
  STYLE_NOTES_MAX,
} from '@/lib/lessonPrompts';
import { logger } from '@/lib/logger';
import type { LessonPlan } from '@/types/lessonPlan';

import { rateLimit } from '../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../_lib/requireOrganizerAccount';
import { consumeLessonBudget } from '../_lib/lessonBudget';

const RATE_LIMIT = { windowMs: 60_000, max: 3 };

const GOAL_MIN = 3;
const GOAL_MAX = 500;
const WEEKS_MIN = 1;
const WEEKS_MAX = 8;

const DOCUMENT_MIME_TYPES = new Set(['application/pdf', 'text/plain']);
const DOCUMENT_MAX_BASE64_CHARS = Math.ceil(DOCUMENT_MAX_BYTES / 3) * 4;
const DOCUMENT_MAX_TOTAL_BASE64_CHARS = Math.ceil(DOCUMENT_MAX_TOTAL_BYTES / 3) * 4;

interface LessonDocumentInput {
  base64: string;
  mimeType: string;
}

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

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
              },
              required: ['word', 'reading', 'meaning', 'exampleJp', 'exampleEn', 'jlptLevel'],
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

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const body = await req.json().catch(() => null);
  const { goal, weeks, cardsPerDeck, documents, level, styleNotes } = (body ?? {}) as {
    goal?: string;
    weeks?: number;
    cardsPerDeck?: number;
    documents?: LessonDocumentInput[];
    level?: string;
    styleNotes?: string;
  };

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
    if (!Array.isArray(documents)) {
      return NextResponse.json({ error: 'documents must be an array.' }, { status: 400 });
    }
    let totalBase64Chars = 0;
    for (const doc of documents) {
      if (
        typeof doc !== 'object' ||
        doc === null ||
        !doc.mimeType ||
        !DOCUMENT_MIME_TYPES.has(doc.mimeType)
      ) {
        return NextResponse.json(
          { error: 'Each document must be a PDF or plain text file.' },
          { status: 400 },
        );
      }
      if (typeof doc.base64 !== 'string' || doc.base64.length > DOCUMENT_MAX_BASE64_CHARS) {
        return NextResponse.json({ error: 'A reference document is too large.' }, { status: 400 });
      }
      totalBase64Chars += doc.base64.length;
    }
    if (totalBase64Chars > DOCUMENT_MAX_TOTAL_BASE64_CHARS) {
      return NextResponse.json(
        { error: 'Combined reference documents are too large.' },
        { status: 400 },
      );
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  const overBudget = await consumeLessonBudget(orgCheck.id);
  if (overBudget) return overBudget;

  try {
    const documentCount = documents?.length ?? 0;

    const parts: Array<Record<string, unknown>> = [];
    for (const doc of documents ?? []) {
      parts.push({ inline_data: { mime_type: doc.mimeType, data: doc.base64 } });
    }
    parts.push({
      text: buildLessonPlanPrompt({
        goal: trimmedGoal,
        weeks: weeks as number,
        cardsPerDeck: cards,
        // Group-wide materials: no one learner's studied vocabulary seeds a plan.
        knownWords: [],
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

    logger.info('Lesson plan generated', {
      route: 'POST /api/group/lesson-plan',
      organizerId: orgCheck.id,
      weeks,
      cardsPerDeck: cards,
      level: jlptLevel,
      styleNoteChars: trimmedStyleNotes.length,
      documentCount,
      deckCount: plan.decks.length,
      cardCount: plan.decks.reduce((n, d) => n + (d.cards?.length ?? 0), 0),
      promptTokens: data.usageMetadata?.promptTokenCount ?? null,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? null,
    });

    return NextResponse.json({ plan });
  } catch (err) {
    logger.error('Unhandled error', {
      route: 'POST /api/group/lesson-plan',
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Failed to build the plan.' }, { status: 500 });
  }
}
