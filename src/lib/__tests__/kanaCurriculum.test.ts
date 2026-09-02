import { describe, expect, it } from 'vitest';
import { toRomaji } from 'wanakana';

import {
  allKana,
  confusablesFor,
  getKanaEntry,
  getSet,
  HIRAGANA_SETS,
  KANA_SETS,
  kanaBefore,
  kanaDifficulty,
  kanaSetForChar,
  type KanaTrack,
  KATAKANA_SETS,
  orderKanaSets,
  segmentReading,
  setsForTrack,
} from '@/lib/kanaCurriculum';
import { isPureKana } from '@/lib/reviewGames';

const TRACKS: KanaTrack[] = ['hiragana', 'katakana'];

describe('kana curriculum shape', () => {
  it('should ship both tracks with the same set ids either side of the prefix', () => {
    const suffix = (id: string) => id.split('-').slice(1).join('-');
    expect(HIRAGANA_SETS.map((s) => suffix(s.id))).toEqual(KATAKANA_SETS.map((s) => suffix(s.id)));
    expect(HIRAGANA_SETS[0].id).toBe('hira-a');
    expect(KATAKANA_SETS[0].id).toBe('kata-a');
  });

  it.each(TRACKS)('should have 104 characters in %s: 46 base, 25 marked, 33 combos', (track) => {
    const sets = setsForTrack(track);
    const count = (kind: string) =>
      sets.filter((s) => s.kind === kind).reduce((n, s) => n + s.entries.length, 0);
    expect(count('base')).toBe(46);
    expect(count('marked')).toBe(25);
    expect(count('combo')).toBe(33);
    expect(allKana(track)).toHaveLength(104);
  });

  it('should include を — the object particle a learner meets in their first sentence', () => {
    expect(getSet('hira-wa')!.entries.map((e) => e.kana)).toEqual(['わ', 'を', 'ん']);
    expect(getSet('kata-wa')!.entries.map((e) => e.kana)).toEqual(['ワ', 'ヲ', 'ン']);
  });

  it('should exclude extended katakana and the long-vowel mark', () => {
    const kana = allKana();
    expect(kana).not.toContain('ー');
    for (const extended of ['ファ', 'ティ', 'ヴ', 'ウィ']) {
      expect(kana).not.toContain(extended);
    }
  });

  it('should hold only kana characters', () => {
    for (const kana of allKana()) expect(isPureKana(kana)).toBe(true);
  });

  it('should never repeat a character', () => {
    const kana = allKana();
    expect(new Set(kana).size).toBe(kana.length);
  });

  it('should keep set ids unique', () => {
    const ids = KANA_SETS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('hira-kya');
    expect(ids).toContain('kata-pya');
  });

  it.each(TRACKS)('should order %s sets 1..n with base rows first', (track) => {
    const sets = setsForTrack(track);
    expect(sets.map((s) => s.order)).toEqual(sets.map((_, i) => i + 1));
    const kinds = sets.map((s) => s.kind);
    expect(kinds.indexOf('marked')).toBeGreaterThan(kinds.lastIndexOf('base'));
    expect(kinds.indexOf('combo')).toBeGreaterThan(kinds.lastIndexOf('marked'));
  });

  it.each(TRACKS)('should number %s entries consecutively across sets', (track) => {
    const orders = setsForTrack(track).flatMap((s) => s.entries.map((e) => e.order));
    expect(orders).toEqual(orders.map((_, i) => i + 1));
  });

  it('should label a set with its own first character, not a linguistics term', () => {
    expect(getSet('hira-a')!.label).toBe('あ');
    expect(getSet('kata-ka')!.label).toBe('カ');
    expect(getSet('hira-kya')!.label).toBe('きゃ');
  });

  it('should tag every entry with its set and track', () => {
    for (const set of KANA_SETS) {
      for (const entry of set.entries) {
        expect(entry.setId).toBe(set.id);
        expect(entry.track).toBe(set.track);
      }
    }
  });

  it('should give every character a mnemonic in both languages', () => {
    for (const kana of allKana()) {
      const { mnemonic } = getKanaEntry(kana)!;
      expect(mnemonic.en.length).toBeGreaterThan(0);
      expect(mnemonic.ja.length).toBeGreaterThan(0);
    }
  });

  it('should point marked and combo characters at the base they are built from', () => {
    expect(getKanaEntry('が')!.baseKana).toBe('か');
    expect(getKanaEntry('ぱ')!.baseKana).toBe('は');
    expect(getKanaEntry('きゃ')!.baseKana).toBe('き');
    expect(getKanaEntry('ジャ')!.baseKana).toBe('ジ');
    expect(getKanaEntry('あ')!.baseKana).toBeUndefined();
  });
});

describe('kana romaji', () => {
  // One direction only: the reverse (toKana(romaji) === kana) is deliberately
  // not asserted — it cannot hold for the duplicate-sound pairs below.
  it('should match wanakana for every character in both tracks', () => {
    for (const kana of allKana()) {
      expect(toRomaji(kana)).toBe(getKanaEntry(kana)!.romaji);
    }
  });

  it.each([
    ['ぢ', 'じ', 'ji'],
    ['づ', 'ず', 'zu'],
    ['ヂ', 'ジ', 'ji'],
    ['ヅ', 'ズ', 'zu'],
  ])('should let %s share the sound of %s (%s) — a round-trip could never', (a, b, romaji) => {
    expect(getKanaEntry(a)!.romaji).toBe(romaji);
    expect(getKanaEntry(b)!.romaji).toBe(romaji);
  });

  it('should romanize を as wo, the reading learners are taught', () => {
    expect(getKanaEntry('を')!.romaji).toBe('wo');
    expect(getKanaEntry('ヲ')!.romaji).toBe('wo');
  });

  it('should use Hepburn spellings for the irregular sounds', () => {
    const romaji = (k: string) => getKanaEntry(k)!.romaji;
    expect([romaji('し'), romaji('ち'), romaji('つ'), romaji('ふ')]).toEqual([
      'shi',
      'chi',
      'tsu',
      'fu',
    ]);
    expect([romaji('しゃ'), romaji('ちょ'), romaji('じゅ')]).toEqual(['sha', 'cho', 'ju']);
  });

  it('should give the two tracks matching sounds position for position', () => {
    const romaji = (track: KanaTrack) =>
      setsForTrack(track).flatMap((s) => s.entries.map((e) => e.romaji));
    expect(romaji('katakana')).toEqual(romaji('hiragana'));
  });
});

describe('lookups', () => {
  it('should find a set by id and nothing for an unknown one', () => {
    expect(getSet('hira-ka')!.entries).toHaveLength(5);
    expect(getSet('nope')).toBeUndefined();
    expect(getKanaEntry('X')).toBeUndefined();
  });

  it('should list only earlier sets of the same track for kanaBefore', () => {
    expect(kanaBefore('hira-a')).toEqual([]);
    expect(kanaBefore('hira-ka')).toEqual(['あ', 'い', 'う', 'え', 'お']);
    expect(kanaBefore('kata-ka')).toEqual(['ア', 'イ', 'ウ', 'エ', 'オ']);
    expect(kanaBefore('unknown')).toEqual([]);
  });

  it('should return all 208 characters when no track is given', () => {
    expect(allKana()).toHaveLength(208);
  });
});

describe('confusable characters', () => {
  it('should pair look-alikes both ways', () => {
    expect(confusablesFor('ね')).toEqual(expect.arrayContaining(['れ', 'わ']));
    expect(confusablesFor('わ')).toContain('ね');
    expect(confusablesFor('シ')).toContain('ツ');
    expect(confusablesFor('ツ')).toContain('シ');
    expect(confusablesFor('ン')).toEqual(expect.arrayContaining(['ソ', 'ノ']));
  });

  it('should never list a character as its own look-alike', () => {
    for (const kana of allKana()) expect(confusablesFor(kana)).not.toContain(kana);
  });

  it('should only name characters that are in the curriculum', () => {
    const known = new Set(allKana());
    for (const kana of allKana()) {
      for (const other of confusablesFor(kana)) expect(known.has(other)).toBe(true);
    }
  });

  it('should have nothing to say about a character with no look-alikes', () => {
    expect(confusablesFor('ぴょ')).toEqual([]);
  });
});

describe('segmentReading', () => {
  it('should split a plain reading into its characters', () => {
    expect(segmentReading('ねこ')).toEqual(['ね', 'こ']);
  });

  it('should keep a combination sound whole', () => {
    expect(segmentReading('きゃく')).toEqual(['きゃ', 'く']);
    expect(segmentReading('りょこう')).toEqual(['りょ', 'こ', 'う']);
    expect(segmentReading('ジュース')).toEqual(['ジュ', 'ス']);
  });

  it('should read a dakuten character as its own entry, not its base', () => {
    expect(segmentReading('がっこう')).toEqual(['が', 'つ', 'こ', 'う']);
    expect(segmentReading('ぱん')).toEqual(['ぱ', 'ん']);
  });

  it('should count the small tsu as the row tsu lives in', () => {
    expect(segmentReading('きって')).toEqual(['き', 'つ', 'て']);
    expect(segmentReading('カップ')).toEqual(['カ', 'ツ', 'プ']);
  });

  it('should skip the katakana long vowel mark rather than report it', () => {
    expect(segmentReading('コーヒー')).toEqual(['コ', 'ヒ']);
  });

  it('should treat a written-out long vowel as ordinary characters', () => {
    expect(segmentReading('おかあさん')).toEqual(['お', 'か', 'あ', 'さ', 'ん']);
  });

  it('should silently drop anything with no curriculum entry', () => {
    expect(segmentReading('ね こ・新')).toEqual(['ね', 'こ']);
    expect(segmentReading('ファン')).toEqual(['フ', 'ン']);
    expect(segmentReading('')).toEqual([]);
  });

  it('should map every character it emits to a curriculum row', () => {
    const readings = ['きゃく', 'がっこう', 'コーヒー', 'ぴょん', 'じゃあ', 'カップ'];
    for (const reading of readings) {
      for (const kana of segmentReading(reading)) {
        expect(kanaSetForChar(kana)).not.toBeNull();
      }
    }
  });
});

describe('kanaSetForChar', () => {
  it('should name the row a character belongs to', () => {
    expect(kanaSetForChar('き')).toBe('hira-ka');
    expect(kanaSetForChar('きゃ')).toBe('hira-kya');
    expect(kanaSetForChar('ヲ')).toBe('kata-wa');
  });

  it('should send the small tsu to the ta row', () => {
    expect(kanaSetForChar('っ')).toBe(kanaSetForChar('つ'));
    expect(kanaSetForChar('ッ')).toBe(kanaSetForChar('ツ'));
  });

  it('should have nothing to say about a non-curriculum character', () => {
    expect(kanaSetForChar('ー')).toBeNull();
    expect(kanaSetForChar('新')).toBeNull();
  });
});

describe('orderKanaSets', () => {
  it('should return the named rows in curriculum order, hiragana first', () => {
    expect(orderKanaSets(['kata-a', 'hira-ka', 'hira-a']).map((s) => s.id)).toEqual([
      'hira-a',
      'hira-ka',
      'kata-a',
    ]);
  });

  it('should ignore an id that names no row', () => {
    expect(orderKanaSets(['nope']).length).toBe(0);
  });
});

describe('kanaDifficulty', () => {
  it('should rank plain rows below marked rows below combination sounds', () => {
    expect(kanaDifficulty('か')).toBeLessThan(kanaDifficulty('が'));
    expect(kanaDifficulty('が')).toBeLessThan(kanaDifficulty('ぎゃ'));
  });

  it('should add to a character that has look-alikes', () => {
    expect(kanaDifficulty('ね')).toBeGreaterThan(kanaDifficulty('な'));
    expect(kanaDifficulty('シ')).toBeGreaterThan(kanaDifficulty('サ'));
  });

  it('should add to a character beginner words hardly ever use', () => {
    expect(kanaDifficulty('む')).toBeGreaterThan(kanaDifficulty('ま'));
  });

  it('should read the small tsu as the row it belongs to', () => {
    expect(kanaDifficulty('っ')).toBe(kanaDifficulty('つ'));
  });

  it('should stay inside 0 and 1, and stay neutral about an unknown character', () => {
    expect(allKana().every((k) => kanaDifficulty(k) >= 0 && kanaDifficulty(k) <= 1)).toBe(true);
    expect(kanaDifficulty('新')).toBe(0.5);
  });
});
