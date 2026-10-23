import { escapeHtml } from '@/lib/lessonPrintable';

export interface StrokeNumber {
  n: number;
  x: number;
  y: number;
}

export interface KanjiStrokes {
  strokes: string[];
  numbers: StrokeNumber[];
}

export const KANJIVG_VIEWBOX = 109;

export const KANJI_RE = /[㐀-䶿一-鿿豈-﫿]/u;

export function uniqueKanji(text: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const ch of text) {
    if (!KANJI_RE.test(ch)) continue;
    if (seen.has(ch)) continue;
    seen.add(ch);
    result.push(ch);
  }
  return result;
}

export function kanjiVgUrl(kanji: string): string {
  const code = kanji.codePointAt(0) ?? 0;
  const hex = code.toString(16).padStart(5, '0');
  return `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@r20260714/kanji/${hex}.svg`;
}

export function kanjiAliveUrl(kanji: string): string {
  return `https://app.kanjialive.com/${encodeURIComponent(kanji)}`;
}

const PATH_RE = /<path\b([^>]*)\/?>/g;
const ID_RE = /\bid="[^"]*-s(\d+)"/;
const D_RE = /\bd="([^"]*)"/;
const D_VALUE_RE = /^[MmCcSsLlHhVvZzQqTtAa0-9.,\s-]+$/;
const TEXT_RE = /<text\b([^>]*)>(\d+)<\/text>/g;
const MATRIX_RE =
  /matrix\(\s*[^,\s]+[,\s]+[^,\s]+[,\s]+[^,\s]+[,\s]+[^,\s]+[,\s]+([^,\s]+)[,\s]+([^,)\s]+)\s*\)/;

export function parseKanjiVg(svg: string): KanjiStrokes | null {
  const pathMatches: { n: number; d: string }[] = [];
  let match: RegExpExecArray | null;
  const pathRegex = new RegExp(PATH_RE);
  while ((match = pathRegex.exec(svg)) !== null) {
    const attrs = match[1];
    const idMatch = ID_RE.exec(attrs);
    const dMatch = D_RE.exec(attrs);
    if (!idMatch || !dMatch) continue;
    const d = dMatch[1];
    if (!D_VALUE_RE.test(d)) return null;
    pathMatches.push({ n: Number(idMatch[1]), d });
  }
  if (pathMatches.length === 0) return null;

  pathMatches.sort((a, b) => a.n - b.n);
  const strokes = pathMatches.map((p) => p.d);

  const numbers: StrokeNumber[] = [];
  const textRegex = new RegExp(TEXT_RE);
  while ((match = textRegex.exec(svg)) !== null) {
    const attrs = match[1];
    const n = Number(match[2]);
    const matrixMatch = MATRIX_RE.exec(attrs);
    if (!matrixMatch) continue;
    const x = Number(matrixMatch[1]);
    const y = Number(matrixMatch[2]);
    if (!Number.isFinite(n) || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    numbers.push({ n, x, y });
  }

  return { strokes, numbers };
}

const strokesCache = new Map<string, KanjiStrokes>();

export function __resetKanjiStrokesCache(): void {
  strokesCache.clear();
}

/** Races the fetch so a mock that ignores AbortSignal still times out in tests. */
async function fetchOne(
  kanji: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<KanjiStrokes | null> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('timeout'));
    }, timeoutMs);
  });
  try {
    const res = await Promise.race([
      fetchImpl(kanjiVgUrl(kanji), { signal: controller.signal }),
      timeout,
    ]);
    if (!res.ok) return null;
    const svg = await res.text();
    return parseKanjiVg(svg);
  } catch {
    return null;
  } finally {
    clearTimeout(timer!);
  }
}

export async function fetchKanjiStrokes(
  kanji: string[],
  opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<Map<string, KanjiStrokes>> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 6000;
  const result = new Map<string, KanjiStrokes>();
  const toFetch = [...new Set(kanji)].filter((k) => {
    const cached = strokesCache.get(k);
    if (cached) {
      result.set(k, cached);
      return false;
    }
    return true;
  });

  await Promise.all(
    toFetch.map(async (k) => {
      const data = await fetchOne(k, fetchImpl, timeoutMs);
      if (data) {
        strokesCache.set(k, data);
        result.set(k, data);
      }
    }),
  );

  return result;
}

export function strokesSvg(
  data: KanjiStrokes,
  opts: {
    upTo?: number;
    color?: string;
    doneColor?: string;
    numbers?: boolean;
    strokeWidth?: number;
  } = {},
): string {
  const n = data.strokes.length;
  const upTo = Math.min(Math.max(opts.upTo ?? n, 1), n);
  const color = escapeHtml(opts.color ?? '#000');
  const doneColor = escapeHtml(opts.doneColor ?? opts.color ?? '#000');
  const strokeWidth = opts.strokeWidth ?? 3;

  const paths = data.strokes
    .slice(0, upTo)
    .map((d, i) => {
      const strokeColor = i === upTo - 1 ? color : doneColor;
      return `<path d="${d}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
    })
    .join('');

  const labels = opts.numbers
    ? data.numbers
        .filter((num) => num.n <= upTo)
        .map(
          (num) => `<text x="${num.x}" y="${num.y}" font-size="8" fill="#808080">${num.n}</text>`,
        )
        .join('')
    : '';

  return `<svg viewBox="0 0 ${KANJIVG_VIEWBOX} ${KANJIVG_VIEWBOX}" width="100%" height="100%" style="fill:none; stroke-linecap:round; stroke-linejoin:round" xmlns="http://www.w3.org/2000/svg">${paths}${labels}</svg>`;
}
