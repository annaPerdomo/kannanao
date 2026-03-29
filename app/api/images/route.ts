import { access } from 'fs';
import { NextRequest, NextResponse } from 'next/server';

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
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
