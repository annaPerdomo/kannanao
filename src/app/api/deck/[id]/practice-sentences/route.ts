import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import type { DbPracticeSentence } from '@/types/practiceSentence';

import { rateLimit } from '../../../_lib/rateLimit';
import { requireAuthenticatedUser } from '../../../_lib/requireAuthenticatedUser';
import { requireOrganizerAccount } from '../../../_lib/requireOrganizerAccount';
import { generateDeckSentences, selectSentences } from '../../../group/_lib/generateDeckSentences';
import { consumeLessonBudget } from '../../../group/_lib/lessonBudget';
import { isMemberOfOrganizer } from '../../../group/_lib/membership';
import { getServiceSupabase } from '../../../group/_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 5 };

/**
 * GET — fetch existing practice sentences for a deck (any authenticated user).
 * `?memberId=` returns that learner's personalised set, falling back to the
 * shared set when they don't have one.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authCheck = await requireAuthenticatedUser(req);
  if (authCheck instanceof NextResponse) return authCheck;

  const { id: deckId } = await params;
  const requested = req.nextUrl.searchParams.get('memberId');

  // A personalised set is derived from that learner's card_progress, so it
  // reveals which words they know. Only they and their organizer may read it.
  if (
    requested &&
    requested !== authCheck.id &&
    !(await isMemberOfOrganizer(requested, authCheck.id))
  ) {
    return NextResponse.json({ error: 'Learner not found in your group.' }, { status: 403 });
  }
  const memberId = requested || null;

  const { data, error } = await selectSentences(deckId, memberId);

  if (error) {
    logger.error('Failed to fetch practice sentences', {
      route: 'GET /api/deck/[id]/practice-sentences',
      deckId,
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to load practice sentences.' }, { status: 500 });
  }

  if (memberId && (!data || data.length === 0)) {
    const { data: shared } = await selectSentences(deckId, null);
    return NextResponse.json({ sentences: (shared ?? []) as DbPracticeSentence[] });
  }

  return NextResponse.json({ sentences: (data ?? []) as DbPracticeSentence[] });
}

/**
 * POST — generate a deck's shared practice sentences (organizer only).
 * If sentences already exist, returns them without regenerating.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const { id: deckId } = await params;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  const overBudget = await consumeLessonBudget(orgCheck.id);
  if (overBudget) return overBudget;

  try {
    const result = await generateDeckSentences({
      deckId,
      knownWords: [],
      apiKey,
      ownerId: orgCheck.id,
    });

    if (result.status === 'failed') {
      return NextResponse.json({ error: result.error }, { status: result.httpStatus });
    }

    return NextResponse.json({ sentences: result.sentences });
  } catch (err) {
    logger.error('Unhandled error', {
      route: 'POST /api/deck/[id]/practice-sentences',
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PATCH — edit practice sentences (organizer) or increment peek count (any user).
 *
 * Body variants:
 * - { sentenceId }                   → increment meaning_peek_count (any auth)
 * - { updates: [...], deletes: [...] } → batch edit/delete sentences (organizer only)
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authCheck = await requireAuthenticatedUser(req);
  if (authCheck instanceof NextResponse) return authCheck;

  const { id: deckId } = await params;

  let body: {
    sentenceId?: string;
    updates?: { id: string; sentence_jp?: string; sentence_en?: string }[];
    deletes?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const sb = getServiceSupabase();

  // ── Batch edit/delete (organizer only) ──
  if (body.updates || body.deletes) {
    if (authCheck.account_type === 'member') {
      return NextResponse.json(
        { error: 'This feature is not available for member accounts.' },
        { status: 403 },
      );
    }

    if (body.deletes && body.deletes.length > 0) {
      const { error: delErr } = await sb
        .from('deck_practice_sentences')
        .delete()
        .in('id', body.deletes)
        .eq('deck_id', deckId);

      if (delErr) {
        logger.error('Failed to delete sentences', { error: delErr.message });
        return NextResponse.json({ error: 'Failed to delete sentences.' }, { status: 500 });
      }
    }

    if (body.updates && body.updates.length > 0) {
      for (const u of body.updates) {
        const fields: Record<string, string> = {};
        if (u.sentence_jp !== undefined) fields.sentence_jp = u.sentence_jp;
        if (u.sentence_en !== undefined) fields.sentence_en = u.sentence_en;
        if (Object.keys(fields).length > 0) {
          await sb
            .from('deck_practice_sentences')
            .update(fields)
            .eq('id', u.id)
            .eq('deck_id', deckId);
        }
      }
    }

    // Return the set the caller was editing, not every learner's rows.
    const { data } = await selectSentences(
      deckId,
      req.nextUrl.searchParams.get('memberId') || null,
    );

    return NextResponse.json({ sentences: data as DbPracticeSentence[] });
  }

  // ── Single peek increment (any auth) ──
  if (!body.sentenceId) {
    return NextResponse.json({ error: 'sentenceId is required.' }, { status: 400 });
  }

  const { error } = await sb.rpc('increment_meaning_peek', {
    row_id: body.sentenceId,
    p_deck_id: deckId,
  });

  if (error) {
    logger.error('Failed to increment peek count', {
      route: 'PATCH /api/deck/[id]/practice-sentences',
      sentenceId: body.sentenceId,
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to update peek count.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE — remove a deck's practice sentences (organizer only), so the next
 * POST regenerates. `?memberId=` clears only that learner's set.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const { id: deckId } = await params;
  const memberId = req.nextUrl.searchParams.get('memberId');
  const sb = getServiceSupabase();

  const del = sb.from('deck_practice_sentences').delete().eq('deck_id', deckId);
  const { error } = await (memberId
    ? del.eq('for_member_id', memberId)
    : del.is('for_member_id', null));

  if (error) {
    logger.error('Failed to delete practice sentences', {
      route: 'DELETE /api/deck/[id]/practice-sentences',
      deckId,
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to delete practice sentences.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
