/** Grammar-ending detection for the "Pick the ending" practice mode: finds the
 * present/negative/past/pastNegative ending a card's `example_jp` is built on. */
import { stripFurigana } from '@/lib/furigana';
import type { Flashcard } from '@/types/flashcard';

export type EndingFamily = 'i-adj' | 'na-noun' | 'masu';
export type EndingForm = 'present' | 'negative' | 'past' | 'pastNegative';

export const FAMILY_ENDINGS: Record<EndingFamily, Record<EndingForm, string>> = {
  'i-adj': {
    present: 'いです',
    negative: 'くないです',
    past: 'かったです',
    pastNegative: 'くなかったです',
  },
  'na-noun': {
    present: 'です',
    negative: 'じゃないです',
    past: 'でした',
    pastNegative: 'じゃなかったです',
  },
  masu: {
    present: 'ます',
    negative: 'ません',
    past: 'ました',
    pastNegative: 'ませんでした',
  },
};

export interface EndingItem {
  card: Flashcard;
  family: EndingFamily;
  form: EndingForm;
  /** example_jp split at the ending; both keep furigana markup. */
  before: string;
  after: string;
  /** The card's own word/meaning spell out this exact ending (the Ch6 case) —
   * an ordinary vocab sentence that merely happens to end this way does not. */
  drillsCard: boolean;
}

/** Below this many eligible cards a round would be too short to be worth it. */
export const MIN_ENDING_ITEMS = 4;

interface Candidate {
  family: EndingFamily;
  form: EndingForm;
  pattern: string;
}

// Present forms are excluded here except masu's, which is the one case the
// spec can disambiguate with a trailing sentence boundary — い/な-noun
// presents are too short to tell from any other text on the card.
const CANDIDATES: Candidate[] = [
  { family: 'i-adj', form: 'pastNegative', pattern: 'くなかったです' },
  { family: 'i-adj', form: 'negative', pattern: 'くないです' },
  { family: 'i-adj', form: 'past', pattern: 'かったです' },
  { family: 'na-noun', form: 'pastNegative', pattern: 'じゃなかったです' },
  { family: 'na-noun', form: 'negative', pattern: 'じゃないです' },
  { family: 'na-noun', form: 'past', pattern: 'でした' },
  { family: 'masu', form: 'pastNegative', pattern: 'ませんでした' },
  { family: 'masu', form: 'negative', pattern: 'ません' },
  { family: 'masu', form: 'past', pattern: 'ました' },
  { family: 'masu', form: 'present', pattern: 'ます' },
];

const MASU_PRESENT_BOUNDARY = new Set(['。', '！', '？', '!', '?', '、', '」']);

/** A stem ending in す whose す doesn't itself follow や or う (やすい/うすい —
 * real adjective stems): the signature of すくない's negative/pastNegative. */
function hasUnguardedSuStem(stem: string): boolean {
  if (!stem.endsWith('す')) return false;
  const before = stem.length >= 2 ? stem[stem.length - 2] : null;
  return before !== 'や' && before !== 'う';
}

/** `すくない` ("few") is a dictionary word, not a conjugated negative. Its
 * negative/pastNegative share the direct す check above; its past
 * (すくなかった) reads the same す two characters further back, behind くな. */
function isSukunaiFalsePositive(family: EndingFamily, form: EndingForm, stem: string): boolean {
  if (family !== 'i-adj') return false;
  if (form === 'negative' || form === 'pastNegative') return hasUnguardedSuStem(stem);
  if (form === 'past' && stem.endsWith('すくな')) return hasUnguardedSuStem(stem.slice(0, -2));
  return false;
}

// Fixed greetings/set phrases that happen to end in a masu or na-noun form —
// detecting them as a conjugation drill would blank out a whole idiom, not a
// taught grammar point. The last three are themselves masu-stem verbs, so
// they're only excluded in their masu-past spelling (わかりました etc).
const SET_PHRASE_STEMS = ['すみ', 'ござい', 'いただき', 'おねがいし', 'ごちそうさま'];
const MASU_PAST_SET_PHRASE_STEMS = ['わかり', 'つかれ', 'すき'];

function isSetPhrase(family: EndingFamily, form: EndingForm, stem: string): boolean {
  if (family !== 'masu' && family !== 'na-noun') return false;
  if (SET_PHRASE_STEMS.some((p) => stem.endsWith(p))) return true;
  return (
    family === 'masu' && form === 'past' && MASU_PAST_SET_PHRASE_STEMS.some((p) => stem.endsWith(p))
  );
}

/** `{kanji|reading}` spans, as [openBraceIndex, closeBraceIndex] pairs. */
function furiganaGroupSpans(text: string): [number, number][] {
  const spans: [number, number][] = [];
  const regex = /\{[^{}]*\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    spans.push([match.index, match.index + match[0].length - 1]);
  }
  return spans;
}

function startsOrEndsInsideGroup(start: number, end: number, spans: [number, number][]): boolean {
  return spans.some(([gs, ge]) => (start > gs && start <= ge) || (end > gs && end <= ge));
}

/**
 * Finds the one grammar ending a card's `example_jp` is built around, or null
 * when the sentence doesn't carry one. When two candidate patterns match at
 * overlapping positions (`ませんでした`/`ません`, `くなかったです`/`かったです`),
 * the earliest-starting match wins, and the longest on a tie.
 */
export function findEnding(card: Flashcard): EndingItem | null {
  const text = card.example_jp;
  if (!text || !text.trim()) return null;

  const groupSpans = furiganaGroupSpans(text);
  let best: { start: number; end: number; family: EndingFamily; form: EndingForm } | null = null;

  for (const { family, form, pattern } of CANDIDATES) {
    let fromIndex = 0;
    for (;;) {
      const start = text.indexOf(pattern, fromIndex);
      if (start === -1) break;
      const end = start + pattern.length;
      fromIndex = start + 1;

      if (startsOrEndsInsideGroup(start, end, groupSpans)) continue;
      const stem = stripFurigana(text.slice(0, start));
      if (isSukunaiFalsePositive(family, form, stem)) continue;
      if (isSetPhrase(family, form, stem)) continue;
      if (family === 'masu' && form === 'present') {
        const after = end < text.length ? text[end] : null;
        if (after !== null && !MASU_PRESENT_BOUNDARY.has(after)) continue;
      }

      if (
        !best ||
        start < best.start ||
        (start === best.start && end - start > best.end - best.start)
      ) {
        best = { start, end, family, form };
      }
    }
  }

  if (!best) return null;
  return {
    card,
    family: best.family,
    form: best.form,
    before: text.slice(0, best.start),
    after: text.slice(best.end),
    drillsCard: drillsCard(card, FAMILY_ENDINGS[best.family][best.form]),
  };
}

function drillsCard(card: Flashcard, ending: string): boolean {
  const normalize = (s: string) => stripFurigana(s).replace(/[\s　]/g, '');
  return normalize(card.word).includes(ending) || normalize(card.meaning).includes(ending);
}

export function endingItems(cards: Flashcard[]): EndingItem[] {
  return cards.reduce<EndingItem[]>((items, card) => {
    const item = findEnding(card);
    if (item) items.push(item);
    return items;
  }, []);
}

/** All four forms of the item's family, present/negative/past/pastNegative. */
export function endingChoices(item: EndingItem): { form: EndingForm; text: string }[] {
  const forms: EndingForm[] = ['present', 'negative', 'past', 'pastNegative'];
  return forms.map((form) => ({ form, text: FAMILY_ENDINGS[item.family][form] }));
}

/** いい becomes よ before every い-adjective ending ({@link FAMILY_ENDINGS}'s
 * い-adj row assumes a stem) — flags that so the miss explainer can call it out. */
export function isIiStem(item: EndingItem): boolean {
  return item.family === 'i-adj' && stripFurigana(item.before).endsWith('よ');
}
