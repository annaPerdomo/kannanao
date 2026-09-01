import { describe, expect, it } from 'vitest';

import { buildLessonPrintableHtml, furiganaToRubyHtml } from '@/lib/lessonPrintable';
import type { PlanDeck, WarmUpWord } from '@/types/lessonPlan';

const LABELS = {
  name: 'Name',
  date: 'Date',
  word: 'Word',
  reading: 'Reading',
  meaning: 'Meaning',
  example: 'Example',
  warmUpTitle: 'Warm-up review',
  warmUpHint: 'Words your group already knows.',
  deck: 'Deck',
  kanaTitle: 'Sounds in this lesson',
  kanaHint: 'Just the rows this lesson uses.',
};

const WARM_UP: WarmUpWord[] = [
  { word: '学校', reading: 'がっこう', meaning: 'school', deckName: 'Basics', addedAt: null },
];

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

function build(variant: 'study' | 'quiz', deck: PlanDeck = DECK, warmUp?: WarmUpWord[]) {
  return buildLessonPrintableHtml({
    title: 'Study sheets',
    locale: 'en',
    variant,
    weeks: [{ heading: 'Week 1 — Food words', deck }],
    labels: LABELS,
    warmUp,
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

describe('warm-up section', () => {
  it('study sheets show the warm-up title, hint, words, meanings and decks before the first week', () => {
    const html = build('study', DECK, WARM_UP);

    expect(html).toContain('class="warmup"');
    expect(html).toContain('Warm-up review');
    expect(html).toContain('Words your group already knows.');
    expect(html).toContain('>Deck<');
    expect(html).toContain('<ruby>学校<rt>がっこう</rt></ruby>');
    expect(html).toContain('school');
    expect(html).toContain('Basics');
    expect(html.indexOf('class="warmup"')).toBeLessThan(html.indexOf('class="week"'));
  });

  it('quiz sheets never show the warm-up section', () => {
    const html = build('quiz', DECK, WARM_UP);

    expect(html).not.toContain('class="warmup"');
    expect(html).not.toContain('Warm-up review');
  });

  it('study sheets with no warm-up entries omit the section', () => {
    expect(build('study', DECK, [])).not.toContain('class="warmup"');
    expect(build('study', DECK, undefined)).not.toContain('class="warmup"');
  });

  it('escapes hostile warm-up content', () => {
    const html = build('study', DECK, [
      {
        word: '<script>alert(1)</script>',
        reading: '',
        meaning: '<img src=x onerror=alert(1)>',
        deckName: '<script>alert(2)</script>',
        addedAt: null,
      },
    ]);

    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;script&gt;alert(2)&lt;/script&gt;');
  });
});

describe('the kana reference page', () => {
  function html(kanaSets?: string[]) {
    return buildLessonPrintableHtml({
      title: 'Study sheets',
      locale: 'en',
      variant: 'study',
      weeks: [{ heading: 'Week 1 — Food words', deck: DECK }],
      labels: LABELS,
      kanaSets,
    });
  }

  it('should be left out unless rows are named', () => {
    expect(html()).not.toContain('Sounds in this lesson');
    expect(html([])).not.toContain('Sounds in this lesson');
  });

  it('should print only the rows the lesson uses, not the whole chart', () => {
    const out = html(['hira-ra']);
    expect(out).toContain('Sounds in this lesson');
    for (const kana of ['ら', 'り', 'る', 'れ', 'ろ']) expect(out).toContain(kana);
    expect(out).not.toContain('>か<');
    expect(out).not.toContain('ぴょ');
  });

  it('should print the rows in curriculum order whatever order they arrive in', () => {
    const out = html(['kata-a', 'hira-ka']);
    expect(out.indexOf('>か<')).toBeLessThan(out.indexOf('>ア<'));
  });

  it('should give every character its romaji', () => {
    expect(html(['hira-ra'])).toContain('>ri<');
  });
});
