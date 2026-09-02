import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../_lib/requireOrganizerAccount';
import {
  MAX_BATCH_QUERIES,
  searchPhoto,
  triggerDownload,
  type UnsplashPhoto,
} from '../../_lib/unsplash';

// A full multi-week lesson plan (8 weeks x 20 cards) can need up to 7 batches
// of MAX_BATCH_QUERIES back-to-back; keep max above that so the plan doesn't
// throttle its own last few decks.
const RATE_LIMIT = { windowMs: 60_000, max: 10 };

/**
 * A full batch is 25 searches plus up to 25 download pings. Run one at a time
 * that is 50 round trips in a single invocation, which outlives the default
 * function timeout and loses every result. Five at a time keeps a full batch to
 * a few seconds; the cost is overshooting the hourly allowance by at most four
 * searches, which is cheaper than the whole run being killed.
 */
const SEARCH_CONCURRENCY = 5;

export const maxDuration = 60;

interface BatchResult {
  query: string;
  result: UnsplashPhoto | null;
}

interface BatchItem {
  query: string;
  variety: boolean;
}

/**
 * One search per distinct query. Entries may be plain strings or
 * `{ query, variety }`; `variety` asks for something other than the top hit,
 * for a card that is replacing the picture it already has.
 */
function parseItems(body: unknown): BatchItem[] {
  const raw = (body as { items?: unknown })?.items;
  if (!Array.isArray(raw)) return [];

  const byQuery = new Map<string, BatchItem>();
  for (const entry of raw) {
    const asItem =
      typeof entry === 'object' && entry !== null ? (entry as Record<string, unknown>) : null;
    const query = typeof entry === 'string' ? entry : asItem?.query;
    if (typeof query !== 'string' || query.trim().length === 0) continue;

    const trimmed = query.trim();
    const variety = asItem?.variety === true;
    const seen = byQuery.get(trimmed);
    // One search answers every card that shares the query, so if any of them is
    // replacing a picture, the whole query gets the wider search.
    if (seen) seen.variety = seen.variety || variety;
    else byQuery.set(trimmed, { query: trimmed, variety });
  }
  return [...byQuery.values()];
}

/**
 * Search Unsplash for a list of queries in one round trip, in small waves so
 * the run can stop as soon as Unsplash says the hourly allowance is gone.
 * Whatever was found before that point still comes back — a half-filled deck is
 * the point of the feature, since the caller retries after the limit resets.
 * `stopped` marks the other kind of early exit (a network fault or an Unsplash
 * error), which the caller must not mistake for "no photo for those words".
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json({ error: 'UNSPLASH_ACCESS_KEY not configured' }, { status: 500 });
  }

  let items: BatchItem[];
  try {
    items = parseItems(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: 'items required' }, { status: 400 });
  }
  if (items.length > MAX_BATCH_QUERIES) {
    return NextResponse.json(
      { error: `At most ${MAX_BATCH_QUERIES} queries per request` },
      { status: 400 },
    );
  }

  const results: BatchResult[] = [];
  let rateLimited = false;
  let stopped = false;
  let remaining: number | null = null;

  for (let i = 0; i < items.length && !rateLimited && !stopped; i += SEARCH_CONCURRENCY) {
    const wave = items.slice(i, i + SEARCH_CONCURRENCY);
    const searches = await Promise.all(
      wave.map(({ query, variety }) =>
        searchPhoto(query, accessKey, { variety }).catch((err) => {
          logger.error('images/batch: Unsplash search failed', { query, err });
          return null;
        }),
      ),
    );

    const pings: string[] = [];
    for (const [n, search] of searches.entries()) {
      if (!search) {
        stopped = true;
        break;
      }
      if (!search.ok) {
        rateLimited = search.rateLimited;
        if (!rateLimited) {
          logger.error('images/batch: Unsplash error', {
            query: wave[n].query,
            status: search.status,
          });
          stopped = true;
        }
        break;
      }
      remaining = search.remaining;
      results.push({ query: wave[n].query, result: search.photo });
      if (search.photo?.downloadLocation) pings.push(search.photo.downloadLocation);
    }

    // Awaited, not fired and forgotten: the function can be frozen the moment
    // it responds, and an untracked download is an Unsplash guideline breach.
    await Promise.allSettled(pings.map((location) => triggerDownload(location, accessKey)));
  }

  return NextResponse.json({ results, rateLimited, stopped, remaining }, { status: 200 });
}
