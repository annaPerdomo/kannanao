import { describe, expect, it } from 'vitest';

import {
  buildKanjiSheetHtml,
  type KanjiSheetLabels,
  type KanjiSheetOptions,
  PRACTICE_BOXES,
  TRACE_BOXES,
} from '@/lib/kanjiSheetPrintable';
import type { KanjiStrokes } from '@/lib/kanjiStrokes';
import type { PlanDeck } from '@/types/lessonPlan';

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

const KANJI_LABELS: KanjiSheetLabels = {
  title: 'Kanji writing sheet',
  name: 'Name',
  date: 'Date',
  empty: 'No words in this plan are written with kanji.',
  strokeCount: (count) => `${count} strokes`,
  watch: 'See it move:',
  credit: 'Stroke order: KanjiVG by Ulrich Apel (CC BY-SA 3.0)',
};

const DEFAULT_OPTIONS: KanjiSheetOptions = { furigana: true, strokeOrder: true };

function deck(cards: PlanDeck['cards']): PlanDeck {
  return { name: 'Week one', description: '', emoji: '📘', mainViewMode: 'kanji', cards };
}

function card(word: string, reading: string, meaning: string): PlanDeck['cards'][number] {
  return { word, reading, meaning, exampleJp: '', exampleEn: '', jlptLevel: 'N5' };
}

function strokesFor(count: number): KanjiStrokes {
  return {
    strokes: Array.from({ length: count }, (_, i) => `M${i} 0 L${i} 10`),
    numbers: Array.from({ length: count }, (_, i) => ({ n: i + 1, x: i, y: i })),
  };
}

function kanjiSheet(
  weeks: { heading: string; deck: PlanDeck }[],
  options: KanjiSheetOptions = DEFAULT_OPTIONS,
  strokes: Map<string, KanjiStrokes> = new Map(),
): Document {
  return parse(
    buildKanjiSheetHtml({ locale: 'en', weeks, labels: KANJI_LABELS, options, strokes }),
  );
}

describe('buildKanjiSheetHtml', () => {
  it('prints one kanji-row per kanji in a two-kanji word, each with exactly PRACTICE_BOXES boxes', () => {
    const strokes = new Map([
      ['食', strokesFor(9)],
      ['堂', strokesFor(11)],
    ]);
    const doc = kanjiSheet(
      [{ heading: 'Week 1', deck: deck([card('食堂', 'しょくどう', 'cafeteria')]) }],
      DEFAULT_OPTIONS,
      strokes,
    );

    const rows = [...doc.querySelectorAll('.kanji-row')];
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.querySelectorAll('.practicebox')).toHaveLength(PRACTICE_BOXES);
    }
  });

  it('marks exactly TRACE_BOXES boxes per row with trace marks, grey paths with data', () => {
    const strokes = new Map([['食', strokesFor(9)]]);
    const doc = kanjiSheet(
      [{ heading: 'Week 1', deck: deck([card('食べる', 'たべる', 'to eat')]) }],
      DEFAULT_OPTIONS,
      strokes,
    );

    const boxes = [...doc.querySelectorAll('.practicebox')];
    const traced = boxes.filter((box) => box.querySelector('path[stroke="#c8c8c8"]'));
    expect(traced).toHaveLength(TRACE_BOXES);
  });

  it('marks TRACE_BOXES boxes with grey text when no stroke data exists', () => {
    const doc = kanjiSheet([
      { heading: 'Week 1', deck: deck([card('食べる', 'たべる', 'to eat')]) },
    ]);

    const boxes = [...doc.querySelectorAll('.practicebox')];
    const traced = boxes.filter((box) => {
      const text = box.querySelector('text[fill="#c8c8c8"]');
      return text?.textContent === '食';
    });
    expect(traced).toHaveLength(TRACE_BOXES);
  });

  it('gives a kanji shared by two words on the same week one row, but prints both word lines', () => {
    const doc = kanjiSheet([
      {
        heading: 'Week 1',
        deck: deck([card('食堂', 'しょくどう', 'cafeteria'), card('食べる', 'たべる', 'to eat')]),
      },
    ]);

    expect(doc.querySelectorAll('.card')).toHaveLength(2);
    expect(doc.querySelectorAll('.kanji-row')).toHaveLength(2);
    const words = [...doc.querySelectorAll('.word')].map((w) => w.textContent);
    expect(words).toEqual(['食堂しょくどう', '食たべる']);
  });

  it('shows ruby and the reading line only when furigana is on', () => {
    const withFurigana = kanjiSheet([
      { heading: 'Week 1', deck: deck([card('食べる', 'たべる', 'to eat')]) },
    ]);
    expect(withFurigana.querySelector('.word ruby')).not.toBeNull();
    expect(withFurigana.querySelector('.reading')?.textContent).toBe('たべる');

    const withoutFurigana = kanjiSheet(
      [{ heading: 'Week 1', deck: deck([card('食べる', 'たべる', 'to eat')]) }],
      { furigana: false, strokeOrder: true },
    );
    expect(withoutFurigana.querySelector('.word ruby')).toBeNull();
    expect(withoutFurigana.querySelector('.word')?.textContent).toBe('食べる');
    expect(withoutFurigana.querySelector('.reading')).toBeNull();
  });

  it('prints one .order frame per stroke and stroke numbers on the model only when strokeOrder is on', () => {
    const strokes = new Map([['食', strokesFor(9)]]);
    const on = kanjiSheet(
      [{ heading: 'Week 1', deck: deck([card('食べる', 'たべる', 'to eat')]) }],
      { furigana: true, strokeOrder: true },
      strokes,
    );
    expect(on.querySelectorAll('.order .frame')).toHaveLength(9);
    expect(on.querySelector('.model text[fill="#808080"]')).not.toBeNull();

    const off = kanjiSheet(
      [{ heading: 'Week 1', deck: deck([card('食べる', 'たべる', 'to eat')]) }],
      { furigana: true, strokeOrder: false },
      strokes,
    );
    expect(off.querySelectorAll('.order')).toHaveLength(0);
    expect(off.querySelector('.model text[fill="#808080"]')).toBeNull();
  });

  it('falls back to the font glyph with no stroke count or order strip when there is no data, but keeps the Kanji Alive link', () => {
    const doc = kanjiSheet([
      { heading: 'Week 1', deck: deck([card('実家', 'じっか', 'parents home')]) },
    ]);

    expect(doc.querySelectorAll('.order')).toHaveLength(0);
    expect(doc.querySelectorAll('.strokecount')).toHaveLength(0);
    expect(doc.querySelector('.model text')?.textContent).toBe('実');
    const link = doc.querySelector('.watch a');
    expect(link?.getAttribute('href')).toContain('%E5%AE%9F');
  });

  it('prints the credit line only when a printed kanji used stroke data', () => {
    const strokes = new Map([['食', strokesFor(9)]]);
    const withData = kanjiSheet(
      [{ heading: 'Week 1', deck: deck([card('食べる', 'たべる', 'to eat')]) }],
      DEFAULT_OPTIONS,
      strokes,
    );
    expect(withData.querySelector('.credit')?.textContent).toBe(KANJI_LABELS.credit);

    const withoutData = kanjiSheet([
      { heading: 'Week 1', deck: deck([card('食べる', 'たべる', 'to eat')]) },
    ]);
    expect(withoutData.querySelector('.credit')).toBeNull();
  });

  it('puts the credit line inside the last sheet, not after it', () => {
    const strokes = new Map([['食', strokesFor(9)]]);
    const doc = kanjiSheet(
      [
        { heading: 'Week 1', deck: deck([card('すし', 'すし', 'sushi')]) },
        { heading: 'Week 2', deck: deck([card('食べる', 'たべる', 'to eat')]) },
      ],
      DEFAULT_OPTIONS,
      strokes,
    );

    expect(doc.querySelectorAll('.sheet')).toHaveLength(1);
    expect(doc.querySelector('.sheet:last-of-type .credit')).not.toBeNull();
  });

  it('escapes card fields', () => {
    const doc = kanjiSheet([
      { heading: 'Week 1', deck: deck([card('食べる', 'たべる', '<b>to eat</b>')]) },
    ]);
    expect(doc.querySelector('.meaning')?.textContent).toBe('<b>to eat</b>');
    expect(doc.querySelector('.meaning')?.querySelector('b')).toBeNull();
  });

  it('says so rather than printing an empty page when the plan has no kanji', () => {
    const doc = kanjiSheet([{ heading: 'Week 1', deck: deck([card('すし', 'すし', 'sushi')]) }]);

    expect(doc.querySelectorAll('.card')).toHaveLength(0);
    expect(doc.querySelector('.empty')?.textContent).toBe(KANJI_LABELS.empty);
  });

  it('treats a mixed-script word with no kanji the same as a pure-kana one', () => {
    const doc = kanjiSheet([
      { heading: 'Week 1', deck: deck([card('Tシャツ', 'てぃーしゃつ', 't-shirt')]) },
    ]);

    expect(doc.querySelectorAll('.card')).toHaveLength(0);
    expect(doc.querySelector('.empty')?.textContent).toBe(KANJI_LABELS.empty);
  });
});
