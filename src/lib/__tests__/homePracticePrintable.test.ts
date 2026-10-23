import { describe, expect, it } from 'vitest';

import {
  buildHomePracticeHtml,
  HOME_WRITE_MAX,
  type HomePracticeLabels,
  type HomePracticeOptions,
} from '@/lib/homePracticePrintable';
import type { LessonPlan, PlanCard, PlanDeck } from '@/types/lessonPlan';

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

const LABELS: HomePracticeLabels = {
  title: 'Home practice',
  name: 'Name',
  date: 'Date',
  wordsHeading: "This week's words",
  sayIt: 'Say it 3 times',
  writeIt: 'Write it',
  trackerHeading: 'My practice this week',
  trackerApp: 'Practiced in the app',
  trackerPaper: 'Practiced on paper',
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  checkedBy: 'Checked by',
  scan: 'Scan to practice in Tangodachi',
};

const DEFAULT_OPTIONS: HomePracticeOptions = { furigana: true };

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

const QR = { svg: '<svg><rect/></svg>', url: 'https://tangodachi.app/review/start' };

describe('buildHomePracticeHtml', () => {
  it('prints one sheet per printable deck', () => {
    const plan: LessonPlan = {
      decks: [deck({ name: 'Week one' }), deck({ name: 'Week two' }), deck({ excluded: true })],
    };
    const doc = parse(
      buildHomePracticeHtml({
        locale: 'en',
        plan,
        labels: LABELS,
        options: DEFAULT_OPTIONS,
        qr: null,
      }),
    );
    expect(doc.querySelectorAll('.sheet')).toHaveLength(2);
  });

  it('builds a tracker with 7 day headers and 14 tick cells', () => {
    const plan: LessonPlan = { decks: [deck()] };
    const doc = parse(
      buildHomePracticeHtml({
        locale: 'en',
        plan,
        labels: LABELS,
        options: DEFAULT_OPTIONS,
        qr: null,
      }),
    );
    expect(doc.querySelectorAll('.tracker-table thead th.day')).toHaveLength(7);
    expect(doc.querySelectorAll('.tracker-table .tick')).toHaveLength(14);
  });

  it('traces each kana of the reading, with the blank row holding the same box count', () => {
    const plan: LessonPlan = {
      decks: [deck({ cards: [card({ word: '食べる', reading: 'たべる' })] })],
    };
    const doc = parse(
      buildHomePracticeHtml({
        locale: 'en',
        plan,
        labels: LABELS,
        options: DEFAULT_OPTIONS,
        qr: null,
      }),
    );
    const traceTexts = [...doc.querySelectorAll('.trace-row text')].map((t) => t.textContent);
    expect(traceTexts).toEqual(['た', 'べ', 'る']);
    expect(doc.querySelectorAll('.blank-row svg')).toHaveLength(3);
    expect(doc.querySelectorAll('.blank-row text')).toHaveLength(0);
  });

  it('gives a reading longer than HOME_WRITE_MAX a writing line instead of boxes', () => {
    const longReading = 'あ'.repeat(HOME_WRITE_MAX + 1);
    const plan: LessonPlan = {
      decks: [deck({ cards: [card({ word: 'long', reading: longReading })] })],
    };
    const doc = parse(
      buildHomePracticeHtml({
        locale: 'en',
        plan,
        labels: LABELS,
        options: DEFAULT_OPTIONS,
        qr: null,
      }),
    );
    expect(doc.querySelector('.writing-line')).not.toBeNull();
    expect(doc.querySelectorAll('.trace-row')).toHaveLength(0);
  });

  it('skips spaces in the reading when tracing', () => {
    const plan: LessonPlan = {
      decks: [deck({ cards: [card({ word: 'ice cream', reading: 'あいす くりーむ' })] })],
    };
    const doc = parse(
      buildHomePracticeHtml({
        locale: 'en',
        plan,
        labels: LABELS,
        options: DEFAULT_OPTIONS,
        qr: null,
      }),
    );
    const traceTexts = [...doc.querySelectorAll('.trace-row text')].map((t) => t.textContent);
    expect(traceTexts).toEqual(['あ', 'い', 'す', 'く', 'り', 'ー', 'む']);
  });

  it('drops 〜 from the reading when tracing', () => {
    const plan: LessonPlan = {
      decks: [deck({ cards: [card({ word: 'long', reading: 'どう〜ぞ' })] })],
    };
    const doc = parse(
      buildHomePracticeHtml({
        locale: 'en',
        plan,
        labels: LABELS,
        options: DEFAULT_OPTIONS,
        qr: null,
      }),
    );
    const traceTexts = [...doc.querySelectorAll('.trace-row text')].map((t) => t.textContent);
    expect(traceTexts).toEqual(['ど', 'う', 'ぞ']);
  });

  it('shows the reading as the word for a hiragana-mode deck', () => {
    const plan: LessonPlan = {
      decks: [
        deck({ mainViewMode: 'hiragana', cards: [card({ word: '食べる', reading: 'たべる' })] }),
      ],
    };
    const doc = parse(
      buildHomePracticeHtml({
        locale: 'en',
        plan,
        labels: LABELS,
        options: DEFAULT_OPTIONS,
        qr: null,
      }),
    );
    expect(doc.querySelector('.word')?.textContent).toBe('たべる');
  });

  it('omits the QR block when qr is null', () => {
    const plan: LessonPlan = { decks: [deck()] };
    const doc = parse(
      buildHomePracticeHtml({
        locale: 'en',
        plan,
        labels: LABELS,
        options: DEFAULT_OPTIONS,
        qr: null,
      }),
    );
    expect(doc.querySelector('.qr')).toBeNull();
  });

  it('omits the QR block when the svg string does not start with <svg', () => {
    const plan: LessonPlan = { decks: [deck()] };
    const doc = parse(
      buildHomePracticeHtml({
        locale: 'en',
        plan,
        labels: LABELS,
        options: DEFAULT_OPTIONS,
        qr: { svg: 'not an svg', url: QR.url },
      }),
    );
    expect(doc.querySelector('.qr')).toBeNull();
  });

  it('renders the svg, caption and URL without https:// for a valid qr', () => {
    const plan: LessonPlan = { decks: [deck()] };
    const doc = parse(
      buildHomePracticeHtml({
        locale: 'en',
        plan,
        labels: LABELS,
        options: DEFAULT_OPTIONS,
        qr: QR,
      }),
    );
    const qrBlock = doc.querySelector('.qr');
    expect(qrBlock?.querySelector('rect')).not.toBeNull();
    expect(qrBlock?.querySelector('.qr-caption')?.textContent).toBe(LABELS.scan);
    expect(qrBlock?.querySelector('.qr-url')?.textContent).toBe('tangodachi.app/review/start');
  });

  it('escapes meanings', () => {
    const plan: LessonPlan = { decks: [deck({ cards: [card({ meaning: '<b>to eat</b>' })] })] };
    const doc = parse(
      buildHomePracticeHtml({
        locale: 'en',
        plan,
        labels: LABELS,
        options: DEFAULT_OPTIONS,
        qr: null,
      }),
    );
    expect(doc.querySelector('.meaning')?.textContent).toBe('<b>to eat</b>');
    expect(doc.querySelector('.meaning')?.querySelector('b')).toBeNull();
  });

  it('spaces word rows with a sibling selector, not :first-of-type', () => {
    const plan: LessonPlan = { decks: [deck()] };
    const html = buildHomePracticeHtml({
      locale: 'en',
      plan,
      labels: LABELS,
      options: DEFAULT_OPTIONS,
      qr: null,
    });
    expect(html).toContain('.word-row + .word-row');
    expect(html).not.toContain('.word-row:first-of-type');
  });

  it('says so rather than printing an empty page when there are no printable decks', () => {
    const plan: LessonPlan = { decks: [] };
    const doc = parse(
      buildHomePracticeHtml({
        locale: 'en',
        plan,
        labels: LABELS,
        options: DEFAULT_OPTIONS,
        qr: null,
      }),
    );
    expect(doc.querySelectorAll('.sheet')).toHaveLength(1);
    expect(doc.querySelectorAll('.word-row')).toHaveLength(0);
  });
});
