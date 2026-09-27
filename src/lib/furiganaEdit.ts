import { type FuriganaSegment, parseFurigana } from './furigana';
import { type KanjiReadingDict, splitReading } from './kanjiReadings';

export const KANJI_RUN_REGEX = /[㐀-䶿一-鿿々〆ヶ]+/g;

export type ReadingGroup = { kanji: string; reading: string };

export function splitKanjiRuns(plain: string): FuriganaSegment[] {
  const segments: FuriganaSegment[] = [];
  const regex = new RegExp(KANJI_RUN_REGEX.source, 'g');
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(plain)) !== null) {
    if (match.index > last) segments.push(plain.slice(last, match.index));
    segments.push({ kanji: match[0], reading: '' });
    last = regex.lastIndex;
  }
  if (last < plain.length) segments.push(plain.slice(last));
  return segments;
}

/**
 * Longest run of consecutive unused prior groups whose kanji concatenates to
 * `run`, so a split like `{日本|にほん}{語|ご}` survives instead of merging.
 */
function findGroupSequence(
  run: string,
  priorGroups: ReadingGroup[],
  used: boolean[],
): [number, number] | null {
  for (let start = 0; start < priorGroups.length; start++) {
    if (used[start]) continue;
    let concat = '';
    let end = start;
    while (end < priorGroups.length && !used[end] && concat.length < run.length) {
      concat += priorGroups[end].kanji;
      end++;
    }
    if (concat === run) return [start, end];
  }
  return null;
}

export function reflowReadings(plain: string, prior: FuriganaSegment[]): FuriganaSegment[] {
  const runs = splitKanjiRuns(plain);
  const priorGroups = readingGroups(prior);
  const used = new Array(priorGroups.length).fill(false);

  const result: FuriganaSegment[] = [];
  for (const run of runs) {
    if (typeof run === 'string') {
      result.push(run);
      continue;
    }
    const sequence = findGroupSequence(run.kanji, priorGroups, used);
    if (sequence) {
      const [start, end] = sequence;
      for (let i = start; i < end; i++) {
        used[i] = true;
        result.push({ kanji: priorGroups[i].kanji, reading: priorGroups[i].reading });
      }
      continue;
    }
    result.push({ kanji: run.kanji, reading: '' });
  }
  return result;
}

export function segmentsToMarkup(segments: FuriganaSegment[]): string {
  return segments
    .map((seg) => {
      if (typeof seg === 'string') return seg;
      if (!seg.reading) return seg.kanji;
      return `{${seg.kanji}|${seg.reading}}`;
    })
    .join('');
}

export function readingGroups(segments: FuriganaSegment[]): ReadingGroup[] {
  return segments
    .filter((seg): seg is { kanji: string; reading: string } => typeof seg !== 'string')
    .map((seg) => ({ kanji: seg.kanji, reading: seg.reading }));
}

export function withReading(
  segments: FuriganaSegment[],
  index: number,
  reading: string,
): FuriganaSegment[] {
  let seen = -1;
  return segments.map((seg) => {
    if (typeof seg === 'string') return seg;
    seen += 1;
    if (seen !== index) return seg;
    return { kanji: seg.kanji, reading };
  });
}

const KANA_ONLY = /^[぀-ヿー\s]*$/;

export function isKana(text: string): boolean {
  return KANA_ONLY.test(text);
}

export function segmentsFromMarkup(markup: string): FuriganaSegment[] {
  return parseFurigana(markup).flatMap((seg) =>
    typeof seg === 'string' ? splitKanjiRuns(seg) : [seg],
  );
}

function mapGroups(
  segments: FuriganaSegment[],
  fn: (group: ReadingGroup, index: number) => FuriganaSegment[],
): FuriganaSegment[] {
  let seen = -1;
  return segments.flatMap((seg) => (typeof seg === 'string' ? [seg] : fn(seg, ++seen)));
}

export function joinGroups(segments: FuriganaSegment[], index: number): FuriganaSegment[] {
  const groups = readingGroups(segments);
  const next = groups[index + 1];
  return mapGroups(segments, (group, i) => {
    if (i === index)
      return [{ kanji: group.kanji + next.kanji, reading: group.reading + next.reading }];
    return i === index + 1 ? [] : [group];
  });
}

export function splitGroup(
  segments: FuriganaSegment[],
  index: number,
  at: number,
  [left, right]: [string, string],
): FuriganaSegment[] {
  return mapGroups(segments, (group, i) => {
    if (i !== index) return [group];
    const chars = Array.from(group.kanji);
    return [
      { kanji: chars.slice(0, at).join(''), reading: left },
      { kanji: chars.slice(at).join(''), reading: right },
    ];
  });
}

export function dictionarySplit(
  group: ReadingGroup,
  at: number,
  dict: KanjiReadingDict,
): [string, string] | null {
  const parts = splitReading(group.kanji, group.reading, dict);
  if (!parts) return null;
  return [parts.slice(0, at).join(''), parts.slice(at).join('')];
}

export function splitAllByKanji(
  segments: FuriganaSegment[],
  dict: KanjiReadingDict,
): FuriganaSegment[] {
  return mapGroups(segments, (group) => {
    const parts = splitReading(group.kanji, group.reading, dict);
    if (!parts) return [group];
    return Array.from(group.kanji).map((kanji, i) => ({ kanji, reading: parts[i] }));
  });
}

const CANNOT_START_READING = /^[ぁぃぅぇぉゃゅょゎっんァィゥェォャュョヮッンー]/;

export function readingCutOptions(reading: string): [string, string][] {
  const chars = Array.from(reading);
  const options: [string, string][] = [];
  for (let i = 1; i < chars.length; i++) {
    const right = chars.slice(i).join('');
    if (!CANNOT_START_READING.test(right)) options.push([chars.slice(0, i).join(''), right]);
  }
  return options;
}
