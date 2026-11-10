import { describe, expect, it } from 'vitest';

import {
  buildReadingCheckHtml,
  gapIndex,
  hasReadingCheckContent,
  judgeSection,
  MAX_CHECK_WORDS,
  type ReadingCheckLabels,
} from '@/lib/readingCheckPrintable';
import type { LessonPlan, PlanCard } from '@/types/lessonPlan';

const labels: ReadingCheckLabels = {
  title: 'Reading check',
  name: 'Name',
  date: 'Date',
  judgeHeading: 'Right or wrong',
  judgeHint: 'hint',
  judgeRight: 'correct',
  gapHeading: 'Missing letter',
  gapHint: 'hint',
  writeHeading: 'Write',
  writeHint: 'hint',
  answerKey: 'Answer key',
  empty: 'No kanji words',
};

const card = (word: string, reading: string): PlanCard => ({
  word,
  reading,
  meaning: `${word} meaning`,
  exampleJp: '',
  exampleEn: '',
  jlptLevel: null,
});

const plan = (cards: PlanCard[]): LessonPlan => ({
  decks: [{ name: 'Week 1', description: '', emoji: '', mainViewMode: 'kanji', cards }],
});

const kanjiPlan = plan([
  card('学校', 'がっこう'),
  card('先生', 'せんせい'),
  card('水', 'みず'),
  card('ねこ', 'ねこ'),
]);

const build = (p: LessonPlan, answerKey = true, seed = 1) =>
  buildReadingCheckHtml({ locale: 'en', plan: p, labels, seed, answerKey });

describe('hasReadingCheckContent', () => {
  it('needs a word written with kanji', () => {
    expect(hasReadingCheckContent(kanjiPlan)).toBe(true);
    expect(hasReadingCheckContent(plan([card('ねこ', 'ねこ')]))).toBe(false);
  });
});

describe('buildReadingCheckHtml', () => {
  it('asks only the kanji words, once in each exercise', () => {
    const html = build(kanjiPlan, false);
    expect(html.match(/class="judge"/g)).toHaveLength(3);
    expect(html.match(/class="gap"/g)).toHaveLength(3);
    expect(html.match(/class="write"/g)).toHaveLength(3);
    expect(html).not.toContain('ねこ');
  });

  it('prints the right reading for every written question in the key', () => {
    const html = build(kanjiPlan);
    const key = html.slice(html.lastIndexOf('Answer key'));
    for (const reading of ['がっこう', 'せんせい', 'みず']) expect(key).toContain(reading);
    expect(build(kanjiPlan, false)).not.toContain('Answer key');
  });

  it('caps a long deck', () => {
    const many = plan(
      Array.from({ length: 30 }, (_, i) =>
        card(`${'一二三四五六七八九十'[i % 10]}${i}校`, 'がっこう'),
      ),
    );
    expect(build(many, false).match(/class="write"/g)).toHaveLength(MAX_CHECK_WORDS);
  });

  it('escapes deck names and words', () => {
    const html = build(plan([card('<水>', 'みず')]));
    expect(html).not.toContain('<水>');
    expect(html).toContain('&lt;水&gt;');
  });

  it('says so when no word has kanji', () => {
    expect(build(plan([card('ねこ', 'ねこ')]))).toContain('No kanji words');
  });
});

describe('judgeSection', () => {
  const words = ['がっこう', 'せんせい', 'みず', 'げつようび', 'しがつ'].map((reading) => ({
    promptHtml: 'x',
    word: 'x',
    reading,
  }));

  it('never leaves a page with nothing right on it', () => {
    for (let seed = 0; seed < 40; seed++) {
      const { key } = judgeSection(words, seed, 'correct');
      expect(key.some((entry) => entry.answer.startsWith('○'))).toBe(true);
    }
  });

  it('keys a wrong spelling with the right one', () => {
    const wrong = Array.from({ length: 40 }, (_, seed) => judgeSection(words, seed, 'correct').key)
      .flat()
      .filter((entry) => entry.answer.startsWith('×'));
    expect(wrong.length).toBeGreaterThan(0);
    for (const entry of wrong) {
      expect(words.map((w) => `× → ${w.reading}`)).toContain(entry.answer);
    }
  });
});

describe('gapIndex', () => {
  it('hides a trap letter when the word has one', () => {
    expect([...'げつようび'][gapIndex('げつようび', 1)]).toBe('げ');
    expect('っう').toContain([...'がっこう'][gapIndex('がっこう', 3)]);
  });

  it('never hides part of the fixed ending', () => {
    for (let seed = 0; seed < 20; seed++) expect(gapIndex('しがつ', seed)).toBe(0);
  });
});
