import { type NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get('query');
    if (!query) {
      return NextResponse.json({ error: 'query required' }, { status: 400 });
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      return NextResponse.json({ error: 'UNSPLASH_ACCESS_KEY not configured' }, { status: 500 });
    }

    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        {
          error: 'Unsplash error',
          status: res.status,
          statusText: res.statusText,
          detail: errorText,
        },
        { status: 502 },
      );
    }

    const data = await res.json();
    const results = data?.results;
    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ result: null }, { status: 200 });
    }

    const photo = results[0];
    return NextResponse.json(
      {
        result: {
          url: photo.urls?.regular,
          downloadLocation: photo.links?.download_location,
          photographerName: photo.user?.name,
          photographerUrl: `${photo.user?.links?.html}?utm_source=kannanao&utm_medium=referral`,
          photoPageUrl: `${photo.links?.html}?utm_source=kannanao&utm_medium=referral`,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
