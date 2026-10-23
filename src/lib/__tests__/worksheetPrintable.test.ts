import { describe, expect, it } from 'vitest';

import {
  blankSentenceHtml,
  buildWorksheetHtml,
  hasWorksheetContent,
  type WorksheetLabels,
  type WorksheetOptions,
} from '@/lib/worksheetPrintable';
import type { LessonPlan, PlanCard, PlanDeck } from '@/types/lessonPlan';

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

const LABELS: WorksheetLabels = {
  title: 'Worksheet',
  name: 'Name',
  date: 'Date',
  matchHeading: 'Match',
  matchHint: 'Write the letter of the meaning next to each word.',
  blankHeading: 'Fill in the blank',
  blankHint: 'Pick a word from the box for each sentence.',
  wordBank: 'Word box',
  answerKey: 'Answer key',
};

const DEFAULT_OPTIONS: WorksheetOptions = { furigana: true, answerKey: true };

function card(overrides: Partial<PlanCard> = {}): PlanCard {
  return {
    word: '食べる',
    reading: 'たべる',
    meaning: 'to eat',
    exampleJp: '',
    exampleEn: '',
    jlptLevel: 'N5',
    ...overrides,
  };
}

function deck(overrides: Partial<PlanDeck> = {}): PlanDeck {
  return {
    name: 'Week one',
    description: '',
    emoji: '📘',
    mainViewMode: 'kanji',
    cards: [card()],
    ...overrides,
  };
}

function eightCards(): PlanCard[] {
  const words = ['食べる', '飲む', '行く', '来る', '見る', '聞く', '話す', '読む'];
  return words.map((word, i) => card({ word, reading: word, meaning: `meaning ${i}` }));
}

describe('blankSentenceHtml', () => {
  it('blanks the answer in plain text', () => {
    const html = blankSentenceHtml('わたしは食べるのが好きです', '食べる', false);
    expect(html).toBe('わたしは<span class="blank">（　　　　　）</span>のが好きです');
  });

  it('drops a ruby segment overlapping the answer into the blank', () => {
    const html = blankSentenceHtml('わたしは{食|た}べます', '食べ', true);
    expect(html).toBe('わたしは<span class="blank">（　　　　　）</span>ます');
  });

  it('keeps ruby outside the answer when furigana is on', () => {
    const html = blankSentenceHtml('{今日|きょう}は食べます', '食べ', true);
    expect(html).toBe(
      '<ruby>今日<rt>きょう</rt></ruby>は<span class="blank">（　　　　　）</span>ます',
    );
  });

  it('strips ruby outside the answer when furigana is off', () => {
    const html = blankSentenceHtml('{今日|きょう}は食べます', '食べ', false);
    expect(html).toBe('今日は<span class="blank">（　　　　　）</span>ます');
  });

  it('falls back to the reading when the word form is absent', () => {
    expect(blankSentenceHtml('たべますか', '食べる', false)).toBeNull();
    expect(blankSentenceHtml('たべますか', 'たべ', false)).toBe(
      '<span class="blank">（　　　　　）</span>ますか',
    );
  });

  it('returns null when the answer is empty or not found', () => {
    expect(blankSentenceHtml('わたしは食べます', '', false)).toBeNull();
    expect(blankSentenceHtml('わたしは食べます', '飲む', false)).toBeNull();
  });

  it('escapes the surrounding text', () => {
    const html = blankSentenceHtml('<b>食べる</b>', '食べる', false);
    expect(html).toBe('&lt;b&gt;<span class="blank">（　　　　　）</span>&lt;/b&gt;');
  });

  it('returns null when the answer only covers part of a ruby group', () => {
    expect(blankSentenceHtml('{今日|きょう}について話します', '日', true)).toBeNull();
  });

  it('blanks a ruby group fully when the answer covers all of it', () => {
    const html = blankSentenceHtml('{今日|きょう}について話します', '今日', true);
    expect(html).toBe('<span class="blank">（　　　　　）</span>について話します');
  });
});

describe('buildWorksheetHtml', () => {
  it('skips a deck with fewer than 3 words and no blankable sentences', () => {
    const plan: LessonPlan = { decks: [deck({ cards: [card(), card({ word: '飲む' })] })] };
    const doc = parse(
      buildWorksheetHtml({ locale: 'en', plan, labels: LABELS, options: DEFAULT_OPTIONS }),
    );
    expect(doc.querySelectorAll('.match-table')).toHaveLength(0);
    expect(doc.querySelectorAll('.blank-row')).toHaveLength(0);
  });

  it('builds a match section for 3+ unique words', () => {
    const plan: LessonPlan = { decks: [deck({ cards: eightCards().slice(0, 3) })] };
    const doc = parse(
      buildWorksheetHtml({ locale: 'en', plan, labels: LABELS, options: DEFAULT_OPTIONS }),
    );
    expect(doc.querySelectorAll('.match-table tr')).toHaveLength(3);
  });

  it('builds a fill-in-the-blank section for 2+ blankable sentences', () => {
    const plan: LessonPlan = {
      decks: [
        deck({
          cards: [
            card({
              word: '食べる',
              exampleJp: 'わたしは食べるのが好きです',
              exampleEn: 'I like to eat',
            }),
            card({ word: '飲む', exampleJp: 'みずを飲む', exampleEn: 'drink water' }),
          ],
        }),
      ],
    };
    const doc = parse(
      buildWorksheetHtml({ locale: 'en', plan, labels: LABELS, options: DEFAULT_OPTIONS }),
    );
    expect(doc.querySelectorAll('.blank-row')).toHaveLength(2);
    expect(doc.querySelectorAll('.match-table')).toHaveLength(0);
  });

  it('omits excluded cards and excluded decks', () => {
    const plan: LessonPlan = {
      decks: [
        deck({ excluded: true, cards: eightCards() }),
        deck({
          name: 'Week two',
          cards: [...eightCards().slice(0, 3), card({ excluded: true, word: 'x' })],
        }),
      ],
    };
    const doc = parse(
      buildWorksheetHtml({ locale: 'en', plan, labels: LABELS, options: DEFAULT_OPTIONS }),
    );
    expect(doc.querySelectorAll('.sheet')).toHaveLength(2);
    expect(doc.querySelectorAll('.match-table tr')).toHaveLength(3);
  });

  it('matches the letter in the answer key to the meaning printed on the sheet', () => {
    const plan: LessonPlan = { decks: [deck({ name: 'Week one', cards: eightCards() })] };
    const doc = parse(
      buildWorksheetHtml({ locale: 'en', plan, labels: LABELS, options: DEFAULT_OPTIONS }),
    );

    const keyLine = doc.querySelector('.key-match')?.textContent ?? '';
    const pairs = keyLine.split('  ').map((part) => {
      const [num, letter] = part.split('–');
      return { num: Number(num), letter };
    });

    const rows = [...doc.querySelectorAll('.match-table tr')];
    const meaningByLetter = new Map(
      rows.map((row) => [
        row.querySelector('.letter')?.textContent?.replace('.', ''),
        row.querySelector('.meaning')?.textContent,
      ]),
    );
    const wordRowMeaning = (num: number) => {
      const row = rows[num - 1];
      return row.querySelector('.jp')?.textContent;
    };

    expect(pairs).toHaveLength(8);
    for (const { num, letter } of pairs) {
      expect(wordRowMeaning(num)).toBeTruthy();
      expect(meaningByLetter.get(letter)).toBe(`meaning ${num - 1}`);
    }
  });

  it('produces identical HTML for the same input', () => {
    const plan: LessonPlan = { decks: [deck({ cards: eightCards() })] };
    // brandHeaderHtml's gradient id counter is global, so strip it before comparing.
    const normalize = (html: string) => html.replace(/print-brand-rule-\d+/g, 'print-brand-rule');
    const a = buildWorksheetHtml({ locale: 'en', plan, labels: LABELS, options: DEFAULT_OPTIONS });
    const b = buildWorksheetHtml({ locale: 'en', plan, labels: LABELS, options: DEFAULT_OPTIONS });
    expect(normalize(a)).toBe(normalize(b));
  });

  it('omits the answer key when the option is off', () => {
    const plan: LessonPlan = { decks: [deck({ cards: eightCards() })] };
    const doc = parse(
      buildWorksheetHtml({
        locale: 'en',
        plan,
        labels: LABELS,
        options: { furigana: true, answerKey: false },
      }),
    );
    expect(doc.querySelectorAll('.key-deck')).toHaveLength(0);
  });

  it('says so rather than printing an empty page when nothing qualifies', () => {
    const plan: LessonPlan = { decks: [] };
    const html = buildWorksheetHtml({
      locale: 'en',
      plan,
      labels: LABELS,
      options: DEFAULT_OPTIONS,
    });
    expect(parse(html).querySelectorAll('.sheet')).toHaveLength(1);
  });

  it('prints the blank-fill answer key in the deck-displayed front text, not always the kanji word', () => {
    const plan: LessonPlan = {
      decks: [
        deck({
          mainViewMode: 'hiragana',
          cards: [
            card({
              word: '食べる',
              reading: 'たべる',
              exampleJp: 'たべるのがすきです',
              exampleEn: 'I like eating',
            }),
            card({
              word: '飲む',
              reading: 'のむ',
              exampleJp: 'のむのがすきです',
              exampleEn: 'I like drinking',
            }),
          ],
        }),
      ],
    };
    const doc = parse(
      buildWorksheetHtml({ locale: 'en', plan, labels: LABELS, options: DEFAULT_OPTIONS }),
    );
    expect(doc.querySelector('.key-blank')?.textContent).toBe('1 ＝ たべる  2 ＝ のむ');
  });

  it('dedupes the match section by displayed front text, not the kanji word, so homophones only appear once', () => {
    const plan: LessonPlan = {
      decks: [
        deck({
          mainViewMode: 'hiragana',
          cards: [
            card({ word: '橋', reading: 'はし', meaning: 'bridge' }),
            card({ word: '箸', reading: 'はし', meaning: 'chopsticks' }),
            card({ word: '猫', reading: 'ねこ', meaning: 'cat' }),
            card({ word: '犬', reading: 'いぬ', meaning: 'dog' }),
          ],
        }),
      ],
    };
    const doc = parse(
      buildWorksheetHtml({ locale: 'en', plan, labels: LABELS, options: DEFAULT_OPTIONS }),
    );
    const fronts = [...doc.querySelectorAll('.match-table .jp')].map((el) => el.textContent);
    expect(fronts).toEqual(['はし', 'ねこ', 'いぬ']);
  });

  it('skips a card in the match section whose meaning repeats an earlier one', () => {
    const plan: LessonPlan = {
      decks: [
        deck({
          cards: [
            card({ word: '橋', reading: 'はし', meaning: 'bridge' }),
            card({ word: 'バス', reading: 'ばす', meaning: 'bridge' }),
            card({ word: '猫', reading: 'ねこ', meaning: 'cat' }),
            card({ word: '犬', reading: 'いぬ', meaning: 'dog' }),
          ],
        }),
      ],
    };
    const doc = parse(
      buildWorksheetHtml({
        locale: 'en',
        plan,
        labels: LABELS,
        options: { furigana: false, answerKey: true },
      }),
    );
    const fronts = [...doc.querySelectorAll('.match-table .jp')].map((el) => el.textContent);
    expect(fronts).toEqual(['橋', '猫', '犬']);
  });
});

describe('hasWorksheetContent', () => {
  it('is true for a deck with 3+ unique words', () => {
    const plan: LessonPlan = { decks: [deck({ cards: eightCards().slice(0, 3) })] };
    expect(hasWorksheetContent(plan)).toBe(true);
  });

  it('is true for a deck with 2+ blankable sentences', () => {
    const plan: LessonPlan = {
      decks: [
        deck({
          cards: [
            card({ word: '食べる', exampleJp: 'わたしは食べるのが好きです' }),
            card({ word: '飲む', exampleJp: 'みずを飲む' }),
          ],
        }),
      ],
    };
    expect(hasWorksheetContent(plan)).toBe(true);
  });

  it('is false for an empty plan', () => {
    expect(hasWorksheetContent({ decks: [] })).toBe(false);
  });

  it('is false for a deck with too few words and no sentences', () => {
    const plan: LessonPlan = { decks: [deck({ cards: [card(), card({ word: '飲む' })] })] };
    expect(hasWorksheetContent(plan)).toBe(false);
  });

  it('does not fall back to a one-character reading', () => {
    const plan: LessonPlan = {
      decks: [
        deck({
          cards: [
            card({
              word: '絵',
              reading: 'え',
              exampleJp: 'えをかきます',
              exampleEn: 'draw a picture',
            }),
            card({
              word: '字',
              reading: 'じ',
              exampleJp: 'じをかきます',
              exampleEn: 'write a letter',
            }),
          ],
        }),
      ],
    };
    expect(hasWorksheetContent(plan)).toBe(false);
  });

  it('falls back to the reading when it is at least two characters long', () => {
    const plan: LessonPlan = {
      decks: [
        deck({
          cards: [
            card({
              word: '食べる',
              reading: 'たべる',
              exampleJp: 'たべるのがすきです',
              exampleEn: 'I like eating',
            }),
            card({
              word: '飲む',
              reading: 'のむ',
              exampleJp: 'のむのがすきです',
              exampleEn: 'I like drinking',
            }),
          ],
        }),
      ],
    };
    expect(hasWorksheetContent(plan)).toBe(true);
  });
});
