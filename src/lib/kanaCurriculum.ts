import { hiraganaToKatakana } from '@/lib/reviewGames';

import { HIRAGANA_MNEMONICS, type KanaMnemonic, KATAKANA_MNEMONICS } from './kanaMnemonics';

export type KanaTrack = 'hiragana' | 'katakana';

/** Curriculum order: plain rows, then the dakuten/handakuten rows, then the small-や rows. */
export type KanaSetKind = 'base' | 'marked' | 'combo';

export interface KanaEntry {
  kana: string;
  romaji: string;
  setId: string;
  track: KanaTrack;
  /** 1-based position within the track, across all sets. */
  order: number;
  /** For marked/combo characters, the base character they are built from. */
  baseKana?: string;
  mnemonic: KanaMnemonic;
}

export interface KanaSet {
  id: string;
  track: KanaTrack;
  kind: KanaSetKind;
  /** 1-based position within the track. */
  order: number;
  /** The row's own first character. Learner-facing: never a linguistics term. */
  label: string;
  entries: KanaEntry[];
}

interface RowSpec {
  /** Suffix of the set id; prefixed with the track ('hira-' / 'kata-'). */
  key: string;
  kind: KanaSetKind;
  kana: string[];
  romaji: string[];
  /** Base characters the marked/combo row is built from, positionally. */
  base?: string[];
}

const A = ['あ', 'い', 'う', 'え', 'お'];
const KA = ['か', 'き', 'く', 'け', 'こ'];
const SA = ['さ', 'し', 'す', 'せ', 'そ'];
const TA = ['た', 'ち', 'つ', 'て', 'と'];
const HA = ['は', 'ひ', 'ふ', 'へ', 'ほ'];

// The standard chart only, deliberately: no extended katakana (ファ ティ ヴ …),
// and no ー — it has no sound of its own.
const ROWS: RowSpec[] = [
  { key: 'a', kind: 'base', kana: A, romaji: ['a', 'i', 'u', 'e', 'o'] },
  { key: 'ka', kind: 'base', kana: KA, romaji: ['ka', 'ki', 'ku', 'ke', 'ko'] },
  { key: 'sa', kind: 'base', kana: SA, romaji: ['sa', 'shi', 'su', 'se', 'so'] },
  { key: 'ta', kind: 'base', kana: TA, romaji: ['ta', 'chi', 'tsu', 'te', 'to'] },
  {
    key: 'na',
    kind: 'base',
    kana: ['な', 'に', 'ぬ', 'ね', 'の'],
    romaji: ['na', 'ni', 'nu', 'ne', 'no'],
  },
  { key: 'ha', kind: 'base', kana: HA, romaji: ['ha', 'hi', 'fu', 'he', 'ho'] },
  {
    key: 'ma',
    kind: 'base',
    kana: ['ま', 'み', 'む', 'め', 'も'],
    romaji: ['ma', 'mi', 'mu', 'me', 'mo'],
  },
  { key: 'ya', kind: 'base', kana: ['や', 'ゆ', 'よ'], romaji: ['ya', 'yu', 'yo'] },
  {
    key: 'ra',
    kind: 'base',
    kana: ['ら', 'り', 'る', 'れ', 'ろ'],
    romaji: ['ra', 'ri', 'ru', 're', 'ro'],
  },
  // を sits in the base rows, off the standard chart: as the object particle it
  // turns up in the first sentence a learner reads.
  { key: 'wa', kind: 'base', kana: ['わ', 'を', 'ん'], romaji: ['wa', 'wo', 'n'] },

  {
    key: 'ga',
    kind: 'marked',
    kana: ['が', 'ぎ', 'ぐ', 'げ', 'ご'],
    romaji: ['ga', 'gi', 'gu', 'ge', 'go'],
    base: KA,
  },
  {
    key: 'za',
    kind: 'marked',
    kana: ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'],
    romaji: ['za', 'ji', 'zu', 'ze', 'zo'],
    base: SA,
  },
  {
    key: 'da',
    kind: 'marked',
    kana: ['だ', 'ぢ', 'づ', 'で', 'ど'],
    romaji: ['da', 'ji', 'zu', 'de', 'do'],
    base: TA,
  },
  {
    key: 'ba',
    kind: 'marked',
    kana: ['ば', 'び', 'ぶ', 'べ', 'ぼ'],
    romaji: ['ba', 'bi', 'bu', 'be', 'bo'],
    base: HA,
  },
  {
    key: 'pa',
    kind: 'marked',
    kana: ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'],
    romaji: ['pa', 'pi', 'pu', 'pe', 'po'],
    base: HA,
  },

  {
    key: 'kya',
    kind: 'combo',
    kana: ['きゃ', 'きゅ', 'きょ'],
    romaji: ['kya', 'kyu', 'kyo'],
    base: ['き', 'き', 'き'],
  },
  {
    key: 'sha',
    kind: 'combo',
    kana: ['しゃ', 'しゅ', 'しょ'],
    romaji: ['sha', 'shu', 'sho'],
    base: ['し', 'し', 'し'],
  },
  {
    key: 'cha',
    kind: 'combo',
    kana: ['ちゃ', 'ちゅ', 'ちょ'],
    romaji: ['cha', 'chu', 'cho'],
    base: ['ち', 'ち', 'ち'],
  },
  {
    key: 'nya',
    kind: 'combo',
    kana: ['にゃ', 'にゅ', 'にょ'],
    romaji: ['nya', 'nyu', 'nyo'],
    base: ['に', 'に', 'に'],
  },
  {
    key: 'hya',
    kind: 'combo',
    kana: ['ひゃ', 'ひゅ', 'ひょ'],
    romaji: ['hya', 'hyu', 'hyo'],
    base: ['ひ', 'ひ', 'ひ'],
  },
  {
    key: 'mya',
    kind: 'combo',
    kana: ['みゃ', 'みゅ', 'みょ'],
    romaji: ['mya', 'myu', 'myo'],
    base: ['み', 'み', 'み'],
  },
  {
    key: 'rya',
    kind: 'combo',
    kana: ['りゃ', 'りゅ', 'りょ'],
    romaji: ['rya', 'ryu', 'ryo'],
    base: ['り', 'り', 'り'],
  },
  {
    key: 'gya',
    kind: 'combo',
    kana: ['ぎゃ', 'ぎゅ', 'ぎょ'],
    romaji: ['gya', 'gyu', 'gyo'],
    base: ['ぎ', 'ぎ', 'ぎ'],
  },
  {
    key: 'ja',
    kind: 'combo',
    kana: ['じゃ', 'じゅ', 'じょ'],
    romaji: ['ja', 'ju', 'jo'],
    base: ['じ', 'じ', 'じ'],
  },
  {
    key: 'bya',
    kind: 'combo',
    kana: ['びゃ', 'びゅ', 'びょ'],
    romaji: ['bya', 'byu', 'byo'],
    base: ['び', 'び', 'び'],
  },
  {
    key: 'pya',
    kind: 'combo',
    kana: ['ぴゃ', 'ぴゅ', 'ぴょ'],
    romaji: ['pya', 'pyu', 'pyo'],
    base: ['ぴ', 'ぴ', 'ぴ'],
  },
];

const TRACK_PREFIX: Record<KanaTrack, string> = { hiragana: 'hira', katakana: 'kata' };

function derivedMnemonic(kana: string, base: string, kind: KanaSetKind): KanaMnemonic {
  if (kind === 'combo') {
    return {
      en: `${base} plus a small character — say both sounds as one.`,
      ja: `${base} と ちいさい もじ。ひとつの おとで よむ。`,
    };
  }
  const twoMarks = kana.codePointAt(0)! - base.codePointAt(0)! === 1;
  return twoMarks
    ? {
        en: `${base} with two small marks — a softer, buzzing sound.`,
        ja: `${base} に てんてん。にごった おと。`,
      }
    : {
        en: `${base} with a small circle — a popping sound.`,
        ja: `${base} に まる。はねる おと。`,
      };
}

function buildTrack(track: KanaTrack): KanaSet[] {
  const toTrack = (k: string) => (track === 'katakana' ? hiraganaToKatakana(k) : k);
  const mnemonics = track === 'katakana' ? KATAKANA_MNEMONICS : HIRAGANA_MNEMONICS;
  let order = 0;

  return ROWS.map((row, rowIndex) => {
    const id = `${TRACK_PREFIX[track]}-${row.key}`;
    const entries = row.kana.map((rawKana, i) => {
      const kana = toTrack(rawKana);
      const baseKana = row.base ? toTrack(row.base[i]) : undefined;
      order += 1;
      return {
        kana,
        romaji: row.romaji[i],
        setId: id,
        track,
        order,
        baseKana,
        mnemonic: baseKana ? derivedMnemonic(kana, baseKana, row.kind) : mnemonics[kana],
      };
    });
    return { id, track, kind: row.kind, order: rowIndex + 1, label: entries[0].kana, entries };
  });
}

export const HIRAGANA_SETS: KanaSet[] = buildTrack('hiragana');
export const KATAKANA_SETS: KanaSet[] = buildTrack('katakana');
export const KANA_SETS: KanaSet[] = [...HIRAGANA_SETS, ...KATAKANA_SETS];

const SETS_BY_ID = new Map(KANA_SETS.map((s) => [s.id, s]));
const ENTRIES_BY_KANA = new Map(KANA_SETS.flatMap((s) => s.entries).map((e) => [e.kana, e]));

export function setsForTrack(track: KanaTrack): KanaSet[] {
  return track === 'katakana' ? KATAKANA_SETS : HIRAGANA_SETS;
}

export function getSet(setId: string): KanaSet | undefined {
  return SETS_BY_ID.get(setId);
}

export function getKanaEntry(kana: string): KanaEntry | undefined {
  return ENTRIES_BY_KANA.get(kana);
}

export function allKana(track?: KanaTrack): string[] {
  const sets = track ? setsForTrack(track) : KANA_SETS;
  return sets.flatMap((s) => s.entries.map((e) => e.kana));
}

export function kanaBefore(setId: string): string[] {
  const set = getSet(setId);
  if (!set) return [];
  return setsForTrack(set.track)
    .filter((s) => s.order < set.order)
    .flatMap((s) => s.entries.map((e) => e.kana));
}

// Drills prefer these as decoys over random characters: telling look-alikes
// apart is the skill, and random decoys make a drill trivially easy.
export const CONFUSABLE_GROUPS: string[][] = [
  ['ね', 'れ', 'わ'],
  ['は', 'ほ'],
  ['ぬ', 'め'],
  ['る', 'ろ'],
  ['あ', 'お'],
  ['い', 'り'],
  ['き', 'さ'],
  ['し', 'つ'],
  ['す', 'む'],
  ['シ', 'ツ'],
  ['ソ', 'ン', 'ノ'],
  ['ク', 'タ'],
  ['ウ', 'ワ'],
  ['ア', 'マ'],
  ['ス', 'ヌ'],
  ['チ', 'テ'],
];

const CONFUSABLES_BY_KANA = new Map<string, string[]>();
for (const group of CONFUSABLE_GROUPS) {
  for (const kana of group) {
    const others = group.filter((k) => k !== kana);
    CONFUSABLES_BY_KANA.set(kana, [...(CONFUSABLES_BY_KANA.get(kana) ?? []), ...others]);
  }
}

/** Look-alikes for `kana` across both scripts, closest first. */
export function confusablesFor(kana: string): string[] {
  return CONFUSABLES_BY_KANA.get(kana) ?? [];
}
