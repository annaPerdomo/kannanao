import { APP_NAME } from '@/lib/brand';

const UTM_SOURCE = APP_NAME.toLowerCase();

/**
 * Ceiling on one batch request. Unsplash's free tier allows 50 requests an
 * hour and a used photo costs two (the search plus the download trigger its
 * API guidelines require), so 25 queries is the most a single batch can ever
 * pay for.
 */
export const MAX_BATCH_QUERIES = 25;

export interface UnsplashPhoto {
  url: string;
  downloadLocation: string;
  photographerName: string;
  photographerUrl: string;
  photoPageUrl: string;
}

export type UnsplashSearch =
  | { ok: true; photo: UnsplashPhoto | null; remaining: number | null }
  | { ok: false; rateLimited: boolean; status: number; statusText: string; detail: string };

interface UnsplashApiPhoto {
  urls?: { regular?: string };
  links?: { download_location?: string; html?: string };
  user?: { name?: string; links?: { html?: string } };
}

function toPhoto(photo: UnsplashApiPhoto): UnsplashPhoto {
  return {
    url: photo.urls?.regular ?? '',
    downloadLocation: photo.links?.download_location ?? '',
    photographerName: photo.user?.name ?? '',
    photographerUrl: `${photo.user?.links?.html}?utm_source=${UTM_SOURCE}&utm_medium=referral`,
    photoPageUrl: `${photo.links?.html}?utm_source=${UTM_SOURCE}&utm_medium=referral`,
  };
}

/**
 * How many photos a `variety` search looks at. The top hit is what the card
 * already has, so a replacement has to be picked from further down the page —
 * one request either way, so the hourly allowance costs the same.
 */
const VARIETY_PER_PAGE = 10;

export async function searchPhoto(
  query: string,
  accessKey: string,
  { variety = false }: { variety?: boolean } = {},
): Promise<UnsplashSearch> {
  const perPage = variety ? VARIETY_PER_PAGE : 1;
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${accessKey}` } });

  if (!res.ok) {
    return {
      ok: false,
      // Unsplash spends its hourly allowance as a 403, not a 429.
      rateLimited: res.status === 403 || res.status === 429,
      status: res.status,
      statusText: res.statusText,
      detail: await res.text(),
    };
  }

  const data = await res.json();
  const results = data?.results;
  const header = res.headers?.get('x-ratelimit-remaining') ?? null;
  const remaining = header === null ? null : Number(header);

  const pool: UnsplashApiPhoto[] = Array.isArray(results) ? results : [];
  const pick = variety && pool.length > 1 ? Math.floor(Math.random() * pool.length) : 0;

  return {
    ok: true,
    photo: pool.length > 0 ? toPhoto(pool[pick]) : null,
    remaining: Number.isFinite(remaining) ? remaining : null,
  };
}

/**
 * Every download location Unsplash hands out lives on its API host. The ping is
 * made server-side with our access key attached, so a location the client made
 * up would hand that key to whatever host it named.
 */
export function isUnsplashDownloadLocation(location: string): boolean {
  try {
    const { protocol, hostname } = new URL(location);
    return protocol === 'https:' && hostname === 'api.unsplash.com';
  } catch {
    return false;
  }
}

/** Unsplash's API guidelines require this ping whenever a photo gets used. */
export async function triggerDownload(downloadLocation: string, accessKey: string): Promise<void> {
  await fetch(downloadLocation, { headers: { Authorization: `Client-ID ${accessKey}` } });
}
