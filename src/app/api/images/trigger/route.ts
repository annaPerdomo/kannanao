import { type NextRequest, NextResponse } from 'next/server';

import { rateLimit } from '../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../_lib/requireOrganizerAccount';
import { isUnsplashDownloadLocation, triggerDownload } from '../../_lib/unsplash';

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  try {
    const { downloadLocation } = await req.json();
    if (!downloadLocation) {
      return NextResponse.json({ error: 'downloadLocation required' }, { status: 400 });
    }
    if (!isUnsplashDownloadLocation(downloadLocation)) {
      return NextResponse.json({ error: 'Not an Unsplash download location' }, { status: 400 });
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      return NextResponse.json({ error: 'UNSPLASH_ACCESS_KEY not configured' }, { status: 500 });
    }

    await triggerDownload(downloadLocation, accessKey);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
