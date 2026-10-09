import { describe, expect, it } from 'vitest';

import type { LessonUnit, LessonUnitWeek } from '@/types/lessonUnit';

import { buildUnitPlanHtml, type UnitPlanLabels } from '../unitPlanPrintable';

function makeWeek(overrides: Partial<LessonUnitWeek> = {}): LessonUnitWeek {
  return {
    deckId: 'd1',
    deckName: 'Greetings',
    deckEmoji: null,
    week: 1,
    title: 'Week 1',
    note: null,
    dueDate: '2026-10-13',
    availableOn: '2026-10-06',
    requiredAccuracy: null,
    requiredMode: null,
    learnerCount: 0,
    finishedCount: 0,
    wordCount: 0,
    status: 'current',
    kanaSets: [],
    handedOut: true,
    ...overrides,
  };
}

function makeUnit(weeks: LessonUnitWeek[], overrides: Partial<LessonUnit> = {}): LessonUnit {
  return {
    id: 'plan1',
    title: 'Unit 1',
    level: 'N5',
    createdAt: '2026-01-01',
    weeks,
    ...overrides,
  };
}

const LABELS: UnitPlanLabels = {
  canDoHeading: 'By the end of this unit, learners can:',
  word: 'Word',
  meaning: 'Meaning',
  weekLine: (n, opens, due) => `Week ${n} · Opens ${opens} · Due ${due}`,
  goalLine: () => null,
};

describe('buildUnitPlanHtml', () => {
  it('escapes a <script> tag in the unit title, a week note, and a word meaning', () => {
    const unit = makeUnit([makeWeek({ note: '<script>alert(1)</script>' })], {
      title: '<script>alert(2)</script>',
    });
    const html = buildUnitPlanHtml({
      unit,
      groupName: 'Section A',
      wordsByDeck: { d1: [{ word: '猫', reading: null, meaning: '<script>cat</script>' }] },
      labels: LABELS,
      locale: 'en',
    });
    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('<script>cat');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders ruby furigana for a word with a reading', () => {
    const unit = makeUnit([makeWeek()]);
    const html = buildUnitPlanHtml({
      unit,
      groupName: 'Section A',
      wordsByDeck: { d1: [{ word: '猫', reading: 'ねこ', meaning: 'cat' }] },
      labels: LABELS,
      locale: 'en',
    });
    expect(html).toContain('<ruby>');
    expect(html).toContain('<rt>ねこ</rt>');
  });

  it('renders one <section class="week"> per week', () => {
    const unit = makeUnit([
      makeWeek({ deckId: 'd1', week: 1 }),
      makeWeek({ deckId: 'd2', week: 2 }),
    ]);
    const html = buildUnitPlanHtml({
      unit,
      groupName: 'Section A',
      wordsByDeck: {},
      labels: LABELS,
      locale: 'en',
    });
    expect(html.match(/<section class="week">/g)).toHaveLength(2);
  });

  it('hides the can-do block when no week has a note', () => {
    const unit = makeUnit([makeWeek({ note: null })]);
    const html = buildUnitPlanHtml({
      unit,
      groupName: 'Section A',
      wordsByDeck: {},
      labels: LABELS,
      locale: 'en',
    });
    expect(html).not.toContain('class="candos"');
  });

  it('shows the can-do block when a week has a note', () => {
    const unit = makeUnit([makeWeek({ note: 'Can greet people' })]);
    const html = buildUnitPlanHtml({
      unit,
      groupName: 'Section A',
      wordsByDeck: {},
      labels: LABELS,
      locale: 'en',
    });
    expect(html).toContain('class="candos"');
    expect(html).toContain('Can greet people');
  });

  it('includes a goal line only when goalLine resolves one', () => {
    const unit = makeUnit([makeWeek({ requiredAccuracy: 80, requiredMode: 'quiz' })]);
    const html = buildUnitPlanHtml({
      unit,
      groupName: 'Section A',
      wordsByDeck: {},
      labels: { ...LABELS, goalLine: () => 'Goal: 80% in Quiz' },
      locale: 'en',
    });
    expect(html).toContain('Goal: 80% in Quiz');
  });
});
