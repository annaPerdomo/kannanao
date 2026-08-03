import { type NextRequest, NextResponse } from 'next/server';

import { KNOWN_WORD_CAP, type KnownWord } from '@/lib/knownWords';
import { logger } from '@/lib/logger';

import { rateLimit } from '../../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../../_lib/requireOrganizerAccount';
import { generateDeckSentences } from '../../_lib/generateDeckSentences';
import { isMemberOfOrganizer } from '../../_lib/memberAccess';
import { loadStudiedVocabulary } from '../../_lib/studiedVocabulary';

const RATE_LIMIT = { windowMs: 60_000, max: 3 };
const MAX_DECKS = 6;
/** Half the pool is reserved for earlier decks in this batch, half for older study history. */
const CARRIED_CAP = Math.floor(KNOWN_WORD_CAP / 2);

export interface BatchDeckResult {
  deckId: string;
  status: 'generated' | 'skipped' | 'failed';
  count?: number;
  error?: string;
}

/**
 * POST — generate Kotoba Bubble sentences for several decks in one call.
 *
 * Decks are processed in the order given and each finished deck's words are fed
 * into the next deck's prompt, so later decks recycle earlier ones. That
 * ordering is the feature; it is deliberately not parallelised.
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const body = await req.json().catch(() => null);
  const { deckIds, memberId } = (body ?? {}) as { deckIds?: string[]; memberId?: string };

  if (!Array.isArray(deckIds) || deckIds.length === 0) {
    return NextResponse.json({ error: 'deckIds (array) is required.' }, { status: 400 });
  }
  if (deckIds.length > MAX_DECKS) {
    return NextResponse.json(
      { error: `Too many decks — generate at most ${MAX_DECKS} at a time.` },
      { status: 400 },
    );
  }
  if (memberId && !(await isMemberOfOrganizer(memberId, orgCheck.id))) {
    return NextResponse.json({ error: 'Learner not found in your group.' }, { status: 403 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  const studied = memberId ? await loadStudiedVocabulary(memberId) : [];
  const carried: KnownWord[] = [];
  const results: BatchDeckResult[] = [];

  for (const deckId of deckIds) {
    const pool = [...carried, ...studied].slice(0, KNOWN_WORD_CAP);

    let outcome;
    try {
      outcome = await generateDeckSentences({
        deckId,
        memberId: memberId ?? null,
        knownWords: pool,
        apiKey,
      });
    } catch (err) {
      logger.error('Batch sentence generation threw', {
        route: 'POST /api/group/practice-sentences/batch',
        deckId,
        error: err instanceof Error ? err.message : String(err),
      });
      results.push({ deckId, status: 'failed', error: 'Generation failed.' });
      continue;
    }

    if (outcome.status === 'failed') {
      results.push({ deckId, status: 'failed', error: outcome.error });
    } else {
      results.push({ deckId, status: outcome.status, count: outcome.sentences.length });
    }

    // Later decks build on earlier ones — newest first, so deck N-1 outranks deck 1.
    carried.unshift(
      ...outcome.deckWords.map((w) => ({ ...w, correctCount: 0, lastReviewedAt: null })),
    );
    carried.splice(CARRIED_CAP);
  }

  logger.info('Batch practice sentence generation complete', {
    route: 'POST /api/group/practice-sentences/batch',
    organizerId: orgCheck.id,
    memberId: memberId ?? null,
    deckCount: deckIds.length,
    generated: results.filter((r) => r.status === 'generated').length,
    failed: results.filter((r) => r.status === 'failed').length,
  });

  return NextResponse.json({ results });
}
