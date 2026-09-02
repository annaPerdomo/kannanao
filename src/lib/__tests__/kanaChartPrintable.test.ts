import { describe, expect, it } from 'vitest';

import {
  buildGroupKanaChartHtml,
  buildKanaChartPrintableHtml,
  buildKanjiSheetHtml,
  type GroupKanaCoverage,
  type KanaSheetLabels,
  type KanaSheetScript,
} from '@/lib/kanaChartPrintable';
import type { PlanDeck } from '@/types/lessonPlan';

const LABELS: KanaSheetLabels = {
  title: 'Kana chart',
  hint: 'Read each column downwards.',
  name: 'Name',
  date: 'Date',
  markedBlock: 'Sounds with marks',
  comboBlock: 'Two-part sounds',
  contextualBlock: 'Sound changers',
  contextual: { littleTsu: 'little tsu', longSound: 'long sound' },
};

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

function sheet(
  script: KanaSheetScript,
  overrides: { romaji?: boolean; blank?: boolean } = {},
): Document {
  return parse(
    buildKanaChartPrintableHtml({
      locale: 'en',
      options: { script, romaji: overrides.romaji ?? true, blank: overrides.blank ?? false },
      labels: LABELS,
    }),
  );
}

function grids(doc: Document): HTMLTableElement[] {
  return [...doc.querySelectorAll<HTMLTableElement>('table.grid')];
}

function rowGlyphs(table: HTMLTableElement, rowIndex: number): (string | null)[] {
  const row = table.querySelectorAll('tr')[rowIndex];
  return [...row.querySelectorAll('td')].map((td) =>
    td.classList.contains('gap') ? null : (td.querySelector('.glyph')?.textContent ?? ''),
  );
}

describe('buildKanaChartPrintableHtml', () => {
  it('prints the gojūon columns ん → あ, matching the chart on screen', () => {
    const base = grids(sheet('hiragana'))[0];

    expect(base.querySelectorAll('th.colhead')).toHaveLength(0);
    expect(rowGlyphs(base, 0)).toEqual([
      'ん',
      'わ',
      'ら',
      'や',
      'ま',
      'は',
      'な',
      'た',
      'さ',
      'か',
      'あ',
    ]);
  });

  it('keeps the holes in the や and わ columns as real gaps', () => {
    const base = grids(sheet('hiragana'))[0];

    expect(rowGlyphs(base, 1)).toEqual([
      null,
      null,
      'り',
      null,
      'み',
      'ひ',
      'に',
      'ち',
      'し',
      'き',
      'い',
    ]);
    // を sits in the わ column's お slot; ん has only its first row.
    expect(rowGlyphs(base, 4)).toEqual([
      null,
      'を',
      'ろ',
      'よ',
      'も',
      'ほ',
      'の',
      'と',
      'そ',
      'こ',
      'お',
    ]);
  });

  it('prints the marked, combination and contextual blocks', () => {
    const doc = sheet('katakana');
    const titles = [...doc.querySelectorAll('section.block h2')].map((h) => h.textContent);

    expect(titles).toEqual(['Sounds with marks', 'Two-part sounds', 'Sound changers']);
    expect(rowGlyphs(grids(doc)[1], 0)).toEqual(['パ', 'バ', 'ダ', 'ザ', 'ガ']);
    expect(rowGlyphs(grids(doc)[2], 0)).toEqual([
      'ピャ',
      'ビャ',
      'ジャ',
      'ギャ',
      'リャ',
      'ミャ',
      'ヒャ',
      'ニャ',
      'チャ',
      'シャ',
      'キャ',
    ]);
  });

  it('labels the contextual strip in words and leaves it in reading order', () => {
    const strip = grids(sheet('katakana')).at(-1)!;
    const cells = [...strip.querySelectorAll('td.cell')];

    expect(cells.map((td) => td.querySelector('.glyph')?.textContent)).toEqual(['ッ', 'ー']);
    expect(cells.map((td) => td.querySelector('.romaji')?.textContent)).toEqual([
      'little tsu',
      'long sound',
    ]);
  });

  it('drops every romaji caption when romaji is off', () => {
    expect(sheet('hiragana', { romaji: false }).querySelectorAll('.romaji')).toHaveLength(0);
    expect(sheet('hiragana').querySelectorAll('.romaji').length).toBeGreaterThan(0);
  });

  it('blanks the glyphs but keeps the geometry and the romaji prompts', () => {
    const blank = sheet('hiragana', { blank: true });
    const full = sheet('hiragana');

    expect(blank.querySelectorAll('td.cell')).toHaveLength(full.querySelectorAll('td.cell').length);
    expect(blank.querySelectorAll('td.gap')).toHaveLength(full.querySelectorAll('td.gap').length);
    expect([...blank.querySelectorAll('.glyph')].every((el) => !el.textContent?.trim())).toBe(true);
    expect(blank.querySelector('.romaji')?.textContent).toBe('n');
  });

  it('stacks both scripts in one cell only for the comparison variant', () => {
    const both = grids(sheet('both'))[0];

    expect(rowGlyphs(both, 0)[10]).toBe('あア');
    expect(rowGlyphs(both, 1)[10]).toBe('いイ');
    expect(rowGlyphs(grids(sheet('hiragana'))[0], 1)[10]).toBe('い');
  });

  it('pairs the contextual characters and keeps katakana ー, which hiragana has no cell for', () => {
    const strip = grids(sheet('both')).at(-1)!;

    expect([...strip.querySelectorAll('.glyph')].map((el) => el.textContent)).toEqual([
      'っッ',
      'ー',
    ]);
  });

  it('stacks a paired combination sound instead of letting it wrap mid-script', () => {
    const combo = grids(sheet('both'))[2];
    const cell = combo.querySelectorAll('tr')[0].querySelectorAll('td')[10];

    expect(cell.querySelector('.glyph')?.innerHTML).toBe('きゃ<br>キャ');
    expect(grids(sheet('both'))[0].querySelectorAll('.glyph')[0].innerHTML).toBe('んン');
  });

  it('omits the name line the learner sheet has nothing to hand in for', () => {
    const bare = parse(
      buildKanaChartPrintableHtml({
        locale: 'en',
        options: { script: 'hiragana', romaji: true, blank: false },
        labels: { ...LABELS, name: undefined, date: undefined },
      }),
    );

    expect(bare.querySelector('.nameline')).toBeNull();
    expect(sheet('hiragana').querySelector('.nameline')?.textContent).toContain('Name');
  });
});

const COVERAGE: GroupKanaCoverage = {
  learnerCount: 4,
  knownByKana: { あ: 4, い: 2, う: 0 },
};

const GROUP_LABELS = {
  ...LABELS,
  title: 'Kana your group can read',
  legend: 'Each bar shows how many of 4 learners read that character.',
  trackTitle: { hiragana: 'Hiragana', katakana: 'Katakana' },
};

function groupSheet(script: KanaSheetScript): Document {
  return parse(
    buildGroupKanaChartHtml({ locale: 'en', script, coverage: COVERAGE, labels: GROUP_LABELS }),
  );
}

describe('buildGroupKanaChartHtml', () => {
  it('marks each cell with the roster fraction that reads it', () => {
    const base = grids(groupSheet('hiragana'))[0];
    const column = (row: number) =>
      [...base.querySelectorAll('tr')[row].querySelectorAll('td')][10];

    expect(column(0).querySelector('.cover')?.textContent).toBe('4/4');
    expect(column(1).querySelector('.cover')?.textContent).toBe('2/4');
    // Never answered by anyone: an absent progress row is zero, not unknown.
    expect(column(2).querySelector('.cover')?.textContent).toBe('0/4');
    expect(column(0).querySelector('.bar i')?.getAttribute('style')).toBe('width:100%');
    expect(column(1).querySelector('.bar i')?.getAttribute('style')).toBe('width:50%');
  });

  it('prints one page per script rather than stacking coverage in a cell', () => {
    expect(groupSheet('hiragana').querySelectorAll('.sheet')).toHaveLength(1);

    const both = groupSheet('both');
    expect(both.querySelectorAll('.sheet')).toHaveLength(2);
    expect([...both.querySelectorAll('.sheet h1')].map((h) => h.textContent)).toEqual([
      'Kana your group can read — Hiragana',
      'Kana your group can read — Katakana',
    ]);
  });

  it('leaves out the contextual strip, which no learner has a progress row for', () => {
    const doc = groupSheet('hiragana');

    expect(doc.body.textContent).not.toContain('Sound changers');
    expect(doc.querySelectorAll('table.grid.strip')).toHaveLength(0);
    expect(grids(sheet('hiragana'))).toHaveLength(grids(doc).length + 1);
  });

  it('carries the legend and no per-learner detail', () => {
    const doc = groupSheet('hiragana');

    expect(doc.querySelector('.legend')?.textContent).toContain('4 learners');
    expect(doc.body.textContent).not.toContain('/4 ');
  });
});

const KANJI_LABELS = {
  title: 'Kanji writing sheet',
  name: 'Name',
  date: 'Date',
  empty: 'No words in this plan are written with kanji.',
};

function deck(cards: PlanDeck['cards']): PlanDeck {
  return { name: 'Week one', description: '', emoji: '📘', mainViewMode: 'kanji', cards };
}

function card(word: string, reading: string, meaning: string): PlanDeck['cards'][number] {
  return { word, reading, meaning, exampleJp: '', exampleEn: '', jlptLevel: 'N5' };
}

function kanjiSheet(weeks: { heading: string; deck: PlanDeck }[]): Document {
  return parse(buildKanjiSheetHtml({ locale: 'en', weeks, labels: KANJI_LABELS }));
}

describe('buildKanjiSheetHtml', () => {
  it('skips words with no kanji and rubies the ones that have some', () => {
    const doc = kanjiSheet([
      {
        heading: 'Week 1',
        deck: deck([
          card('寿司', 'すし', 'sushi'),
          card('すし', 'すし', 'sushi'),
          card('コーヒー', 'こーひー', 'coffee'),
          card('食べる', 'たべる', 'to eat'),
        ]),
      },
    ]);
    const cards = [...doc.querySelectorAll('.card')];

    expect(cards.map((el) => el.querySelector('.word')?.textContent)).toEqual([
      '寿司すし',
      '食たべる',
    ]);
    expect(cards[1].querySelector('.word ruby rt')?.textContent).toBe('た');
    expect(cards[0].querySelectorAll('.boxes span')).toHaveLength(3);
    expect(cards[0].querySelector('.meaning')?.textContent).toBe('sushi');
  });

  it('gives each week its own page and skips a week with no kanji at all', () => {
    const doc = kanjiSheet([
      { heading: 'Week 1', deck: deck([card('寿司', 'すし', 'sushi')]) },
      { heading: 'Week 2', deck: deck([card('すし', 'すし', 'sushi')]) },
    ]);

    expect([...doc.querySelectorAll('.sheet h1')].map((h) => h.textContent)).toEqual(['Week 1']);
  });

  it('says so rather than printing an empty page when the plan has no kanji', () => {
    const doc = kanjiSheet([{ heading: 'Week 1', deck: deck([card('すし', 'すし', 'sushi')]) }]);

    expect(doc.querySelectorAll('.card')).toHaveLength(0);
    expect(doc.querySelector('.empty')?.textContent).toBe(KANJI_LABELS.empty);
  });
});
