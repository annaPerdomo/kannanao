import { describe, expect, it } from 'vitest';

import { buildLessonPrintableHtml, furiganaToRubyHtml } from '@/lib/lessonPrintable';
import type { PlanDeck } from '@/types/lessonPlan';

const LABELS = {
  name: 'Name',
  date: 'Date',
  word: 'Word',
  reading: 'Reading',
  meaning: 'Meaning',
  example: 'Example',
};

const DECK: PlanDeck = {
  name: 'Food words',
  description: 'Ordering at a restaurant',
  emoji: '🍜',
  mainViewMode: 'kanji',
  cards: [
    {
      word: '寿司',
      reading: 'すし',
      meaning: 'sushi',
      exampleJp: '{寿司|すし}を{食|た}べます',
      exampleEn: 'I eat sushi',
      jlptLevel: 'N5',
    },
  ],
};

function build(variant: 'study' | 'quiz', deck: PlanDeck = DECK) {
  return buildLessonPrintableHtml({
    title: 'Study sheets',
    locale: 'en',
    variant,
    weeks: [{ heading: 'Week 1 — Food words', deck }],
    labels: LABELS,
  });
}

describe('furiganaToRubyHtml', () => {
  it('turns markup into ruby and escapes plain text', () => {
    expect(furiganaToRubyHtml('{猫|ねこ}が<好き>')).toBe(
      '<ruby>猫<rt>ねこ</rt></ruby>が&lt;好き&gt;',
    );
  });
});

describe('buildLessonPrintableHtml', () => {
  it('study sheets carry ruby words, meanings and both example lines', () => {
    const html = build('study');

    expect(html).toContain('<ruby>寿司<rt>すし</rt></ruby>');
    expect(html).toContain('sushi');
    expect(html).toContain('<ruby>食<rt>た</rt></ruby>');
    expect(html).toContain('I eat sushi');
    expect(html).toContain('Week 1 — Food words');
    expect(html).toContain('Ordering at a restaurant');
  });

  it('quiz sheets show the plain word and leave reading and meaning blank', () => {
    const html = build('quiz');

    expect(html).toContain('寿司');
    expect(html).not.toContain('<ruby>');
    expect(html).not.toContain('sushi');
    expect(html).toContain('class="blank"');
  });

  it('escapes hostile field content', () => {
    const html = build('study', {
      ...DECK,
      description: '<script>alert(1)</script>',
      cards: [{ ...DECK.cards[0], meaning: '<img src=x onerror=alert(1)>' }],
    });

    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
  });
});
