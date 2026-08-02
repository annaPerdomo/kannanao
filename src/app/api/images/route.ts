import { type NextRequest, NextResponse } from 'next/server';

import { rateLimit } from '../_lib/rateLimit';
import { requireOrganizerAccount } from '../_lib/requireOrganizerAccount';
import { searchPhoto } from '../_lib/unsplash';

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  try {
    const query = req.nextUrl.searchParams.get('query');
    if (!query) {
      return NextResponse.json({ error: 'query required' }, { status: 400 });
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      return NextResponse.json({ error: 'UNSPLASH_ACCESS_KEY not configured' }, { status: 500 });
    }

    const search = await searchPhoto(query, accessKey);

    if (!search.ok) {
      return NextResponse.json(
        {
          error: 'Unsplash error',
          rateLimited: search.rateLimited,
          status: search.status,
          statusText: search.statusText,
          detail: search.detail,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ result: search.photo }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
