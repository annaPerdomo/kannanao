import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  __resetKanjiStrokesCache,
  fetchKanjiStrokes,
  kanjiAliveUrl,
  kanjiVgUrl,
  parseKanjiVg,
  strokesSvg,
  uniqueKanji,
} from '@/lib/kanjiStrokes';

const JITSU_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 109 109">
  <g id="kvg:StrokeOrder_05b9f" fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round">
    <g id="kvg:05b9f">
      <path id="kvg:05b9f-s2" d="M44.5,10 L44.5,50"/>
      <path id="kvg:05b9f-s1" d="M20,15 L90,15"/>
      <path id="kvg:05b9f-s3" d="M20,70 C20,80 90,80 90,70"/>
    </g>
  </g>
  <g id="kvg:StrokeNumbers_05b9f" fill="#808080" font-size="8">
    <text transform="matrix(1 0 0 1 17.25 11.63)">1</text>
    <text transform="matrix(1 0 0 1 47.25 25.63)">2</text>
    <text transform="matrix(1 0 0 1 17.25 68.63)">3</text>
  </g>
</svg>`;

const NO_STROKES_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 109 109"></svg>`;

const UNSAFE_D_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 109 109">' +
  '<path id="kvg:05b9f-s1" d="M1,1 L2,2&quot;&gt;&lt;script" />' +
  '</svg>';

describe('uniqueKanji', () => {
  it('extracts unique ideographs in first-seen order, excluding 々 and kana', () => {
    expect(uniqueKanji('実家の実々')).toEqual(['実', '家']);
  });

  it('returns an empty array for kana-only text', () => {
    expect(uniqueKanji('これはかな')).toEqual([]);
  });
});

describe('kanjiVgUrl / kanjiAliveUrl', () => {
  it('builds the KanjiVG URL from the code point as 5-digit lowercase hex', () => {
    expect(kanjiVgUrl('実')).toBe(
      'https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@r20260714/kanji/05b9f.svg',
    );
  });

  it('builds the Kanji Alive URL with the kanji URL-encoded', () => {
    expect(kanjiAliveUrl('実')).toBe('https://app.kanjialive.com/%E5%AE%9F');
  });
});

describe('parseKanjiVg', () => {
  it('orders strokes by their -sN suffix regardless of document order', () => {
    const result = parseKanjiVg(JITSU_SVG);
    expect(result).not.toBeNull();
    expect(result!.strokes).toEqual([
      'M20,15 L90,15',
      'M44.5,10 L44.5,50',
      'M20,70 C20,80 90,80 90,70',
    ]);
  });

  it('parses the stroke-number positions', () => {
    const result = parseKanjiVg(JITSU_SVG);
    expect(result!.numbers).toEqual([
      { n: 1, x: 17.25, y: 11.63 },
      { n: 2, x: 47.25, y: 25.63 },
      { n: 3, x: 17.25, y: 68.63 },
    ]);
  });

  it('returns null when a path has an unsafe d attribute', () => {
    expect(parseKanjiVg(UNSAFE_D_SVG)).toBeNull();
  });

  it('returns null when there are no stroke paths', () => {
    expect(parseKanjiVg(NO_STROKES_SVG)).toBeNull();
  });
});

describe('fetchKanjiStrokes', () => {
  afterEach(() => {
    __resetKanjiStrokesCache();
    vi.useRealTimers();
  });

  it('includes an OK kanji and drops a 404, a rejected fetch and a timed-out one', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('05b9f')) {
        return Promise.resolve({ ok: true, text: () => Promise.resolve(JITSU_SVG) } as Response);
      }
      if (url.includes('05bb6')) {
        return Promise.resolve({ ok: false } as Response);
      }
      if (url.includes('07684')) {
        return Promise.reject(new Error('network error'));
      }
      return new Promise<Response>(() => {});
    });

    const promise = fetchKanjiStrokes(['実', '家', '猫', '犬'], {
      fetchImpl,
      timeoutMs: 10,
    });
    await vi.advanceTimersByTimeAsync(20);
    const result = await promise;

    expect(result.has('実')).toBe(true);
    expect(result.has('家')).toBe(false);
    expect(result.has('猫')).toBe(false);
    expect(result.has('犬')).toBe(false);
  });

  it('caches a successful kanji so a second call does not refetch it', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: true, text: () => Promise.resolve(JITSU_SVG) } as Response);

    await fetchKanjiStrokes(['実'], { fetchImpl });
    await fetchKanjiStrokes(['実'], { fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries a kanji that previously failed', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false } as Response);

    const first = await fetchKanjiStrokes(['実'], { fetchImpl });
    const second = await fetchKanjiStrokes(['実'], { fetchImpl });

    expect(first.has('実')).toBe(false);
    expect(second.has('実')).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe('strokesSvg', () => {
  it('draws strokes up to upTo, colouring earlier ones with doneColor', () => {
    const data = parseKanjiVg(JITSU_SVG)!;
    const svg = strokesSvg(data, { upTo: 2, doneColor: '#aaa' });
    const paths = [...svg.matchAll(/<path[^>]*>/g)];
    expect(paths).toHaveLength(2);
    expect(paths[0][0]).toContain('#aaa');
    expect(paths[1][0]).toContain('#000');
  });

  it('adds stroke-number labels when numbers is true', () => {
    const data = parseKanjiVg(JITSU_SVG)!;
    const svg = strokesSvg(data, { numbers: true });
    expect(svg).toContain('<text x="17.25" y="11.63"');
  });

  it('clamps upTo to at least 1', () => {
    const data = parseKanjiVg(JITSU_SVG)!;
    const svg = strokesSvg(data, { upTo: 0 });
    expect([...svg.matchAll(/<path[^>]*>/g)]).toHaveLength(1);
  });

  it('clamps upTo to at most the stroke count', () => {
    const data = parseKanjiVg(JITSU_SVG)!;
    const svg = strokesSvg(data, { upTo: 99 });
    expect([...svg.matchAll(/<path[^>]*>/g)]).toHaveLength(data.strokes.length);
  });
});
